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

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/user', userRoutes);
app.use('/api/lectures', lecturesRoutes);
app.use('/api/teacher', teacherStatsRoutes);
app.use('/api/live', liveSessionsRoutes);
app.use('/api/scheduled', scheduledClassesRoutes);
app.use('/api/ai-notes', aiNotesRoutes);

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

// Start server
server.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  console.log(`WebSocket server ready for video streaming`);
  
  // Initialize database on Render
  await initializeDatabase();
});
