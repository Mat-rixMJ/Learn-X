'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
    avgRating: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      const response = await fetch(`${baseUrl}/api/scheduled/my-scheduled`, {
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
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/scheduled/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleForm),
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
      } else {
        alert(data.message || 'Failed to schedule class');
      }
    } catch (error) {
      console.error('Schedule class error:', error);
      alert('Failed to schedule class');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-4">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
                Teacher Dashboard
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Welcome back! Manage your classes and lectures</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3">
              <button
                onClick={openScheduleForm}
                className="px-3 sm:px-4 py-3 sm:py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center sm:justify-start space-x-2 text-sm sm:text-base min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Schedule Class</span>
                <span className="sm:hidden">Schedule</span>
              </button>
              <button
                onClick={openStartLiveForm}
                className="px-3 sm:px-4 py-3 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center justify-center sm:justify-start space-x-2 text-sm sm:text-base min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Start Live Session</span>
                <span className="sm:hidden">Go Live</span>
              </button>
              <button
                onClick={openUploadForm}
                className="px-3 sm:px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center sm:justify-start space-x-2 text-sm sm:text-base min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="hidden sm:inline">Upload Lecture</span>
                <span className="sm:hidden">Upload</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-3 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center sm:justify-start space-x-2 text-sm sm:text-base min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 mb-6 sm:mb-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide pb-1">
            {[
              { id: 'overview', label: 'Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { id: 'lectures', label: 'My Lectures', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
              { id: 'live', label: 'Live Sessions', icon: 'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z' },
              { id: 'scheduled', label: 'Scheduled', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: 'classes', label: 'My Classes', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { id: 'students', label: 'Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
              { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 min-w-max py-2 sm:py-2.5 px-3 sm:px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-w-[95vw] sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">📤 Upload New Lecture</h2>
            <form onSubmit={handleUploadSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📚 Select Class</label>
                <select
                  value={uploadForm.class_id}
                  onChange={(e) => setUploadForm({...uploadForm, class_id: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                  required
                >
                  <option value="">Select a class...</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.subject}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-gray-500 text-xs sm:text-sm mt-2">
                    📝 No classes available. Create a class first to upload lectures.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📝 Lecture Title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="e.g., Introduction to Machine Learning"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📖 Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 h-20 sm:h-24 text-sm sm:text-base"
                  placeholder="Describe what this lecture covers..."
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">🎥 Video URL</label>
                <input
                  type="url"
                  value={uploadForm.video_url}
                  onChange={(e) => setUploadForm({...uploadForm, video_url: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="https://example.com/video.mp4 or YouTube URL"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">🎵 Audio URL (Optional)</label>
                  <input
                    type="url"
                    value={uploadForm.audio_url}
                    onChange={(e) => setUploadForm({...uploadForm, audio_url: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                    placeholder="Audio file URL"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📊 Slides URL (Optional)</label>
                  <input
                    type="url"
                    value={uploadForm.slides_url}
                    onChange={(e) => setUploadForm({...uploadForm, slides_url: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                    placeholder="Slides PDF URL"
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={uploadForm.is_public}
                    onChange={(e) => setUploadForm({...uploadForm, is_public: e.target.checked})}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                  />
                  <span className="text-gray-700 font-semibold text-sm sm:text-base">🌐 Make this lecture public (visible to all users)</span>
                </label>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-full hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg text-sm sm:text-base"
                >
                  📤 Upload Lecture
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-500 text-white rounded-lg sm:rounded-full hover:bg-gray-600 font-semibold shadow-lg text-sm sm:text-base"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Start Live Session Form Modal */}
      {showStartLiveForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-w-[95vw] sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">📺 Start Live Session</h2>
            <form onSubmit={handleStartLiveSession} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📚 Select Class</label>
                <select
                  value={liveForm.class_id}
                  onChange={(e) => setLiveForm({...liveForm, class_id: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
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
                  <p className="text-gray-500 text-xs sm:text-sm mt-2">
                    📝 No active classes available. Create and activate a class first.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📝 Session Title</label>
                <input
                  type="text"
                  value={liveForm.title}
                  onChange={(e) => setLiveForm({...liveForm, title: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="e.g., AI Fundamentals - Live Q&A Session"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📖 Session Description</label>
                <textarea
                  value={liveForm.description}
                  onChange={(e) => setLiveForm({...liveForm, description: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 h-20 sm:h-24 text-sm sm:text-base"
                  placeholder="Describe what you'll cover in this live session..."
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">👥 Max Participants</label>
                <input
                  type="number"
                  value={liveForm.max_participants}
                  onChange={(e) => setLiveForm({...liveForm, max_participants: parseInt(e.target.value) || 50})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                  min="1"
                  max="500"
                  placeholder="50"
                />
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Maximum number of students who can join this session</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg sm:rounded-full hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg text-sm sm:text-base"
                >
                  📺 Start Live Session
                </button>
                <button
                  type="button"
                  onClick={() => setShowStartLiveForm(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-500 text-white rounded-lg sm:rounded-full hover:bg-gray-600 font-semibold shadow-lg text-sm sm:text-base"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-w-[95vw] sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">📅 Schedule Class</h2>
            <form onSubmit={handleScheduleClass} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📚 Select Class</label>
                <select
                  value={scheduleForm.class_id}
                  onChange={(e) => setScheduleForm({...scheduleForm, class_id: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
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
                  <p className="text-gray-500 text-xs sm:text-sm mt-2">
                    📝 No active classes available. Create and activate a class first.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📝 Class Title</label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="e.g., AI Fundamentals - Weekly Lecture"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📖 Description</label>
                <textarea
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 h-20 sm:h-24 text-sm sm:text-base"
                  placeholder="Describe what you'll cover in this scheduled class..."
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">📅 Date</label>
                  <input
                    type="date"
                    value={scheduleForm.scheduled_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduled_date: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">⏰ Time</label>
                  <input
                    type="time"
                    value={scheduleForm.scheduled_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduled_time: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">⏱️ Duration (minutes)</label>
                  <input
                    type="number"
                    value={scheduleForm.duration_minutes}
                    onChange={(e) => setScheduleForm({...scheduleForm, duration_minutes: parseInt(e.target.value) || 60})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
                    min="15"
                    max="480"
                    placeholder="60"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">👥 Max Participants</label>
                  <input
                    type="number"
                    value={scheduleForm.max_participants}
                    onChange={(e) => setScheduleForm({...scheduleForm, max_participants: parseInt(e.target.value) || 50})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-sm sm:text-base"
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
                    className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                  />
                  <span className="text-gray-700 font-semibold text-sm sm:text-base">🔔 Send reminders to students (24h and 1h before)</span>
                </label>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg sm:rounded-full hover:from-yellow-600 hover:to-orange-600 font-semibold shadow-lg text-sm sm:text-base"
                >
                  📅 Schedule Class
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-500 text-white rounded-lg sm:rounded-full hover:bg-gray-600 font-semibold shadow-lg text-sm sm:text-base"
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Classes</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.activeClasses}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Lectures</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalLectures}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.avgRating}</p>
                  </div>
                  <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Uploaded: {activity.title}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lectures Tab */}
        {activeTab === 'lectures' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">My Lectures ({lectures.length})</h2>
              <button
                onClick={openUploadForm}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Lecture
              </button>
            </div>
            
            {lectures.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lectures Yet</h3>
                <p className="text-gray-600 mb-6">Upload your first lecture to get started!</p>
                <button
                  onClick={openUploadForm}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload First Lecture
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lectures.map((lecture) => (
                  <div key={lecture.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{lecture.title}</h3>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>Class: {lecture.class_name}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span>Students: {lecture.enrolled_students}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Duration: {lecture.duration}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Created: {new Date(lecture.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{lecture.description}</p>
                      <div className="flex space-x-2">
                        <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors duration-200">
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteLecture(lecture.id, lecture.title)}
                          className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">My Classes ({classes.length})</h2>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Class
              </button>
            </div>
            
            {classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Yet</h3>
                <p className="text-gray-600 mb-6">Create your first class to start teaching!</p>
                <button className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Class
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((classItem) => (
                  <div key={classItem.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          classItem.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {classItem.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span>Subject: {classItem.subject}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span>Students: {classItem.enrolled_students}/{classItem.max_participants}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Lectures: {classItem.total_lectures}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Created: {new Date(classItem.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded truncate">
                          Link: {classItem.sharable_link}
                        </div>
                        <div className="flex space-x-2">
                          <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors duration-200">
                            Edit
                          </button>
                          <button className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors duration-200">
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
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
                {/* Mobile Card View */}
                <div className="block md:hidden">
                  <div className="divide-y divide-gray-200">
                    {students.map((student, index) => (
                      <div key={student.id} className={`p-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {student.name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <div className="font-semibold text-gray-800">{student.name}</div>
                              <div className="text-sm text-gray-600">{student.email}</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">📚 Class:</span>
                            <span className="font-medium">{student.class_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">📖 Subject:</span>
                            <span>{student.subject}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">📅 Enrolled:</span>
                            <span>{new Date(student.enrolled_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          <button className="flex-1 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm hover:bg-blue-200 font-medium">
                            👀 View
                          </button>
                          <button className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm hover:bg-green-200 font-medium">
                            📧 Contact
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
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
