require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimiter');
const { initializeDatabase } = require('./config/initDB');

const app = express();
const port = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Needed for WebRTC
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'http://localhost:3001', // Allow alternate port
    'http://localhost:3000'  // Original port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
app.use(apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Store connected clients by room
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New Socket.IO connection established:', socket.id);

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

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

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
