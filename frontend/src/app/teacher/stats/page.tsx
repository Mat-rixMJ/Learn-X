'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';

export default function TeacherStats() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadTeacherStats = async () => {
      try {
        // Check authentication and role
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!token || !userData) {
          router.push('/login');
          return;
        }

        const parsedUser = JSON.parse(userData);
        
        if (parsedUser.role !== 'teacher') {
          router.push('/login');
          return;
        }
        
        setUser(parsedUser);
        
        // Load data
        await Promise.all([
          loadStats(),
          loadClasses(),
          loadLectures()
        ]);
        
      } catch (error) {
        console.error('Error loading teacher stats:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadTeacherStats();
  }, [router]);

  const loadStats = async () => {
    try {
      const response = await apiService.getDashboard();
      if (response.success && response.data) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await apiService.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadLectures = async () => {
    try {
      const response = await apiService.getLectures();
      if (response.success && response.data) {
        setLectures(response.data);
      }
    } catch (error) {
      console.error('Error loading lectures:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teacher statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/teacher/dashboard"
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                📊 Teaching Analytics
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <p className="text-lg font-semibold text-gray-900">{user?.username}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-blue-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">📚</div>
                  </div>
                  <div className="ml-5">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500">Total Classes</dt>
                      <dd className="text-3xl font-bold text-gray-900">{stats?.totalClasses || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-green-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">🎥</div>
                  </div>
                  <div className="ml-5">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500">Total Lectures</dt>
                      <dd className="text-3xl font-bold text-gray-900">{stats?.totalLectures || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-purple-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">📝</div>
                  </div>
                  <div className="ml-5">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500">AI Notes Generated</dt>
                      <dd className="text-3xl font-bold text-gray-900">{stats?.totalNotes || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-yellow-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">🎯</div>
                  </div>
                  <div className="ml-5">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500">Average Score</dt>
                      <dd className="text-3xl font-bold text-gray-900">{stats?.avgScore || 0}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Classes Breakdown */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Classes Overview</h3>
              </div>
              <div className="p-6">
                {classes.length > 0 ? (
                  <div className="space-y-4">
                    {classes.map((classItem: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{classItem.title}</h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Class
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {classItem.description || 'No description available'}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>📅 Created: {classItem.created_at ? new Date(classItem.created_at).toLocaleDateString() : 'N/A'}</span>
                          <span>👥 Max Students: {classItem.max_students || 'Unlimited'}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="text-center mt-6">
                      <Link
                        href="/classes"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        View All Classes
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-gray-500 mb-4">No classes created yet</p>
                    <Link
                      href="/create-class"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Create Your First Class
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Lectures Breakdown */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Lectures</h3>
              </div>
              <div className="p-6">
                {lectures.length > 0 ? (
                  <div className="space-y-4">
                    {lectures.slice(0, 5).map((lecture: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{lecture.title}</h4>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Lecture
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {lecture.description || 'No description available'}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>📅 {lecture.recorded_at ? new Date(lecture.recorded_at).toLocaleDateString() : 'N/A'}</span>
                          <span>⏱️ {lecture.duration_seconds ? `${Math.round(lecture.duration_seconds / 60)} min` : 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="text-center mt-6">
                      <Link
                        href="/lectures"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        View All Lectures
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎥</div>
                    <p className="text-gray-500 mb-4">No lectures uploaded yet</p>
                    <Link
                      href="/classes"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Upload First Lecture
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Performance Insights */}
          <div className="mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-2xl font-bold text-gray-900">{stats?.avgScore || 0}%</div>
                  <div className="text-sm text-gray-500">Average Student Score</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl mb-2">📈</div>
                  <div className="text-2xl font-bold text-gray-900">{classes.length}</div>
                  <div className="text-sm text-gray-500">Active Classes</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-2xl font-bold text-gray-900">{stats?.totalNotes || 0}</div>
                  <div className="text-sm text-gray-500">AI Notes Generated</div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Teaching Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload more video lectures to improve student engagement</li>
                  <li>• Use AI-generated notes to help students understand key concepts</li>
                  <li>• Monitor student progress through the dashboard</li>
                  <li>• Start live sessions for real-time interaction</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}