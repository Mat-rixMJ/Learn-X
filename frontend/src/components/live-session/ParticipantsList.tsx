'use client';

import React, { useState } from 'react';

interface Participant {
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  isStreaming?: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId: string;
}

export default function ParticipantsList({
  participants,
  currentUserId
}: ParticipantsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const teacher = participants.find(p => p.role === 'teacher');
  const students = participants.filter(p => p.role === 'student');

  const getStatusIcon = (participant: Participant) => {
    if (participant.connectionStatus === 'connecting') return '🟡';
    if (participant.connectionStatus === 'disconnected') return '🔴';
    if (participant.isStreaming) return '📹';
    return '🟢';
  };

  const getStatusText = (participant: Participant) => {
    if (participant.connectionStatus === 'connecting') return 'Connecting...';
    if (participant.connectionStatus === 'disconnected') return 'Disconnected';
    if (participant.isStreaming) return 'Streaming';
    return 'Connected';
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <div 
        className="px-4 py-3 border-b bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Participants ({participants.length})
          </h3>
          <span className="text-gray-500">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Participants List */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {/* Teacher Section */}
          {teacher && (
            <div className="px-4 py-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Teacher
              </h4>
              <div className="flex items-center space-x-3 py-2">
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {teacher.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 text-xs">
                    {getStatusIcon(teacher)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {teacher.userName}
                      {teacher.userId === currentUserId && ' (You)'}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Host
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {getStatusText(teacher)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Students Section */}
          {students.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Students ({students.length})
              </h4>
              <div className="space-y-2">
                {students.map((student) => (
                  <div key={student.userId} className="flex items-center space-x-3 py-1">
                    <div className="relative">
                      <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {student.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 text-xs">
                        {getStatusIcon(student)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {student.userName}
                        {student.userId === currentUserId && ' (You)'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getStatusText(student)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {participants.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm">No participants yet</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-600">
        <div className="flex justify-between">
          <span>🟢 Online: {participants.filter(p => p.connectionStatus !== 'disconnected').length}</span>
          <span>📹 Streaming: {participants.filter(p => p.isStreaming).length}</span>
        </div>
      </div>
    </div>
  );
}