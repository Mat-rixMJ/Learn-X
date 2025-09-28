require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimiter');
const { initializeDatabase } = require('./config/initDB');

const app = express();
app.set('trust proxy', 1); // Trust the first proxy (ngrok)
const port = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Needed for WebRTC
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'http://localhost:3001', // Allow alternate port for local dev
    'http://localhost:3000',  // Original local port
    'https://wishtiq.online', // Custom domain
    'https://www.wishtiq.online', // Custom domain with www
    /https:\/\/.*\.vercel\.app$/, // Allow all Vercel deployments
    /https:\/\/.*\.cloudflareaccess\.com$/, // Cloudflare Access domains
    /https:\/\/.*\.trycloudflare\.com$/, // Cloudflare quick tunnels
    process.env.CLOUDFLARE_TUNNEL_URL, // Custom Cloudflare tunnel URL
    'https://learnx-backend.your-domain.com' // Default tunnel domain (update this)
  ].filter(Boolean), // Remove undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Allow standard headers; include optional ngrok header for backwards compatibility
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// Rate limiting
app.use(apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads (non-video files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // Don't cache video files, handle them separately
    if (path.includes('/videos/')) {
      return;
    }
  }
}));

// Video streaming endpoint with proper CORS and range support
app.get('/stream/video/:filename', (req, res) => {
  const fs = require('fs');
  const videoPath = path.join(__dirname, 'uploads', 'videos', req.params.filename);
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Set CORS headers for video streaming
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Accept-Ranges');
  res.header('Accept-Ranges', 'bytes');
  res.header('Content-Type', 'video/mp4');

  if (range) {
    // Parse range header
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    
    // Create read stream for the requested range
    const file = fs.createReadStream(videoPath, { start, end });
    
    // Set partial content headers
    res.status(206);
    res.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.header('Content-Length', chunksize.toString());
    
    file.pipe(res);
  } else {
    // No range header, send entire file
    res.header('Content-Length', fileSize.toString());
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to help with ngrok issues
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'API is working correctly',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    method: req.method,
    url: req.url
  });
});

// API Routes
const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const userRoutes = require('./routes/user');
const lecturesRoutes = require('./routes/lectures');
const teacherStatsRoutes = require('./routes/teacher-stats');
const liveSessionsRoutes = require('./routes/live-sessions');
const scheduledClassesRoutes = require('./routes/scheduled-classes');
const aiNotesRoutes = require('./routes/ai-notes');
const breakoutRoomsRoutes = require('./routes/breakout-rooms');
const translationRoutes = require('./routes/translation');
const assignmentsRoutes = require('./routes/assignments');
const contentRoutes = require('./routes/content');
const analyticsRoutes = require('./routes/analytics');
const profilesRoutes = require('./routes/profiles');
const studentDashboardRoutes = require('./routes/student-dashboard');
const teacherDashboardRoutes = require('./routes/teacher-dashboard');
const schedulingRoutes = require('./routes/scheduling');
const notificationsRoutes = require('./routes/notifications');
const { pythonServicesEnabled } = require('./config/features');
let pythonServicesRouter = null;
let setupWebSocketProxy = null;
if (pythonServicesEnabled) {
  const pythonModule = require('./routes/python-services');
  pythonServicesRouter = pythonModule.router;
  setupWebSocketProxy = pythonModule.setupWebSocketProxy;
}
const systemHealthRoute = pythonServicesEnabled ? require('./routes/system-health') : null;

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/user', userRoutes);
app.use('/api/lectures', lecturesRoutes);
app.use('/api/teacher', teacherStatsRoutes);
app.use('/api/live', liveSessionsRoutes);
app.use('/api/scheduled', scheduledClassesRoutes);
app.use('/api/ai-notes', aiNotesRoutes);
app.use('/api/breakout-rooms', breakoutRoomsRoutes);
app.use('/api/translate', translationRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/student', studentDashboardRoutes);
app.use('/api/teacher-dashboard', teacherDashboardRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/notifications', notificationsRoutes);
if (pythonServicesEnabled && pythonServicesRouter) {
  app.use('/api/python-services', pythonServicesRouter);
  if (systemHealthRoute) {
    app.use('/api/system/health', systemHealthRoute);
  }
} else {
  // Stub endpoints when python services disabled
  app.get('/api/python-services/health', (req,res)=>{
    res.json({ success:true, overall_status:'disabled', services:{}, timestamp:new Date().toISOString() });
  });
  app.get('/api/system/health', (req,res)=>{
    res.json({ success:true, overall:'python_disabled', python_services:{ enabled:false }, timestamp:new Date().toISOString() });
  });
}

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'LearnX Backend API is running',
    version: '1.0.0',
    docs: '/api/docs'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDev && { stack: error.stack })
  });
});

// Create HTTP server
const server = createServer(app);

// Socket.IO server for video streaming signaling
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Import and initialize live streaming service
const LiveStreamingService = require('./services/live-streaming');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remoteclassroom',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const liveStreamingService = new LiveStreamingService(io, pool);

io.on('connection', (socket) => {
  console.log('🔌 New Socket.IO connection established:', socket.id);

  // Live session events
  socket.on('join-session', (data) => {
    liveStreamingService.joinSession(socket, data);
  });

  socket.on('leave-session', (data) => {
    liveStreamingService.leaveSession(socket, data);
  });

  // WebRTC signaling events
  socket.on('offer', (data) => {
    liveStreamingService.handleOffer(socket, data);
  });

  socket.on('answer', (data) => {
    liveStreamingService.handleAnswer(socket, data);
  });

  socket.on('ice-candidate', (data) => {
    liveStreamingService.handleIceCandidate(socket, data);
  });

  // Chat and messaging
  socket.on('chat-message', (data) => {
    liveStreamingService.handleChatMessage(socket, data);
  });

  // Recording control
  socket.on('toggle-recording', (data) => {
    liveStreamingService.toggleRecording(socket, data);
  });

  // Audio/Video data for recording and captions
  socket.on('audio-data', (data) => {
    liveStreamingService.handleAudioData(socket, data);
  });

  socket.on('video-data', (data) => {
    liveStreamingService.handleVideoData(socket, data);
  });

  // Caption control
  socket.on('start-captions', (data) => {
    const connectionInfo = liveStreamingService.userConnections.get(socket.id);
    if (connectionInfo && connectionInfo.userRole === 'teacher') {
      liveStreamingService.startCaptions(data.sessionId, data.language);
    }
  });

  socket.on('stop-captions', (data) => {
    const connectionInfo = liveStreamingService.userConnections.get(socket.id);
    if (connectionInfo && connectionInfo.userRole === 'teacher') {
      liveStreamingService.stopCaptions(data.sessionId);
    }
  });

  // Stream control events
  socket.on('start-stream', (data) => {
    const connectionInfo = liveStreamingService.userConnections.get(socket.id);
    if (connectionInfo && connectionInfo.userRole === 'teacher') {
      socket.to(data.sessionId).emit('stream-started', {
        teacherId: connectionInfo.userId,
        timestamp: Date.now()
      });
    }
  });

  socket.on('stop-stream', (data) => {
    const connectionInfo = liveStreamingService.userConnections.get(socket.id);
    if (connectionInfo && connectionInfo.userRole === 'teacher') {
      socket.to(data.sessionId).emit('stream-stopped', {
        teacherId: connectionInfo.userId,
        timestamp: Date.now()
      });
    }
  });

  // Breakout Rooms Events
  socket.on('create-breakout-room', async (data) => {
    try {
      const { sessionId, room, assignmentMethod, autoAssign } = data;
      const connectionInfo = liveStreamingService.userConnections.get(socket.id);
      
      if (!connectionInfo || connectionInfo.userRole !== 'teacher') {
        socket.emit('error', { message: 'Only teachers can create breakout rooms' });
        return;
      }

      // Create the room (implement breakout room storage)
      const roomId = require('uuid').v4();
      const newRoom = {
        id: roomId,
        sessionId,
        name: room.name,
        topic: room.topic,
        maxParticipants: room.maxParticipants || 4,
        timeLimit: room.timeLimit || 15,
        isPrivate: room.isPrivate || false,
        isActive: false,
        participants: [],
        createdAt: new Date()
      };

      // Store room and notify all participants
      io.to(sessionId).emit('breakout-room-created', newRoom);
      io.to(sessionId).emit('breakout-rooms-updated', await getSessionBreakoutRooms(sessionId));
    } catch (error) {
      console.error('Error creating breakout room:', error);
      socket.emit('error', { message: 'Failed to create breakout room' });
    }
  });

  socket.on('delete-breakout-room', async (data) => {
    try {
      const { sessionId, roomId } = data;
      const connectionInfo = liveStreamingService.userConnections.get(socket.id);
      
      if (!connectionInfo || connectionInfo.userRole !== 'teacher') {
        socket.emit('error', { message: 'Only teachers can delete breakout rooms' });
        return;
      }

      // Remove all participants from the room first
      io.to(`breakout-${roomId}`).emit('breakout-room-deleted', { roomId });
      
      // Notify all participants
      io.to(sessionId).emit('breakout-rooms-updated', await getSessionBreakoutRooms(sessionId));
    } catch (error) {
      console.error('Error deleting breakout room:', error);
      socket.emit('error', { message: 'Failed to delete breakout room' });
    }
  });

  socket.on('join-breakout-room', async (data) => {
    try {
      const { sessionId, roomId, userId } = data;
      const connectionInfo = liveStreamingService.userConnections.get(socket.id);
      
      if (!connectionInfo) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Leave current breakout room if in one
      const currentRooms = Array.from(socket.rooms);
      const currentBreakoutRoom = currentRooms.find(room => room.startsWith('breakout-'));
      if (currentBreakoutRoom) {
        socket.leave(currentBreakoutRoom);
        socket.to(currentBreakoutRoom).emit('user-left-breakout', {
          userId: connectionInfo.userId,
          userName: connectionInfo.userName,
          roomId: currentBreakoutRoom.replace('breakout-', '')
        });
      }

      // Join new breakout room
      socket.join(`breakout-${roomId}`);
      socket.to(`breakout-${roomId}`).emit('user-joined-breakout', {
        userId: connectionInfo.userId,
        userName: connectionInfo.userName,
        userRole: connectionInfo.userRole,
        roomId
      });

      socket.emit('breakout-room-joined', { roomId });
      
      // Update main session participants list
      io.to(sessionId).emit('breakout-rooms-updated', await getSessionBreakoutRooms(sessionId));
    } catch (error) {
      console.error('Error joining breakout room:', error);
      socket.emit('error', { message: 'Failed to join breakout room' });
    }
  });

  socket.on('leave-breakout-room', async (data) => {
    try {
      const { sessionId, roomId } = data;
      const connectionInfo = liveStreamingService.userConnections.get(socket.id);
      
      if (!connectionInfo) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Leave breakout room
      socket.leave(`breakout-${roomId}`);
      socket.to(`breakout-${roomId}`).emit('user-left-breakout', {
        userId: connectionInfo.userId,
        userName: connectionInfo.userName,
        roomId
      });

      socket.emit('breakout-room-left', { roomId });
      
      // Update main session participants list
      io.to(sessionId).emit('breakout-rooms-updated', await getSessionBreakoutRooms(sessionId));
    } catch (error) {
      console.error('Error leaving breakout room:', error);
      socket.emit('error', { message: 'Failed to leave breakout room' });
    }
  });

  socket.on('start-breakout-session', async (data) => {
    try {
      const { sessionId } = data;
      const connectionInfo = liveStreamingService.userConnections.get(socket.id);
      
      if (!connectionInfo || connectionInfo.userRole !== 'teacher') {
        socket.emit('error', { message: 'Only teachers can start breakout sessions' });
        return;
      }

      // Activate all breakout rooms for this session
      const rooms = await getSessionBreakoutRooms(sessionId);
      const timeLimit = rooms[0]?.timeLimit || 15; // Use first room's time limit
      
      io.to(sessionId).emit('breakout-session-started', { 
        timeLimit,
        startTime: Date.now()
      });

      // Start countdown timer
      if (timeLimit) {
        setTimeout(() => {
          io.to(sessionId).emit('breakout-session-ended', {
            reason: 'Time limit reached'
          });
        }, timeLimit * 60 * 1000);
      }
    } catch (error) {
      console.error('Error starting breakout session:', error);
      socket.emit('error', { message: 'Failed to start breakout session' });
    }
  });

  socket.on('end-breakout-session', async (data) => {
    try {
      const { sessionId } = data;
      const connectionInfo = liveStreamingService.userConnections.get(socket.id);
      
      if (!connectionInfo || connectionInfo.userRole !== 'teacher') {
        socket.emit('error', { message: 'Only teachers can end breakout sessions' });
        return;
      }

      // End breakout session for all participants
      io.to(sessionId).emit('breakout-session-ended', {
        reason: 'Ended by teacher'
      });

      // Move all participants back to main session
      const breakoutRooms = await getSessionBreakoutRooms(sessionId);
      breakoutRooms.forEach(room => {
        io.to(`breakout-${room.id}`).emit('return-to-main-session');
      });
    } catch (error) {
      console.error('Error ending breakout session:', error);
      socket.emit('error', { message: 'Failed to end breakout session' });
    }
  });

  socket.on('auto-assign-breakout-rooms', async (data) => {
    try {
      const { sessionId, method } = data; // method: 'random' | 'balanced'
      const connectionInfo = liveStreamingService.userConnections.get(socket.id);
      
      if (!connectionInfo || connectionInfo.userRole !== 'teacher') {
        socket.emit('error', { message: 'Only teachers can auto-assign participants' });
        return;
      }

      // Get all participants in the session
      const sessionParticipants = liveStreamingService.getSessionParticipants(sessionId);
      const breakoutRooms = await getSessionBreakoutRooms(sessionId);
      
      if (breakoutRooms.length === 0) {
        socket.emit('error', { message: 'No breakout rooms available' });
        return;
      }

      // Auto-assign participants
      if (method === 'random') {
        const shuffled = sessionParticipants.sort(() => Math.random() - 0.5);
        shuffled.forEach((participant, index) => {
          const roomIndex = index % breakoutRooms.length;
          const room = breakoutRooms[roomIndex];
          
          // Emit join event for this participant
          io.to(participant.socketId).emit('auto-assigned-to-room', {
            roomId: room.id,
            roomName: room.name
          });
        });
      } else if (method === 'balanced') {
        const participantsPerRoom = Math.ceil(sessionParticipants.length / breakoutRooms.length);
        sessionParticipants.forEach((participant, index) => {
          const roomIndex = Math.floor(index / participantsPerRoom);
          if (roomIndex < breakoutRooms.length) {
            const room = breakoutRooms[roomIndex];
            io.to(participant.socketId).emit('auto-assigned-to-room', {
              roomId: room.id,
              roomName: room.name
            });
          }
        });
      }

      io.to(sessionId).emit('breakout-rooms-updated', await getSessionBreakoutRooms(sessionId));
    } catch (error) {
      console.error('Error auto-assigning participants:', error);
      socket.emit('error', { message: 'Failed to auto-assign participants' });
    }
  });

  socket.on('move-participant-breakout', async (data) => {
    try {
      const { sessionId, participantId, fromRoomId, toRoomId } = data;
      const connectionInfo = liveStreamingService.userConnections.get(socket.id);
      
      if (!connectionInfo || connectionInfo.userRole !== 'teacher') {
        socket.emit('error', { message: 'Only teachers can move participants' });
        return;
      }

      // Find participant's socket
      const participantSocket = liveStreamingService.findParticipantSocket(participantId);
      if (!participantSocket) {
        socket.emit('error', { message: 'Participant not found' });
        return;
      }

      // Remove from current room
      if (fromRoomId) {
        participantSocket.leave(`breakout-${fromRoomId}`);
        participantSocket.to(`breakout-${fromRoomId}`).emit('user-left-breakout', {
          userId: participantId,
          roomId: fromRoomId
        });
      }

      // Add to new room (if specified)
      if (toRoomId) {
        participantSocket.join(`breakout-${toRoomId}`);
        participantSocket.to(`breakout-${toRoomId}`).emit('user-joined-breakout', {
          userId: participantId,
          roomId: toRoomId
        });
        participantSocket.emit('moved-to-breakout-room', { roomId: toRoomId });
      } else {
        participantSocket.emit('moved-to-main-session');
      }

      io.to(sessionId).emit('breakout-rooms-updated', await getSessionBreakoutRooms(sessionId));
    } catch (error) {
      console.error('Error moving participant:', error);
      socket.emit('error', { message: 'Failed to move participant' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('💔 Socket disconnected:', socket.id);
    liveStreamingService.leaveSession(socket, {});
  });

  // Legacy room-based events for backward compatibility
  socket.on('join-room', (data) => {
    handleJoinRoom(socket, data);
  });

  socket.on('offer', (data) => {
    handleSignalingMessage(socket, 'offer', data);
  });

  socket.on('answer', (data) => {
    handleSignalingMessage(socket, 'answer', data);
  });

  socket.on('ice-candidate', (data) => {
    handleSignalingMessage(socket, 'ice-candidate', data);
  });

  socket.on('leave-room', (data) => {
    handleLeaveRoom(socket, data);
  });
});

// Set up WebSocket proxy for Python services (only if enabled)
if (pythonServicesEnabled && setupWebSocketProxy) {
  setupWebSocketProxy(server);
}

// Make live streaming service available to routes
app.set('liveStreamingService', liveStreamingService);

// Store connected clients by room (legacy support)
const rooms = new Map();

function handleJoinRoom(socket, data) {
  const { roomId, userId, userName } = data;

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }

  const room = rooms.get(roomId);
  room.set(userId, { socket, userId, userName });

  socket.roomId = roomId;
  socket.userId = userId;

  // Notify other participants in the room
  room.forEach((client, clientId) => {
    if (clientId !== userId) {
      client.socket.emit('user-joined', {
        userId,
        userName
      });
    }
  });

  // Send list of existing participants to the new user
  const participants = Array.from(room.entries()).map(([id, client]) => ({
    userId: id,
    userName: client.userName
  }));

  socket.emit('room-joined', {
    participants
  });

  console.log(`User ${userName} joined room ${roomId}`);
}

function handleSignalingMessage(socket, type, data) {
  const { targetUserId, ...message } = data;
  const room = rooms.get(socket.roomId);

  if (room && room.has(targetUserId)) {
    const targetClient = room.get(targetUserId);
    targetClient.socket.emit(type, {
      ...message,
      fromUserId: socket.userId
    });
  }
}

function handleLeaveRoom(socket, data) {
  const { roomId, userId } = data;
  const room = rooms.get(roomId);

  if (room) {
    const user = room.get(userId);
    if (user) {
      room.delete(userId);

      // Notify other participants
      room.forEach((client) => {
        client.socket.emit('user-left', {
          userId
        });
      });

      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }
  }

  console.log(`User ${userId} left room ${roomId}`);
}

function handleDisconnect(socket) {
  if (socket.roomId && socket.userId) {
    handleLeaveRoom(socket, { roomId: socket.roomId, userId: socket.userId });
  }
}

// Helper function to get breakout rooms for a session
async function getSessionBreakoutRooms(sessionId) {
  // This is a simplified implementation
  // In production, you'd fetch from database
  try {
    // For now, return empty array - you can implement database storage later
    return [];
  } catch (error) {
    console.error('Error fetching breakout rooms:', error);
    return [];
  }
}

// Start server
server.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  console.log(`WebSocket server ready for video streaming`);
  
  // Initialize database on Render
  await initializeDatabase();
  
  // Start notification service for dual timing system (45min + 5min before class)
  const NotificationService = require('./services/notificationService');
  const notificationService = new NotificationService();
  console.log('🔔 Dual notification system started (45min + 5min reminders)');
});
