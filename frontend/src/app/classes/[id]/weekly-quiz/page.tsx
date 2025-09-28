'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';

interface WeeklyQuizData {
  id: string;
  week: number;
  title: string;
  description: string;
  questions: number;
  timeLimit: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  attempts: number;
  maxAttempts: number;
  bestScore: number;
  averageScore: number;
  deadline: string;
  status: 'available' | 'completed' | 'locked' | 'overdue';
}

export default function WeeklyQuiz() {
  const [classData, setClassData] = useState<any>(null);
  const [weeklyQuizzes, setWeeklyQuizzes] = useState<WeeklyQuizData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  useEffect(() => {
    loadWeeklyQuizData();
  }, [classId]);

  const loadWeeklyQuizData = async () => {
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
      
      // Generate sample weekly quiz data
      const sampleWeeklyQuizzes: WeeklyQuizData[] = [
        {
          id: 'week1-quiz',
          week: 1,
          title: 'Fundamentals Assessment',
          description: 'Comprehensive quiz covering introduction and basic concepts',
          questions: 15,
          timeLimit: 30,
          difficulty: 'Easy',
          topics: ['Introduction', 'Basic Concepts', 'Terminology'],
          attempts: 2,
          maxAttempts: 3,
          bestScore: 85,
          averageScore: 78,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed'
        },
        {
          id: 'week2-quiz',
          week: 2,
          title: 'Core Principles Quiz',
          description: 'Test your understanding of key principles and methodologies',
          questions: 20,
          timeLimit: 45,
          difficulty: 'Medium',
          topics: ['Core Principles', 'Methodologies', 'Best Practices'],
          attempts: 1,
          maxAttempts: 3,
          bestScore: 92,
          averageScore: 82,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed'
        },
        {
          id: 'week3-quiz',
          week: 3,
          title: 'Practical Applications',
          description: 'Apply your knowledge to real-world scenarios and case studies',
          questions: 18,
          timeLimit: 40,
          difficulty: 'Medium',
          topics: ['Case Studies', 'Problem Solving', 'Application'],
          attempts: 0,
          maxAttempts: 3,
          bestScore: 0,
          averageScore: 79,
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'available'
        },
        {
          id: 'week4-quiz',
          week: 4,
          title: 'Advanced Concepts',
          description: 'Challenge yourself with complex scenarios and advanced topics',
          questions: 25,
          timeLimit: 60,
          difficulty: 'Hard',
          topics: ['Advanced Topics', 'Complex Scenarios', 'Integration'],
          attempts: 0,
          maxAttempts: 2,
          bestScore: 0,
          averageScore: 0,
          deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'locked'
        },
        {
          id: 'week5-quiz',
          week: 5,
          title: 'Integration & Synthesis',
          description: 'Comprehensive assessment of integrated knowledge',
          questions: 30,
          timeLimit: 75,
          difficulty: 'Hard',
          topics: ['Integration', 'Synthesis', 'Comprehensive Review'],
          attempts: 0,
          maxAttempts: 2,
          bestScore: 0,
          averageScore: 0,
          deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'locked'
        }
      ];
      
      setWeeklyQuizzes(sampleWeeklyQuizzes);
      
    } catch (error) {
      console.error('Error loading weekly quiz data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'available':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'locked':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'available':
        return '📝';
      case 'locked':
        return '🔒';
      case 'overdue':
        return '⏰';
      default:
        return '📋';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const handleStartQuiz = (quizId: string) => {
    // In a real app, this would redirect to the actual quiz
    router.push(`/classes/${classId}/quiz`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading weekly quizzes...</p>
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
                📊 Weekly Quizzes
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {classData.title}
            </h2>
            <p className="text-gray-600 mb-4">
              👨‍🏫 Instructor: {classData.instructor_name}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {weeklyQuizzes.length}
                </div>
                <div className="text-sm text-gray-600">Total Quizzes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {weeklyQuizzes.filter(q => q.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {weeklyQuizzes.filter(q => q.status === 'available').length}
                </div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {weeklyQuizzes.filter(q => q.status === 'completed').reduce((sum, q) => sum + q.bestScore, 0) / 
                   Math.max(weeklyQuizzes.filter(q => q.status === 'completed').length, 1)}%
                </div>
                <div className="text-sm text-gray-600">Avg Score</div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {weeklyQuizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Quiz Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">{getStatusIcon(quiz.status)}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Week {quiz.week}: {quiz.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">{quiz.description}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize border ${getStatusColor(quiz.status)}`}>
                      {quiz.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty}
                    </span>
                  </div>
                </div>

                {/* Quiz Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{quiz.questions}</div>
                    <div className="text-xs text-gray-600">Questions</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{quiz.timeLimit}m</div>
                    <div className="text-xs text-gray-600">Time Limit</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{quiz.maxAttempts - quiz.attempts}</div>
                    <div className="text-xs text-gray-600">Attempts Left</div>
                  </div>
                </div>
              </div>

              {/* Quiz Content */}
              <div className="p-6">
                {/* Topics */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">📚 Topics Covered</h5>
                  <div className="flex flex-wrap gap-2">
                    {quiz.topics.map((topic, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Performance */}
                {quiz.status === 'completed' && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">🎯 Your Performance</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-lg font-semibold text-green-800">{quiz.bestScore}%</div>
                        <div className="text-xs text-green-600">Best Score</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-lg font-semibold text-blue-800">{quiz.attempts}</div>
                        <div className="text-xs text-blue-600">Attempts Used</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deadline */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">⏰ Deadline</span>
                    <span className={`text-sm ${
                      formatDeadline(quiz.deadline).includes('Overdue') ? 'text-red-600' :
                      formatDeadline(quiz.deadline).includes('today') || formatDeadline(quiz.deadline).includes('tomorrow') ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {formatDeadline(quiz.deadline)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(quiz.deadline).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {quiz.status === 'available' && (
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
                    >
                      Start Quiz
                    </button>
                  )}
                  
                  {quiz.status === 'completed' && quiz.attempts < quiz.maxAttempts && (
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
                    >
                      Retake Quiz
                    </button>
                  )}
                  
                  {quiz.status === 'completed' && (
                    <Link
                      href={`/classes/${classId}/quiz-review/${quiz.id}`}
                      className="flex-1 text-center border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg font-medium text-sm"
                    >
                      Review Answers
                    </Link>
                  )}
                  
                  {quiz.status === 'locked' && (
                    <button
                      disabled
                      className="flex-1 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-medium text-sm cursor-not-allowed"
                    >
                      🔒 Locked
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Performance Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Overall Performance</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(weeklyQuizzes.filter(q => q.status === 'completed').reduce((sum, q) => sum + q.bestScore, 0) / 
                 Math.max(weeklyQuizzes.filter(q => q.status === 'completed').length, 1))}%
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {weeklyQuizzes.filter(q => q.bestScore >= 80).length}
              </div>
              <div className="text-sm text-gray-600">High Scores (80%+)</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {weeklyQuizzes.reduce((sum, q) => sum + q.attempts, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Attempts</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Math.round((weeklyQuizzes.filter(q => q.status === 'completed').length / weeklyQuizzes.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
          </div>

          {/* Progress Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Study Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Review lecture materials before attempting quizzes</li>
              <li>• Take advantage of multiple attempts to improve your scores</li>
              <li>• Focus on topics you scored lowest on</li>
              <li>• Don't wait until the deadline - start early!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}