'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'teacher' | 'admin';
  bypassProfileCheck?: boolean;
}

export default function ProfileCompletionGuard({ 
  children, 
  requiredRole, 
  bypassProfileCheck = false 
}: ProfileCompletionGuardProps) {
  const router = useRouter();

  useEffect(() => {
    if (bypassProfileCheck) return;

    const checkProfileStatus = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userData);

        // Role check
        if (requiredRole && user.role !== requiredRole) {
          router.push('/login');
          return;
        }

        // Profile completion check
        if (!user.profile_complete) {
          router.push('/complete-profile');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
      }
    };

    checkProfileStatus();
  }, [router, requiredRole, bypassProfileCheck]);

  return <>{children}</>;
}