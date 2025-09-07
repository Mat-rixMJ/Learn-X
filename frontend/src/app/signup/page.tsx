'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          password: formData.password,
          role: formData.role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful
        alert('Account created successfully! Please login.');
        router.push('/login');
      } else {
        // Handle server errors
        setError(data.message || data.errors?.[0]?.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please check if the server is running and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full max-w-lg border border-white/20">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">Join LearnX</h2>
          <p className="text-gray-600 text-lg">Create your account to start learning</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">👤 Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 text-lg"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">🆔 Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 text-lg"
              placeholder="Choose a username"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">📧 Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 text-lg"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">🔒 Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 text-lg"
              placeholder="Create a password"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">🔒 Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 text-lg"
              placeholder="Confirm your password"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">🎓 Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 text-lg bg-white"
            >
              <option value="student">📚 Student</option>
              <option value="teacher">👨‍🏫 Teacher</option>
            </select>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm font-medium">❌ {error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-semibold text-lg shadow-lg transform transition-all duration-200 ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : (
              '🚀 Sign Up'
            )}
          </button>
        </form>
        <p className="text-center mt-6 text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-purple-600 font-semibold hover:underline transition-colors duration-200">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
