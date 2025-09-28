'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TeacherScheduleDashboard from '../../components/TeacherScheduleDashboard';
import NotificationsPanel from '../../components/NotificationsPanel';

interface User {
  id: string;
  role: string;
  full_name: string;
}

const TeacherDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
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
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
        return;
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Welcome, {user.full_name}
              </h1>
              <p className="text-sm text-gray-600">Teacher Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationsPanel userId={user.id} />
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  router.push('/login');
                }}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Dashboard */}
      <TeacherScheduleDashboard />
    </div>
  );
};

export default TeacherDashboard;