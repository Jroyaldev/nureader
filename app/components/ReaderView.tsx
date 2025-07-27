'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { ReadingSettings, Highlight } from './types';
import HighlightColorPicker from './HighlightColorPicker';
import { ContentSkeleton } from './skeletons';
import { useMobileTouch, useMobileCapabilities } from './useMobileTouch';
import { 
  getTextSelection, 
  getSelectedText, 
  clearSelection, 
  getSelectionCoordinates,
  calculateTextOffset,
  renderHighlights
} from './highlightUtils';

interface ReaderViewProps {
  content: string;
  settings: ReadingSettings;
  onNextChapter: () => void;
  onPrevChapter: () => void;
  onProgressChange: (progress: number) => void;
  isFirstChapter: boolean;
  isLastChapter: boolean;
  chapterProgress: number;
  highlights?: Highlight[];
  onHighlight?: (text: string, color: Highlight['color'], startOffset: number, endOffset: number) => void;
  onHighlightClick?: (highlight: Highlight) => void;
  isLoading?: boolean;
  isTransitioning?: boolean;
}

const ReaderView = React.memo(({
  content,
  settings,
  onNextChapter,
  onPrevChapter,
  onProgressChange,
  isFirstChapter,
  isLastChapter,
  chapterProgress: _chapterProgress,
  highlights = [],
  onHighlight,
  onHighlightClick = () => {},
  isLoading = false,
  isTransitioning: isTransitioningProp = false
}: ReaderViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  
  // Mobile touch capabilities
  const capabilities = useMobileCapabilities();


  // Page navigation with smooth scrolling
  const navigatePage = useCallback((direction: 'next' | 'prev') => {
    const container = containerRef.current;
    if (!container) return;
    
    const viewportHeight = container.clientHeight;
    const currentScroll = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const maxScroll = scrollHeight - viewportHeight;
    
    if (direction === 'next') {
      if (maxScroll <= 0 || currentScroll >= maxScroll - 10) {
        if (!isLastChapter) {
          onNextChapter();
        }
      } else {
        const targetScroll = Math.min(currentScroll + viewportHeight * 0.9, maxScroll);
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    } else {
      if (currentScroll <= 10) {
        if (!isFirstChapter) {
          onPrevChapter();
        }
      } else {
        const targetScroll = Math.max(currentScroll - viewportHeight * 0.9, 0);
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  }, [isFirstChapter, isLastChapter, onNextChapter, onPrevChapter]);


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

  const handleHighlightColor = useCallback((color: Highlight['color']) => {
    if (selectedText && selectionRange && onHighlight) {
      onHighlight(selectedText, color, selectionRange.start, selectionRange.end);
      clearSelection();
      setShowColorPicker(false);
      setSelectedText('');
      setSelectionRange(null);
    }
  }, [selectedText, selectionRange, onHighlight]);

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
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          navigatePage('prev');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          navigatePage('next');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHighlightColor, navigatePage]);

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

  // Clean and sanitize content
  const cleanContent = React.useMemo(() => {
    if (!content) return '';
    return DOMPurify.sanitize(content, {
      ADD_TAGS: ['image', 'svg'],
      ADD_ATTR: ['srcset', 'alt']
    });
  }, [content]);

  // Handle text selection
  useEffect(() => {
    if (!contentRef.current || !onHighlight) return;
    
    const handleSelection = () => {
      handleTextSelection();
    };
    
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [handleTextSelection, onHighlight]);

  // Apply content and highlights
  useEffect(() => {
    if (!contentRef.current || !cleanContent) return;
    
    contentRef.current.innerHTML = cleanContent;
    
    if (highlights.length > 0) {
      renderHighlights(contentRef.current, highlights);
    }
    
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      updateScrollPosition();
    }
  }, [cleanContent, highlights, updateScrollPosition]);

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

  // Mobile touch handling
  const { touchHandlers } = useMobileTouch({
    onSwipeLeft: () => navigatePage('next'),
    onSwipeRight: () => navigatePage('prev'),
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

  if (isLoading || (isTransitioningProp && !content)) {
    return <ContentSkeleton className="h-full" />;
  }

  return (
    <div
      ref={containerRef}
      className={classNames(
        'h-full overflow-y-auto overflow-x-hidden scroll-smooth',
        themeClasses[settings.theme]
      )}
      {...touchHandlers}
      style={{
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily,
        lineHeight: settings.lineHeight,
        letterSpacing: `${settings.letterSpacing}px`
      }}
    >
        {/* Content */}
        <div
          ref={contentRef}
          className={classNames(
            'prose prose-lg max-w-none',
            modeClasses[settings.readingMode],
            // Enhanced typography classes
            'prose-headings:font-serif prose-headings:font-medium',
            'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
            'prose-headings:mb-4 prose-headings:mt-8',
            'prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
            // Improved paragraph styling
            'prose-p:text-gray-800 dark:prose-p:text-gray-200',
            'prose-p:mb-4 prose-p:leading-relaxed',
            // Better contrast and readability
            'prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold',
            'prose-em:text-gray-800 dark:prose-em:text-gray-200',
            // Refined blockquote styling
            'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600',
            'prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-6',
            // Image handling
            'prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8',
            // Link styling
            'prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
            // Selection color
            'selection:bg-blue-200 dark:selection:bg-blue-800'
          )}
          style={{
            padding: `${settings.marginSize * 1.5}px ${capabilities.isSmallScreen ? settings.marginSize : settings.marginSize * 2}px`,
            paddingBottom: `${settings.marginSize * 3}px`,
            maxWidth: settings.readingMode === 'normal' ? '100%' : settings.readingMode === 'focus' ? '75ch' : '65ch',
            margin: '0 auto',
            minHeight: '100vh' // Ensure minimum height for proper scrolling
          }}
        />
        
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
});

ReaderView.displayName = 'ReaderView';

export default ReaderView;