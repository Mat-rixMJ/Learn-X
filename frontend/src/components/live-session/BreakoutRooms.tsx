'use client';

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface BreakoutRoom {
  id: string;
  name: string;
  participants: Participant[];
  maxParticipants: number;
  isActive: boolean;
  createdAt: Date;
  topic?: string;
  timeLimit?: number; // in minutes
  isPrivate: boolean;
}

interface Participant {
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  isOnline: boolean;
  joinedAt?: Date;
}

interface BreakoutRoomsProps {
  socket: Socket | null;
  sessionId: string;
  currentUser: any;
  participants: Participant[];
  userRole: 'teacher' | 'student';
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
}

const ROOM_COLORS = [
  'bg-blue-100 border-blue-200 text-blue-800',
  'bg-green-100 border-green-200 text-green-800',
  'bg-purple-100 border-purple-200 text-purple-800',
  'bg-orange-100 border-orange-200 text-orange-800',
  'bg-pink-100 border-pink-200 text-pink-800',
  'bg-indigo-100 border-indigo-200 text-indigo-800',
  'bg-teal-100 border-teal-200 text-teal-800',
  'bg-red-100 border-red-200 text-red-800'
];

export default function BreakoutRooms({
  socket,
  sessionId,
  currentUser,
  participants,
  userRole,
  onJoinRoom,
  onLeaveRoom
}: BreakoutRoomsProps) {
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [roomTimer, setRoomTimer] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);

  // Create room form state
  const [newRoom, setNewRoom] = useState({
    name: '',
    topic: '',
    maxParticipants: 4,
    timeLimit: 15,
    isPrivate: false,
    autoAssign: false,
    assignmentMethod: 'manual' as 'manual' | 'random' | 'balanced'
  });

  useEffect(() => {
    if (!socket) return;

    // Socket event listeners
    socket.on('breakout-rooms-updated', (rooms: BreakoutRoom[]) => {
      setBreakoutRooms(rooms);
    });

    socket.on('breakout-room-joined', (data: { roomId: string; room: BreakoutRoom }) => {
      setCurrentRoom(data.roomId);
      onJoinRoom(data.roomId);
    });

    socket.on('breakout-room-left', () => {
      setCurrentRoom(null);
      onLeaveRoom();
    });

    socket.on('breakout-session-started', (data: { timeLimit: number }) => {
      setIsActive(true);
      setRoomTimer(data.timeLimit * 60); // Convert to seconds
    });

    socket.on('breakout-session-ended', () => {
      setIsActive(false);
      setRoomTimer(0);
      setCurrentRoom(null);
      onLeaveRoom();
    });

    socket.on('breakout-timer-update', (seconds: number) => {
      setRoomTimer(seconds);
    });

    return () => {
      socket.off('breakout-rooms-updated');
      socket.off('breakout-room-joined');
      socket.off('breakout-room-left');
      socket.off('breakout-session-started');
      socket.off('breakout-session-ended');
      socket.off('breakout-timer-update');
    };
  }, [socket, onJoinRoom, onLeaveRoom]);

  // Timer countdown effect
  useEffect(() => {
    if (!isActive || roomTimer <= 0) return;

    const interval = setInterval(() => {
      setRoomTimer(prev => {
        if (prev <= 1) {
          // Time's up!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, roomTimer]);

  const createBreakoutRoom = () => {
    if (!socket || !newRoom.name.trim()) return;

    const room: Omit<BreakoutRoom, 'id' | 'participants' | 'isActive' | 'createdAt'> = {
      name: newRoom.name.trim(),
      topic: newRoom.topic.trim() || undefined,
      maxParticipants: newRoom.maxParticipants,
      timeLimit: newRoom.timeLimit,
      isPrivate: newRoom.isPrivate
    };

    socket.emit('create-breakout-room', {
      sessionId,
      room,
      assignmentMethod: newRoom.assignmentMethod,
      autoAssign: newRoom.autoAssign
    });

    // Reset form
    setNewRoom({
      name: '',
      topic: '',
      maxParticipants: 4,
      timeLimit: 15,
      isPrivate: false,
      autoAssign: false,
      assignmentMethod: 'manual'
    });
    setShowCreateDialog(false);
  };

  const deleteBreakoutRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('delete-breakout-room', { sessionId, roomId });
  };

  const joinBreakoutRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('join-breakout-room', { sessionId, roomId, userId: currentUser.id });
  };

  const leaveBreakoutRoom = () => {
    if (!socket || !currentRoom) return;
    socket.emit('leave-breakout-room', { sessionId, roomId: currentRoom, userId: currentUser.id });
  };

  const startBreakoutSession = () => {
    if (!socket) return;
    socket.emit('start-breakout-session', { sessionId });
  };

  const endBreakoutSession = () => {
    if (!socket) return;
    socket.emit('end-breakout-session', { sessionId });
  };

  const autoAssignParticipants = (method: 'random' | 'balanced') => {
    if (!socket) return;
    socket.emit('auto-assign-breakout-rooms', { sessionId, method });
  };

  const moveParticipant = (participantId: string, fromRoomId: string | null, toRoomId: string) => {
    if (!socket) return;
    socket.emit('move-participant-breakout', {
      sessionId,
      participantId,
      fromRoomId,
      toRoomId
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const unassignedParticipants = participants.filter(p => 
    !breakoutRooms.some(room => room.participants.some(rp => rp.userId === p.userId))
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div>
          <h3 className="text-lg font-semibold">Breakout Rooms</h3>
          {isActive && (
            <div className="text-sm text-blue-600 font-medium">
              ⏱️ Time remaining: {formatTime(roomTimer)}
            </div>
          )}
        </div>
        
        {userRole === 'teacher' && (
          <div className="flex space-x-2">
            {!isActive ? (
              <>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  + Create Room
                </button>
                <button
                  onClick={() => setShowManageDialog(true)}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  ⚙️ Manage
                </button>
                {breakoutRooms.length > 0 && (
                  <button
                    onClick={startBreakoutSession}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    ▶️ Start Session
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={endBreakoutSession}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                ⏹️ End Session
              </button>
            )}
          </div>
        )}
      </div>

      {/* Current Room Status */}
      {currentRoom && (
        <div className="p-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-blue-900">
                📍 Currently in: {breakoutRooms.find(r => r.id === currentRoom)?.name}
              </div>
              {breakoutRooms.find(r => r.id === currentRoom)?.topic && (
                <div className="text-sm text-blue-700">
                  Topic: {breakoutRooms.find(r => r.id === currentRoom)?.topic}
                </div>
              )}
            </div>
            <button
              onClick={leaveBreakoutRoom}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>
      )}

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-4">
        {breakoutRooms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🏠</div>
            <div>No breakout rooms created yet</div>
            {userRole === 'teacher' && (
              <div className="text-sm mt-2">Create rooms to enable small group discussions</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {breakoutRooms.map((room, index) => (
              <div
                key={room.id}
                className={`border-2 rounded-lg p-4 ${ROOM_COLORS[index % ROOM_COLORS.length]}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{room.name}</h4>
                    {room.topic && (
                      <p className="text-sm opacity-75 mt-1">{room.topic}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                      {room.participants.length}/{room.maxParticipants}
                    </span>
                    {room.isPrivate && (
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                        🔒 Private
                      </span>
                    )}
                  </div>
                </div>

                {/* Participants */}
                <div className="mb-3">
                  <div className="text-xs font-medium mb-1 opacity-75">Participants:</div>
                  {room.participants.length === 0 ? (
                    <div className="text-xs opacity-50">No participants yet</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {room.participants.map(participant => (
                        <span
                          key={participant.userId}
                          className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded flex items-center space-x-1"
                        >
                          <span>{participant.userName}</span>
                          {participant.role === 'teacher' && <span>👩‍🏫</span>}
                          {userRole === 'teacher' && (
                            <button
                              onClick={() => moveParticipant(participant.userId, room.id, '')}
                              className="ml-1 text-red-600 hover:text-red-800"
                              title="Remove from room"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    {currentRoom !== room.id && room.participants.length < room.maxParticipants && (
                      <button
                        onClick={() => joinBreakoutRoom(room.id)}
                        disabled={!isActive && userRole === 'student'}
                        className="text-xs px-3 py-1 bg-white bg-opacity-75 rounded hover:bg-opacity-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Join Room
                      </button>
                    )}
                    {userRole === 'teacher' && (
                      <button
                        onClick={() => deleteBreakoutRoom(room.id)}
                        className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {room.timeLimit && (
                    <div className="text-xs opacity-75">
                      ⏰ {room.timeLimit} min limit
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Unassigned Participants */}
        {userRole === 'teacher' && unassignedParticipants.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <h4 className="font-medium mb-2 text-gray-700">Unassigned Participants</h4>
            <div className="flex flex-wrap gap-2">
              {unassignedParticipants.map(participant => (
                <div
                  key={participant.userId}
                  className="px-3 py-1 bg-white border rounded text-sm flex items-center space-x-2"
                >
                  <span>{participant.userName}</span>
                  {participant.role === 'teacher' && <span>👩‍🏫</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => autoAssignParticipants('random')}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Assign Randomly
              </button>
              <button
                onClick={() => autoAssignParticipants('balanced')}
                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                Assign Balanced
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Room Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Breakout Room</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room Name *</label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Discussion Group 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Topic (Optional)</label>
                <input
                  type="text"
                  value={newRoom.topic}
                  onChange={(e) => setNewRoom({...newRoom, topic: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Chapter 5 Analysis"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Participants</label>
                  <select
                    value={newRoom.maxParticipants}
                    onChange={(e) => setNewRoom({...newRoom, maxParticipants: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[2, 3, 4, 5, 6, 8, 10].map(num => (
                      <option key={num} value={num}>{num} people</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Time Limit</label>
                  <select
                    value={newRoom.timeLimit}
                    onChange={(e) => setNewRoom({...newRoom, timeLimit: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[5, 10, 15, 20, 30, 45, 60].map(mins => (
                      <option key={mins} value={mins}>{mins} minutes</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRoom.isPrivate}
                    onChange={(e) => setNewRoom({...newRoom, isPrivate: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Private room</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRoom.autoAssign}
                    onChange={(e) => setNewRoom({...newRoom, autoAssign: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Auto-assign participants</span>
                </label>
              </div>

              {newRoom.autoAssign && (
                <div>
                  <label className="block text-sm font-medium mb-1">Assignment Method</label>
                  <select
                    value={newRoom.assignmentMethod}
                    onChange={(e) => setNewRoom({...newRoom, assignmentMethod: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="random">Random Assignment</option>
                    <option value="balanced">Balanced Groups</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={createBreakoutRoom}
                disabled={!newRoom.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}