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

export default function StudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const router = useRouter();

  const [formData, setFormData] = useState({
    student_class: '',
    roll_number: '',
    section: 'A',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    date_of_birth: '',
    emergency_contact: '',
    selected_subjects: [] as string[]
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
      if (parsedUser.role !== 'student') {
        router.push('/login');
        return;
      }
    } catch (error) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const fetchSubjects = async (classNumber: string) => {
    if (!classNumber) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/profiles/subjects/${classNumber}`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.data || []);
        // Auto-select core subjects
        const coreSubjects = data.data.filter((s: Subject) => s.is_core).map((s: Subject) => s.subject_name);
        setFormData(prev => ({ ...prev, selected_subjects: coreSubjects }));
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classNumber = e.target.value;
    setFormData(prev => ({ ...prev, student_class: classNumber, selected_subjects: [] }));
    fetchSubjects(classNumber);
  };

  const handleSubjectToggle = (subjectName: string, isCore: boolean) => {
    if (isCore) return; // Core subjects cannot be unselected
    
    setFormData(prev => ({
      ...prev,
      selected_subjects: prev.selected_subjects.includes(subjectName)
        ? prev.selected_subjects.filter(s => s !== subjectName)
        : [...prev.selected_subjects, subjectName]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await apiService.completeStudentProfile(formData);

      if (result.success) {
        // Update user data in localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.profile_completed = true;
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Redirect to student dashboard
        router.push('/student');
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
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">📚 Complete Your Student Profile</h1>
            <p className="text-gray-300">Please fill in your details to access your student dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Class and Roll Number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Class *</label>
                <select
                  value={formData.student_class}
                  onChange={handleClassChange}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="" className="bg-gray-800">Select Class</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => (
                    <option key={num} value={num} className="bg-gray-800">Class {num}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">Roll Number *</label>
                <input
                  type="text"
                  value={formData.roll_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, roll_number: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                  placeholder="Enter roll number"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">Section</label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {['A', 'B', 'C', 'D', 'E'].map(section => (
                    <option key={section} value={section} className="bg-gray-800">Section {section}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Parent Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Parent/Guardian Name</label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_name: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter parent name"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">Parent Phone</label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_phone: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Parent Email</label>
                <input
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_email: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-gray-300 font-medium mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="Enter address"
                />
              </div>
            </div>

            {/* Subjects Selection */}
            {subjects.length > 0 && (
              <div>
                <label className="block text-gray-300 font-medium mb-4">Select Subjects</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {subjects.map((subject) => (
                    <label
                      key={subject.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.selected_subjects.includes(subject.subject_name)
                          ? 'bg-purple-500/20 border-purple-500/50 text-white'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                      } ${subject.is_core ? 'opacity-75' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selected_subjects.includes(subject.subject_name)}
                        onChange={() => handleSubjectToggle(subject.subject_name, subject.is_core)}
                        disabled={subject.is_core}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-medium">{subject.subject_name}</span>
                        {subject.is_core && (
                          <span className="text-xs text-purple-400 block">Core Subject</span>
                        )}
                        {subject.is_optional && (
                          <span className="text-xs text-green-400 block">Optional</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Core subjects are automatically selected. You can choose optional subjects.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !formData.student_class || !formData.roll_number}
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