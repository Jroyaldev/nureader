'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import classNames from 'classnames';

interface OptimizedImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  placeholder?: string;
  onClick?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt = '',
  className = '',
  style = {},
  onLoad,
  onError,
  lazy = true,
  placeholder,
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [showZoom, setShowZoom] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  const handleImageClick = useCallback(() => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: toggle zoom
      setShowZoom(true);
    }
  }, [onClick]);

  const handleZoomClose = useCallback(() => {
    setShowZoom(false);
  }, []);

  // Generate placeholder with shimmer effect
  const renderPlaceholder = () => (
    <div
      className={classNames(
        'bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg',
        'flex items-center justify-center',
        className
      )}
      style={{
        minHeight: '200px',
        ...style
      }}
    >
      <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
        <svg
          className="w-12 h-12 mb-2"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm">Loading image...</span>
      </div>
    </div>
  );

  // Error state
  const renderError = () => (
    <div
      className={classNames(
        'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
        'flex items-center justify-center text-red-600 dark:text-red-400',
        className
      )}
      style={{
        minHeight: '200px',
        ...style
      }}
    >
      <div className="flex flex-col items-center">
        <svg
          className="w-12 h-12 mb-2"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm">Failed to load image</span>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={containerRef}
        className={classNames(
          'relative overflow-hidden rounded-lg',
          {
            'cursor-zoom-in': !showZoom && (isLoaded || placeholder),
            'cursor-pointer': onClick
          }
        )}
        onClick={isLoaded ? handleImageClick : undefined}
      >
        {/* Show placeholder while loading */}
        {!isLoaded && !isError && renderPlaceholder()}

        {/* Show error state */}
        {isError && renderError()}

        {/* Actual image - only render when in view */}
        {isInView && !isError && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={classNames(
              'transition-opacity duration-300',
              {
                'opacity-0': !isLoaded,
                'opacity-100': isLoaded
              },
              className
            )}
            style={{
              ...style,
              display: isLoaded ? 'block' : 'none'
            }}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            decoding="async"
          />
        )}

        {/* Loading overlay */}
        {!isLoaded && !isError && isInView && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
          </div>
        )}
      </div>

      {/* Fullscreen zoom modal */}
      {showZoom && isLoaded && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={handleZoomClose}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh'
              }}
            />
            <button
              onClick={handleZoomClose}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              aria-label="Close zoom"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </>
  );
};

export default OptimizedImage;