'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  IoBookmarkOutline,
  IoColorWandOutline,
  IoImageOutline,
  IoGridOutline,
  IoTextOutline,
  IoExpandOutline,
  IoContractOutline,
  IoLocateOutline
} from 'react-icons/io5';
import classNames from 'classnames';
import { NavigationContext, EPUBChapter, BookmarkWithNote, Highlight, PageBreakMap } from './types';
import { useMobileCapabilities } from './useMobileTouch';

interface ReadingMiniMapProps {
  navigationContext: NavigationContext;
  chapters: EPUBChapter[];
  pageBreakMaps: Map<number, PageBreakMap>;
  bookmarks?: BookmarkWithNote[];
  highlights?: Highlight[];
  onNavigateToPage?: (globalPageNumber: number) => void;
  onNavigateToChapter?: (chapterIndex: number) => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface ChapterSegment {
  chapterIndex: number;
  title: string;
  startPage: number;
  endPage: number;
  pageCount: number;
  currentPage?: number;
  wordCount: number;
  bookmarks: BookmarkWithNote[];
  highlights: Highlight[];
  hasImages: boolean;
  hasTables: boolean;
  contentDensity: 'low' | 'medium' | 'high';
}

const ReadingMiniMap = React.memo(({
  navigationContext,
  chapters,
  pageBreakMaps,
  bookmarks = [],
  highlights = [],
  onNavigateToPage,
  onNavigateToChapter,
  className,
  collapsed = false,
  onToggleCollapsed
}: ReadingMiniMapProps) => {
  const capabilities = useMobileCapabilities();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Calculate chapter segments with page distribution
  const chapterSegments = useMemo((): ChapterSegment[] => {
    let globalPageCounter = 0;
    
    return chapters.map((chapter, chapterIndex) => {
      const pageMap = pageBreakMaps.get(chapterIndex);
      const pageCount = pageMap?.pages.length || 1;
      
      const segment: ChapterSegment = {
        chapterIndex,
        title: chapter.title,
        startPage: globalPageCounter,
        endPage: globalPageCounter + pageCount - 1,
        pageCount,
        wordCount: chapter.wordCount,
        bookmarks: bookmarks.filter(b => b.chapterIndex === chapterIndex),
        highlights: highlights.filter(h => h.chapterIndex === chapterIndex),
        hasImages: false,
        hasTables: false,
        contentDensity: 'medium'
      };

      // Detect current page in this chapter
      if (chapterIndex === navigationContext.currentChapter.index) {
        segment.currentPage = globalPageCounter + navigationContext.currentPage.number - 1;
      }

      // Analyze content characteristics
      if (pageMap) {
        segment.hasImages = pageMap.pages.some(page => page.hasImages);
        segment.hasTables = pageMap.pages.some(page => page.hasTables);
        
        // Calculate average content density
        const densities = pageMap.pages.map(page => {
          switch (page.contentDensity) {
            case 'low': return 1;
            case 'medium': return 2;
            case 'high': return 3;
            default: return 2;
          }
        });
        const avgDensity = densities.reduce((sum, d) => sum + d, 0) / densities.length;
        
        if (avgDensity < 1.5) segment.contentDensity = 'low';
        else if (avgDensity > 2.5) segment.contentDensity = 'high';
        else segment.contentDensity = 'medium';
      }

      globalPageCounter += pageCount;
      return segment;
    });
  }, [chapters, pageBreakMaps, bookmarks, highlights, navigationContext]);

  // Calculate minimap dimensions
  const minimapDimensions = useMemo(() => {
    const totalPages = chapterSegments.reduce((sum, segment) => sum + segment.pageCount, 0);
    const maxWidth = capabilities.isSmallScreen ? 280 : 400;
    const segmentHeight = showDetailedView ? 24 : 12;
    
    return {
      totalPages,
      maxWidth,
      segmentHeight,
      totalHeight: chapterSegments.length * (segmentHeight + 2) // +2 for spacing
    };
  }, [chapterSegments, capabilities.isSmallScreen, showDetailedView]);

  // Handle segment click
  const handleSegmentClick = useCallback((segment: ChapterSegment, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const segmentWidth = rect.width;
    
    // Calculate which page within the segment was clicked
    const pageWithinSegment = Math.floor((clickX / segmentWidth) * segment.pageCount);
    const targetGlobalPage = segment.startPage + Math.max(0, Math.min(pageWithinSegment, segment.pageCount - 1));
    
    if (onNavigateToPage) {
      onNavigateToPage(targetGlobalPage);
    } else if (onNavigateToChapter) {
      onNavigateToChapter(segment.chapterIndex);
    }
  }, [onNavigateToPage, onNavigateToChapter]);

  // Get content type indicators
  const getContentIndicators = (segment: ChapterSegment) => {
    const indicators = [];
    
    if (segment.hasImages) {
      indicators.push(
        <IoImageOutline key="images" className="w-3 h-3 text-blue-500" title="Contains images" />
      );
    }
    
    if (segment.hasTables) {
      indicators.push(
        <IoGridOutline key="tables" className="w-3 h-3 text-green-500" title="Contains tables" />
      );
    }
    
    if (segment.bookmarks.length > 0) {
      indicators.push(
        <div key="bookmarks" className="flex items-center">
          <IoBookmarkOutline className="w-3 h-3 text-yellow-500" />
          <span className="text-xs ml-1">{segment.bookmarks.length}</span>
        </div>
      );
    }
    
    if (segment.highlights.length > 0) {
      indicators.push(
        <div key="highlights" className="flex items-center">
          <IoColorWandOutline className="w-3 h-3 text-purple-500" />
          <span className="text-xs ml-1">{segment.highlights.length}</span>
        </div>
      );
    }
    
    return indicators;
  };

  // Get density color
  const getDensityColor = (density: ChapterSegment['contentDensity']) => {
    switch (density) {
      case 'low': return 'bg-blue-200 dark:bg-blue-800';
      case 'medium': return 'bg-gray-300 dark:bg-gray-600';
      case 'high': return 'bg-gray-500 dark:bg-gray-400';
      default: return 'bg-gray-300 dark:bg-gray-600';
    }
  };

  if (collapsed) {
    return (
      <div className={classNames(
        'flex items-center p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg',
        className
      )}>
        <button
          onClick={onToggleCollapsed}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Expand reading map"
        >
          <IoExpandOutline className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        
        {/* Compact progress indicator */}
        <div className="ml-2 flex-1 max-w-20">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-1 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${navigationContext.currentChapter.progress}%` }}
            />
          </div>
        </div>
        
        <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          {navigationContext.currentChapter.index + 1}/{navigationContext.totalChapters}
        </div>
      </div>
    );
  }

  return (
    <div className={classNames(
      'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50',
      'transition-all duration-300',
      {
        'p-4': !capabilities.isSmallScreen,
        'p-3': capabilities.isSmallScreen
      },
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <IoLocateOutline className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Reading Map
          </h3>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowDetailedView(!showDetailedView)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label={showDetailedView ? "Compact view" : "Detailed view"}
          >
            <IoTextOutline className={classNames(
              'w-3 h-3',
              {
                'text-blue-500': showDetailedView,
                'text-gray-400': !showDetailedView
              }
            )} />
          </button>
          
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              aria-label="Collapse reading map"
            >
              <IoContractOutline className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Chapter Segments */}
      <div 
        ref={containerRef}
        className="space-y-1"
        style={{ maxHeight: capabilities.isSmallScreen ? '200px' : '300px', overflowY: 'auto' }}
      >
        {chapterSegments.map((segment) => (
          <div
            key={segment.chapterIndex}
            className="group"
            onMouseEnter={() => setHoveredSegment(segment.chapterIndex)}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            {/* Chapter Label */}
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span className="truncate flex-1">
                {showDetailedView 
                  ? segment.title 
                  : `Ch. ${segment.chapterIndex + 1}`
                }
              </span>
              <span className="ml-2 flex-shrink-0">
                {segment.pageCount} page{segment.pageCount !== 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div
              className={classNames(
                'relative rounded cursor-pointer transition-all duration-200',
                'hover:shadow-md hover:scale-105 group-hover:ring-2 group-hover:ring-blue-500/50',
                getDensityColor(segment.contentDensity),
                {
                  'ring-2 ring-blue-500': segment.chapterIndex === navigationContext.currentChapter.index
                }
              )}
              style={{ height: `${minimapDimensions.segmentHeight}px` }}
              onClick={(e) => handleSegmentClick(segment, e)}
              role="slider"
              aria-label={`Chapter ${segment.chapterIndex + 1}: ${segment.title}`}
              aria-valuenow={segment.chapterIndex === navigationContext.currentChapter.index ? navigationContext.currentPage.number : 0}
              aria-valuemax={segment.pageCount}
            >
              {/* Current page indicator */}
              {segment.currentPage !== undefined && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{
                    left: `${((segment.currentPage - segment.startPage) / segment.pageCount) * 100}%`
                  }}
                />
              )}
              
              {/* Bookmarks */}
              {segment.bookmarks.map((bookmark, index) => {
                const bookmarkPosition = ((bookmark.position / 100) * segment.pageCount) / segment.pageCount * 100;
                return (
                  <div
                    key={bookmark.id}
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-5"
                    style={{ left: `${bookmarkPosition}%` }}
                    title={bookmark.note || 'Bookmark'}
                  />
                );
              })}
              
              {/* Highlights */}
              {segment.highlights.map((highlight, index) => {
                const highlightStart = (highlight.startOffset / segment.wordCount) * 100;
                const highlightWidth = Math.max(1, ((highlight.endOffset - highlight.startOffset) / segment.wordCount) * 100);
                return (
                  <div
                    key={highlight.id}
                    className={classNames(
                      'absolute top-0 bottom-0 opacity-60 z-5',
                      {
                        'bg-yellow-400': highlight.color === 'yellow',
                        'bg-green-400': highlight.color === 'green',
                        'bg-blue-400': highlight.color === 'blue',
                        'bg-pink-400': highlight.color === 'pink',
                        'bg-orange-400': highlight.color === 'orange'
                      }
                    )}
                    style={{ 
                      left: `${highlightStart}%`,
                      width: `${highlightWidth}%`
                    }}
                    title={highlight.text.substring(0, 50) + '...'}
                  />
                );
              })}
            </div>
            
            {/* Content indicators */}
            {showDetailedView && (
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-1">
                  {getContentIndicators(segment)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {(segment.wordCount / 1000).toFixed(1)}k words
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Page {navigationContext.currentPage.globalNumber} of {navigationContext.currentPage.totalInBook}
          </span>
          <span>
            {Math.round(navigationContext.currentChapter.progress)}% chapter complete
          </span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredSegment !== null && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-black dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
          {(() => {
            const segment = chapterSegments[hoveredSegment];
            return (
              <div>
                <div className="font-medium">{segment.title}</div>
                <div className="text-gray-300">
                  {segment.pageCount} pages • {(segment.wordCount / 1000).toFixed(1)}k words
                </div>
                {segment.bookmarks.length > 0 && (
                  <div className="text-yellow-400">{segment.bookmarks.length} bookmarks</div>
                )}
                {segment.highlights.length > 0 && (
                  <div className="text-purple-400">{segment.highlights.length} highlights</div>
                )}
              </div>
            );
          })()}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-black dark:border-b-gray-800"></div>
        </div>
      )}
    </div>
  );
});

ReadingMiniMap.displayName = 'ReadingMiniMap';

export default ReadingMiniMap;