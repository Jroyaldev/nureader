'use client';

import React from 'react';
import classNames from 'classnames';
import Skeleton, { SkeletonText, SkeletonButton, SkeletonCard, SkeletonAvatar } from '../Skeleton';

// Content skeleton for reader view
export const ContentSkeleton = React.memo(({ className, ...props }: { className?: string }) => (
  <div className={classNames('space-y-4 p-6', className)} {...props}>
    <div className="space-y-2">
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-11/12 h-4" />
      <Skeleton variant="text" className="w-10/12 h-4" />
      <Skeleton variant="text" className="w-full h-4" />
    </div>
    
    <div className="space-y-2">
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-9/12 h-4" />
      <Skeleton variant="text" className="w-11/12 h-4" />
      <Skeleton variant="text" className="w-8/12 h-4" />
    </div>
    
    <div className="space-y-2">
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-10/12 h-4" />
      <Skeleton variant="text" className="w-11/12 h-4" />
      <Skeleton variant="text" className="w-9/12 h-4" />
    </div>
    
    <div className="space-y-2">
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-8/12 h-4" />
      <Skeleton variant="text" className="w-10/12 h-4" />
      <Skeleton variant="text" className="w-full h-4" />
    </div>
    
    <div className="space-y-2">
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-11/12 h-4" />
      <Skeleton variant="text" className="w-9/12 h-4" />
    </div>
  </div>
));

// Table of Contents skeleton
export const TOCSkeleton = React.memo(({ className, ...props }: { className?: string }) => (
  <div className={classNames('space-y-3 p-4', className)} {...props}>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <Skeleton variant="text" className="w-6 h-4" />
        <Skeleton variant="text" className={`h-4 ${i % 3 === 0 ? 'w-48' : i % 3 === 1 ? 'w-36' : 'w-40'}`} />
      </div>
    ))}
  </div>
));

// Bookmarks skeleton
export const BookmarksSkeleton = React.memo(({ className, ...props }: { className?: string }) => (
  <div className={classNames('space-y-4 p-4', className)} {...props}>
    {Array.from({ length: 5 }).map((_, i) => (
      <SkeletonCard key={i} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Skeleton variant="text" className="w-32 h-4" />
          <div className="flex space-x-2">
            <Skeleton variant="circle" className="w-6 h-6" />
            <Skeleton variant="circle" className="w-6 h-6" />
          </div>
        </div>
        <Skeleton variant="text" className="w-full h-3 mb-1" />
        <Skeleton variant="text" className="w-4/5 h-3 mb-2" />
        <Skeleton variant="text" className="w-24 h-3" />
      </SkeletonCard>
    ))}
  </div>
));

// Search results skeleton
export const SearchSkeleton = React.memo(({ className, ...props }: { className?: string }) => (
  <div className={classNames('space-y-3 p-4', className)} {...props}>
    <div className="mb-4">
      <Skeleton variant="text" className="w-48 h-5" />
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="border-l-4 border-blue-200 pl-4 py-2">
        <Skeleton variant="text" className="w-24 h-3 mb-1" />
        <Skeleton variant="text" className="w-full h-4 mb-1" />
        <Skeleton variant="text" className="w-3/4 h-4" />
      </div>
    ))}
  </div>
));

// Settings skeleton
export const SettingsSkeleton = React.memo(({ className, ...props }: { className?: string }) => (
  <div className={classNames('space-y-6 p-6', className)} {...props}>
    {Array.from({ length: 4 }).map((_, groupIndex) => (
      <div key={groupIndex} className="space-y-4">
        <Skeleton variant="text" className="w-32 h-5" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, itemIndex) => (
            <div key={itemIndex} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton variant="text" className="w-24 h-4" />
                <Skeleton variant="text" className="w-40 h-3" />
              </div>
              <Skeleton variant="rounded" className="w-16 h-8" />
            </div>
          ))}
        </div>
      </div>
    ))}
    
    <div className="flex justify-end space-x-3 pt-6 border-t">
      <SkeletonButton className="w-20 h-10" />
      <SkeletonButton className="w-16 h-10" />
    </div>
  </div>
));

// Navigation controls skeleton
export const NavigationSkeleton = React.memo(({ className, ...props }: { className?: string }) => (
  <div className={classNames('flex items-center justify-between p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700', className)} {...props}>
    <div className="flex items-center space-x-3">
      <Skeleton variant="circle" className="w-10 h-10" />
      <Skeleton variant="text" className="w-32 h-4" />
    </div>
    
    <div className="flex items-center space-x-2">
      <Skeleton variant="circle" className="w-9 h-9" />
      <Skeleton variant="circle" className="w-9 h-9" />
      <Skeleton variant="circle" className="w-9 h-9" />
      <Skeleton variant="circle" className="w-9 h-9" />
    </div>
  </div>
));

// Progress bar skeleton
export const ProgressSkeleton = React.memo(({ className, ...props }: { className?: string }) => (
  <div className={classNames('space-y-2 p-4', className)} {...props}>
    <div className="flex justify-between text-sm">
      <Skeleton variant="text" className="w-20 h-4" />
      <Skeleton variant="text" className="w-16 h-4" />
    </div>
    <Skeleton variant="rounded" className="w-full h-2" />
  </div>
));

// Complete EPUB loading skeleton with book preview
export const EPUBLoadingSkeleton = React.memo(({ 
  className, 
  showContent = false, 
  ...props 
}: { 
  className?: string;
  showContent?: boolean;
}) => (
  <div className={classNames('h-full flex flex-col', className)} {...props}>
    <NavigationSkeleton />
    
    <div className="flex-1 flex">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-24 h-5" />
          <div className="space-y-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} variant="text" className={`h-3 ${i % 4 === 0 ? 'w-32' : i % 4 === 1 ? 'w-28' : i % 4 === 2 ? 'w-36' : 'w-24'}`} />
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 relative">
        {showContent ? (
          <ContentSkeleton className="h-full overflow-auto" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto">
                <Skeleton variant="rounded" className="w-full h-full" />
              </div>
              <Skeleton variant="text" className="w-48 h-5 mx-auto" />
              <Skeleton variant="text" className="w-32 h-4 mx-auto" />
            </div>
          </div>
        )}
      </div>
    </div>
    
    <ProgressSkeleton />
  </div>
));

// Image loading skeleton
export const ImageSkeleton = React.memo(({ 
  className, 
  aspectRatio = 'aspect-video',
  ...props 
}: { 
  className?: string;
  aspectRatio?: string;
}) => (
  <div className={classNames('bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden', aspectRatio, className)} {...props}>
    <Skeleton variant="rect" className="w-full h-full" />
  </div>
));

// List item skeleton for various lists
export const ListItemSkeleton = React.memo(({ className, ...props }: { className?: string }) => (
  <div className={classNames('flex items-center space-x-3 p-3', className)} {...props}>
    <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
    <div className="flex-1 space-y-1">
      <Skeleton variant="text" className="w-3/4 h-4" />
      <Skeleton variant="text" className="w-1/2 h-3" />
    </div>
    <Skeleton variant="circle" className="w-6 h-6 flex-shrink-0" />
  </div>
));

// Set display names
ContentSkeleton.displayName = 'ContentSkeleton';
TOCSkeleton.displayName = 'TOCSkeleton';
BookmarksSkeleton.displayName = 'BookmarksSkeleton';
SearchSkeleton.displayName = 'SearchSkeleton';
SettingsSkeleton.displayName = 'SettingsSkeleton';
NavigationSkeleton.displayName = 'NavigationSkeleton';
ProgressSkeleton.displayName = 'ProgressSkeleton';
EPUBLoadingSkeleton.displayName = 'EPUBLoadingSkeleton';
ImageSkeleton.displayName = 'ImageSkeleton';
ListItemSkeleton.displayName = 'ListItemSkeleton';