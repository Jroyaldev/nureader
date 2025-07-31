'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoChevronBack, IoChevronForward, IoDownload, IoExpand } from 'react-icons/io5';
import classNames from 'classnames';

interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt?: string;
    caption?: string;
  }>;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setTransform({ scale: 1, x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrevious, handleNext, handleZoomIn, handleZoomOut, resetZoom]);

  const handlePrevious = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    resetZoom();
  }, [images.length, resetZoom]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    resetZoom();
  }, [images.length, resetZoom]);

  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 5)
    }));
    setIsZoomed(true);
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => {
      const newScale = Math.max(prev.scale / 1.2, 1);
      return {
        scale: newScale,
        x: newScale === 1 ? 0 : prev.x,
        y: newScale === 1 ? 0 : prev.y
      };
    });
    
    if (transform.scale <= 1.2) {
      setIsZoomed(false);
    }
  }, [transform.scale]);

  const resetZoom = useCallback(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
    setIsZoomed(false);
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    if (transform.scale > 1) {
      resetZoom();
    } else {
      handleZoomIn();
    }
  }, [transform.scale, handleZoomIn, resetZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (transform.scale <= 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - transform.x,
      y: e.clientY - transform.y
    });
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || transform.scale <= 1) return;
    
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  }, [isDragging, dragStart, transform.scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(images[currentIndex].src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${currentIndex + 1}.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [images, currentIndex]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="text-white text-sm">
            {currentIndex + 1} of {images.length}
          </span>
          {currentImage.caption && (
            <span className="text-gray-300 text-sm max-w-md truncate">
              {currentImage.caption}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 text-white hover:text-gray-300 transition-colors"
            aria-label="Download image"
          >
            <IoDownload className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleZoomIn}
            className="p-2 text-white hover:text-gray-300 transition-colors"
            aria-label="Zoom in"
          >
            <IoExpand className="w-5 h-5" />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-white hover:text-gray-300 transition-colors"
            aria-label="Close gallery"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handleImageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: isZoomed 
              ? (isDragging ? 'grabbing' : 'grab')
              : 'zoom-in'
          }}
        >
          <img
            src={currentImage.src}
            alt={currentImage.alt || `Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${transform.scale}) translate(${transform.x / transform.scale}px, ${transform.y / transform.scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            draggable={false}
          />
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className={classNames(
                'absolute left-4 top-1/2 -translate-y-1/2',
                'p-3 bg-black/50 hover:bg-black/70 rounded-full',
                'text-white transition-all duration-200',
                'hover:scale-110'
              )}
              aria-label="Previous image"
            >
              <IoChevronBack className="w-6 h-6" />
            </button>
            
            <button
              onClick={handleNext}
              className={classNames(
                'absolute right-4 top-1/2 -translate-y-1/2',
                'p-3 bg-black/50 hover:bg-black/70 rounded-full',
                'text-white transition-all duration-200',
                'hover:scale-110'
              )}
              aria-label="Next image"
            >
              <IoChevronForward className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Zoom controls */}
      {isZoomed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
          <button
            onClick={handleZoomOut}
            className="p-2 text-white hover:text-gray-300 transition-colors"
            aria-label="Zoom out"
          >
            <span className="text-lg font-mono">−</span>
          </button>
          
          <span className="text-white text-sm min-w-[4rem] text-center">
            {Math.round(transform.scale * 100)}%
          </span>
          
          <button
            onClick={handleZoomIn}
            className="p-2 text-white hover:text-gray-300 transition-colors"
            aria-label="Zoom in"
          >
            <span className="text-lg font-mono">+</span>
          </button>
          
          <div className="w-px h-6 bg-gray-600 mx-2" />
          
          <button
            onClick={resetZoom}
            className="px-3 py-1 text-white hover:text-gray-300 transition-colors text-sm"
            aria-label="Reset zoom"
          >
            Reset
          </button>
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="p-4 bg-black/50 backdrop-blur-sm">
          <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  resetZoom();
                }}
                className={classNames(
                  'flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all',
                  {
                    'border-white': index === currentIndex,
                    'border-transparent hover:border-gray-400': index !== currentIndex
                  }
                )}
                aria-label={`Go to image ${index + 1}`}
              >
                <img
                  src={image.src}
                  alt={image.alt || `Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;