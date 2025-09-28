'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  is_core: boolean;
  is_optional: boolean;
}

interface ClassAssignment {
  class_number: number;
  section: string;
  subject_name: string;
  is_class_teacher: boolean;
}

export default function TeacherProfilePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<{ [key: number]: Subject[] }>({});
  const router = useRouter();

  const [formData, setFormData] = useState({
    employee_id: '',
    department: '',
    qualification: '',
    experience_years: 0,
    phone: '',
    emergency_contact: '',
    address: '',
    date_of_joining: '',
    specialization: '',
    class_assignments: [] as ClassAssignment[]
  });

  useEffect(() => {
    // Check authentication
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
    } catch (error) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const fetchSubjectsForClass = async (classNumber: number) => {
    if (availableSubjects[classNumber]) return;
    
    try {
      // Since we don't have a specific subjects API, we'll provide default subjects
      const defaultSubjects: Subject[] = [
        { id: '1', subject_name: 'Mathematics', subject_code: 'MATH', is_core: true, is_optional: false },
        { id: '2', subject_name: 'Science', subject_code: 'SCI', is_core: true, is_optional: false },
        { id: '3', subject_name: 'English', subject_code: 'ENG', is_core: true, is_optional: false },
        { id: '4', subject_name: 'History', subject_code: 'HIST', is_core: false, is_optional: true },
        { id: '5', subject_name: 'Geography', subject_code: 'GEO', is_core: false, is_optional: true },
      ];
      setAvailableSubjects(prev => ({
        ...prev,
        [classNumber]: defaultSubjects
      }));
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const addClassAssignment = () => {
    setFormData(prev => ({
      ...prev,
      class_assignments: [
        ...prev.class_assignments,
        { class_number: 1, section: 'A', subject_name: '', is_class_teacher: false }
      ]
    }));
  };

  const removeClassAssignment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      class_assignments: prev.class_assignments.filter((_, i) => i !== index)
    }));
  };

  const updateClassAssignment = (index: number, field: keyof ClassAssignment, value: any) => {
    setFormData(prev => ({
      ...prev,
      class_assignments: prev.class_assignments.map((assignment, i) => 
        i === index ? { ...assignment, [field]: value } : assignment
      )
    }));

    // Fetch subjects when class changes
    if (field === 'class_number') {
      fetchSubjectsForClass(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await apiService.completeTeacherProfile(formData);

      if (result.success) {
        // Update user data in localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.profile_completed = true;
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Redirect to teacher dashboard
        router.push('/teacher/dashboard');
      } else {
        alert(result.message || 'Failed to complete profile');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      alert('Failed to complete profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">👨‍🏫 Complete Your Teacher Profile</h1>
            <p className="text-gray-300">Please fill in your details and class assignments</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Employee ID *</label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                  placeholder="Enter employee ID"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Mathematics, Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Qualification</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualification: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., M.Sc. Mathematics, B.Ed."
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">Experience (Years)</label>
                <input
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="0"
                  max="50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">Emergency Contact</label>
                <input
                  type="tel"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Emergency contact number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Date of Joining</label>
                <input
                  type="date"
                  value={formData.date_of_joining}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_joining: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">Specialization</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Algebra, Physics, Chemistry"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="Enter address"
              />
            </div>

            {/* Class Assignments */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-gray-300 font-medium">Class Assignments *</label>
                <button
                  type="button"
                  onClick={addClassAssignment}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  + Add Class
                </button>
              </div>

              {formData.class_assignments.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-white/20 rounded-lg">
                  <p className="text-gray-400">No class assignments added yet</p>
                  <p className="text-sm text-gray-500">Click "Add Class" to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.class_assignments.map((assignment, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-gray-300 text-sm font-medium mb-2">Class</label>
                          <select
                            value={assignment.class_number}
                            onChange={(e) => updateClassAssignment(index, 'class_number', parseInt(e.target.value))}
                            className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => (
                              <option key={num} value={num} className="bg-gray-800">Class {num}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm font-medium mb-2">Section</label>
                          <select
                            value={assignment.section}
                            onChange={(e) => updateClassAssignment(index, 'section', e.target.value)}
                            className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {['A', 'B', 'C', 'D', 'E'].map(section => (
                              <option key={section} value={section} className="bg-gray-800">Section {section}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm font-medium mb-2">Subject</label>
                          <select
                            value={assignment.subject_name}
                            onChange={(e) => updateClassAssignment(index, 'subject_name', e.target.value)}
                            className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="" className="bg-gray-800">Select Subject</option>
                            {(availableSubjects[assignment.class_number] || []).map(subject => (
                              <option key={subject.id} value={subject.subject_name} className="bg-gray-800">
                                {subject.subject_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={assignment.is_class_teacher}
                              onChange={(e) => updateClassAssignment(index, 'is_class_teacher', e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-gray-300 text-sm">Class Teacher</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeClassAssignment(index)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !formData.employee_id || formData.class_assignments.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Completing Profile...
                </div>
              ) : (
                '✅ Complete Profile & Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}