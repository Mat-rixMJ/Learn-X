const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for breakout rooms (in production, use database)
let breakoutRooms = new Map(); // sessionId -> rooms[]
let roomParticipants = new Map(); // roomId -> participants[]
let sessionTimers = new Map(); // sessionId -> timer info

// Get breakout rooms for a session
router.get('/:sessionId/rooms', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const rooms = breakoutRooms.get(sessionId) || [];
    
    // Add participant data to each room
    const roomsWithParticipants = rooms.map(room => ({
      ...room,
      participants: roomParticipants.get(room.id) || []
    }));

    res.json({
      success: true,
      data: roomsWithParticipants
    });
  } catch (error) {
    console.error('Error fetching breakout rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breakout rooms'
    });
  }
});

// Create a new breakout room
router.post('/:sessionId/rooms', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { room, assignmentMethod, autoAssign } = req.body;
    
    const roomId = uuidv4();
    const newRoom = {
      id: roomId,
      name: room.name,
      topic: room.topic,
      maxParticipants: room.maxParticipants || 4,
      timeLimit: room.timeLimit || 15,
      isPrivate: room.isPrivate || false,
      isActive: false,
      createdAt: new Date()
    };

    // Add to session's rooms
    const sessionRooms = breakoutRooms.get(sessionId) || [];
    sessionRooms.push(newRoom);
    breakoutRooms.set(sessionId, sessionRooms);
    
    // Initialize empty participants list
    roomParticipants.set(roomId, []);

    // Auto-assign participants if requested
    if (autoAssign) {
      // This would need access to session participants
      // Implementation depends on how participants are stored
    }

    res.json({
      success: true,
      data: newRoom,
      message: 'Breakout room created successfully'
    });
  } catch (error) {
    console.error('Error creating breakout room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create breakout room'
    });
  }
});

// Delete a breakout room
router.delete('/:sessionId/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const { sessionId, roomId } = req.params;
    
    // Remove room from session
    const sessionRooms = breakoutRooms.get(sessionId) || [];
    const updatedRooms = sessionRooms.filter(room => room.id !== roomId);
    breakoutRooms.set(sessionId, updatedRooms);
    
    // Remove participants
    roomParticipants.delete(roomId);

    res.json({
      success: true,
      message: 'Breakout room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting breakout room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete breakout room'
    });
  }
});

// Join a breakout room
router.post('/:sessionId/rooms/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const { sessionId, roomId } = req.params;
    const { userId, userName, userRole } = req.body;
    
    const participants = roomParticipants.get(roomId) || [];
    const room = breakoutRooms.get(sessionId)?.find(r => r.id === roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (participants.length >= room.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    // Check if user is already in the room
    if (participants.some(p => p.userId === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User already in room'
      });
    }

    // Add participant
    participants.push({
      userId,
      userName,
      role: userRole,
      isOnline: true,
      joinedAt: new Date()
    });
    roomParticipants.set(roomId, participants);

    res.json({
      success: true,
      data: { roomId, room },
      message: 'Joined breakout room successfully'
    });
  } catch (error) {
    console.error('Error joining breakout room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join breakout room'
    });
  }
});

// Leave a breakout room
router.post('/:sessionId/rooms/:roomId/leave', authenticateToken, async (req, res) => {
  try {
    const { sessionId, roomId } = req.params;
    const { userId } = req.body;
    
    const participants = roomParticipants.get(roomId) || [];
    const updatedParticipants = participants.filter(p => p.userId !== userId);
    roomParticipants.set(roomId, updatedParticipants);

    res.json({
      success: true,
      message: 'Left breakout room successfully'
    });
  } catch (error) {
    console.error('Error leaving breakout room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave breakout room'
    });
  }
});

// Start breakout session
router.post('/:sessionId/start', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { timeLimit } = req.body;
    
    // Activate all rooms in the session
    const sessionRooms = breakoutRooms.get(sessionId) || [];
    const activatedRooms = sessionRooms.map(room => ({
      ...room,
      isActive: true
    }));
    breakoutRooms.set(sessionId, activatedRooms);
    
    // Set up session timer
    if (timeLimit) {
      sessionTimers.set(sessionId, {
        startTime: Date.now(),
        timeLimit: timeLimit * 60 * 1000, // Convert to milliseconds
        isActive: true
      });
    }

    res.json({
      success: true,
      message: 'Breakout session started successfully'
    });
  } catch (error) {
    console.error('Error starting breakout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start breakout session'
    });
  }
});

// End breakout session
router.post('/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Deactivate all rooms
    const sessionRooms = breakoutRooms.get(sessionId) || [];
    const deactivatedRooms = sessionRooms.map(room => ({
      ...room,
      isActive: false
    }));
    breakoutRooms.set(sessionId, deactivatedRooms);
    
    // Clear participants from all rooms
    sessionRooms.forEach(room => {
      roomParticipants.set(room.id, []);
    });
    
    // Clear session timer
    sessionTimers.delete(sessionId);

    res.json({
      success: true,
      message: 'Breakout session ended successfully'
    });
  } catch (error) {
    console.error('Error ending breakout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end breakout session'
    });
  }
});

// Auto-assign participants
router.post('/:sessionId/auto-assign', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { method, participants } = req.body; // method: 'random' | 'balanced'
    
    const sessionRooms = breakoutRooms.get(sessionId) || [];
    
    if (sessionRooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms available for assignment'
      });
    }

    // Clear current assignments
    sessionRooms.forEach(room => {
      roomParticipants.set(room.id, []);
    });

    // Auto-assign based on method
    if (method === 'random') {
      // Shuffle participants
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      
      shuffled.forEach((participant, index) => {
        const roomIndex = index % sessionRooms.length;
        const room = sessionRooms[roomIndex];
        const roomParticipantsList = roomParticipants.get(room.id) || [];
        
        if (roomParticipantsList.length < room.maxParticipants) {
          roomParticipantsList.push({
            userId: participant.userId,
            userName: participant.userName,
            role: participant.role,
            isOnline: participant.isOnline,
            joinedAt: new Date()
          });
          roomParticipants.set(room.id, roomParticipantsList);
        }
      });
    } else if (method === 'balanced') {
      // Distribute evenly across rooms
      const participantsPerRoom = Math.ceil(participants.length / sessionRooms.length);
      
      participants.forEach((participant, index) => {
        const roomIndex = Math.floor(index / participantsPerRoom);
        if (roomIndex < sessionRooms.length) {
          const room = sessionRooms[roomIndex];
          const roomParticipantsList = roomParticipants.get(room.id) || [];
          
          if (roomParticipantsList.length < room.maxParticipants) {
            roomParticipantsList.push({
              userId: participant.userId,
              userName: participant.userName,
              role: participant.role,
              isOnline: participant.isOnline,
              joinedAt: new Date()
            });
            roomParticipants.set(room.id, roomParticipantsList);
          }
        }
      });
    }

    res.json({
      success: true,
      message: 'Participants assigned successfully'
    });
  } catch (error) {
    console.error('Error auto-assigning participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-assign participants'
    });
  }
});

// Get session timer status
router.get('/:sessionId/timer', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const timer = sessionTimers.get(sessionId);
    
    if (!timer || !timer.isActive) {
      return res.json({
        success: true,
        data: { isActive: false, timeRemaining: 0 }
      });
    }

    const elapsed = Date.now() - timer.startTime;
    const timeRemaining = Math.max(0, timer.timeLimit - elapsed);
    
    res.json({
      success: true,
      data: {
        isActive: timer.isActive,
        timeRemaining: Math.floor(timeRemaining / 1000) // Return in seconds
      }
    });
  } catch (error) {
    console.error('Error getting timer status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get timer status'
    });
  }
});

module.exports = router;