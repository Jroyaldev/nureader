'use client';

import React from 'react';
import classNames from 'classnames';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = React.memo(({ 
  className, 
  variant = 'rectangular', 
  width, 
  height, 
  animation = 'pulse' 
}: SkeletonProps) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse', // Could be enhanced with wave animation
    none: ''
  };
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  };

  return (
    <div
      className={classNames(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// Content skeleton for EPUB reader
export const ContentSkeleton = React.memo(({ className }: { className?: string }) => (
  <div className={classNames('p-6 space-y-4', className)}>
    {/* Title skeleton */}
    <Skeleton height={32} className="w-3/4" />
    
    {/* Paragraph skeletons */}
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton height={20} className="w-full" />
        <Skeleton height={20} className="w-full" />
        <Skeleton height={20} className="w-4/5" />
        {i < 7 && <div className="h-4" />}
      </div>
    ))}
  </div>
));

ContentSkeleton.displayName = 'ContentSkeleton';

// EPUB loading skeleton with realistic book layout
export const EPUBLoadingSkeleton = React.memo(({ 
  showContent = false 
}: { 
  showContent?: boolean 
}) => {
  if (showContent) {
    return (
      <div className="h-full overflow-hidden">
        <ContentSkeleton className="h-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center space-y-6 max-w-md w-full">
        {/* Book icon skeleton */}
        <div className="flex justify-center">
          <Skeleton variant="rectangular" width={80} height={100} className="rounded-lg" />
        </div>
        
        {/* Title skeleton */}
        <div className="space-y-2">
          <Skeleton height={24} className="w-3/4 mx-auto" />
          <Skeleton height={16} className="w-1/2 mx-auto" />
        </div>
        
        {/* Progress bar skeleton */}
        <div className="space-y-2">
          <Skeleton height={8} className="w-full rounded-full" />
          <Skeleton height={14} className="w-1/3 mx-auto" />
        </div>
        
        {/* Loading tips skeleton */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
          <Skeleton height={16} className="w-full" />
          <Skeleton height={16} className="w-4/5" />
        </div>
      </div>
    </div>
  );
});

EPUBLoadingSkeleton.displayName = 'EPUBLoadingSkeleton';

// Table of contents skeleton
export const TOCSkeleton = React.memo(() => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <Skeleton variant="circular" width={24} height={24} />
        <div className="flex-1 space-y-1">
          <Skeleton height={16} className={classNames('w-full', {
            'w-4/5': i % 3 === 0,
            'w-3/4': i % 3 === 1,
            'w-5/6': i % 3 === 2
          })} />
          {i % 4 === 0 && <Skeleton height={12} className="w-1/2" />}
        </div>
        <Skeleton width={40} height={12} />
      </div>
    ))}
  </div>
));

TOCSkeleton.displayName = 'TOCSkeleton';

// Search results skeleton
export const SearchSkeleton = React.memo(() => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton height={14} className="w-1/4" />
          <Skeleton height={12} className="w-16" />
        </div>
        <Skeleton height={16} className="w-full" />
        <Skeleton height={16} className="w-4/5" />
        <Skeleton height={12} className="w-1/3" />
      </div>
    ))}
  </div>
));

SearchSkeleton.displayName = 'SearchSkeleton';

// Highlights skeleton
export const HighlightsSkeleton = React.memo(() => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="circular" width={20} height={20} />
          <Skeleton height={12} className="w-20" />
        </div>
        <Skeleton height={16} className="w-full" />
        <Skeleton height={16} className="w-3/4" />
        <div className="flex items-center justify-between">
          <Skeleton height={12} className="w-24" />
          <div className="flex space-x-2">
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
        </div>
      </div>
    ))}
  </div>
));

HighlightsSkeleton.displayName = 'HighlightsSkeleton';

// Bookmarks skeleton
export const BookmarksSkeleton = React.memo(() => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        <Skeleton variant="circular" width={32} height={32} />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} className="w-3/4" />
          <Skeleton height={12} className="w-1/2" />
        </div>
        <div className="flex space-x-2">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="circular" width={24} height={24} />
        </div>
      </div>
    ))}
  </div>
));

BookmarksSkeleton.displayName = 'BookmarksSkeleton';

// Settings skeleton
export const SettingsSkeleton = React.memo(() => (
  <div className="space-y-6 p-6">
    {/* Theme section */}
    <div className="space-y-3">
      <Skeleton height={20} className="w-24" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton height={60} className="w-full rounded-lg" />
            <Skeleton height={14} className="w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Typography section */}
    <div className="space-y-4">
      <Skeleton height={20} className="w-32" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton height={16} className="w-20" />
          <Skeleton height={32} className="w-24" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton height={16} className="w-24" />
          <Skeleton height={32} className="w-32" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton height={16} className="w-28" />
          <Skeleton height={32} className="w-24" />
        </div>
      </div>
    </div>
    
    {/* Layout section */}
    <div className="space-y-4">
      <Skeleton height={20} className="w-20" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton height={40} className="w-full rounded-lg" />
            <Skeleton height={12} className="w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Reading preferences */}
    <div className="space-y-4">
      <Skeleton height={20} className="w-36" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton height={16} className="w-32" />
            <Skeleton height={24} className="w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Action buttons */}
    <div className="flex space-x-3 pt-4">
      <Skeleton height={40} className="flex-1 rounded-lg" />
      <Skeleton height={40} className="flex-1 rounded-lg" />
    </div>
  </div>
));

SettingsSkeleton.displayName = 'SettingsSkeleton';