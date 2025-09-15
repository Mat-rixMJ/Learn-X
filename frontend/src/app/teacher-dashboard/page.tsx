'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VideoUpload from '@/components/lectures/VideoUpload';
import VideoPlayer from '@/components/lectures/VideoPlayer';

interface Class {
  id: string;
  name: string;
  subject: string;
  max_participants: number;
  is_active: boolean;
  sharable_link: string;
  created_at: string;
  enrolled_students: number;
  total_lectures: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  class_name: string;
  subject: string;
  enrolled_at: string;
}

interface TeacherStats {
  activeClasses: number;
  totalLectures: number;
  totalStudents: number;
  scheduledClasses: number;
  avgRating: number;
}

interface RecentActivity {
  title: string;
  created_at: string;
}

interface Lecture {
  id: string;
  title: string;
  description: string;
  class_name: string;
  subject: string;
  video_url: string;
  duration: string;
  enrolled_students: number;
  is_public: boolean;
  created_at: string;
  recorded_at?: string;
}

interface LiveSession {
  id: string;
  class_id: string;
  title: string;
  description: string;
  class_name: string;
  subject: string;
  max_participants: number;
  current_participants: number;
  status: string;
  started_at: string;
}

interface ScheduledClass {
  id: string;
  class_id: string;
  title: string;
  description: string;
  class_name: string;
  subject: string;
  scheduled_at: string;
  duration_minutes: number;
  max_participants: number;
  enrolled_students: number;
  status: string;
  send_reminders: boolean;
}

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [stats, setStats] = useState<TeacherStats>({
    activeClasses: 0,
    totalLectures: 0,
    totalStudents: 0,
    scheduledClasses: 0,
    avgRating: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showStartLiveForm, setShowStartLiveForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    class_id: '',
    title: '',
    description: '',
    video_url: '',
    audio_url: '',
    slides_url: '',
    is_public: false
  });
  const [liveForm, setLiveForm] = useState({
    class_id: '',
    title: '',
    description: '',
    max_participants: 50
  });
  const [scheduleForm, setScheduleForm] = useState({
    class_id: '',
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    max_participants: 50,
    send_reminders: true
  });
  const router = useRouter();

  useEffect(() => {
    checkTeacherAuth();
    fetchTeacherStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'lectures') {
      fetchMyLectures();
    } else if (activeTab === 'classes') {
      fetchMyClasses();
    } else if (activeTab === 'students') {
      fetchMyStudents();
    } else if (activeTab === 'live') {
      fetchLiveSessions();
    } else if (activeTab === 'scheduled') {
      fetchScheduledClasses();
    }
  }, [activeTab]);

  const checkTeacherAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success && data.data.role === 'teacher') {
        setLoading(false);
      } else {
        // Not a teacher, redirect to student dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const fetchMyLectures = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/lectures/my-lectures`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setLectures(data.data.lectures);
      }
    } catch (error) {
      console.error('Fetch lectures error:', error);
    }
  };

  const fetchTeacherStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/teacher/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
        setRecentActivity(data.data.recentActivity);
      }
    } catch (error) {
      console.error('Fetch teacher stats error:', error);
    }
  };

  const fetchMyClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/teacher/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setClasses(data.data.classes);
      }
    } catch (error) {
      console.error('Fetch classes error:', error);
    }
  };

  const fetchMyStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/teacher/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setStudents(data.data.students);
      }
    } catch (error) {
      console.error('Fetch students error:', error);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/live/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setLiveSessions(data.data.sessions);
      }
    } catch (error) {
      console.error('Fetch live sessions error:', error);
    }
  };

  const handleStartLiveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/live/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(liveForm),
      });

      const data = await response.json();
      if (data.success) {
        alert('Live session started successfully!');
        setShowStartLiveForm(false);
        setLiveForm({
          class_id: '',
          title: '',
          description: '',
          max_participants: 50
        });
        fetchLiveSessions();
        // Redirect to live session
        window.open(`/live-class?session=${data.data.session.id}`, '_blank');
      } else {
        alert(data.message || 'Failed to start live session');
      }
    } catch (error) {
      console.error('Start live session error:', error);
      alert('Failed to start live session');
    }
  };

  const handleEndLiveSession = async (sessionId: string, sessionTitle: string) => {
    if (!confirm(`Are you sure you want to end "${sessionTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/live/end/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        alert('Live session ended successfully!');
        fetchLiveSessions();
      } else {
        alert(data.message || 'Failed to end live session');
      }
    } catch (error) {
      console.error('End live session error:', error);
      alert('Failed to end live session');
    }
  };

  const fetchScheduledClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/teacher/scheduled-classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setScheduledClasses(data.data.scheduledClasses);
      }
    } catch (error) {
      console.error('Fetch scheduled classes error:', error);
    }
  };

  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!scheduleForm.class_id || !scheduleForm.title || !scheduleForm.scheduled_date || !scheduleForm.scheduled_time) {
        alert('Please fill in all required fields');
        return;
      }

      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Combine date and time into ISO string for the backend
      const scheduledDateTime = new Date(`${scheduleForm.scheduled_date}T${scheduleForm.scheduled_time}`);
      
      // Validate that the scheduled time is in the future
      if (scheduledDateTime <= new Date()) {
        alert('Scheduled time must be in the future');
        return;
      }
      
      // Prepare the payload for the backend API
      const payload = {
        class_id: scheduleForm.class_id,
        title: scheduleForm.title,
        description: scheduleForm.description,
        scheduled_at: scheduledDateTime.toISOString(),
        duration_minutes: scheduleForm.duration_minutes,
        max_participants: scheduleForm.max_participants,
        send_reminders: scheduleForm.send_reminders
      };
      
      const response = await fetch(`${baseUrl}/api/scheduled/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        alert('Class scheduled successfully!');
        setShowScheduleForm(false);
        setScheduleForm({
          class_id: '',
          title: '',
          description: '',
          scheduled_date: '',
          scheduled_time: '',
          duration_minutes: 60,
          max_participants: 50,
          send_reminders: true
        });
        fetchScheduledClasses();
        fetchTeacherStats(); // Update stats to reflect new scheduled class
      } else {
        alert(data.message || 'Failed to schedule class');
      }
    } catch (error) {
      console.error('Schedule class error:', error);
      alert('Failed to schedule class. Please check your connection and try again.');
    }
  };

  const handleStartScheduledClass = async (scheduledId: string, title: string) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/scheduled/start/${scheduledId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        alert(`Class "${title}" started successfully!`);
        fetchScheduledClasses();
        fetchLiveSessions();
        // Open live session in new tab
        window.open(data.data.liveSession.join_url, '_blank');
      } else {
        alert(data.message || 'Failed to start scheduled class');
      }
    } catch (error) {
      console.error('Start scheduled class error:', error);
      alert('Failed to start scheduled class');
    }
  };

  const handleCancelScheduledClass = async (scheduledId: string, title: string) => {
    if (!confirm(`Are you sure you want to cancel "${title}"? Students will be notified.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/scheduled/${scheduledId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        alert('Scheduled class cancelled successfully!');
        fetchScheduledClasses();
      } else {
        alert(data.message || 'Failed to cancel scheduled class');
      }
    } catch (error) {
      console.error('Cancel scheduled class error:', error);
      alert('Failed to cancel scheduled class');
    }
  };

  const handleDeleteLecture = async (lectureId: string, lectureTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${lectureTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/lectures/${lectureId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        alert('Lecture deleted successfully!');
        // Refresh data after successful deletion
        fetchMyLectures();
        fetchTeacherStats();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/lectures`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadForm),
      });

      const data = await response.json();
      if (data.success) {
        alert('Lecture uploaded successfully!');
        setShowUploadForm(false);
        setUploadForm({
          class_id: '',
          title: '',
          description: '',
          video_url: '',
          audio_url: '',
          slides_url: '',
          is_public: false
        });
        // Refresh data after successful upload
        fetchMyLectures();
        fetchTeacherStats();
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    }
  };

  const openUploadForm = async () => {
    // Load classes if not already loaded
    if (classes.length === 0) {
      await fetchMyClasses();
    }
    setShowUploadForm(true);
  };

  const openStartLiveForm = async () => {
    // Load classes if not already loaded
    if (classes.length === 0) {
      await fetchMyClasses();
    }
    setShowStartLiveForm(true);
  };

  const openScheduleForm = async () => {
    // Load classes if not already loaded
    if (classes.length === 0) {
      await fetchMyClasses();
    }
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];
    setScheduleForm({
      ...scheduleForm,
      scheduled_date: defaultDate
    });
    setShowScheduleForm(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-center">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-6 m-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            👨‍🏫 Teacher Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">Welcome, Teacher!</span>
            <button
              onClick={openScheduleForm}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full hover:from-yellow-600 hover:to-orange-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              📅 Schedule Class
            </button>
            <button
              onClick={openStartLiveForm}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              📺 Start Live Session
            </button>
            <button
              onClick={openUploadForm}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full hover:from-green-600 hover:to-teal-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              📤 Upload Lecture
            </button>
            <button 
              onClick={handleLogout}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 font-medium shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 mb-8 shadow-lg">
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'lectures', label: '🎥 My Lectures', icon: '🎥' },
              { id: 'live', label: '📺 Live Sessions', icon: '📺' },
              { id: 'scheduled', label: '📅 Scheduled Classes', icon: '📅' },
              { id: 'classes', label: '📚 My Classes', icon: '📚' },
              { id: 'students', label: '👥 Students', icon: '👥' },
              { id: 'analytics', label: '📈 Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">� Upload New Video Lecture</h2>
              <button
                onClick={() => setShowUploadForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <VideoUpload
              teacherClasses={classes.map(cls => ({
                id: cls.id,
                name: cls.name,
                subject: cls.subject
              }))}
              onUploadSuccess={(lecture) => {
                // Refresh lectures list and close modal
                fetchMyLectures();
                setShowUploadForm(false);
                // Show success message (you can add a toast notification here)
                alert(`✅ Video "${lecture.title}" uploaded successfully!`);
              }}
              onUploadError={(error) => {
                // Show error message (you can add a toast notification here)
                alert(`❌ Upload failed: ${error}`);
              }}
            />
            
            {classes.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  📝 No classes available. Please create a class first before uploading lectures.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start Live Session Form Modal */}
      {showStartLiveForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📺 Start Live Session</h2>
            <form onSubmit={handleStartLiveSession} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">📚 Select Class</label>
                <select
                  value={liveForm.class_id}
                  onChange={(e) => setLiveForm({...liveForm, class_id: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                  required
                >
                  <option value="">Select a class...</option>
                  {classes.filter(c => c.is_active).map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.subject} ({classItem.enrolled_students} students)
                    </option>
                  ))}
                </select>
                {classes.filter(c => c.is_active).length === 0 && (
                  <p className="text-gray-500 text-sm mt-2">
                    📝 No active classes available. Create and activate a class first.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2">📝 Session Title</label>
                <input
                  type="text"
                  value={liveForm.title}
                  onChange={(e) => setLiveForm({...liveForm, title: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                  placeholder="e.g., AI Fundamentals - Live Q&A Session"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2">📖 Session Description</label>
                <textarea
                  value={liveForm.description}
                  onChange={(e) => setLiveForm({...liveForm, description: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 h-24"
                  placeholder="Describe what you'll cover in this live session..."
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2">👥 Max Participants</label>
                <input
                  type="number"
                  value={liveForm.max_participants}
                  onChange={(e) => setLiveForm({...liveForm, max_participants: parseInt(e.target.value) || 50})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                  min="1"
                  max="500"
                  placeholder="50"
                />
                <p className="text-gray-500 text-sm mt-1">Maximum number of students who can join this session</p>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg"
                >
                  📺 Start Live Session
                </button>
                <button
                  type="button"
                  onClick={() => setShowStartLiveForm(false)}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 font-semibold shadow-lg"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Class Form Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📅 Schedule Class</h2>
            <form onSubmit={handleScheduleClass} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">📚 Select Class</label>
                <select
                  value={scheduleForm.class_id}
                  onChange={(e) => setScheduleForm({...scheduleForm, class_id: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                  required
                >
                  <option value="">Select a class...</option>
                  {classes.filter(c => c.is_active).map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.subject} ({classItem.enrolled_students} students)
                    </option>
                  ))}
                </select>
                {classes.filter(c => c.is_active).length === 0 && (
                  <p className="text-gray-500 text-sm mt-2">
                    📝 No active classes available. Create and activate a class first.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2">📝 Class Title</label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                  placeholder="e.g., AI Fundamentals - Weekly Lecture"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2">📖 Description</label>
                <textarea
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 h-24"
                  placeholder="Describe what you'll cover in this scheduled class..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">📅 Date</label>
                  <input
                    type="date"
                    value={scheduleForm.scheduled_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduled_date: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">⏰ Time</label>
                  <input
                    type="time"
                    value={scheduleForm.scheduled_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduled_time: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">⏱️ Duration (minutes)</label>
                  <input
                    type="number"
                    value={scheduleForm.duration_minutes}
                    onChange={(e) => setScheduleForm({...scheduleForm, duration_minutes: parseInt(e.target.value) || 60})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                    min="15"
                    max="480"
                    placeholder="60"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">👥 Max Participants</label>
                  <input
                    type="number"
                    value={scheduleForm.max_participants}
                    onChange={(e) => setScheduleForm({...scheduleForm, max_participants: parseInt(e.target.value) || 50})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
                    min="1"
                    max="500"
                    placeholder="50"
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={scheduleForm.send_reminders}
                    onChange={(e) => setScheduleForm({...scheduleForm, send_reminders: e.target.checked})}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <span className="text-gray-700 font-semibold">🔔 Send reminders to students (24h and 1h before)</span>
                </label>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full hover:from-yellow-600 hover:to-orange-600 font-semibold shadow-lg"
                >
                  📅 Schedule Class
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 font-semibold shadow-lg"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                <div className="text-center">
                  <div className="text-4xl mb-2">📚</div>
                  <div className="text-2xl font-bold text-indigo-600">{stats.activeClasses}</div>
                  <div className="text-gray-600">Active Classes</div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎥</div>
                  <div className="text-2xl font-bold text-green-600">{stats.totalLectures}</div>
                  <div className="text-gray-600">Total Lectures</div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                <div className="text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-purple-600">{stats.totalStudents}</div>
                  <div className="text-gray-600">Total Students</div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                <div className="text-center">
                  <div className="text-4xl mb-2">📅</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.scheduledClasses}</div>
                  <div className="text-gray-600">Scheduled Classes</div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                <div className="text-center">
                  <div className="text-4xl mb-2">⭐</div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.avgRating}</div>
                  <div className="text-gray-600">Avg Rating</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📈 Recent Activity</h3>
                <div className="space-y-2">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-xl">
                      <span className="text-gray-700">📝 Uploaded: {activity.title}</span>
                      <span className="text-gray-500 text-sm">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lectures Tab */}
        {activeTab === 'lectures' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">🎥 My Lectures ({lectures.length})</h2>
              <button
                onClick={openUploadForm}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full hover:from-green-600 hover:to-teal-600 font-semibold shadow-lg"
              >
                ➕ Add New Lecture
              </button>
            </div>
            
            {lectures.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
                <div className="text-6xl mb-4">🎥</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Lectures Yet</h3>
                <p className="text-gray-600 mb-6">Upload your first lecture to get started!</p>
                <button
                  onClick={openUploadForm}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg text-lg"
                >
                  📤 Upload First Lecture
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lectures.map((lecture) => (
                  <div key={lecture.id} className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{lecture.title}</h3>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>📚 <strong>Class:</strong> {lecture.class_name}</p>
                      <p>👥 <strong>Students:</strong> {lecture.enrolled_students}</p>
                      <p>⏱️ <strong>Duration:</strong> {lecture.duration}</p>
                      <p>📅 <strong>Created:</strong> {new Date(lecture.recorded_at || lecture.created_at).toLocaleDateString()}</p>
                      {lecture.is_public && <p>🌐 <strong>Public:</strong> Visible to all users</p>}
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{lecture.description}</p>
                    
                    {/* Video Preview */}
                    {lecture.video_url && (
                      <div className="mb-4">
                        {lecture.video_url.startsWith('/uploads/') ? (
                          // Local uploaded video - use custom player with streaming
                          <VideoPlayer
                            videoUrl={lecture.video_url}
                            title={lecture.title}
                            className="w-full h-40 rounded-lg border border-gray-200"
                            controls={true}
                            autoPlay={false}
                          />
                        ) : (
                          // External video URL
                          <div className="w-full h-40 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl mb-2">🎥</div>
                              <p className="text-sm text-gray-600">External Video</p>
                              <a 
                                href={lecture.video_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                              >
                                View Video
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {lecture.video_url && (
                        <button 
                          onClick={() => {
                            // Open in dedicated watch page for better viewing experience
                            window.open(`/watch/${lecture.id}`, '_blank');
                          }}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-sm hover:from-green-600 hover:to-teal-600"
                        >
                          ▶️ Play
                        </button>
                      )}
                      <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm">
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteLecture(lecture.id, lecture.title)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-sm hover:from-red-600 hover:to-pink-600"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other tabs placeholder */}
        {activeTab === 'classes' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📚 My Classes ({classes.length})</h2>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:from-blue-600 hover:to-cyan-600 font-semibold shadow-lg">
                ➕ Create New Class
              </button>
            </div>
            
            {classes.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Classes Yet</h3>
                <p className="text-gray-600 mb-6">Create your first class to start teaching!</p>
                <button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg text-lg">
                  📚 Create First Class
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((classItem) => (
                  <div key={classItem.id} className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{classItem.name}</h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        classItem.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {classItem.is_active ? '🟢 Active' : '🔴 Inactive'}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>📖 <strong>Subject:</strong> {classItem.subject}</p>
                      <p>👥 <strong>Students:</strong> {classItem.enrolled_students}/{classItem.max_participants}</p>
                      <p>🎥 <strong>Lectures:</strong> {classItem.total_lectures}</p>
                      <p>📅 <strong>Created:</strong> {new Date(classItem.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500 truncate">
                        🔗 {classItem.sharable_link}
                      </div>
                      <div className="flex space-x-2">
                        <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm hover:from-blue-600 hover:to-cyan-600">
                          ✏️ Edit
                        </button>
                        <button className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-sm hover:from-green-600 hover:to-teal-600">
                          👀 View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">👥 My Students ({students.length})</h2>
            </div>
            
            {students.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Students Yet</h3>
                <p className="text-gray-600">Students will appear here once they join your classes.</p>
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold">👤 Student</th>
                        <th className="px-6 py-4 text-left font-semibold">📧 Email</th>
                        <th className="px-6 py-4 text-left font-semibold">📚 Class</th>
                        <th className="px-6 py-4 text-left font-semibold">📖 Subject</th>
                        <th className="px-6 py-4 text-left font-semibold">📅 Enrolled</th>
                        <th className="px-6 py-4 text-left font-semibold">⚡ Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map((student, index) => (
                        <tr key={student.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {student.name.charAt(0)}
                              </div>
                              <div className="ml-3">
                                <div className="font-semibold text-gray-800">{student.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{student.email}</td>
                          <td className="px-6 py-4 text-gray-800 font-medium">{student.class_name}</td>
                          <td className="px-6 py-4 text-gray-600">{student.subject}</td>
                          <td className="px-6 py-4 text-gray-600">
                            {new Date(student.enrolled_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200">
                                👀 View
                              </button>
                              <button className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200">
                                📧 Contact
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Sessions Tab */}
        {activeTab === 'live' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📺 Live Sessions ({liveSessions.length})</h2>
              <button
                onClick={openStartLiveForm}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg"
              >
                📺 Start New Session
              </button>
            </div>
            
            {liveSessions.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
                <div className="text-6xl mb-4">📺</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Active Live Sessions</h3>
                <p className="text-gray-600 mb-6">Start your first live session to engage with your students in real-time!</p>
                <button
                  onClick={openStartLiveForm}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg text-lg"
                >
                  📺 Start First Live Session
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveSessions.map((session) => (
                  <div key={session.id} className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 relative">
                    {/* Live indicator */}
                    <div className="absolute -top-2 -right-2">
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
                        LIVE
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{session.title}</h3>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>📚 <strong>Class:</strong> {session.class_name}</p>
                      <p>📖 <strong>Subject:</strong> {session.subject}</p>
                      <p>👥 <strong>Participants:</strong> {session.current_participants}/{session.max_participants}</p>
                      <p>⏰ <strong>Started:</strong> {new Date(session.started_at).toLocaleString()}</p>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{session.description || 'No description provided'}</p>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => window.open(`/live-class?session=${session.id}`, '_blank')}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm hover:from-blue-600 hover:to-cyan-600 font-semibold"
                      >
                        🎥 Join Session
                      </button>
                      <button 
                        onClick={() => handleEndLiveSession(session.id, session.title)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-sm hover:from-red-600 hover:to-pink-600 font-semibold"
                      >
                        🛑 End Session
                      </button>
                    </div>
                    
                    {/* Participant progress bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(session.current_participants / session.max_participants) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {Math.round((session.current_participants / session.max_participants) * 100)}% capacity
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Classes Tab */}
        {activeTab === 'scheduled' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📅 Scheduled Classes ({scheduledClasses.length})</h2>
              <button
                onClick={openScheduleForm}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full hover:from-yellow-600 hover:to-orange-600 font-semibold shadow-lg"
              >
                📅 Schedule New Class
              </button>
            </div>
            
            {scheduledClasses.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Scheduled Classes</h3>
                <p className="text-gray-600 mb-6">Schedule your first class to help students plan ahead and never miss a session!</p>
                <button
                  onClick={openScheduleForm}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full hover:from-yellow-600 hover:to-orange-600 font-semibold shadow-lg text-lg"
                >
                  📅 Schedule First Class
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scheduledClasses.map((scheduledClass) => {
                  const scheduledDate = new Date(scheduledClass.scheduled_at);
                  const now = new Date();
                  const isUpcoming = scheduledDate > now;
                  const isPast = scheduledDate < now;
                  const canStart = Math.abs(scheduledDate.getTime() - now.getTime()) < 15 * 60 * 1000; // 15 minutes window
                  
                  return (
                    <div key={scheduledClass.id} className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 relative">
                      {/* Status indicator */}
                      <div className="absolute -top-2 -right-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center ${
                          scheduledClass.status === 'scheduled' 
                            ? isUpcoming 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-orange-100 text-orange-800'
                            : scheduledClass.status === 'started'
                            ? 'bg-green-100 text-green-800'
                            : scheduledClass.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {scheduledClass.status === 'scheduled' && isUpcoming && '📅 Scheduled'}
                          {scheduledClass.status === 'scheduled' && canStart && '🚀 Ready to Start'}
                          {scheduledClass.status === 'started' && '✅ Started'}
                          {scheduledClass.status === 'cancelled' && '❌ Cancelled'}
                          {scheduledClass.status === 'completed' && '✅ Completed'}
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-800 mb-2 pr-16">{scheduledClass.title}</h3>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <p>📚 <strong>Class:</strong> {scheduledClass.class_name}</p>
                        <p>📖 <strong>Subject:</strong> {scheduledClass.subject}</p>
                        <p>👥 <strong>Students:</strong> {scheduledClass.enrolled_students}</p>
                        <p>⏰ <strong>Scheduled:</strong> {scheduledDate.toLocaleString()}</p>
                        <p>⏱️ <strong>Duration:</strong> {scheduledClass.duration_minutes} minutes</p>
                        <p>📍 <strong>Max Participants:</strong> {scheduledClass.max_participants}</p>
                        {scheduledClass.send_reminders && (
                          <p>🔔 <strong>Reminders:</strong> Enabled</p>
                        )}
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4">{scheduledClass.description || 'No description provided'}</p>
                      
                      <div className="flex space-x-2">
                        {scheduledClass.status === 'scheduled' && (
                          <>
                            {canStart ? (
                              <button 
                                onClick={() => handleStartScheduledClass(scheduledClass.id, scheduledClass.title)}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-sm hover:from-green-600 hover:to-teal-600 font-semibold"
                              >
                                🚀 Start Now
                              </button>
                            ) : (
                              <button 
                                disabled
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-600 rounded-full text-sm cursor-not-allowed font-semibold"
                              >
                                ⏳ {isUpcoming ? 'Scheduled' : 'Past Due'}
                              </button>
                            )}
                            <button 
                              onClick={() => handleCancelScheduledClass(scheduledClass.id, scheduledClass.title)}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-sm hover:from-red-600 hover:to-pink-600 font-semibold"
                            >
                              ❌ Cancel
                            </button>
                          </>
                        )}
                        
                        {scheduledClass.status === 'started' && (
                          <button 
                            disabled
                            className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold"
                          >
                            ✅ Class Started
                          </button>
                        )}
                        
                        {(scheduledClass.status === 'cancelled' || scheduledClass.status === 'completed') && (
                          <button 
                            disabled
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold"
                          >
                            📋 {scheduledClass.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                          </button>
                        )}
                      </div>

                      {/* Time until class */}
                      {scheduledClass.status === 'scheduled' && isUpcoming && (
                        <div className="mt-4 p-3 bg-yellow-50 rounded-xl">
                          <p className="text-sm text-yellow-800 text-center">
                            ⏰ Starts in {Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60))} hours
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Analytics & Reports</h3>
            <p className="text-gray-600">View detailed analytics of your teaching performance.</p>
          </div>
        )}
      </main>
    </div>
  );
}
