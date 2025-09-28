'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useRouter } from 'next/navigation';

interface LiveSession {
  id: string;
  title: string;
  description: string;
  class_name: string;
  subject: string;
  teacher_name: string;
  started_at: string;
  max_participants: number;
  participant_count: number;
  status: string;
}

export default function LiveClassesPage() {
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningSession, setJoiningSession] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLiveSessions();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchLiveSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveSessions = async () => {
    try {
      const result = await apiService.getActiveLiveSessions();

      if (result.success && result.data) {
        setLiveSessions(result.data);
      } else {
        setError(result.message || 'Failed to load live sessions');
      }
    } catch (error) {
      console.error('Error fetching live sessions:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (sessionId: string) => {
    if (joiningSession) return;

    setJoiningSession(sessionId);
    try {
      const result = await apiService.joinLiveSession(sessionId);

      if (result.success) {
        // Redirect to live session room
        router.push(`/live-session/${sessionId}`);
      } else {
        alert(result.message || 'Failed to join live session');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join session. Please try again.');
    } finally {
      setJoiningSession(null);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const started = new Date(timestamp);
    const diffMs = now.getTime() - started.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just started';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading live sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">🔴 Live Classes</h1>
              <p className="text-gray-300 text-lg">Join ongoing live sessions with your teachers</p>
            </div>
            <div className="mt-4 lg:mt-0 flex gap-3">
              <Link 
                href="/classes"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Browse Classes
              </Link>
              <Link 
                href="/student"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Live Sessions */}
        {liveSessions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {liveSessions.map((session) => (
              <div key={session.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                {/* Live Indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex items-center px-3 py-1 bg-red-500/20 rounded-full border border-red-500/50">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      <span className="text-red-300 text-sm font-medium">LIVE</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300">
                    Started: {formatTime(session.started_at)}
                  </div>
                </div>

                {/* Session Info */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-2">{session.title}</h3>
                  <p className="text-purple-300 text-sm font-medium mb-2">{session.class_name} • {session.subject}</p>
                  {session.description && (
                    <p className="text-gray-300 text-sm mb-3">{session.description}</p>
                  )}
                </div>

                {/* Teacher & Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-300">
                    <span>👨‍🏫 {session.teacher_name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span>👥 {session.participant_count}/{session.max_participants} participants</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span>⏱️ {getTimeSince(session.started_at)}</span>
                  </div>
                </div>

                {/* Join Button */}
                <button
                  onClick={() => handleJoinSession(session.id)}
                  disabled={joiningSession === session.id || session.participant_count >= session.max_participants}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                    session.participant_count >= session.max_participants
                      ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                      : joiningSession === session.id
                      ? 'bg-purple-500/50 text-purple-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-purple-600 text-white hover:from-red-700 hover:to-purple-700 hover:scale-105'
                  }`}
                >
                  {joiningSession === session.id 
                    ? 'Joining...' 
                    : session.participant_count >= session.max_participants 
                    ? 'Session Full' 
                    : '🔴 Join Live Session'
                  }
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No Live Sessions</h3>
            <p className="text-gray-400 mb-6">There are no active live sessions at the moment.</p>
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">Check back later or browse available classes:</p>
              <Link 
                href="/classes"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                📚 Browse All Classes
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}