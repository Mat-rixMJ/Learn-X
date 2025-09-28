'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedFetch } from '@/utils/auth';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  points_possible: number;
  assignment_type: string;
  is_published: boolean;
  class_name: string;
  submissions_count: number;
  total_students: number;
  average_grade: number;
  created_at: string;
}

interface Class {
  id: string;
  name: string;
}

export default function AssignmentsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const router = useRouter();

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    instructions: '',
    class_id: '',
    due_date: '',
    points_possible: 100,
    assignment_type: 'homework',
    is_published: false,
    allow_late_submission: true
  });

  useEffect(() => {
    // Check authentication and role
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
      fetchData();
    } catch (error) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const fetchData = async () => {
    try {
      const [assignmentsRes, classesRes] = await Promise.all([
        authenticatedFetch('/api/assignments'),
        authenticatedFetch('/api/classes')
      ]);

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.data || []);
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const response = await authenticatedFetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAssignment),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewAssignment({
          title: '',
          description: '',
          instructions: '',
          class_id: '',
          due_date: '',
          points_possible: 100,
          assignment_type: 'homework',
          is_published: false,
          allow_late_submission: true
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment');
    } finally {
      setCreateLoading(false);
    }
  };

  const togglePublishStatus = async (assignmentId: string, currentStatus: boolean) => {
    try {
      const response = await authenticatedFetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_published: !currentStatus }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update assignment');
    }
  };

  const filteredAssignments = selectedClass 
    ? assignments.filter(a => a.class_name === classes.find(c => c.id === selectedClass)?.name)
    : assignments;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">📝 Assignments</h1>
              <p className="text-gray-300 text-lg">Create and manage assignments for your students</p>
            </div>
            <div className="mt-4 lg:mt-0 flex gap-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
              >
                + Create Assignment
              </button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
          <div className="flex gap-4 items-center">
            <label className="text-white font-medium">Filter by Class:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-gray-800">
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignments List */}
        <div className="grid gap-6">
          {filteredAssignments.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Assignments Yet</h3>
              <p className="text-gray-400">Create your first assignment to get started!</p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <div key={assignment.id} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{assignment.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        assignment.is_published 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {assignment.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {assignment.assignment_type}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-4">{assignment.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Class:</span>
                        <p className="text-white font-medium">{assignment.class_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Due Date:</span>
                        <p className="text-white font-medium">
                          {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Points:</span>
                        <p className="text-white font-medium">{assignment.points_possible}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Submissions:</span>
                        <p className="text-white font-medium">
                          {assignment.submissions_count || 0} / {assignment.total_students || 0}
                        </p>
                      </div>
                    </div>
                    {assignment.average_grade && (
                      <div className="mt-3">
                        <span className="text-gray-400">Average Grade:</span>
                        <span className="text-white font-medium ml-2">{Math.round(assignment.average_grade)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => togglePublishStatus(assignment.id, assignment.is_published)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        assignment.is_published
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {assignment.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link
                      href={`/assignments/${assignment.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Assignment Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Assignment</h2>
              <form onSubmit={handleCreateAssignment}>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Title *</label>
                    <input
                      type="text"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Class *</label>
                    <select
                      value={newAssignment.class_id}
                      onChange={(e) => setNewAssignment({ ...newAssignment, class_id: e.target.value })}
                      className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="" className="bg-gray-800">Select a class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id} className="bg-gray-800">
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Type</label>
                      <select
                        value={newAssignment.assignment_type}
                        onChange={(e) => setNewAssignment({ ...newAssignment, assignment_type: e.target.value })}
                        className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="homework" className="bg-gray-800">Homework</option>
                        <option value="quiz" className="bg-gray-800">Quiz</option>
                        <option value="exam" className="bg-gray-800">Exam</option>
                        <option value="project" className="bg-gray-800">Project</option>
                        <option value="discussion" className="bg-gray-800">Discussion</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Points</label>
                      <input
                        type="number"
                        value={newAssignment.points_possible}
                        onChange={(e) => setNewAssignment({ ...newAssignment, points_possible: parseInt(e.target.value) })}
                        className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Due Date</label>
                      <input
                        type="datetime-local"
                        value={newAssignment.due_date}
                        onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                        className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Description</label>
                    <textarea
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Instructions</label>
                    <textarea
                      value={newAssignment.instructions}
                      onChange={(e) => setNewAssignment({ ...newAssignment, instructions: e.target.value })}
                      className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newAssignment.is_published}
                        onChange={(e) => setNewAssignment({ ...newAssignment, is_published: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-gray-300">Publish immediately</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newAssignment.allow_late_submission}
                        onChange={(e) => setNewAssignment({ ...newAssignment, allow_late_submission: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-gray-300">Allow late submissions</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {createLoading ? 'Creating...' : 'Create Assignment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}