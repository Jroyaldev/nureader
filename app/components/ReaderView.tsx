'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { IoChevronBack, IoChevronForward, IoAdd, IoRemove } from 'react-icons/io5';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { ReadingSettings, Highlight } from './types';
import styles from './PageTurnAnimation.module.css';
import HighlightColorPicker from './HighlightColorPicker';
import { useMobileTouch, useMobileCapabilities, useTouchPerformance } from './useMobileTouch';
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
  onPageChange: (page: number) => void;
  onTotalPagesChange: (totalPages: number) => void;
  isFirstChapter: boolean;
  isLastChapter: boolean;
  currentPage: number;
  totalPages: number;
  chapterProgress: number;
  highlights?: Highlight[];
  onHighlight?: (text: string, color: Highlight['color'], startOffset: number, endOffset: number) => void;
  onHighlightClick?: (highlight: Highlight) => void;
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
  chapterProgress,
  highlights = [],
  onHighlight,
  onHighlightClick
}: ReaderViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'forward' | 'backward'>('forward');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(false);
  const [touchFeedback, setTouchFeedback] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  
  // Mobile touch capabilities
  const capabilities = useMobileCapabilities();
  const { isOptimized } = useTouchPerformance();
  
  // Get animation type from settings or default based on device/preferences
  const animationType = settings.pageAnimation || (capabilities.isSmallScreen ? 'slide' : 'flip');

  const goToPage = useCallback((page: number, smooth = true) => {
    if (!containerRef.current || isTransitioning) return;

    // Check if we need to change chapters
    if (page < 1) {
      if (!isFirstChapter) {
        setIsTransitioning(true);
        setTurnDirection('backward');
        setTimeout(() => {
          onPrevChapter();
          setIsTransitioning(false);
        }, 600);
      }
      return;
    }
    if (page > totalPages) {
      if (!isLastChapter) {
        setIsTransitioning(true);
        setTurnDirection('forward');
        setTimeout(() => {
          onNextChapter();
          setIsTransitioning(false);
        }, 600);
      }
      return;
    }

    // Determine animation direction
    const direction = page > currentPage ? 'forward' : 'backward';
    setTurnDirection(direction);
    
    // Only animate if smooth is true and not using reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (smooth && !prefersReducedMotion) {
      setIsTransitioning(true);
      
      // Wait for animation to complete
      setTimeout(() => {
        const pageHeight = containerRef.current!.clientHeight;
        const scrollTop = (page - 1) * pageHeight;
        containerRef.current!.scrollTop = scrollTop;
        onPageChange(page);
        setIsTransitioning(false);
      }, animationType === 'fade' ? 300 : animationType === 'slide' ? 400 : 600);
    } else {
      // Instant page change for reduced motion or non-smooth navigation
      const pageHeight = containerRef.current.clientHeight;
      const scrollTop = (page - 1) * pageHeight;
      containerRef.current.scrollTop = scrollTop;
      onPageChange(page);
    }
  }, [isTransitioning, isFirstChapter, isLastChapter, totalPages, currentPage, animationType, onPrevChapter, onNextChapter, onPageChange]);

  const handleHighlightColor = useCallback((color: Highlight['color']) => {
    if (selectedText && selectionRange && onHighlight) {
      onHighlight(selectedText, color, selectionRange.start, selectionRange.end);
      clearSelection();
      setShowColorPicker(false);
      setSelectedText('');
      setSelectionRange(null);
    }
  }, [selectedText, selectionRange, onHighlight]);

  // Handle pinch-to-zoom for text scaling
  const handlePinchZoom = useCallback((scale: number, isEnd: boolean) => {
    if (!capabilities.supportsPinchZoom) return;
    
    const newZoom = Math.max(0.8, Math.min(2.5, scale));
    setZoomLevel(newZoom);
    
    if (isEnd) {
      // Update font size based on zoom level
      const newFontSize = Math.round(settings.fontSize * newZoom);
      if (newFontSize !== settings.fontSize && newFontSize >= 12 && newFontSize <= 32) {
        // This would typically update settings, but we'll just show zoom controls instead
        setShowZoomControls(true);
        setTimeout(() => setShowZoomControls(false), 2000);
      }
      setZoomLevel(1); // Reset visual zoom after font size update
    }
  }, [capabilities.supportsPinchZoom, settings.fontSize]);

  // Handle tap for showing/hiding UI elements
  const handleTap = useCallback((x: number, y: number) => {
    // Show touch feedback
    setTouchFeedback({ x, y, show: true });
    setTimeout(() => setTouchFeedback(prev => ({ ...prev, show: false })), 200);
    
    // In immersive mode, show controls briefly
    if (settings.readingMode === 'immersive') {
      const event = new CustomEvent('showImmersiveControls');
      window.dispatchEvent(event);
    }
  }, [settings.readingMode]);

  // Handle long press for text selection on mobile
  const handleLongPress = useCallback((x: number, y: number) => {
    if (!capabilities.isTouchDevice) return;
    
    // Enable text selection mode
    if (contentRef.current) {
      contentRef.current.style.userSelect = 'text';
      contentRef.current.style.webkitUserSelect = 'text';
      
      // Create a synthetic text selection at the touch point
      const element = document.elementFromPoint(x, y);
      if (element && element.closest('[data-selectable]')) {
        const range = document.createRange();
        const selection = window.getSelection();
        if (selection) {
          try {
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (err) {
            console.warn('Text selection failed:', err);
          }
        }
      }
    }
  }, [capabilities.isTouchDevice]);

  // Enhanced keyboard navigation with highlight shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Quick highlight shortcuts when text is selected
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
  }, [currentPage, totalPages, goToPage, handleHighlightColor]);

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
      
      // Calculate offsets
      const startOffset = calculateTextOffset(contentRef.current, selection.startContainer, selection.startOffset);
      const endOffset = calculateTextOffset(contentRef.current, selection.endContainer, selection.endOffset);
      setSelectionRange({ start: startOffset, end: endOffset });
    }
  }, [onHighlight]);

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

    // Apply highlights after content is set
    if (highlights.length > 0) {
      renderHighlights(contentRef.current, highlights);
    }

    // Add selection listener
    const handleSelection = () => {
      handleTextSelection();
    };
    
    document.addEventListener('selectionchange', handleSelection);

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

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [content, totalPages, highlights, onPageChange, onTotalPagesChange, handleTextSelection]);

  // Enhanced mobile touch handling
  const { touchHandlers } = useMobileTouch({
    onSwipeLeft: () => goToPage(currentPage + 1),
    onSwipeRight: () => goToPage(currentPage - 1),
    onPinchZoom: handlePinchZoom,
    onTap: handleTap,
    onLongPress: handleLongPress,
    swipeThreshold: 60, // Slightly higher threshold for more deliberate swipes
    preventScrollOnSwipe: true
  });

  // Zoom controls for mobile
  const handleZoomIn = useCallback(() => {
    const newSize = Math.min(32, settings.fontSize + 2);
    // This would update settings - placeholder for the actual implementation
    console.log('Zoom in to:', newSize);
  }, [settings.fontSize]);

  const handleZoomOut = useCallback(() => {
    const newSize = Math.max(12, settings.fontSize - 2);
    // This would update settings - placeholder for the actual implementation  
    console.log('Zoom out to:', newSize);
  }, [settings.fontSize]);


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
          'flex-1 overflow-hidden relative',
          themeClasses[settings.theme],
          modeClasses[settings.readingMode],
          styles.pageContainer,
          {
            [styles.slideAnimation]: animationType === 'slide',
            [styles.fadeAnimation]: animationType === 'fade',
            [styles.flipAnimation]: animationType === 'flip',
            [styles.pageTurning]: isTransitioning
          }
        )}
        {...touchHandlers}
        style={{
          fontSize: `${settings.fontSize}px`,
          fontFamily: settings.fontFamily,
          lineHeight: settings.lineHeight,
          letterSpacing: `${settings.letterSpacing}px`,
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: zoomLevel !== 1 ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out'
        }}
      >
        {/* Current Page */}
        <div
          className={classNames(
            styles.page,
            {
              [styles.pageActive]: !isTransitioning,
              [styles.pageTurningForward]: isTransitioning && turnDirection === 'forward',
              [styles.pageTurningBackward]: isTransitioning && turnDirection === 'backward'
            }
          )}
        >
          <div
            ref={contentRef}
            className={classNames(
              'prose max-w-none h-full overflow-hidden',
              {
                'text-selection-active': capabilities.isTouchDevice
              }
            )}
            data-selectable
            style={{
              padding: `${capabilities.isSmallScreen ? Math.max(16, settings.marginSize / 2) : settings.marginSize}px`,
              maxWidth: `${settings.columnWidth}ch`,
              margin: settings.pageLayout === 'single' ? '0 auto' : undefined,
              columns: settings.pageLayout === 'double' && !capabilities.isSmallScreen ? 2 : undefined,
              columnGap: settings.pageLayout === 'double' && !capabilities.isSmallScreen ? `${settings.marginSize * 2}px` : undefined,
              userSelect: capabilities.isTouchDevice ? 'none' : 'text',
              WebkitUserSelect: capabilities.isTouchDevice ? 'none' : 'text'
            }}
          />
        </div>
        
        {/* Page shadow effect */}
        <div className={styles.pageShadow} />
        
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
        
        {/* Page curl effect (desktop only) */}
        {animationType === 'flip' && !capabilities.isTouchDevice && (
          <div className={styles.pageCurl} />
        )}
        
        {/* Touch feedback indicator */}
        {touchFeedback.show && capabilities.isTouchDevice && (
          <div 
            className="fixed w-12 h-12 pointer-events-none z-50 transition-all duration-200"
            style={{
              left: touchFeedback.x - 24,
              top: touchFeedback.y - 24,
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'scale(1)',
              animation: 'ping 0.2s ease-out'
            }}
          />
        )}
        
        {/* Mobile zoom controls */}
        {capabilities.isTouchDevice && showZoomControls && (
          <div className="fixed top-1/2 right-4 transform -translate-y-1/2 flex flex-col gap-2 z-40 animate-fade-in">
            <button
              onClick={handleZoomIn}
              className="control-button bg-black/20 backdrop-blur-sm p-3 rounded-full"
              aria-label="Zoom in"
            >
              <IoAdd className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleZoomOut}
              className="control-button bg-black/20 backdrop-blur-sm p-3 rounded-full"
              aria-label="Zoom out"
            >
              <IoRemove className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>
      
      {/* Navigation Controls */}
      <div className={classNames(
        'flex items-center justify-between backdrop-blur-md border-t transition-all duration-300',
        {
          'px-6 py-4': !capabilities.isSmallScreen,
          'px-4 py-3': capabilities.isSmallScreen,
          'bg-white/90 dark:bg-gray-900/90 border-gray-200/50 dark:border-gray-700/50': settings.readingMode !== 'immersive',
          'bg-transparent border-transparent opacity-0 hover:opacity-100 hover:bg-white/5 dark:hover:bg-gray-900/5': settings.readingMode === 'immersive'
        }
      )}>
        <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 && isFirstChapter}
            className={classNames(
              'flex items-center gap-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 group',
              {
                'px-4 py-2': !capabilities.isSmallScreen,
                'px-3 py-2 min-h-[44px]': capabilities.isSmallScreen // Ensure minimum touch target size
              }
            )}
            aria-label="Previous page"
          >
            <IoChevronBack className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {!capabilities.isSmallScreen && (
              <span className="text-sm font-medium">Previous</span>
            )}
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
            className={classNames(
              'flex items-center gap-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 group',
              {
                'px-4 py-2': !capabilities.isSmallScreen,
                'px-3 py-2 min-h-[44px]': capabilities.isSmallScreen // Ensure minimum touch target size
              }
            )}
            aria-label="Next page"
          >
            {!capabilities.isSmallScreen && (
              <span className="text-sm font-medium">Next</span>
            )}
            <IoChevronForward className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
    </div>
  );
});

ReaderView.displayName = 'ReaderView';

export default ReaderView;