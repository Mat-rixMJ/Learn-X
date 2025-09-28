// const ffmpeg = require('fluent-ffmpeg'); // Optional - requires FFmpeg installation
const fs = require('fs').promises;
const path = require('path');

class SessionRecordingService {
  constructor(pool) {
    this.pool = pool;
    this.activeRecordings = new Map();
    this.recordingsPath = path.join(__dirname, '../uploads/recordings');
    
    // Ensure recordings directory exists
    this.ensureRecordingsDirectory();
  }

  async ensureRecordingsDirectory() {
    try {
      await fs.mkdir(this.recordingsPath, { recursive: true });
      console.log('📁 Recordings directory ready:', this.recordingsPath);
    } catch (error) {
      console.error('Error creating recordings directory:', error);
    }
  }

  async startRecording(sessionId, options = {}) {
    try {
      if (this.activeRecordings.has(sessionId)) {
        return { success: false, error: 'Recording already in progress' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `session-${sessionId}-${timestamp}.webm`;
      const filePath = path.join(this.recordingsPath, filename);

      // Create recording entry in database
      const recordingResult = await this.pool.query(
        'INSERT INTO live_session_recordings (session_id, file_path, recording_started_at, processing_status) VALUES ($1, $2, NOW(), $3) RETURNING *',
        [sessionId, filePath, 'recording']
      );

      const recordingInfo = {
        id: recordingResult.rows[0].id,
        sessionId,
        filePath,
        startTime: Date.now(),
        chunks: [],
        stream: null,
        status: 'recording'
      };

      this.activeRecordings.set(sessionId, recordingInfo);

      console.log(`📹 Started recording for session ${sessionId}: ${filename}`);
      
      return {
        success: true,
        recordingId: recordingInfo.id,
        filePath: filename
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      return { success: false, error: error.message };
    }
  }

  async stopRecording(sessionId) {
    try {
      const recordingInfo = this.activeRecordings.get(sessionId);
      if (!recordingInfo) {
        return { success: false, error: 'No active recording found' };
      }

      recordingInfo.status = 'processing';
      const duration = (Date.now() - recordingInfo.startTime) / 1000;

      // If we have chunks, process them
      if (recordingInfo.chunks.length > 0) {
        await this.processRecordingChunks(recordingInfo);
      }

      // Update database
      await this.pool.query(
        'UPDATE live_session_recordings SET recording_ended_at = NOW(), duration_seconds = $1, processing_status = $2 WHERE id = $3',
        [Math.round(duration), 'completed', recordingInfo.id]
      );

      // Calculate file size
      try {
        const stats = await fs.stat(recordingInfo.filePath);
        await this.pool.query(
          'UPDATE live_session_recordings SET file_size = $1 WHERE id = $2',
          [stats.size, recordingInfo.id]
        );
      } catch (error) {
        console.error('Error getting file stats:', error);
      }

      this.activeRecordings.delete(sessionId);

      console.log(`🏁 Completed recording for session ${sessionId}`);
      
      return {
        success: true,
        recordingId: recordingInfo.id,
        duration: Math.round(duration),
        filePath: recordingInfo.filePath
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return { success: false, error: error.message };
    }
  }

  async addAudioChunk(sessionId, audioChunk) {
    const recordingInfo = this.activeRecordings.get(sessionId);
    if (recordingInfo && recordingInfo.status === 'recording') {
      recordingInfo.chunks.push({
        data: audioChunk,
        timestamp: Date.now()
      });
      return { success: true };
    }
    return { success: false, error: 'No active recording or recording not in progress' };
  }

  async addVideoChunk(sessionId, videoChunk) {
    const recordingInfo = this.activeRecordings.get(sessionId);
    if (recordingInfo && recordingInfo.status === 'recording') {
      // For video chunks, we might want to handle them differently
      // This is a simplified version
      recordingInfo.chunks.push({
        data: videoChunk,
        timestamp: Date.now(),
        type: 'video'
      });
      return { success: true };
    }
    return { success: false, error: 'No active recording or recording not in progress' };
  }

  async processRecordingChunks(recordingInfo) {
    try {
      // Combine all audio/video chunks into a single file
      const combinedBuffer = Buffer.concat(
        recordingInfo.chunks.map(chunk => chunk.data)
      );

      // Write the combined buffer to file
      await fs.writeFile(recordingInfo.filePath, combinedBuffer);

      console.log(`💾 Saved recording file: ${recordingInfo.filePath}`);
      
      // Optionally convert to different formats using FFmpeg
      await this.convertRecording(recordingInfo);
      
      return { success: true };
    } catch (error) {
      console.error('Error processing recording chunks:', error);
      throw error;
    }
  }

  async convertRecording(recordingInfo) {
    try {
      console.log('⚠️  FFmpeg not available - recording saved as:', recordingInfo.filePath);
      return recordingInfo; // Return original recording without conversion
      
      /* FFmpeg conversion code - requires fluent-ffmpeg package
      const inputPath = recordingInfo.filePath;
      const outputPath = inputPath.replace('.webm', '.mp4');

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .format('mp4')
          .on('start', (commandLine) => {
            console.log('🎬 FFmpeg conversion started:', commandLine);
          })
          .on('progress', (progress) => {
            console.log('📈 Conversion progress:', progress.percent + '%');
          })
          .on('end', async () => {
            console.log('✅ Conversion completed:', outputPath);
            
            // Update database with MP4 file path
            try {
              await this.pool.query(
                'UPDATE live_session_recordings SET file_path = $1 WHERE id = $2',
                [outputPath, recordingInfo.id]
              );
            } catch (error) {
              console.error('Error updating recording path:', error);
            }
            
            resolve({ success: true, outputPath });
          })
          .on('error', (error) => {
            console.error('❌ Conversion error:', error);
            reject(error);
          })
          .run();
      });
      */
    } catch (error) {
      console.error('Error converting recording:', error);
      // Don't throw, just log the error since the original recording still exists
      return { success: false, error: error.message };
    }
  }

  async getSessionRecordings(sessionId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM live_session_recordings WHERE session_id = $1 ORDER BY recording_started_at DESC',
        [sessionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting session recordings:', error);
      return [];
    }
  }

  async getRecordingInfo(recordingId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM live_session_recordings WHERE id = $1',
        [recordingId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting recording info:', error);
      return null;
    }
  }

  async deleteRecording(recordingId) {
    try {
      const recording = await this.getRecordingInfo(recordingId);
      if (!recording) {
        return { success: false, error: 'Recording not found' };
      }

      // Delete file from filesystem
      try {
        await fs.unlink(recording.file_path);
      } catch (error) {
        console.warn('File already deleted or not found:', error.message);
      }

      // Delete from database
      await this.pool.query(
        'DELETE FROM live_session_recordings WHERE id = $1',
        [recordingId]
      );

      console.log(`🗑️ Deleted recording: ${recording.file_path}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting recording:', error);
      return { success: false, error: error.message };
    }
  }

  // Get recording file stream for download
  async getRecordingStream(recordingId) {
    try {
      const recording = await this.getRecordingInfo(recordingId);
      if (!recording) {
        return { success: false, error: 'Recording not found' };
      }

      // Check if file exists
      try {
        await fs.access(recording.file_path);
      } catch (error) {
        return { success: false, error: 'Recording file not found' };
      }

      return {
        success: true,
        filePath: recording.file_path,
        fileName: path.basename(recording.file_path),
        fileSize: recording.file_size
      };
    } catch (error) {
      console.error('Error getting recording stream:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up old recordings (can be called periodically)
  async cleanupOldRecordings(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldRecordings = await this.pool.query(
        'SELECT * FROM live_session_recordings WHERE recording_started_at < $1',
        [cutoffDate]
      );

      let deletedCount = 0;
      for (const recording of oldRecordings.rows) {
        const result = await this.deleteRecording(recording.id);
        if (result.success) {
          deletedCount++;
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} old recordings`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error cleaning up recordings:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SessionRecordingService;