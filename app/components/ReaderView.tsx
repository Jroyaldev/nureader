'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { ReadingSettings, Highlight } from './types';
import HighlightColorPicker from './HighlightColorPicker';
import { ContentSkeleton } from './skeletons';
import { useMobileTouch, useMobileCapabilities } from '../hooks/useMobileTouch';
import { 
  getTextSelection, 
  getSelectedText, 
  clearSelection, 
  getSelectionCoordinates,
  calculateTextOffset,
  renderHighlights
} from './highlightUtils';
import styles from './PageTurnAnimation.module.css';
import scrollSnapStyles from './PageScrollSnap.module.css';

interface ReaderViewProps {
  content: string;
  settings: ReadingSettings;
  onNextChapter: () => void;
  onPrevChapter: () => void;
  onProgressChange: (progress: number) => void;
  onPageChange?: (currentPage: number, totalPages: number) => void;
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
  onPageChange,
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
<<<<<<< HEAD
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'next' | 'prev'>('next');
=======
  const [showSwipeHint, setShowSwipeHint] = useState(false);
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
  
  // Mobile touch capabilities and performance optimization
  const capabilities = useMobileCapabilities();
  useTouchPerformance(); // Optimize touch performance

  // Show swipe hint on first load for mobile users
  useEffect(() => {
    if (capabilities.isTouchDevice && !localStorage.getItem('swipe-hint-shown')) {
      setShowSwipeHint(true);
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('swipe-hint-shown', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [capabilities.isTouchDevice]);

<<<<<<< HEAD
  // Calculate total pages based on content
  const calculatePages = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      setTotalPages(1);
      return;
    }
    
    // For page-based layout
    if (settings.pageLayout === 'single') {
      // Allow layout to settle and force a reflow before calculating
      setTimeout(() => {
        try {
          // Force the container to apply column layout
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          
          // Set column width to viewport width to ensure proper pagination
          content.style.columnWidth = `${containerWidth}px`;
          content.style.columnGap = `${settings.marginSize * 2}px`;
          content.style.columnFill = 'auto';
          content.style.height = `${containerHeight}px`;
          
          // Force reflow
          content.offsetHeight;
          
          const contentWidth = content.scrollWidth;
          
          if (containerWidth <= 0 || contentWidth <= 0) {
            console.warn('Invalid dimensions for page calculation:', { containerWidth, contentWidth });
            setTotalPages(1);
            return;
          }
          
          // After setting columnWidth, scrollWidth should reflect multiple columns
          const pages = Math.max(1, Math.ceil(contentWidth / containerWidth));
          
          // Add debug logging in development
          if (process.env.NODE_ENV === 'development') {
            console.log('CSS Column Page calculation:', {
              containerWidth,
              containerHeight,
              contentWidth,
              calculatedPages: pages,
              currentPage,
              columnWidth: content.style.columnWidth,
              columnGap: content.style.columnGap
            });
          }
          
          setTotalPages(pages);
        } catch (error) {
          console.error('Error calculating pages:', error);
          setTotalPages(1);
        }
      }, 150);
    } else {
      // For continuous scroll, we still need a page count for progress
      setTotalPages(1);
    }
  }, [settings.pageLayout, currentPage]);

  // Throttle rapid navigation to prevent performance issues
  const lastNavigationTime = useRef(0);
  const NAVIGATION_THROTTLE = 100; // ms

  // Page navigation with discrete page turns
=======

  // Enhanced page navigation with proper pagination
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
  const navigatePage = useCallback((direction: 'next' | 'prev') => {
    const container = containerRef.current;
    const now = Date.now();
    
    // Throttle rapid navigation
    if (now - lastNavigationTime.current < NAVIGATION_THROTTLE) {
      return;
    }
    lastNavigationTime.current = now;
    
<<<<<<< HEAD
    if (!container || isAnimating) return;
    
    // For single page layout, use page-based navigation
    if (settings.pageLayout === 'single') {
      // Set animation direction and start animation
      setAnimationDirection(direction);
      setIsAnimating(true);
      
      if (direction === 'next') {
        if (currentPage >= totalPages - 1) {
          if (!isLastChapter) {
            onNextChapter();
          }
          setIsAnimating(false);
        } else {
          const newPage = Math.min(currentPage + 1, totalPages - 1);
          setCurrentPage(newPage);
          // Scroll to the new page using CSS columns
          if (container) {
            const pageWidth = container.clientWidth;
            container.scrollTo({
              left: newPage * pageWidth,
              behavior: 'smooth'
            });
          }
        }
      } else {
        if (currentPage <= 0) {
          if (!isFirstChapter) {
            onPrevChapter();
          }
          setIsAnimating(false);
        } else {
          const newPage = Math.max(currentPage - 1, 0);
          setCurrentPage(newPage);
          // Scroll to the new page using CSS columns
          if (container) {
            const pageWidth = container.clientWidth;
            container.scrollTo({
              left: newPage * pageWidth,
              behavior: 'smooth'
            });
          }
        }
      }
    } else {
      // For continuous scroll, navigate by chapters directly
      if (direction === 'next') {
        if (!isLastChapter) {
          onNextChapter();
        }
      } else {
        if (!isFirstChapter) {
          onPrevChapter();
        }
=======
    // Calculate page size (90% of viewport to ensure some overlap)
    const pageSize = viewportHeight * 0.85;
    
    if (direction === 'next') {
      // Check if we're at the bottom of current chapter
      if (maxScroll <= 0 || currentScroll >= maxScroll - 20) {
        if (!isLastChapter) {
          onNextChapter();
        }
        return;
      }
      
      // Calculate next page position
      const targetScroll = Math.min(currentScroll + pageSize, maxScroll);
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    } else {
      // Check if we're at the top of current chapter
      if (currentScroll <= 20) {
        if (!isFirstChapter) {
          onPrevChapter();
        }
        return;
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
      }
      
      // Calculate previous page position
      const targetScroll = Math.max(currentScroll - pageSize, 0);
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [currentPage, totalPages, isFirstChapter, isLastChapter, onNextChapter, onPrevChapter, isAnimating, settings.pageLayout]);


  // Get animation container classes based on animation type
  const getAnimationContainerClasses = useCallback(() => {
    const animation = settings.pageAnimation || 'slide';
    return classNames(
      styles.pageContainer,
      {
        [styles.slideAnimation]: animation === 'slide',
        [styles.fadeAnimation]: animation === 'fade',
        [styles.flipAnimation]: animation === 'flip',
        [styles.pageTurning]: isAnimating
      }
    );
  }, [settings.pageAnimation, isAnimating]);

  // Get page classes based on current state
  const getPageClasses = useCallback(() => {
    return classNames(
      styles.page,
      {
        [styles.pageActive]: !isAnimating,
        [styles.pageTurningForward]: isAnimating && animationDirection === 'next',
        [styles.pageTurningBackward]: isAnimating && animationDirection === 'prev'
      }
    );
  }, [isAnimating, animationDirection]);

  // Update page transform when page changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || settings.pageLayout !== 'single') return;
    
    const translateX = currentPage * 100;
    const animation = settings.pageAnimation || 'slide';
    
    // Handle different animation types
    if (animation === 'fade') {
      if (isAnimating) {
        // Fade out, change position, then fade in
        container.style.opacity = '0';
        setTimeout(() => {
          container.style.transform = `translateX(-${translateX}%)`;
          setTimeout(() => {
            container.style.opacity = '1';
          }, 50); // Short delay to ensure transform is applied
        }, 150);
      } else {
        // Ensure final state is correct
        container.style.transform = `translateX(-${translateX}%)`;
        container.style.opacity = '1';
      }
    } else {
      // For slide and flip animations, use transform directly
      container.style.transform = `translateX(-${translateX}%)`;
      container.style.opacity = '1';
    }
    
    // Reset animation state after animation completes
    if (isAnimating) {
      const animationDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 
                                animation === 'flip' ? 500 : 
                                animation === 'fade' ? 300 : 400;
      setTimeout(() => {
        setIsAnimating(false);
      }, animationDuration);
    }
    
    // Update progress based on pages
    const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
    onProgressChange(Math.min(100, Math.max(0, progress)));
    
    // Notify parent about page changes for proper progress tracking
    if (onPageChange) {
      onPageChange(currentPage, totalPages);
    }
  }, [currentPage, totalPages, onProgressChange, onPageChange, settings.pageLayout, settings.pageAnimation, isAnimating]);

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
        case 'h': // Vim-style navigation
        case 'k':
          e.preventDefault();
          navigatePage('prev');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'j': // Vim-style navigation
        case 'l':
          e.preventDefault();
          navigatePage('next');
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

  // Handle highlight click
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    // Could emit event or show highlight details
    console.log('Highlight clicked:', highlight);
    // Future: Show highlight details modal or context menu
  }, []);

  // Apply content and highlights
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Handle empty content gracefully
    if (!cleanContent || cleanContent.trim() === '') {
      contentRef.current.innerHTML = '<p class="text-gray-500 italic">This chapter appears to be empty.</p>';
      setTotalPages(1);
      setCurrentPage(0);
      setIsAnimating(false);
      return;
    }
    
    contentRef.current.innerHTML = cleanContent;
    
    if (highlights.length > 0) {
      renderHighlights(contentRef.current, highlights, handleHighlightClick);
    }
    
<<<<<<< HEAD
    // Reset to first page and calculate pages when content changes
    setCurrentPage(0);
    setIsAnimating(false);
    setTimeout(() => calculatePages(), 100); // Allow layout to settle
  }, [cleanContent, highlights, calculatePages]);
=======
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      updateScrollPosition();
    }
  }, [cleanContent, highlights, updateScrollPosition, handleHighlightClick]);
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)

  // Calculate pages on resize with debouncing
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        calculatePages();
      }, 150); // Debounce resize events
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [calculatePages]);

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
      className={classNames(
<<<<<<< HEAD
        'h-full relative overflow-hidden',
        themeClasses[settings.theme],
        getAnimationContainerClasses()
=======
        'h-full overflow-y-auto overflow-x-hidden scroll-smooth',
        'relative', // For proper positioning
        themeClasses[settings.theme]
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
      )}
      style={{
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily,
        lineHeight: settings.lineHeight,
        letterSpacing: `${settings.letterSpacing}px`,
        // Ensure proper scrolling behavior
        scrollBehavior: 'smooth',
        overscrollBehavior: 'contain'
      }}
    >
      <div
        ref={containerRef}
        className={classNames(
          'h-full transition-transform duration-300 ease-in-out',
          getPageClasses(),
          scrollSnapStyles.pageContainer,
          {
            'pointer-events-none': isAnimating,
            'will-change-transform': settings.pageLayout === 'single',
            [scrollSnapStyles.pageSliding]: settings.pageLayout === 'single'
          }
        )}
        style={{
          width: settings.pageLayout === 'single' ? `${totalPages * 100}%` : '100%',
          display: settings.pageLayout === 'single' ? 'flex' : 'block'
        }}
        {...touchHandlers}
      >
        {/* Content */}
        <div
          ref={contentRef}
          className={classNames(
            'prose prose-lg max-w-none h-full',
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
            paddingTop: `${settings.marginSize * 1.5}px`,
            paddingLeft: `${capabilities.isSmallScreen ? settings.marginSize : settings.marginSize * 2}px`,
            paddingRight: `${capabilities.isSmallScreen ? settings.marginSize : settings.marginSize * 2}px`,
            paddingBottom: `${settings.marginSize * 3}px`,
            maxWidth: settings.readingMode === 'normal' ? '100%' : settings.readingMode === 'focus' ? '75ch' : '65ch',
            margin: '0 auto',
<<<<<<< HEAD
            ...(settings.pageLayout === 'single' ? {
              // CSS columns will be set dynamically in calculatePages
              minHeight: '100vh',
              flex: 'none'
            } : {
              minHeight: '100vh'
            })
          }}
        />
        
        {/* Page shadow effect during animation */}
        {isAnimating && settings.pageLayout === 'single' && (
          <div className={styles.pageShadow} />
        )}
        
        {/* Page curl effect for hover (desktop only) */}
        {settings.pageLayout === 'single' && !isAnimating && (
          <div className={styles.pageCurl} />
        )}
        
=======
            minHeight: 'calc(100vh - 120px)' // Account for controls and ensure proper pagination
          }}
        />
        
        {/* Pagination Indicators */}
        <div className={classNames(
          'fixed left-1/2 transform -translate-x-1/2 z-30 transition-opacity duration-300',
          {
            'bottom-4': !capabilities.isSmallScreen,
            'bottom-20': capabilities.isSmallScreen, // Account for mobile browser UI
            'opacity-0 pointer-events-none': settings.readingMode === 'immersive' && !capabilities.isTouchDevice
          }
        )}>
          <div className="flex items-center gap-2 bg-black/20 dark:bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white dark:text-gray-200 shadow-lg">
            <span className="font-medium">Page {Math.floor(_chapterProgress / 10) + 1}</span>
            <div className={classNames(
              'bg-white/30 rounded-full overflow-hidden',
              capabilities.isSmallScreen ? 'w-12 h-1' : 'w-16 h-1'
            )}>
              <div 
                className="h-full bg-white transition-all duration-300 ease-out"
                style={{ width: `${Math.max(1, _chapterProgress)}%` }}
              />
            </div>
            <span className="text-white/70 font-medium">{Math.round(_chapterProgress)}%</span>
          </div>
        </div>

        {/* Swipe Hint for Mobile Users */}
        {showSwipeHint && capabilities.isTouchDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mx-4 max-w-sm text-center shadow-xl">
              <div className="text-2xl mb-3">👆</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Swipe to Navigate
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Swipe left or right to turn pages, or tap the sides of the screen
              </p>
              <div className="flex justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span>← Previous</span>
                <span>Next →</span>
              </div>
            </div>
          </div>
        )}

>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
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
      
      {/* Page indicator */}
      {settings.pageLayout === 'single' && totalPages > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white">
          {currentPage + 1} / {totalPages}
        </div>
      )}
    </div>
  );
});

ReaderView.displayName = 'ReaderView';

export default ReaderView;