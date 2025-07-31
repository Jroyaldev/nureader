'use client';

import React from 'react';
import classNames from 'classnames';
import { useMotionPreferences } from '../hooks/useMotionPreferences';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rect' | 'circle' | 'rounded';
  animation?: 'pulse' | 'shimmer' | 'none';
  lines?: number; // For text variant
  children?: React.ReactNode;
}

const Skeleton = React.memo(({
  className,
  width,
  height,
  variant = 'rect',
  animation = 'shimmer',
  lines = 1,
  children,
  ...props
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) => {
  const { getAnimation } = useMotionPreferences();
  const effectiveAnimation = getAnimation(animation);
  // If children are provided, show shimmer overlay on actual content
  if (children) {
    return (
      <div 
        className={classNames(
          'relative overflow-hidden',
          className
        )}
        style={{ width, height }}
        aria-hidden="true"
        {...props}
      >
        {children}
        <div className={classNames(
          'absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent',
          {
            'animate-shimmer': effectiveAnimation === 'shimmer',
            'animate-pulse': effectiveAnimation === 'pulse',
          }
        )} />
      </div>
    );
  }

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className={classNames('space-y-2', className)} aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={classNames(
              'h-4 bg-gray-200 dark:bg-gray-700',
              'rounded',
              {
                'animate-shimmer': effectiveAnimation === 'shimmer',
                'animate-pulse': effectiveAnimation === 'pulse',
              }
            )}
            style={{
              width: index === lines - 1 ? '75%' : '100%', // Last line shorter
              height
            }}
          />
        ))}
      </div>
    );
  }

  // Single skeleton element
  return (
    <div
      className={classNames(
        'bg-gray-200 dark:bg-gray-700',
        {
          // Variants
          'rounded': variant === 'rect' || variant === 'text',
          'rounded-full': variant === 'circle',
          'rounded-lg': variant === 'rounded',
          
          // Animations
          'animate-shimmer': effectiveAnimation === 'shimmer',
          'animate-pulse': effectiveAnimation === 'pulse',
          
          // Default sizes
          'h-4': variant === 'text' && !height,
          'w-full': variant === 'text' && !width,
          'w-12 h-12': variant === 'circle' && !width && !height,
          'h-6': variant === 'rect' && !height,
        },
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// Specialized skeleton components for common use cases
export const SkeletonText = React.memo(({ lines = 3, className, ...props }: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton variant="text" lines={lines} className={className} {...props} />
));

export const SkeletonAvatar = React.memo(({ size = 48, className, ...props }: Omit<SkeletonProps, 'variant'> & { size?: number }) => (
  <Skeleton 
    variant="circle" 
    width={size} 
    height={size} 
    className={className} 
    {...props} 
  />
));

export const SkeletonButton = React.memo(({ className, ...props }: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton 
    variant="rounded" 
    height="2.5rem"
    width="6rem"
    className={className} 
    {...props} 
  />
));

export const SkeletonCard = React.memo(({ className, children, ...props }: SkeletonProps) => (
  <div 
    className={classNames(
      'p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3',
      className
    )}
    aria-hidden="true"
    {...props}
  >
    {children || (
      <>
        <div className="flex items-center space-x-3">
          <SkeletonAvatar size={40} />
          <div className="flex-1">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" className="mt-1" />
          </div>
        </div>
        <SkeletonText lines={2} />
      </>
    )}
  </div>
));

SkeletonText.displayName = 'SkeletonText';
SkeletonAvatar.displayName = 'SkeletonAvatar';
SkeletonButton.displayName = 'SkeletonButton';
SkeletonCard.displayName = 'SkeletonCard';

export default Skeleton;