'use client';

import React, { useState } from 'react';
import classNames from 'classnames';
import { IoImageOutline } from 'react-icons/io5';
import Skeleton from './Skeleton';

interface SkeletonImageProps {
  src: string;
  alt: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  fallbackIcon?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

const SkeletonImage = React.memo(({
  src,
  alt,
  width = '100%',
  height = '12rem',
  className,
  fallbackIcon,
  onLoad,
  onError,
  ...props
}: SkeletonImageProps & React.HTMLAttributes<HTMLDivElement>) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  if (error) {
    return (
      <div 
        className={classNames(
          'bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600',
          className
        )}
        style={{ width, height }}
        aria-label={`Failed to load image: ${alt}`}
        {...props}
      >
        <div className="text-center text-gray-400 dark:text-gray-500">
          {fallbackIcon || <IoImageOutline className="w-8 h-8 mx-auto mb-2" />}
          <div className="text-sm">Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={classNames('relative', className)}
      style={{ width, height }}
      {...props}
    >
      {loading && (
        <Skeleton 
          width="100%" 
          height="100%" 
          variant="rounded" 
          className="absolute inset-0"
        >
          <div className="flex items-center justify-center h-full">
            <IoImageOutline className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
        </Skeleton>
      )}
      <img
        src={src}
        alt={alt}
        className={classNames(
          'w-full h-full object-cover rounded-lg transition-opacity duration-300',
          {
            'opacity-0': loading,
            'opacity-100': !loading
          }
        )}
        onLoad={handleLoad}
        onError={handleError}
        style={{ 
          display: loading ? 'none' : 'block'
        }}
      />
    </div>
  );
});

SkeletonImage.displayName = 'SkeletonImage';

export default SkeletonImage;