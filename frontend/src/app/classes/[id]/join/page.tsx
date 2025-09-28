'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';

export default function JoinClass() {
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      
      const classResponse = await apiService.getClasses();
      if (classResponse.success && classResponse.data) {
        const currentClass = classResponse.data.find((c: any) => c.id === classId);
        if (currentClass) {
          setClassData(currentClass);
        }
      }
      
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    setJoining(true);
    
    // Simulate joining class (in real app, this would call an API)
    setTimeout(() => {
      setJoined(true);
      setJoining(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading class information...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Class Not Found</h2>
          <p className="text-gray-600 mb-6">The class you're trying to join doesn't exist.</p>
          <Link
            href="/student"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/student"
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                🚀 Join Class
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!joined ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            {/* Class Information */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-6">🎓</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{classData.title}</h2>
              <p className="text-xl text-gray-600 mb-2">👨‍🏫 {classData.instructor_name}</p>
              <p className="text-gray-700 max-w-2xl mx-auto">
                {classData.description || 'Join this class to access lectures, quizzes, and learning materials.'}
              </p>
            </div>

            {/* Class Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl mb-2">🎥</div>
                <h3 className="font-semibold text-blue-900">Live Sessions</h3>
                <p className="text-sm text-blue-700">Interactive live classes</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl mb-2">📹</div>
                <h3 className="font-semibold text-green-900">Recordings</h3>
                <p className="text-sm text-green-700">Access recorded lectures</p>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl mb-2">📝</div>
                <h3 className="font-semibold text-yellow-900">Quizzes</h3>
                <p className="text-sm text-yellow-700">Daily & weekly assessments</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="font-semibold text-purple-900">AI Notes</h3>
                <p className="text-sm text-purple-700">Smart study materials</p>
              </div>
            </div>

            {/* Class Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Class Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Class Code:</span>
                  <span className="ml-2 text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded">
                    {classData.class_code || classData.id?.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Max Students:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {classData.max_students || 'Unlimited'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Duration:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {classData.duration_minutes ? `${classData.duration_minutes} minutes` : 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Schedule:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {classData.scheduled_at 
                      ? new Date(classData.scheduled_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          hour: 'numeric',
                          minute: '2-digit'
                        })
                      : 'Flexible timing'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* What You'll Get */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">✨ What You'll Get</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Access to all live sessions
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Recorded lecture library
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Interactive quizzes and assessments
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    AI-generated study notes
                  </li>
                </ul>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Progress tracking and analytics
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Direct interaction with instructor
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Course completion certificate
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Peer learning community
                  </li>
                </ul>
              </div>
            </div>

            {/* Join Button */}
            <div className="text-center">
              <button
                onClick={handleJoinClass}
                disabled={joining}
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {joining ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Joining Class...
                  </>
                ) : (
                  <>
                    🚀 Join This Class
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Free to join • Instant access • Cancel anytime
              </p>
            </div>
          </div>
        ) : (
          /* Success State */
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to {classData.title}!
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              You've successfully joined the class. You now have access to all course materials and can participate in live sessions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">📚</div>
                <h3 className="font-semibold text-blue-900">Start Learning</h3>
                <p className="text-sm text-blue-700">Access course materials</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">📝</div>
                <h3 className="font-semibold text-green-900">Take Quizzes</h3>
                <p className="text-sm text-green-700">Test your knowledge</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🔴</div>
                <h3 className="font-semibold text-yellow-900">Join Live</h3>
                <p className="text-sm text-yellow-700">Attend live sessions</p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Link
                href={`/classes/${classId}/syllabus`}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                View Syllabus
              </Link>
              <Link
                href="/student"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}