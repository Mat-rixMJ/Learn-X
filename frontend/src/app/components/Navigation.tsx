'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
}

export default function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMobileMenu && !target.closest('nav')) {
        setShowMobileMenu(false);
      }
    };

    if (showMobileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMobileMenu]);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
    setShowProfileDropdown(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowProfileDropdown(false);
    router.push('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="group flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 group-hover:from-purple-300 group-hover:to-pink-300 transition-all duration-300">
              Learn-X
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link href="/" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300 hover:scale-105">
              Home
            </Link>
            {user && (
              <>
                <Link href="/simple-dashboard" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300 hover:scale-105">
                  Dashboard
                </Link>
                <Link href="/live-class" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300 hover:scale-105">
                  Live Class
                </Link>
                <Link href="/recorded-lectures" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300 hover:scale-105">
                  Lectures
                </Link>
                <Link href="/ai-notes" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300 hover:scale-105">
                  AI Notes
                </Link>
              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              /* User Profile Dropdown */
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 transition-all duration-300 border border-white/20 hover:border-white/40"
                >
                  {/* Profile Avatar */}
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {getInitials(user.fullName || user.username)}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-white font-medium text-sm">{user.fullName || user.username}</p>
                    <p className="text-gray-300 text-xs capitalize">{user.role}</p>
                  </div>
                  {/* Dropdown Arrow */}
                  <svg className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <>
                    {/* Mobile: Full screen overlay */}
                    <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={() => setShowProfileDropdown(false)} />
                    
                    {/* Dropdown Content */}
                    <div className="absolute right-0 sm:mt-2 mt-1 w-screen sm:w-80 max-w-sm sm:max-w-none bg-slate-800/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl py-4 z-50 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto transform sm:translate-x-0 -translate-x-3 sm:rounded-2xl rounded-b-2xl rounded-t-lg">
                    {/* User Info Header */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {getInitials(user.fullName || user.username)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{user.fullName || user.username}</h3>
                          <p className="text-gray-300 text-sm">{user.email}</p>
                          <span className="inline-block bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-medium capitalize mt-1">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <p className="text-gray-400 text-xs mb-1">Username</p>
                        <p className="text-white font-medium">{user.username}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <p className="text-gray-400 text-xs mb-1">Email Address</p>
                        <p className="text-white font-medium">{user.email}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <p className="text-gray-400 text-xs mb-1">Account Type</p>
                        <p className="text-white font-medium capitalize">{user.role}</p>
                      </div>
                      {user.fullName && (
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                          <p className="text-gray-400 text-xs mb-1">Full Name</p>
                          <p className="text-white font-medium">{user.fullName}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 sm:px-6 py-2 border-t border-white/10">
                      <Link 
                        href="/settings"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 mb-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Login/Signup Buttons */
              <>
                <Link href="/login" className="hidden sm:block px-6 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300 border border-white/20 hover:border-white/40">
                  Login
                </Link>
                <Link href="/signup" className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/25">
                  Sign Up
                </Link>
              </>
            )}
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-slate-800/95 backdrop-blur-xl border-t border-white/10">
            <div className="px-6 py-4 space-y-2">
              <Link 
                href="/" 
                onClick={() => setShowMobileMenu(false)}
                className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300"
              >
                Home
              </Link>
              {user ? (
                <>
                  <Link 
                    href="/simple-dashboard" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/live-class" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300"
                  >
                    Live Class
                  </Link>
                  <Link 
                    href="/recorded-lectures" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300"
                  >
                    Lectures
                  </Link>
                  <Link 
                    href="/ai-notes" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300"
                  >
                    AI Notes
                  </Link>

                  {/* Mobile User Info */}
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex items-center space-x-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {getInitials(user.fullName || user.username)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{user.fullName || user.username}</p>
                        <p className="text-gray-300 text-xs capitalize">{user.role}</p>
                      </div>
                    </div>
                    
                    <Link 
                      href="/settings"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 mb-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </Link>
                    
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all duration-300 border border-white/20"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/signup" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold transition-all duration-300 text-center"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}