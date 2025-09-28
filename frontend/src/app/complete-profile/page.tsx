'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Subject, StudentFormData, TeacherFormData, ProfileFormData, ApiResponse, User } from '@/types/profile';

const ProfileCompletion = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [rollNumberCheck, setRollNumberCheck] = useState({ checking: false, available: true, message: '' });
  
  const [formData, setFormData] = useState<ProfileFormData>({
    // Common fields
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
    emergency_contact: '',
    emergency_phone: '',
    
    // Student-specific fields
    student_class: '',
    roll_number: '',
    parent_name: '',
    parent_phone: '',
    previous_school: '',
    subjects: [],
    
    // Teacher-specific fields
    teaching_classes: [],
    teaching_subjects: [],
    qualification: '',
    experience_years: '',
    specialization: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // If already has profile_complete, redirect to dashboard
      if (parsedUser.profile_complete) {
        router.push(parsedUser.role === 'teacher' ? '/teacher' : '/student');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

    // Fetch all subjects for teachers
    fetchAllSubjects();
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // Fetch subjects when student class changes
    if (formData.student_class && user?.role === 'student') {
      fetchSubjectsByClass(formData.student_class);
    }
  }, [formData.student_class, user]);

  const fetchSubjectsByClass = async (classLevel: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/profiles/subjects/${classLevel}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchAllSubjects = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/profiles/public/subjects`);
      
      if (response.ok) {
        const data = await response.json();
        setAllSubjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching all subjects:', error);
    }
  };

  const checkRollNumber = async (classLevel: string, rollNumber: string) => {
    if (!classLevel || !rollNumber) return;
    
    setRollNumberCheck({ checking: true, available: true, message: '' });
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/profiles/check-roll-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_class: classLevel,
          roll_number: rollNumber
        })
      });
      
      const data = await response.json();
      setRollNumberCheck({
        checking: false,
        available: data.available,
        message: data.message
      });
    } catch (error) {
      setRollNumberCheck({
        checking: false,
        available: false,
        message: 'Error checking roll number'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check roll number availability for students
    if (name === 'roll_number' || name === 'student_class') {
      const classLevel = name === 'student_class' ? value : formData.student_class;
      const rollNumber = name === 'roll_number' ? value : formData.roll_number;
      
      if (classLevel && rollNumber && user?.role === 'student') {
        const timeoutId = setTimeout(() => checkRollNumber(classLevel, rollNumber), 500);
        return () => clearTimeout(timeoutId);
      }
    }

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleMultiSelectChange = (name: 'subjects' | 'teaching_classes' | 'teaching_subjects', value: string) => {
    setFormData(prev => {
      const currentArray = prev[name] as string[];
      return {
        ...prev,
        [name]: currentArray.includes(value)
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value]
      };
    });
  };  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.emergency_contact) newErrors.emergency_contact = 'Emergency contact is required';
    if (!formData.emergency_phone) newErrors.emergency_phone = 'Emergency phone is required';

    if (user?.role === 'student') {
      // Student validations
      if (!formData.student_class) newErrors.student_class = 'Class is required';
      if (!formData.roll_number) newErrors.roll_number = 'Roll number is required';
      if (!formData.parent_name) newErrors.parent_name = 'Parent name is required';
      if (!formData.parent_phone) newErrors.parent_phone = 'Parent phone is required';
      if (!rollNumberCheck.available) newErrors.roll_number = 'Roll number is not available';
    } else if (user?.role === 'teacher') {
      // Teacher validations
      if (formData.teaching_classes.length === 0) newErrors.teaching_classes = 'At least one teaching class is required';
      if (formData.teaching_subjects.length === 0) newErrors.teaching_subjects = 'At least one teaching subject is required';
      if (!formData.qualification) newErrors.qualification = 'Qualification is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!rollNumberCheck.available && user?.role === 'student') return;

    setIsSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/profiles/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Update user data in localStorage
        const updatedUser = { ...user, profile_complete: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Redirect to appropriate dashboard
        router.push(user?.role === 'teacher' ? '/teacher' : '/student');
      } else {
        alert(data.message || 'Failed to complete profile');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      alert('Error completing profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg px-8 py-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Complete Your Profile</h2>
            <p className="mt-2 text-gray-600">
              Welcome {user.full_name}! Please complete your profile to get started.
            </p>
            <div className="mt-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg inline-block">
              Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your phone number"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact *
                </label>
                <input
                  type="text"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.emergency_contact ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Emergency contact name"
                />
                {errors.emergency_contact && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Phone *
                </label>
                <input
                  type="tel"
                  name="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.emergency_phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Emergency contact phone"
                />
                {errors.emergency_phone && <p className="text-red-500 text-sm mt-1">{errors.emergency_phone}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your full address"
              />
            </div>

            {/* Student-specific Fields */}
            {user.role === 'student' && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class *
                    </label>
                    <select
                      name="student_class"
                      value={formData.student_class}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.student_class ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Class</option>
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <option key={num} value={num}>Class {num}</option>
                      ))}
                    </select>
                    {errors.student_class && <p className="text-red-500 text-sm mt-1">{errors.student_class}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Roll Number *
                    </label>
                    <input
                      type="text"
                      name="roll_number"
                      value={formData.roll_number}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.roll_number || !rollNumberCheck.available ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter roll number"
                    />
                    {rollNumberCheck.checking && (
                      <p className="text-blue-500 text-sm mt-1">Checking availability...</p>
                    )}
                    {!rollNumberCheck.checking && rollNumberCheck.message && (
                      <p className={`text-sm mt-1 ${rollNumberCheck.available ? 'text-green-500' : 'text-red-500'}`}>
                        {rollNumberCheck.message}
                      </p>
                    )}
                    {errors.roll_number && <p className="text-red-500 text-sm mt-1">{errors.roll_number}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parent/Guardian Name *
                    </label>
                    <input
                      type="text"
                      name="parent_name"
                      value={formData.parent_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.parent_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Parent or guardian name"
                    />
                    {errors.parent_name && <p className="text-red-500 text-sm mt-1">{errors.parent_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parent/Guardian Phone *
                    </label>
                    <input
                      type="tel"
                      name="parent_phone"
                      value={formData.parent_phone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.parent_phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Parent or guardian phone"
                    />
                    {errors.parent_phone && <p className="text-red-500 text-sm mt-1">{errors.parent_phone}</p>}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Previous School
                  </label>
                  <input
                    type="text"
                    name="previous_school"
                    value={formData.previous_school}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name of previous school (optional)"
                  />
                </div>

                {/* Display subjects for selected class */}
                {subjects.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subjects for Class {formData.student_class}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {subjects.map(subject => (
                        <div key={subject.id} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">
                          {subject.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teacher-specific Fields */}
            {user.role === 'teacher' && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Teacher Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teaching Classes *
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <label key={num} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.teaching_classes.includes(num.toString())}
                            onChange={() => handleMultiSelectChange('teaching_classes', num.toString())}
                            className="mr-2"
                          />
                          <span className="text-sm">Class {num}</span>
                        </label>
                      ))}
                    </div>
                    {errors.teaching_classes && <p className="text-red-500 text-sm mt-1">{errors.teaching_classes}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teaching Subjects *
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {allSubjects.map(subject => (
                        <label key={subject.name} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={formData.teaching_subjects.includes(subject.name)}
                            onChange={() => handleMultiSelectChange('teaching_subjects', subject.name)}
                            className="mr-2"
                          />
                          <span className="text-sm">{subject.name}</span>
                        </label>
                      ))}
                    </div>
                    {errors.teaching_subjects && <p className="text-red-500 text-sm mt-1">{errors.teaching_subjects}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualification *
                    </label>
                    <input
                      type="text"
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.qualification ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., M.Ed, B.Ed, PhD in Mathematics"
                    />
                    {errors.qualification && <p className="text-red-500 text-sm mt-1">{errors.qualification}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      name="experience_years"
                      value={formData.experience_years}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Years of teaching experience"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Elementary Mathematics, Advanced Physics"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6 border-t">
              <button
                type="submit"
                disabled={isSubmitting || (user?.role === 'student' && !rollNumberCheck.available)}
                className={`w-full py-3 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting || (user?.role === 'student' && !rollNumberCheck.available)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Completing Profile...' : 'Complete Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletion;