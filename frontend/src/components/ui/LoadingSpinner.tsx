'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  text = 'Loading...' 
}: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4';
      case 'large':
        return 'w-12 h-12';
      case 'medium':
      default:
        return 'w-8 h-8';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className={`${getSizeClasses()} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}></div>
      {text && (
        <p className="text-gray-600 text-sm">{text}</p>
      )}
    </div>
  );
}