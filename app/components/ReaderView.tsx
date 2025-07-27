'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { ReadingSettings } from './types';

interface ReaderViewProps {
  content: string;
  settings: ReadingSettings;
  onNextChapter: () => void;
  onPrevChapter: () => void;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (totalPages: number) => void;
  isFirstChapter: boolean;
  isLastChapter: boolean;
  currentPage: number;
  totalPages: number;
  chapterProgress: number;
}

const ReaderView = React.memo(({
  content,
  settings,
  onNextChapter,
  onPrevChapter,
  onPageChange,
  onTotalPagesChange,
  isFirstChapter,
  isLastChapter,
  currentPage,
  totalPages,
  chapterProgress
}: ReaderViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToPage = useCallback((page: number, smooth = true) => {
    if (!containerRef.current || isTransitioning) return;

    if (page < 1) {
      if (!isFirstChapter) {
        setIsTransitioning(true);
        onPrevChapter();
        setTimeout(() => setIsTransitioning(false), 300);
      }
      return;
    }
    if (page > totalPages) {
      if (!isLastChapter) {
        setIsTransitioning(true);
        onNextChapter();
        setTimeout(() => setIsTransitioning(false), 300);
      }
      return;
    }

    const pageHeight = containerRef.current.clientHeight;
    const scrollTop = (page - 1) * pageHeight;
    
    if (smooth) {
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    } else {
      containerRef.current.scrollTop = scrollTop;
    }
    
    onPageChange(page);
  }, [isTransitioning, isFirstChapter, isLastChapter, totalPages, onPrevChapter, onNextChapter, onPageChange]);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goToPage(currentPage - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          goToPage(currentPage + 1);
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, goToPage]);

  // Set content and handle page calculations
  useEffect(() => {
    if (!contentRef.current || !containerRef.current) return;

    const cleanContent = DOMPurify.sanitize(content, {
      ADD_TAGS: ['image', 'svg'],
      ADD_ATTR: ['srcset', 'alt']
    });
    
    contentRef.current.innerHTML = cleanContent;

    // Calculate pages based on content height
    const calculatePages = () => {
      if (!contentRef.current || !containerRef.current) return;
      
      const containerHeight = containerRef.current.clientHeight;
      const contentHeight = contentRef.current.scrollHeight;
      
      if (contentHeight > 0 && containerHeight > 0) {
        const pages = Math.max(1, Math.ceil(contentHeight / containerHeight));
        // Update total pages for this chapter
        if (pages !== totalPages) {
          onTotalPagesChange(pages);
          onPageChange(1); // Reset to first page when content changes
        }
      }
    };

    // Wait for images to load before calculating pages
    const images = contentRef.current.querySelectorAll('img');
    let loadedImages = 0;
    
    if (images.length === 0) {
      calculatePages();
    } else {
      images.forEach((img) => {
        if (img.complete) {
          loadedImages++;
          if (loadedImages === images.length) {
            calculatePages();
          }
        } else {
          img.onload = () => {
            loadedImages++;
            if (loadedImages === images.length) {
              calculatePages();
            }
          };
          img.onerror = () => {
            loadedImages++;
            if (loadedImages === images.length) {
              calculatePages();
            }
          };
        }
      });
    }
  }, [content, totalPages, onPageChange, onTotalPagesChange]);

  const themeClasses = {
    light: 'bg-white text-gray-900',
    dark: 'bg-gray-900 text-gray-100',
    sepia: 'bg-amber-50 text-amber-900'
  };

  const modeClasses = {
    normal: '',
    focus: 'max-w-4xl mx-auto',
    immersive: 'max-w-3xl mx-auto'
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        className={classNames(
          'flex-1 overflow-hidden relative transition-all duration-300',
          themeClasses[settings.theme],
          modeClasses[settings.readingMode],
          {
            'opacity-70': isTransitioning
          }
        )}
        style={{
          fontSize: `${settings.fontSize}px`,
          fontFamily: settings.fontFamily,
          lineHeight: settings.lineHeight,
          letterSpacing: `${settings.letterSpacing}px`
        }}
      >
        <div
          ref={contentRef}
          className="prose max-w-none transition-all duration-300"
          style={{
            padding: `${settings.marginSize}px`,
            maxWidth: `${settings.columnWidth}ch`,
            margin: settings.pageLayout === 'single' ? '0 auto' : undefined,
            columns: settings.pageLayout === 'double' ? 2 : undefined,
            columnGap: settings.pageLayout === 'double' ? `${settings.marginSize * 2}px` : undefined
          }}
        />
        
        {/* Page turn animations */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 animate-pulse" />
        )}
      </div>
      
      {/* Navigation Controls */}
      {settings.readingMode !== 'immersive' && (
        <div className="flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 && isFirstChapter}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 group"
            aria-label="Previous page"
          >
            <IoChevronBack className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Previous</span>
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${chapterProgress}%` }}
              />
            </div>
          </div>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages && isLastChapter}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 group"
            aria-label="Next page"
          >
            <span className="text-sm font-medium">Next</span>
            <IoChevronForward className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      )}
    </div>
  );
});

ReaderView.displayName = 'ReaderView';

export default ReaderView;