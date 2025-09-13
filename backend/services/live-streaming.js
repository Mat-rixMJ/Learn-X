const { Pool } = require('pg');
const { TranslationService, SimpleTranslationService } = require('./translation');
const { SpeechToTextService, SimpleSpeechToTextService } = require('./speech-to-text');
const SessionRecordingService = require('./recording');

class LiveStreamingService {
  constructor(io, pool) {
    this.io = io;
    this.pool = pool;
    this.activeSessions = new Map();
    this.userConnections = new Map();
    this.streamingRooms = new Map();
    
    // Initialize recording service
    this.recordingService = new SessionRecordingService(pool);
    
    // Initialize translation service
    try {
      this.translationService = new TranslationService();
    } catch (error) {
      console.warn('Google Translate not available, using simple translation service');
      this.translationService = new SimpleTranslationService();
    }
    
    // Initialize speech-to-text service
    try {
      this.speechService = new SpeechToTextService();
      // Override emit methods to use Socket.IO
      this.speechService.emitCaption = (sessionId, caption) => {
        this.io.to(sessionId).emit('live-caption', caption);
      };
      this.speechService.emitError = (sessionId, error) => {
        this.io.to(sessionId).emit('caption-error', error);
      };
    } catch (error) {
      console.warn('Google Speech-to-Text not available, using simple service');
      this.speechService = new SimpleSpeechToTextService();
      // Override emit methods for simple service too
      this.speechService.emitCaption = (sessionId, caption) => {
        this.io.to(sessionId).emit('live-caption', caption);
      };
      this.speechService.emitError = (sessionId, error) => {
        this.io.to(sessionId).emit('caption-error', error);
      };
    }
  }

  async startLiveSession(sessionId, teacherId, classId) {
    try {
      // Update session status in database
      await this.pool.query(
        'UPDATE live_sessions SET status = $1, started_at = NOW() WHERE id = $2',
        ['active', sessionId]
      );

      // Create room for this session
      const room = {
        sessionId,
        teacherId,
        classId,
        participants: new Map(),
        teacher: null,
        isRecording: false,
        streamStartTime: Date.now()
      };

      this.activeSessions.set(sessionId, room);
      this.streamingRooms.set(sessionId, room);

      console.log(`✅ Live session ${sessionId} started by teacher ${teacherId}`);
      return { success: true, sessionId };
    } catch (error) {
      console.error('Error starting live session:', error);
      return { success: false, error: error.message };
    }
  }

  async joinSession(socket, data) {
    const { sessionId, userId, userRole, userName } = data;
    
    try {
      // Verify session exists and is active
      const sessionResult = await this.pool.query(
        'SELECT * FROM live_sessions WHERE id = $1 AND status = $2',
        [sessionId, 'active']
      );

      if (sessionResult.rows.length === 0) {
        socket.emit('join-error', { message: 'Session not found or not active' });
        return;
      }

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        socket.emit('join-error', { message: 'Session not initialized' });
        return;
      }

      // Add user to session
      const userInfo = {
        socket,
        userId,
        userName,
        role: userRole,
        joinedAt: new Date(),
        isStreaming: false,
        connectionStatus: 'connected'
      };

      if (userRole === 'teacher') {
        session.teacher = userInfo;
      } else {
        session.participants.set(userId, userInfo);
      }

      this.userConnections.set(socket.id, { sessionId, userId, userRole });
      socket.join(sessionId);

      // Record participant join in database
      await this.pool.query(
        'INSERT INTO live_session_participants (session_id, user_id, joined_at) VALUES ($1, $2, NOW())',
        [sessionId, userId]
      );

      // Notify others in the session
      socket.to(sessionId).emit('user-joined', {
        userId,
        userName,
        role: userRole,
        timestamp: Date.now()
      });

      // Send current session state to new participant
      const participantsList = Array.from(session.participants.values()).map(p => ({
        userId: p.userId,
        userName: p.userName,
        role: p.role,
        isStreaming: p.isStreaming
      }));

      if (session.teacher) {
        participantsList.push({
          userId: session.teacher.userId,
          userName: session.teacher.userName,
          role: 'teacher',
          isStreaming: session.teacher.isStreaming
        });
      }

      socket.emit('session-joined', {
        sessionId,
        participants: participantsList,
        isRecording: session.isRecording,
        streamStartTime: session.streamStartTime
      });

      console.log(`👤 ${userName} (${userRole}) joined session ${sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('join-error', { message: 'Failed to join session' });
    }
  }

  async leaveSession(socket, data) {
    const connectionInfo = this.userConnections.get(socket.id);
    if (!connectionInfo) return;

    const { sessionId, userId, userRole } = connectionInfo;
    const session = this.activeSessions.get(sessionId);
    
    if (!session) return;

    try {
      // Update participant leave time in database
      await this.pool.query(
        'UPDATE live_session_participants SET left_at = NOW() WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL',
        [sessionId, userId]
      );

      // Remove from session
      if (userRole === 'teacher') {
        session.teacher = null;
        // If teacher leaves, end the session
        await this.endSession(sessionId);
      } else {
        session.participants.delete(userId);
      }

      this.userConnections.delete(socket.id);
      socket.leave(sessionId);

      // Notify others
      socket.to(sessionId).emit('user-left', {
        userId,
        role: userRole,
        timestamp: Date.now()
      });

      console.log(`👋 User ${userId} left session ${sessionId}`);
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }

  async endSession(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) return;

      // Update session status in database
      await this.pool.query(
        'UPDATE live_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
        ['ended', sessionId]
      );

      // Update all active participants
      await this.pool.query(
        'UPDATE live_session_participants SET left_at = NOW() WHERE session_id = $1 AND left_at IS NULL',
        [sessionId]
      );

      // Notify all participants
      this.io.to(sessionId).emit('session-ended', {
        sessionId,
        timestamp: Date.now()
      });

      // Clean up
      this.activeSessions.delete(sessionId);
      this.streamingRooms.delete(sessionId);

      console.log(`🏁 Session ${sessionId} ended`);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // WebRTC Signaling handlers
  handleOffer(socket, data) {
    const { targetUserId, offer, sessionId } = data;
    const connectionInfo = this.userConnections.get(socket.id);
    
    if (!connectionInfo) return;

    socket.to(sessionId).emit('offer-received', {
      fromUserId: connectionInfo.userId,
      targetUserId,
      offer
    });
  }

  handleAnswer(socket, data) {
    const { targetUserId, answer, sessionId } = data;
    const connectionInfo = this.userConnections.get(socket.id);
    
    if (!connectionInfo) return;

    socket.to(sessionId).emit('answer-received', {
      fromUserId: connectionInfo.userId,
      targetUserId,
      answer
    });
  }

  handleIceCandidate(socket, data) {
    const { targetUserId, candidate, sessionId } = data;
    const connectionInfo = this.userConnections.get(socket.id);
    
    if (!connectionInfo) return;

    socket.to(sessionId).emit('ice-candidate-received', {
      fromUserId: connectionInfo.userId,
      targetUserId,
      candidate
    });
  }

  // Chat messaging
  async handleChatMessage(socket, data) {
    const { sessionId, message, messageType = 'chat' } = data;
    const connectionInfo = this.userConnections.get(socket.id);
    
    if (!connectionInfo) return;

    try {
      // Store message in database
      const result = await this.pool.query(
        'INSERT INTO live_session_messages (session_id, user_id, message, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
        [sessionId, connectionInfo.userId, message, messageType]
      );

      const messageData = {
        id: result.rows[0].id,
        userId: connectionInfo.userId,
        message,
        messageType,
        timestamp: result.rows[0].timestamp
      };

      // Broadcast to all participants
      this.io.to(sessionId).emit('chat-message', messageData);
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  }

  // Recording control
  async toggleRecording(socket, data) {
    const { sessionId, enable } = data;
    const connectionInfo = this.userConnections.get(socket.id);
    
    if (!connectionInfo || connectionInfo.userRole !== 'teacher') {
      socket.emit('recording-error', { message: 'Only teachers can control recording' });
      return;
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      if (enable) {
        // Start recording
        const result = await this.recordingService.startRecording(sessionId);
        
        if (result.success) {
          session.isRecording = true;
          session.recordingId = result.recordingId;

          await this.pool.query(
            'UPDATE live_sessions SET recording_enabled = $1, recording_status = $2 WHERE id = $3',
            [true, 'recording', sessionId]
          );

          // Notify all participants
          this.io.to(sessionId).emit('recording-status', {
            isRecording: true,
            recordingId: result.recordingId,
            timestamp: Date.now()
          });

          console.log(`📹 Recording started for session ${sessionId}`);
        } else {
          socket.emit('recording-error', { message: result.error });
        }
      } else {
        // Stop recording
        const result = await this.recordingService.stopRecording(sessionId);
        
        if (result.success) {
          session.isRecording = false;
          session.recordingId = null;

          await this.pool.query(
            'UPDATE live_sessions SET recording_status = $1 WHERE id = $2',
            ['completed', sessionId]
          );

          // Notify all participants
          this.io.to(sessionId).emit('recording-status', {
            isRecording: false,
            recordingId: result.recordingId,
            duration: result.duration,
            timestamp: Date.now()
          });

          console.log(`🏁 Recording stopped for session ${sessionId}`);
        } else {
          socket.emit('recording-error', { message: result.error });
        }
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      socket.emit('recording-error', { message: 'Failed to toggle recording' });
    }
  }

  // Handle audio data for recording
  async handleAudioData(socket, data) {
    const { sessionId, audioChunk } = data;
    const connectionInfo = this.userConnections.get(socket.id);
    
    if (!connectionInfo) return;

    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isRecording) return;

    // Add to recording
    await this.recordingService.addAudioChunk(sessionId, audioChunk);

    // Also process for live captions if enabled
    if (session.subtitle_enabled) {
      await this.speechService.processAudioChunk(sessionId, audioChunk);
    }
  }

  // Handle video data for recording
  async handleVideoData(socket, data) {
    const { sessionId, videoChunk } = data;
    const connectionInfo = this.userConnections.get(socket.id);
    
    if (!connectionInfo || connectionInfo.userRole !== 'teacher') return;

    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isRecording) return;

    // Add to recording
    await this.recordingService.addVideoChunk(sessionId, videoChunk);
  }

  // Get active sessions for teacher
  async getActiveSessions(teacherId) {
    try {
      const result = await this.pool.query(
        'SELECT ls.*, c.name as class_name FROM live_sessions ls JOIN classes c ON ls.class_id = c.id WHERE ls.teacher_id = $1 AND ls.status = $2',
        [teacherId, 'active']
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  // Start live captions for a session
  async startCaptions(sessionId, languageCode = 'en-US') {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      const result = await this.speechService.startTranscription(sessionId, {
        languageCode
      });

      if (result.success) {
        // Update session to enable captions
        await this.pool.query(
          'UPDATE live_sessions SET subtitle_enabled = true WHERE id = $1',
          [sessionId]
        );

        // Notify participants
        this.io.to(sessionId).emit('captions-started', {
          sessionId,
          language: languageCode,
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      console.error('Error starting captions:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop live captions
  async stopCaptions(sessionId) {
    try {
      const result = this.speechService.stopTranscription(sessionId);

      if (result.success) {
        await this.pool.query(
          'UPDATE live_sessions SET subtitle_enabled = false WHERE id = $1',
          [sessionId]
        );

        this.io.to(sessionId).emit('captions-stopped', {
          sessionId,
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      console.error('Error stopping captions:', error);
      return { success: false, error: error.message };
    }
  }

  // Process audio for live captions
  async processAudio(sessionId, audioBuffer) {
    return this.speechService.processAudioChunk(sessionId, audioBuffer);
  }

  // Translate a message in real-time
  async translateMessage(sessionId, messageId, targetLanguage) {
    try {
      // Get the original message
      const messageResult = await this.pool.query(
        'SELECT * FROM live_session_messages WHERE id = $1 AND session_id = $2',
        [messageId, sessionId]
      );

      if (messageResult.rows.length === 0) {
        return { success: false, error: 'Message not found' };
      }

      const originalMessage = messageResult.rows[0];
      
      // Translate the message
      const translation = await this.translationService.translateText(
        originalMessage.message,
        targetLanguage
      );

      // Store the translation
      await this.pool.query(
        'INSERT INTO live_session_messages (session_id, user_id, message, message_type, language, original_message, is_translated) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [sessionId, originalMessage.user_id, translation.translatedText, 'translation', targetLanguage, originalMessage.message, true]
      );

      return {
        success: true,
        translation,
        originalMessage: originalMessage.message
      };
    } catch (error) {
      console.error('Error translating message:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced chat message handler with translation support
  async handleChatMessage(socket, data) {
    const { sessionId, message, messageType = 'chat', translateTo = [] } = data;
    const connectionInfo = this.userConnections.get(socket.id);
    
    if (!connectionInfo) return;

    try {
      // Store original message in database
      const result = await this.pool.query(
        'INSERT INTO live_session_messages (session_id, user_id, message, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
        [sessionId, connectionInfo.userId, message, messageType]
      );

      const messageData = {
        id: result.rows[0].id,
        userId: connectionInfo.userId,
        message,
        messageType,
        timestamp: result.rows[0].timestamp,
        translations: {}
      };

      // If translation is requested, translate the message
      if (translateTo.length > 0) {
        for (const targetLang of translateTo) {
          try {
            const translation = await this.translationService.translateText(message, targetLang);
            messageData.translations[targetLang] = translation.translatedText;
          } catch (error) {
            console.error(`Translation error for ${targetLang}:`, error);
            messageData.translations[targetLang] = message; // Fallback to original
          }
        }
      }

      // Broadcast to all participants
      this.io.to(sessionId).emit('chat-message', messageData);
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  }

  // Handle live caption with translation
  async handleLiveCaption(sessionId, captionData) {
    try {
      // Store caption in database
      const result = await this.pool.query(
        'INSERT INTO live_session_captions (session_id, text_content, start_time, confidence_score, language) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [sessionId, captionData.text, captionData.startTime, captionData.confidence, 'en']
      );

      const session = this.activeSessions.get(sessionId);
      if (!session) return;

      // Check if session has translation enabled
      const sessionInfo = await this.pool.query(
        'SELECT translation_enabled, available_languages FROM live_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionInfo.rows[0]?.translation_enabled) {
        const languages = sessionInfo.rows[0].available_languages || ['en'];
        const translations = {};

        // Translate to all enabled languages
        for (const lang of languages) {
          if (lang !== 'en') {
            try {
              const translation = await this.translationService.translateText(
                captionData.text,
                lang,
                'en'
              );
              translations[lang] = translation.translatedText;
            } catch (error) {
              console.error(`Caption translation error for ${lang}:`, error);
              translations[lang] = captionData.text;
            }
          } else {
            translations[lang] = captionData.text;
          }
        }

        // Emit translated captions
        this.io.to(sessionId).emit('live-caption-translated', {
          id: result.rows[0].id,
          original: captionData.text,
          translations,
          timestamp: captionData.timestamp,
          confidence: captionData.confidence,
          startTime: captionData.startTime
        });
      } else {
        // Emit original caption only
        this.io.to(sessionId).emit('live-caption', {
          id: result.rows[0].id,
          text: captionData.text,
          timestamp: captionData.timestamp,
          confidence: captionData.confidence,
          startTime: captionData.startTime
        });
      }
    } catch (error) {
      console.error('Error handling live caption:', error);
    }
  }
}

module.exports = LiveStreamingService;