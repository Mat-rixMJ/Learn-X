'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedFetch } from '@/utils/auth';

interface ClassData {
  id: string;
  name: string;
  subject: string;
  enrolled_students: number;
  max_students: number;
}

export default function StartLiveSessionPage() {
  const [user, setUser] = useState<any>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    class_id: '',
    title: '',
    description: '',
    max_participants: 50
  });

  useEffect(() => {
    // Check authentication and teacher role
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'teacher') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
      fetchTeacherClasses(parsedUser.id);
    } catch (error) {
      router.push('/login');
      return;
    }
  }, [router]);

  const fetchTeacherClasses = async (teacherId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await authenticatedFetch(`${apiUrl}/api/classes`);
      const data = await response.json();

      if (data.success) {
        // Filter classes by the current teacher
        const teacherClasses = data.data.classes.filter((cls: any) => 
          cls.teacher_name === user?.username || cls.teacher_id === teacherId
        );
        setClasses(teacherClasses);
      } else {
        console.error('Failed to fetch classes:', data.message);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_participants' ? parseInt(value) || 0 : value
    }));

    // Auto-populate title when class is selected
    if (name === 'class_id') {
      const selectedClass = classes.find(cls => cls.id === value);
      if (selectedClass) {
        setFormData(prev => ({
          ...prev,
          class_id: value,
          title: `Live: ${selectedClass.name}`,
          description: `Interactive live session for ${selectedClass.name}`
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !formData.class_id) return;

    setSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await authenticatedFetch(`${apiUrl}/api/live/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (result.success) {
        alert(`Live session started successfully! Session ID: ${result.data.session.id}`);
        router.push('/teacher-dashboard');
      } else {
        alert(result.message || 'Failed to start live session');
      }
    } catch (error) {
      console.error('Error starting live session:', error);
      alert('Failed to start live session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading your classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">🔴 Start Live Session</h1>
              <p className="text-gray-300 text-lg">Begin a live interactive session with your students</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link 
                href="/teacher-dashboard"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {classes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No Classes Found</h3>
              <p className="text-gray-400 mb-6">You need to create classes before starting live sessions.</p>
              <Link 
                href="/create-class"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                ✨ Create Your First Class
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Class Selection */}
              <div>
                <label htmlFor="class_id" className="block text-sm font-medium text-white mb-2">
                  Select Class *
                </label>
                <select
                  id="class_id"
                  name="class_id"
                  value={formData.class_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Choose a class for the live session</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.subject}) - {cls.enrolled_students} students
                    </option>
                  ))}
                </select>
              </div>

              {/* Session Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Live: Mathematics Review"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Describe what you'll cover in this live session..."
                />
              </div>

              {/* Max Participants */}
              <div>
                <label htmlFor="max_participants" className="block text-sm font-medium text-white mb-2">
                  Maximum Participants
                </label>
                <input
                  type="number"
                  id="max_participants"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  min="1"
                  max="200"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="submit"
                  disabled={submitting || !formData.class_id}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-medium hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {submitting ? 'Starting Session...' : '🔴 Start Live Session'}
                </button>
                
                <Link
                  href="/teacher-dashboard"
                  className="flex-1 py-3 px-6 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}