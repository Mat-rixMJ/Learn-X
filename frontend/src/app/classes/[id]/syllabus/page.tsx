'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';

interface SyllabusItem {
  id: string;
  week: number;
  topic: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  materials: string[];
  assignments: string[];
}

export default function ClassSyllabus() {
  const [classData, setClassData] = useState<any>(null);
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      
      // Load class details
      const classResponse = await apiService.getClasses();
      if (classResponse.success && classResponse.data) {
        const currentClass = classResponse.data.find((c: any) => c.id === classId);
        if (currentClass) {
          setClassData(currentClass);
        }
      }
      
      // Generate sample syllabus data (in real app, this would come from API)
      const sampleSyllabus: SyllabusItem[] = [
        {
          id: '1',
          week: 1,
          topic: 'Introduction and Fundamentals',
          description: 'Overview of the course, basic concepts and terminology',
          status: 'completed',
          materials: ['Lecture Video', 'PDF Notes', 'Additional Reading'],
          assignments: ['Quiz 1', 'Reading Assignment']
        },
        {
          id: '2',
          week: 2,
          topic: 'Core Concepts and Principles',
          description: 'Deep dive into the main principles and methodologies',
          status: 'completed',
          materials: ['Lecture Video', 'Interactive Demo', 'Practice Problems'],
          assignments: ['Quiz 2', 'Project Proposal']
        },
        {
          id: '3',
          week: 3,
          topic: 'Practical Applications',
          description: 'Real-world examples and hands-on practice',
          status: 'current',
          materials: ['Lecture Video', 'Lab Materials', 'Case Studies'],
          assignments: ['Weekly Quiz', 'Lab Report']
        },
        {
          id: '4',
          week: 4,
          topic: 'Advanced Topics',
          description: 'Complex scenarios and advanced techniques',
          status: 'upcoming',
          materials: ['Lecture Video', 'Research Papers'],
          assignments: ['Research Assignment', 'Group Project']
        },
        {
          id: '5',
          week: 5,
          topic: 'Integration and Synthesis',
          description: 'Bringing concepts together and practical implementation',
          status: 'upcoming',
          materials: ['Lecture Video', 'Integration Guide'],
          assignments: ['Final Project', 'Peer Review']
        },
        {
          id: '6',
          week: 6,
          topic: 'Assessment and Review',
          description: 'Final assessments and course review',
          status: 'upcoming',
          materials: ['Review Materials', 'Practice Tests'],
          assignments: ['Final Exam', 'Course Reflection']
        }
      ];
      
      setSyllabus(sampleSyllabus);
      
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'current':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upcoming':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'current':
        return '📍';
      case 'upcoming':
        return '⏳';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading syllabus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/student"
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                📋 Course Syllabus
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Class Information */}
        {classData && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {classData.title}
                </h2>
                <p className="text-gray-600 mb-4">
                  👨‍🏫 Instructor: {classData.instructor_name}
                </p>
                <p className="text-gray-700">
                  {classData.description || 'Comprehensive course covering essential topics and practical applications.'}
                </p>
              </div>
              <div className="text-right">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Course Progress</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {Math.round((syllabus.filter(s => s.status === 'completed').length / syllabus.length) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Syllabus Timeline */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Course Timeline</h3>
            <p className="text-sm text-gray-600 mt-1">
              {syllabus.length} weeks • {syllabus.filter(s => s.status === 'completed').length} completed • {syllabus.filter(s => s.status === 'current').length} current
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {syllabus.map((item, index) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${getStatusColor(item.status)}`}>
                      <span className="text-lg">{getStatusIcon(item.status)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Week {item.week}: {item.topic}
                      </h4>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{item.description}</p>

                    {/* Materials and Assignments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Materials */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">📚 Materials</h5>
                        <ul className="space-y-1">
                          {item.materials.map((material, idx) => (
                            <li key={idx} className="flex items-center text-sm text-gray-600">
                              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                              {material}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Assignments */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">📝 Assignments</h5>
                        <ul className="space-y-1">
                          {item.assignments.map((assignment, idx) => (
                            <li key={idx} className="flex items-center text-sm text-gray-600">
                              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2"></span>
                              {assignment}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {item.status === 'current' && (
                      <div className="mt-4 flex space-x-2">
                        <Link
                          href={`/classes/${classId}/quiz`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Take Quiz
                        </Link>
                        <Link
                          href={`/recorded-lectures?class=${classId}&week=${item.week}`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Watch Lecture
                        </Link>
                      </div>
                    )}
                    
                    {item.status === 'completed' && (
                      <div className="mt-4">
                        <Link
                          href={`/recorded-lectures?class=${classId}&week=${item.week}`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Review Materials
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {syllabus.filter(s => s.status === 'completed').length} weeks
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">📍</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current</p>
                <p className="text-2xl font-bold text-gray-900">
                  Week {syllabus.find(s => s.status === 'current')?.week || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 rounded-full">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-gray-900">
                  {syllabus.filter(s => s.status === 'upcoming').length} weeks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}