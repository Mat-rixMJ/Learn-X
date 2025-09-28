'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiService, type Class } from '@/utils/api';

interface ExtendedClass extends Class {
  name?: string; // For backward compatibility
  subject?: string; // For backward compatibility
  teacher_name?: string;
  teacher_full_name?: string;
  enrolled_students?: number;
  total_lectures?: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ExtendedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrollingClass, setEnrollingClass] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const result = await apiService.getClasses();

      if (result.success && result.data) {
        // Ensure data is an array
        const classData = Array.isArray(result.data) ? result.data : [];
        setClasses(classData as ExtendedClass[]);
      } else {
        setError(result.message || 'Failed to load classes');
        setClasses([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Network error. Please try again.');
      setClasses([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (classId: string) => {
    if (enrollingClass) return;

    setEnrollingClass(classId);
    try {
      const result = await apiService.joinClass(classId);
      
      if (result.success) {
        alert('Successfully enrolled in class!');
        fetchClasses();
      } else {
        alert(result.message || 'Failed to enroll in class');
      }
    } catch (error) {
      console.error('Error enrolling in class:', error);
      alert('Failed to enroll. Please try again.');
    } finally {
      setEnrollingClass(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading available classes...</p>
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
              <h1 className="text-3xl font-bold text-white mb-2">Discover Classes 📚</h1>
              <p className="text-gray-300 text-lg">Find and join classes that interest you</p>
            </div>
            <div className="mt-4 lg:mt-0">
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

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(classes) && classes.map((classItem) => (
            <div key={classItem.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              {/* Class Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{classItem.name}</h3>
                  <p className="text-purple-300 text-sm font-medium">{classItem.subject}</p>
                </div>
                <div className="ml-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                    {classItem.enrolled_students}/{classItem.max_students} enrolled
                  </span>
                </div>
              </div>

              {/* Class Description */}
              <p className="text-gray-300 text-sm mb-4">{classItem.description}</p>

              {/* Class Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-300">
                  <span>👨‍🏫 {classItem.teacher_full_name || classItem.teacher_name}</span>
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <span>⏱️ Duration: {classItem.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <span>📚 {classItem.total_lectures} recorded lectures</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleEnroll(classItem.id)}
                  disabled={enrollingClass === classItem.id || Boolean(classItem.enrolled_students && classItem.max_students && classItem.enrolled_students >= classItem.max_students)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                    (classItem.enrolled_students && classItem.max_students && classItem.enrolled_students >= classItem.max_students)
                      ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                      : enrollingClass === classItem.id
                      ? 'bg-purple-500/50 text-purple-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {enrollingClass === classItem.id ? 'Enrolling...' : 
                   (classItem.enrolled_students && classItem.max_students && classItem.enrolled_students >= classItem.max_students) ? 'Class Full' : 'Enroll Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {Array.isArray(classes) && classes.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-white mb-2">No classes found</h3>
            <p className="text-gray-400">Check back later for new classes.</p>
          </div>
        )}
      </div>
    </div>
  );
}