'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { ReadingSettings, Highlight } from './types';
import HighlightColorPicker from './HighlightColorPicker';
import OptimizedImage from './OptimizedImage';
import { ContentSkeleton } from './skeletons';
import { useMobileTouch, useMobileCapabilities } from '../hooks/useMobileTouch';
import { useImageOptimization } from '../hooks/useImageOptimization';
import { 
  getTextSelection, 
  getSelectedText, 
  clearSelection, 
  getSelectionCoordinates,
  calculateTextOffset,
  renderHighlights
} from './highlightUtils';

interface ChapterViewProps {
  content: string;
  settings: ReadingSettings;
  highlights: Highlight[];
  onHighlight: (text: string, color: Highlight['color'], startOffset: number, endOffset: number) => void;
  onProgressChange: (progress: number) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  isFirstChapter: boolean;
  isLastChapter: boolean;
  isLoading?: boolean;
  chapterTitle?: string;
}

const ChapterView: React.FC<ChapterViewProps> = ({
  content,
  settings,
  highlights = [],
  onHighlight,
  onProgressChange,
  onNavigate,
  isFirstChapter,
  isLastChapter,
  isLoading = false,
  chapterTitle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  
  // Mobile capabilities
  const capabilities = useMobileCapabilities();
  
  // Image optimization
  const { getCachedImage, preloadImages } = useImageOptimization();

  // Clean and sanitize content
  const cleanContent = React.useMemo(() => {
    if (!content) return '';

    // Keep only safe markup; allow data/blob URLs produced by the hook
    let sanitized = DOMPurify.sanitize(content, {
      ADD_TAGS: ['image', 'svg'],
      ADD_ATTR: ['srcset', 'alt', 'style', 'href', 'src'],
      ALLOW_DATA_ATTR: true
    });

    // Do not rewrite src/href here; the hook now resolves resources to blob/data URLs already.
    return sanitized;
  }, [content]);

  // Track scroll position
  const updateScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;
    
    if (maxScroll <= 0) {
      onProgressChange(100);
      return;
    }
    
    const progress = (scrollTop / maxScroll) * 100;
    onProgressChange(Math.min(100, Math.max(0, progress)));
  }, [onProgressChange]);

  // Handle text selection for highlighting
  const handleTextSelection = useCallback(() => {
    if (!contentRef.current || !onHighlight) return;
    
    const text = getSelectedText();
    if (text.length < 3) {
      setShowColorPicker(false);
      return;
    }

    const selection = getTextSelection();
    if (!selection) return;

    const coords = getSelectionCoordinates();
    if (coords) {
      setSelectedText(text);
      setColorPickerPosition(coords);
      setShowColorPicker(true);
      
      const startOffset = calculateTextOffset(contentRef.current, selection.startContainer, selection.startOffset);
      const endOffset = calculateTextOffset(contentRef.current, selection.endContainer, selection.endOffset);
      setSelectionRange({ start: startOffset, end: endOffset });
    }
  }, [onHighlight]);

  const handleHighlightColor = useCallback((color: Highlight['color']) => {
    if (selectedText && selectionRange && onHighlight) {
      onHighlight(selectedText, color, selectionRange.start, selectionRange.end);
      clearSelection();
      setShowColorPicker(false);
      setSelectedText('');
      setSelectionRange(null);
    }
  }, [selectedText, selectionRange, onHighlight]);

  // Process images in content
  const processImages = useCallback(async (element: HTMLElement) => {
    const images = element.querySelectorAll('img');
    
    for (const img of Array.from(images)) {
      const src = img.getAttribute('src');
      if (!src || (!src.startsWith('blob:') && !src.startsWith('data:'))) {
        continue;
      }

      // Create optimized image wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'image-wrapper relative';
      
      // Add loading placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg flex items-center justify-center';
      placeholder.style.minHeight = '200px';
      placeholder.innerHTML = `
        <div class="flex flex-col items-center text-gray-400 dark:text-gray-500">
          <svg class="w-12 h-12 mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
          </svg>
          <span class="text-sm">Loading image...</span>
        </div>
      `;
      
      wrapper.appendChild(placeholder);
      
      // Replace original image
      img.parentNode?.replaceChild(wrapper, img);
      
      // Load optimized image
      try {
        const optimizedImg = document.createElement('img');
        optimizedImg.src = src;
        optimizedImg.alt = img.alt || '';
        optimizedImg.className = classNames(
          'max-w-full h-auto rounded-lg shadow-lg my-4 mx-auto block',
          'transition-opacity duration-300 opacity-0',
          'cursor-zoom-in hover:shadow-xl'
        );
        optimizedImg.loading = 'lazy';
        optimizedImg.decoding = 'async';
        
        // Add click handler for zoom
        optimizedImg.addEventListener('click', () => {
          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4';
          modal.innerHTML = `
            <div class="relative max-w-full max-h-full">
              <img src="${src}" alt="${img.alt || ''}" class="max-w-full max-h-full object-contain" style="max-width: 90vw; max-height: 90vh;">
              <button class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors" aria-label="Close zoom">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          `;
          
          modal.addEventListener('click', (e) => {
            if (e.target === modal || (e.target as HTMLElement).closest('button')) {
              document.body.removeChild(modal);
            }
          });
          
          document.body.appendChild(modal);
        });
        
        optimizedImg.onload = () => {
          wrapper.removeChild(placeholder);
          optimizedImg.style.opacity = '1';
          wrapper.appendChild(optimizedImg);
        };
        
        optimizedImg.onerror = () => {
          placeholder.innerHTML = `
            <div class="flex flex-col items-center text-red-400">
              <svg class="w-12 h-12 mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span class="text-sm">Failed to load image</span>
            </div>
          `;
        };
        
      } catch (error) {
        console.warn('Failed to process image:', error);
        placeholder.innerHTML = `
          <div class="flex flex-col items-center text-red-400">
            <svg class="w-12 h-12 mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm">Image processing failed</span>
          </div>
        `;
      }
    }
  }, []);

  // Apply content and highlights
  useEffect(() => {
    if (!contentRef.current || !cleanContent) return;
    
    contentRef.current.innerHTML = cleanContent;
    
    // Process images for optimization
    processImages(contentRef.current);
    
    if (highlights.length > 0) {
      renderHighlights(contentRef.current, highlights, (highlight) => {
        console.log('Highlight clicked:', highlight);
      });
    }
    
    // Only scroll to top when content actually changes
    if (containerRef.current && cleanContent !== lastContentRef.current) {
      containerRef.current.scrollTop = 0;
      updateScrollPosition();
      lastContentRef.current = cleanContent;
    }
  }, [cleanContent, highlights, updateScrollPosition, processImages]);

  // Track scroll progress
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      updateScrollPosition();
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollPosition();
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [updateScrollPosition]);

  // Handle text selection
  useEffect(() => {
    if (!contentRef.current || !onHighlight) return;
    
    const handleSelection = () => {
      handleTextSelection();
    };
    
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [handleTextSelection, onHighlight]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const selection = window.getSelection();
      const hasSelection = selection ? selection.toString().trim().length > 0 : false;
      
      if (hasSelection && !e.ctrlKey && !e.metaKey) {
        const colorKey = e.key.toLowerCase();
        const colorMap: Record<string, Highlight['color']> = {
          'y': 'yellow',
          'g': 'green', 
          'b': 'blue',
          'p': 'pink',
          'o': 'orange'
        };
        
        if (colorMap[colorKey]) {
          e.preventDefault();
          handleHighlightColor(colorMap[colorKey]);
          return;
        }
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (!isFirstChapter) onNavigate('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!isLastChapter) onNavigate('next');
          break;
        case 'Home':
          e.preventDefault();
          containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          e.preventDefault();
          if (containerRef.current) {
            const { scrollHeight, clientHeight } = containerRef.current;
            containerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHighlightColor, onNavigate, isFirstChapter, isLastChapter]);

  // Mobile touch handling
  const { touchHandlers } = useMobileTouch({
    onSwipeLeft: () => !isLastChapter && onNavigate('next'),
    onSwipeRight: () => !isFirstChapter && onNavigate('prev'),
    swipeThreshold: 50,
    preventScrollOnSwipe: false
  });

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

  // Ensure settings have default values
  const safeSettings = {
    fontSize: settings?.fontSize || 16,
    fontFamily: settings?.fontFamily || 'serif',
    lineHeight: settings?.lineHeight || 1.6,
    letterSpacing: settings?.letterSpacing || 0,
    marginSize: settings?.marginSize || 40,
    theme: settings?.theme || 'light' as const,
    readingMode: settings?.readingMode || 'normal' as const,
  };

  if (isLoading) {
    return <ContentSkeleton className="h-full" />;
  }

  return (
    <div
      ref={containerRef}
      className={classNames(
        'absolute inset-0 overflow-y-auto overflow-x-hidden',
        themeClasses[safeSettings.theme]
      )}
      {...touchHandlers}
      style={{
        fontSize: `${safeSettings.fontSize}px`,
        fontFamily: safeSettings.fontFamily,
        lineHeight: safeSettings.lineHeight,
        letterSpacing: `${safeSettings.letterSpacing}px`,
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Chapter Title */}
      {chapterTitle && (
        <h1 className={classNames(
          'text-2xl font-bold mb-6',
          'text-gray-900 dark:text-gray-100',
          modeClasses[safeSettings.readingMode]
        )}
        style={{
          paddingTop: `${safeSettings.marginSize}px`,
          paddingLeft: `${capabilities.isSmallScreen ? safeSettings.marginSize : safeSettings.marginSize * 2}px`,
          paddingRight: `${capabilities.isSmallScreen ? safeSettings.marginSize : safeSettings.marginSize * 2}px`,
        }}>
          {chapterTitle}
        </h1>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        className={classNames(
          'prose prose-lg max-w-none',
          modeClasses[safeSettings.readingMode],
          'prose-headings:font-serif prose-headings:font-medium',
          'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
          'prose-headings:mb-4 prose-headings:mt-8',
          'prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
          'prose-p:text-gray-800 dark:prose-p:text-gray-200',
          'prose-p:mb-4 prose-p:leading-relaxed',
          'prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold',
          'prose-em:text-gray-800 dark:prose-em:text-gray-200',
          'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600',
          'prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-6',
          'prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8',
          'prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
          'selection:bg-blue-200 dark:selection:bg-blue-800'
        )}
        style={{
          paddingTop: chapterTitle ? '0' : `${safeSettings.marginSize * 1.5}px`,
          paddingLeft: `${capabilities.isSmallScreen ? safeSettings.marginSize : safeSettings.marginSize * 2}px`,
          paddingRight: `${capabilities.isSmallScreen ? safeSettings.marginSize : safeSettings.marginSize * 2}px`,
          paddingBottom: `${safeSettings.marginSize * 3}px`,
          maxWidth: safeSettings.readingMode === 'normal' ? '100%' : safeSettings.readingMode === 'focus' ? '75ch' : '65ch',
          margin: '0 auto'
        }}
      />

      {/* Navigation hints at bottom */}
      <div className={classNames(
        'flex justify-between items-center py-8',
        'text-gray-500 dark:text-gray-400 text-sm',
        modeClasses[safeSettings.readingMode]
      )}
      style={{
        paddingLeft: `${capabilities.isSmallScreen ? safeSettings.marginSize : safeSettings.marginSize * 2}px`,
        paddingRight: `${capabilities.isSmallScreen ? safeSettings.marginSize : safeSettings.marginSize * 2}px`,
      }}>
        <div>
          {!isFirstChapter && (
            <span className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onNavigate('prev')}>
              ← Previous Chapter
            </span>
          )}
        </div>
        <div>
          {!isLastChapter && (
            <span className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onNavigate('next')}>
              Next Chapter →
            </span>
          )}
        </div>
      </div>

      {/* Highlight Color Picker */}
      {showColorPicker && colorPickerPosition && (
        <HighlightColorPicker
          position={colorPickerPosition}
          onColorSelect={handleHighlightColor}
          onClose={() => {
            setShowColorPicker(false);
            clearSelection();
          }}
        />
      )}
    </div>
  );
};

export default ChapterView;