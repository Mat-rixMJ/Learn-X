'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_marks: number;
  assignment_type: string;
  class_title: string;
  class_id: string;
  attachment_url?: string;
  submission_status?: 'not_submitted' | 'submitted' | 'graded';
  marks_obtained?: number;
  feedback?: string;
  submitted_at?: string;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [submissionText, setSubmissionText] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadAssignments();
  }, []);

  const checkAuthentication = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'student') {
      router.push('/login');
      return;
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError('');

      // Mock assignments data for demonstration
      const mockAssignments: Assignment[] = [
        {
          id: '1',
          title: 'Mathematics Assignment 1',
          description: 'Solve problems 1-20 from Chapter 5: Calculus Fundamentals',
          due_date: '2025-10-05',
          total_marks: 100,
          assignment_type: 'homework',
          class_title: 'Advanced Mathematics',
          class_id: '1',
          submission_status: 'not_submitted'
        },
        {
          id: '2',
          title: 'Physics Lab Report',
          description: 'Write a comprehensive lab report on the pendulum experiment',
          due_date: '2025-10-10',
          total_marks: 50,
          assignment_type: 'lab_report',
          class_title: 'Physics Laboratory',
          class_id: '2',
          submission_status: 'submitted',
          submitted_at: '2025-09-28T10:30:00Z'
        },
        {
          id: '3',
          title: 'Computer Science Project',
          description: 'Develop a web application using React and Node.js',
          due_date: '2025-10-15',
          total_marks: 200,
          assignment_type: 'project',
          class_title: 'Web Development',
          class_id: '3',
          submission_status: 'graded',
          marks_obtained: 185,
          feedback: 'Excellent work! Very clean code and good UI design.',
          submitted_at: '2025-09-25T15:45:00Z'
        }
      ];
      setAssignments(mockAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
      setError('Failed to load assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (!submissionText.trim()) {
      alert('Please provide a submission text');
      return;
    }

    try {
      setSubmittingId(assignmentId);
      
      // Mock submission - in real app this would call API
      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, submission_status: 'submitted', submitted_at: new Date().toISOString() }
          : assignment
      ));

      setSubmissionText('');
      alert('Assignment submitted successfully!');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'graded': return 'text-green-600 bg-green-100';
      case 'not_submitted': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'submitted': return 'Submitted';
      case 'graded': return 'Graded';
      case 'not_submitted': return 'Pending';
      default: return 'Unknown';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const filteredAssignments = assignments.filter(assignment => {
    switch (activeTab) {
      case 'pending': return assignment.submission_status === 'not_submitted';
      case 'submitted': return assignment.submission_status === 'submitted';
      case 'graded': return assignment.submission_status === 'graded';
      case 'all': return true;
      default: return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/student" className="text-blue-600 hover:text-blue-800">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">📝 My Assignments</h1>
            </div>
            <div className="text-sm text-gray-600">
              {assignments.length} total assignments
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'pending', label: 'Pending', count: assignments.filter(a => a.submission_status === 'not_submitted').length },
                { id: 'submitted', label: 'Submitted', count: assignments.filter(a => a.submission_status === 'submitted').length },
                { id: 'graded', label: 'Graded', count: assignments.filter(a => a.submission_status === 'graded').length },
                { id: 'all', label: 'All', count: assignments.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Assignments List */}
        <div className="space-y-6">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No assignments found</h3>
              <p className="text-gray-600">No assignments in the {activeTab} category.</p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{assignment.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.submission_status)}`}>
                        {getStatusText(assignment.submission_status)}
                      </span>
                      {isOverdue(assignment.due_date) && assignment.submission_status === 'not_submitted' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{assignment.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>📚 {assignment.class_title}</span>
                      <span>📅 Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                      <span>🎯 {assignment.total_marks} marks</span>
                      <span className="capitalize">📝 {assignment.assignment_type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Submission Details */}
                {assignment.submission_status === 'submitted' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="text-sm text-blue-800">
                      <strong>Submitted:</strong> {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                )}

                {/* Grading Details */}
                {assignment.submission_status === 'graded' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="text-sm text-green-800 space-y-1">
                      <div><strong>Score:</strong> {assignment.marks_obtained}/{assignment.total_marks} ({Math.round((assignment.marks_obtained! / assignment.total_marks) * 100)}%)</div>
                      {assignment.feedback && (
                        <div><strong>Feedback:</strong> {assignment.feedback}</div>
                      )}
                      <div><strong>Submitted:</strong> {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString() : 'N/A'}</div>
                    </div>
                  </div>
                )}

                {/* Submission Form */}
                {assignment.submission_status === 'not_submitted' && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Submit Assignment</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Response
                        </label>
                        <textarea
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your assignment response here..."
                        />
                      </div>

                      <button
                        onClick={() => handleSubmitAssignment(assignment.id)}
                        disabled={submittingId === assignment.id}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingId === assignment.id ? 'Submitting...' : 'Submit Assignment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}