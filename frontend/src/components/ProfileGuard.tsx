'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileGuardProps {
  children: ReactNode;
}

const ProfileGuard = ({ children }: ProfileGuardProps) => {
  const router = useRouter();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkProfileStatus = async () => {
      try {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!userData || !token) {
          router.push('/login');
          return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // If profile is already complete according to localStorage, continue
        if (parsedUser.profile_complete) {
          setIsCheckingProfile(false);
          return;
        }

        // Double-check with backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/profiles/profile-status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.data.requiresCompletion) {
            // Profile needs completion, redirect to profile completion form
            router.push('/complete-profile');
            return;
          } else {
            // Profile is complete, update localStorage and continue
            const updatedUser = { ...parsedUser, profile_complete: true };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
          }
        } else {
          // If API call fails, check localStorage value
          if (!parsedUser.profile_complete) {
            router.push('/complete-profile');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking profile status:', error);
        // On error, fall back to localStorage check
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          if (!parsedUser.profile_complete) {
            router.push('/complete-profile');
            return;
          }
        }
      } finally {
        setIsCheckingProfile(false);
      }
    };

    checkProfileStatus();
  }, [router]);

  if (isCheckingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking profile status...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProfileGuard;