'use client';

import React from 'react';
import { IoBookOutline } from 'react-icons/io5';

interface LoadingStateProps {
  progress: number;
  stage: string;
  showSkeleton?: boolean;
}

const LoadingState = React.memo(({ progress, stage, showSkeleton = false }: LoadingStateProps) => {
  if (showSkeleton) {
    return (
      <div className="h-full p-6 animate-pulse">
        {/* Controls Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
          <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            ))}
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            ))}
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
          </div>
        </div>

        {/* Progress Skeleton */}
        <div className="mt-auto pt-6">
          <div className="flex justify-between mb-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
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
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {stage}
        </p>

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