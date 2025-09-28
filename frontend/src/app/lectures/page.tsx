'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LecturesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to recorded-lectures page
    router.replace('/recorded-lectures');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
        <p className="text-white text-lg">Redirecting to lectures...</p>
      </div>
    </div>
  );
}