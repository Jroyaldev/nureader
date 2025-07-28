'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { ReadingSettings, Highlight, PageInfo, PageBreakMap, NavigationContext } from './types';
import HighlightColorPicker from './HighlightColorPicker';
import { ContentSkeleton } from './skeletons';
import { useMobileTouch, useMobileCapabilities, useTouchPerformance } from './useMobileTouch';
import { 
  getTextSelection, 
  getSelectedText, 
  clearSelection, 
  getSelectionCoordinates,
  calculateTextOffset,
  renderHighlights
} from './highlightUtils';
import styles from './PageTurnAnimation.module.css';

interface HybridReaderViewProps {
  content: string;
  settings: ReadingSettings;
  pageBreakMap: PageBreakMap | null;
  currentPageInfo: PageInfo | null;
  navigationContext: NavigationContext;
  highlights?: Highlight[];
  onHighlight?: (text: string, color: Highlight['color'], startOffset: number, endOffset: number) => void;
  onHighlightClick?: (highlight: Highlight) => void;
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  onProgressChange: (progress: number) => void;
  isLoading?: boolean;
  isTransitioning?: boolean;
}

const HybridReaderView = React.memo(({
  content,
  settings,
  pageBreakMap,
  currentPageInfo,
  navigationContext,
  highlights = [],
  onHighlight,
  onHighlightClick = () => {},
  onNavigateNext,
  onNavigatePrevious,
  onProgressChange,
  isLoading = false,
  isTransitioning = false
}: HybridReaderViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
  
  // UI state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'next' | 'prev'>('next');
  const [renderError, setRenderError] = useState<string | null>(null);
  
  // Mobile touch capabilities and performance optimization
  const capabilities = useMobileCapabilities();
  useTouchPerformance();

  // Throttle rapid navigation to prevent performance issues
  const lastNavigationTime = useRef(0);
  const NAVIGATION_THROTTLE = 150; // ms

  // Extract current page content based on page break map
  const currentPageContent = useMemo(() => {
    if (!pageBreakMap || !currentPageInfo || !content) {
      return content; // Fallback to full content
    }

    try {
      // For semantic page breaks, we extract content between offsets
      const pageContent = content.substring(
        currentPageInfo.startOffset,
        currentPageInfo.endOffset
      );

      // Ensure we have complete HTML structure
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Find the actual DOM elements that correspond to our offsets
      const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let currentOffset = 0;
      let startNode: Node | null = null;
      let endNode: Node | null = null;
      let startNodeOffset = 0;
      let endNodeOffset = 0;

      let node: Node | null;
      while ((node = walker.nextNode())) {
        const nodeLength = node.textContent?.length || 0;
        
        if (!startNode && currentOffset + nodeLength > currentPageInfo.startOffset) {
          startNode = node;
          startNodeOffset = currentPageInfo.startOffset - currentOffset;
        }
        
        if (!endNode && currentOffset + nodeLength >= currentPageInfo.endOffset) {
          endNode = node;
          endNodeOffset = currentPageInfo.endOffset - currentOffset;
          break;
        }
        
        currentOffset += nodeLength;
      }

      // If we found proper nodes, extract the range
      if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode, Math.max(0, startNodeOffset));
        range.setEnd(endNode, Math.min(endNode.textContent?.length || 0, endNodeOffset));
        
        const fragment = range.cloneContents();
        const wrapper = document.createElement('div');
        wrapper.appendChild(fragment);
        
        return wrapper.innerHTML || pageContent;
      }

      return pageContent;
    } catch (error) {
      console.warn('Error extracting page content:', error);
      setRenderError('Failed to render page content');
      return content; // Fallback to full content
    }
  }, [content, pageBreakMap, currentPageInfo]);

  // Clean and sanitize page content
  const cleanPageContent = useMemo(() => {
    if (!currentPageContent) return '';
    
    try {
      return DOMPurify.sanitize(currentPageContent, {
        ADD_TAGS: ['image', 'svg'],
        ADD_ATTR: ['srcset', 'alt', 'data-page-element']
      });
    } catch (error) {
      console.warn('Error sanitizing content:', error);
      setRenderError('Failed to sanitize page content');
      return currentPageContent;
    }
  }, [currentPageContent]);

  // Page navigation with advanced animation support
  const navigatePage = useCallback((direction: 'next' | 'prev') => {
    const now = Date.now();
    
    // Throttle rapid navigation
    if (now - lastNavigationTime.current < NAVIGATION_THROTTLE) {
      return;
    }
    lastNavigationTime.current = now;
    
    if (isAnimating) return;
    
    // Clear any selections before navigation
    clearSelection();
    setShowColorPicker(false);
    
    // Set animation state
    setAnimationDirection(direction);
    setIsAnimating(true);
    
    // Execute navigation after animation starts
    const animationDelay = settings.pageAnimation === 'none' ? 0 : 50;
    setTimeout(() => {
      if (direction === 'next') {
        onNavigateNext();
      } else {
        onNavigatePrevious();
      }
    }, animationDelay);
    
    // Reset animation state
    const animationDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 
                             settings.pageAnimation === 'flip' ? 500 : 
                             settings.pageAnimation === 'fade' ? 300 : 400;
    
    setTimeout(() => {
      setIsAnimating(false);
    }, animationDuration);
  }, [isAnimating, settings.pageAnimation, onNavigateNext, onNavigatePrevious]);

  // Get animation container classes
  const getAnimationContainerClasses = useCallback(() => {
    const animation = settings.pageAnimation || 'slide';
    return classNames(
      styles.pageContainer,
      'h-full relative overflow-hidden',
      {
        [styles.slideAnimation]: animation === 'slide',
        [styles.fadeAnimation]: animation === 'fade',
        [styles.flipAnimation]: animation === 'flip',
        [styles.pageTurning]: isAnimating,
        'opacity-50': isTransitioning
      }
    );
  }, [settings.pageAnimation, isAnimating, isTransitioning]);

  // Get page classes based on current state
  const getPageClasses = useCallback(() => {
    return classNames(
      styles.page,
      'transition-all duration-300 ease-in-out',
      {
        [styles.pageActive]: !isAnimating,
        [styles.pageTurningForward]: isAnimating && animationDirection === 'next',
        [styles.pageTurningBackward]: isAnimating && animationDirection === 'prev',
        'pointer-events-none': isAnimating || isTransitioning
      }
    );
  }, [isAnimating, animationDirection, isTransitioning]);

  // Handle text selection for highlighting
  const handleTextSelection = useCallback(() => {
    if (!pageContentRef.current || !onHighlight) return;
    
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
      
      // Calculate offsets relative to the current page
      const startOffset = calculateTextOffset(pageContentRef.current, selection.startContainer, selection.startOffset);
      const endOffset = calculateTextOffset(pageContentRef.current, selection.endContainer, selection.endOffset);
      
      // Adjust offsets to be relative to the full chapter content
      const adjustedStartOffset = (currentPageInfo?.startOffset || 0) + startOffset;
      const adjustedEndOffset = (currentPageInfo?.startOffset || 0) + endOffset;
      
      setSelectionRange({ start: adjustedStartOffset, end: adjustedEndOffset });
    }
  }, [onHighlight, currentPageInfo]);

  // Handle highlight color selection
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

  // Handle text selection events
  useEffect(() => {
    if (!pageContentRef.current || !onHighlight) return;
    
    const handleSelection = () => {
      handleTextSelection();
    };
    
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [handleTextSelection, onHighlight]);

  // Apply content and highlights when page content changes
  useEffect(() => {
    if (!pageContentRef.current) return;
    
    try {
      setRenderError(null);
      
      // Handle empty content gracefully
      if (!cleanPageContent || cleanPageContent.trim() === '') {
        pageContentRef.current.innerHTML = '<p class="text-gray-500 italic">This page appears to be empty.</p>';
        return;
      }
      
      pageContentRef.current.innerHTML = cleanPageContent;
      
      // Apply highlights for the current page
      if (highlights.length > 0 && currentPageInfo) {
        const pageHighlights = highlights.filter(highlight => 
          highlight.startOffset >= currentPageInfo.startOffset && 
          highlight.endOffset <= currentPageInfo.endOffset
        );
        
        if (pageHighlights.length > 0) {
          renderHighlights(pageContentRef.current, pageHighlights);
        }
      }
      
      // Update progress based on current page
      if (currentPageInfo && navigationContext.currentPage.totalInChapter > 0) {
        const pageProgress = ((currentPageInfo.pageNumber + 1) / navigationContext.currentPage.totalInChapter) * 100;
        onProgressChange(Math.min(100, Math.max(0, pageProgress)));
      }
      
    } catch (error) {
      console.error('Error rendering page content:', error);
      setRenderError('Failed to render page content');
    }
  }, [cleanPageContent, highlights, currentPageInfo, navigationContext, onProgressChange]);

  // Mobile touch handling
  const { touchHandlers } = useMobileTouch({
    onSwipeLeft: () => navigatePage('next'),
    onSwipeRight: () => navigatePage('prev'),
    swipeThreshold: 50,
    preventScrollOnSwipe: false
  });

  // Theme and mode classes
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

  if (isLoading) {
    return <ContentSkeleton className="h-full" />;
  }

  if (renderError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-2">Rendering Error</div>
          <div className="text-gray-600 dark:text-gray-400">{renderError}</div>
          <button 
            onClick={() => setRenderError(null)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={classNames(
        getAnimationContainerClasses(),
        themeClasses[settings.theme]
      )}
      style={{
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily,
        lineHeight: settings.lineHeight,
        letterSpacing: `${settings.letterSpacing}px`
      }}
      {...touchHandlers}
    >
      <div
        className={classNames(
          'h-full w-full',
          getPageClasses()
        )}
      >
        {/* Page Content */}
        <div
          ref={pageContentRef}
          className={classNames(
            'prose prose-lg max-w-none h-full overflow-hidden',
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
            'prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8 prose-img:max-h-96 prose-img:object-contain',
            // Link styling
            'prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
            // Selection color
            'selection:bg-blue-200 dark:selection:bg-blue-800'
          )}
          style={{
            padding: `${settings.marginSize * 1.5}px ${capabilities.isSmallScreen ? settings.marginSize : settings.marginSize * 2}px`,
            paddingBottom: `${settings.marginSize * 3}px`,
            maxWidth: settings.readingMode === 'normal' ? '100%' : 
                     settings.readingMode === 'focus' ? '75ch' : '65ch',
            margin: '0 auto',
            minHeight: '100vh'
          }}
        />
        
        {/* Page shadow effect during animation */}
        {isAnimating && (
          <div className={styles.pageShadow} />
        )}
        
        {/* Page curl effect for hover (desktop only) */}
        {!isAnimating && !capabilities.isTouchDevice && (
          <div className={styles.pageCurl} />
        )}
        
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
      
      {/* Enhanced Page Indicator */}
      {currentPageInfo && navigationContext.currentPage.totalInChapter > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
          <div className="flex items-center space-x-2">
            <span>{navigationContext.currentPage.number} / {navigationContext.currentPage.totalInChapter}</span>
            {navigationContext.currentPage.totalInBook > navigationContext.currentPage.totalInChapter && (
              <span className="text-xs opacity-75">
                (Global: {navigationContext.currentPage.globalNumber} / {navigationContext.currentPage.totalInBook})
              </span>
            )}
          </div>
          {/* Reading progress indicator */}
          <div className="w-full bg-white/20 rounded-full h-1 mt-1">
            <div 
              className="bg-white rounded-full h-1 transition-all duration-300"
              style={{ 
                width: `${(navigationContext.currentPage.number / navigationContext.currentPage.totalInChapter) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Page Quality Indicator (for debugging/development) */}
      {process.env.NODE_ENV === 'development' && currentPageInfo && (
        <div className="absolute top-4 right-4 bg-black/60 text-white px-2 py-1 rounded text-xs">
          Quality: {currentPageInfo.breakQuality}/10
          {currentPageInfo.contentDensity && (
            <span className="block">Density: {currentPageInfo.contentDensity}</span>
          )}
        </div>
      )}
    </div>
  );
});

HybridReaderView.displayName = 'HybridReaderView';

export default HybridReaderView;