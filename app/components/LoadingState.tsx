'use client';

import React from 'react';
import { IoBookOutline } from 'react-icons/io5';
import { EPUBLoadingSkeleton } from './skeletons';

interface LoadingStateProps {
  progress: number;
  stage: string;
  showSkeleton?: boolean;
  variant?: 'default' | 'content' | 'minimal';
  details?: string;
  estimatedTime?: number;
}

const LoadingState = React.memo(({ 
  progress, 
  stage, 
  showSkeleton = false, 
  variant = 'default',
  details,
  estimatedTime
}: LoadingStateProps) => {
  // Show content skeleton for a more realistic preview
  if (showSkeleton) {
    return <EPUBLoadingSkeleton showContent={variant === 'content'} />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        {/* Animated Book Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <IoBookOutline className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="absolute inset-0 w-20 h-20 mx-auto rounded-2xl border-4 border-blue-200 dark:border-blue-800 animate-ping opacity-75" />
        </div>

        {/* Progress Information */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Loading Your Book
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {stage}
        </p>
        {details && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            {details}
          </p>
        )}
        {estimatedTime && (
          <p className="text-xs text-gray-400 dark:text-gray-600 mb-6">
            Estimated time: {estimatedTime}s remaining
          </p>
        )}

        {/* Progress Bar */}
        <div className="w-full max-w-xs mx-auto">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loading Tips */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Tip:</strong> Use keyboard shortcuts for faster navigation once loaded: 
            Arrow keys for pages, Ctrl+T for table of contents, Ctrl+F for search.
          </p>
        </div>
      </div>
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

export default LoadingState;