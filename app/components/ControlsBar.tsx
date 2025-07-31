'use client';

import React, { useState, useEffect } from 'react';
import {
  IoMenuOutline,
  IoBookmark,
  IoSearch,
  IoSettings,
  IoExpand,
  IoContract,
  IoMoon,
  IoSunny,
  IoColorPalette,
  IoEye,
  IoColorWand,
  IoEllipsisHorizontal,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoPlaySkipBackOutline,
  IoPlaySkipForwardOutline,
  IoNavigateOutline,
  IoLocateOutline
} from 'react-icons/io5';
import classNames from 'classnames';
import { ReadingSettings, ReadingProgress, EPUBChapter, NavigationContext } from './types';
import { useMobileCapabilities } from '../hooks/useMobileTouch';

interface ControlsBarProps {
  onToggleTOC: () => void;
  onToggleBookmarks: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  onToggleHighlights?: () => void;
  onToggleFullscreen: () => void;
  onToggleReadingMode: () => void;
  onToggleMiniMap?: () => void;
  onToggleContextualInfo?: () => void;
  settings: ReadingSettings;
  onUpdateSettings: (settings: Partial<ReadingSettings>) => void;
  isLoading: boolean;
  currentChapter: number;
  chapters: EPUBChapter[];
  isFullscreen: boolean;
  progress: ReadingProgress;
  navigationContext?: NavigationContext;
  // Hybrid navigation controls
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateToChapterStart?: () => void;
  onNavigateToChapterEnd?: () => void;
  showPageBoundaries?: boolean;
  canNavigateNext?: boolean;
  canNavigatePrevious?: boolean;
}

const ControlsBar = React.memo(({
  onToggleTOC,
  onToggleBookmarks,
  onToggleSearch,
  onToggleSettings,
  onToggleHighlights,
  onToggleFullscreen,
  onToggleReadingMode,
  onToggleMiniMap,
  onToggleContextualInfo,
  settings,
  onUpdateSettings,
  isLoading,
  currentChapter,
  chapters,
  isFullscreen,
  progress,
  navigationContext,
  onNavigateNext,
  onNavigatePrevious,
  onNavigateToChapterStart,
  onNavigateToChapterEnd,
  showPageBoundaries = false,
  canNavigateNext = true,
  canNavigatePrevious = true
}: ControlsBarProps) => {
  const capabilities = useMobileCapabilities();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [shouldAutoHide, setShouldAutoHide] = useState(false);
  
  // Auto-hide controls on mobile in immersive mode
  useEffect(() => {
    if (settings.readingMode === 'immersive' && capabilities.isTouchDevice) {
      const timer = setTimeout(() => setShouldAutoHide(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShouldAutoHide(false);
    }
  }, [settings.readingMode, capabilities.isTouchDevice]);
  
  // Listen for custom event to show controls temporarily
  useEffect(() => {
    const handleShowControls = () => {
      setShouldAutoHide(false);
      const timer = setTimeout(() => setShouldAutoHide(true), 3000);
      return () => clearTimeout(timer);
    };
    
    window.addEventListener('showImmersiveControls', handleShowControls);
    return () => window.removeEventListener('showImmersiveControls', handleShowControls);
  }, []);
  const handleThemeToggle = () => {
    const themeOrder: ReadingSettings['theme'][] = ['light', 'dark', 'sepia'];
    const currentIndex = themeOrder.indexOf(settings.theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    onUpdateSettings({ theme: nextTheme });
  };

  const getThemeIcon = () => {
    switch (settings.theme) {
      case 'light':
        return <IoMoon className="w-5 h-5 transition-transform group-hover:scale-110" />;
      case 'dark':
        return <IoColorPalette className="w-5 h-5 transition-transform group-hover:scale-110" />;
      case 'sepia':
        return <IoSunny className="w-5 h-5 transition-transform group-hover:scale-110" />;
      default:
        return <IoSunny className="w-5 h-5 transition-transform group-hover:scale-110" />;
    }
  };

  const getReadingModeLabel = () => {
    switch (settings.readingMode) {
      case 'normal': return 'Normal Mode';
      case 'focus': return 'Focus Mode';
      case 'immersive': return 'Immersive Mode';
      default: return 'Reading Mode';
    }
  };

  return (
    <div className={classNames(
      'flex items-center justify-between backdrop-blur-md border-b transition-all duration-300 z-10',
      {
        'px-6 py-4': !capabilities.isSmallScreen,
        'px-4 py-3': capabilities.isSmallScreen,
        'bg-white/90 dark:bg-gray-900/90 border-gray-200/50 dark:border-gray-700/50': settings.readingMode !== 'immersive',
        'bg-transparent border-transparent': settings.readingMode === 'immersive',
        'opacity-0 hover:opacity-100 hover:bg-white/5 dark:hover:bg-gray-900/5': settings.readingMode === 'immersive' && !capabilities.isTouchDevice,
        'opacity-100': settings.readingMode !== 'immersive' || capabilities.isTouchDevice,
        'transform -translate-y-full': capabilities.isTouchDevice && settings.readingMode === 'immersive' && shouldAutoHide && !isFullscreen,
        'transform translate-y-0': !capabilities.isTouchDevice || settings.readingMode !== 'immersive' || !shouldAutoHide || isFullscreen
      }
    )}>
      {/* Left Controls: Navigation */}
      <div className={classNames(
        'flex items-center',
        {
          'gap-2': !capabilities.isSmallScreen,
          'gap-1': capabilities.isSmallScreen
        }
      )}>
        {capabilities.isSmallScreen ? (
          // Mobile: Show mobile menu button
          <>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={classNames(
                'control-button group min-h-[44px] min-w-[44px] flex items-center justify-center',
                {
                  'bg-primary/10 text-primary': showMobileMenu
                }
              )}
              aria-label="Menu"
            >
              <IoEllipsisHorizontal className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>
            
            {/* Mobile menu overlay */}
            {showMobileMenu && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}>
                <div className="absolute top-16 left-4 right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 animate-slide-up">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { onToggleTOC(); setShowMobileMenu(false); }}
                      className="control-button group flex flex-col items-center gap-2 p-4 rounded-xl min-h-[60px]"
                      aria-label="Table of Contents"
                    >
                      <IoMenuOutline className="w-6 h-6" />
                      <span className="text-xs font-medium">Contents</span>
                    </button>
                    <button
                      onClick={() => { onToggleBookmarks(); setShowMobileMenu(false); }}
                      className="control-button group flex flex-col items-center gap-2 p-4 rounded-xl min-h-[60px]"
                      aria-label="Bookmarks"
                    >
                      <IoBookmark className="w-6 h-6" />
                      <span className="text-xs font-medium">Bookmarks</span>
                    </button>
                    <button
                      onClick={() => { onToggleSearch(); setShowMobileMenu(false); }}
                      className="control-button group flex flex-col items-center gap-2 p-4 rounded-xl min-h-[60px]"
                      aria-label="Search"
                    >
                      <IoSearch className="w-6 h-6" />
                      <span className="text-xs font-medium">Search</span>
                    </button>
                    {onToggleHighlights && (
                      <button
                        onClick={() => { onToggleHighlights(); setShowMobileMenu(false); }}
                        className="control-button group flex flex-col items-center gap-2 p-4 rounded-xl min-h-[60px]"
                        aria-label="Highlights"
                      >
                        <IoColorWand className="w-6 h-6" />
                        <span className="text-xs font-medium">Highlights</span>
                      </button>
                    )}
                    {onToggleMiniMap && (
                      <button
                        onClick={() => { onToggleMiniMap(); setShowMobileMenu(false); }}
                        className="control-button group flex flex-col items-center gap-2 p-4 rounded-xl min-h-[60px]"
                        aria-label="Reading Map"
                      >
                        <IoNavigateOutline className="w-6 h-6" />
                        <span className="text-xs font-medium">Map</span>
                      </button>
                    )}
                    {onToggleContextualInfo && (
                      <button
                        onClick={() => { onToggleContextualInfo(); setShowMobileMenu(false); }}
                        className="control-button group flex flex-col items-center gap-2 p-4 rounded-xl min-h-[60px]"
                        aria-label="Reading Info"
                      >
                        <IoLocateOutline className="w-6 h-6" />
                        <span className="text-xs font-medium">Info</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // Desktop: Show all buttons
          <>
            <button
              onClick={onToggleTOC}
              className="control-button group"
              aria-label="Table of Contents"
            >
              <IoMenuOutline className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>
            <button
              onClick={onToggleBookmarks}
              className="control-button group"
              aria-label="Bookmarks"
            >
              <IoBookmark className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>
            <button
              onClick={onToggleSearch}
              className="control-button group"
              aria-label="Search"
            >
              <IoSearch className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>
            {onToggleHighlights && (
              <button
                onClick={onToggleHighlights}
                className="control-button group"
                aria-label="Highlights"
              >
                <IoColorWand className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}
            
            {/* Navigation Controls Separator */}
            {(onNavigatePrevious || onNavigateNext || onToggleMiniMap || onToggleContextualInfo) && (
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
            )}
            
            {/* Chapter Navigation */}
            {onNavigateToChapterStart && (
              <button
                onClick={onNavigateToChapterStart}
                className="control-button group"
                aria-label="Go to chapter start"
                disabled={!canNavigatePrevious}
              >
                <IoPlaySkipBackOutline className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}
            
            {/* Page Navigation */}
            {onNavigatePrevious && (
              <button
                onClick={onNavigatePrevious}
                className={classNames(
                  'control-button group',
                  {
                    'opacity-50 cursor-not-allowed': !canNavigatePrevious
                  }
                )}
                aria-label="Previous page"
                disabled={!canNavigatePrevious}
              >
                <IoChevronBackOutline className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}
            
            {onNavigateNext && (
              <button
                onClick={onNavigateNext}
                className={classNames(
                  'control-button group',
                  {
                    'opacity-50 cursor-not-allowed': !canNavigateNext
                  }
                )}
                aria-label="Next page"
                disabled={!canNavigateNext}
              >
                <IoChevronForwardOutline className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}
            
            {onNavigateToChapterEnd && (
              <button
                onClick={onNavigateToChapterEnd}
                className="control-button group"
                aria-label="Go to chapter end"
                disabled={!canNavigateNext}
              >
                <IoPlaySkipForwardOutline className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}
            
            {/* Enhanced Navigation Tools */}
            {onToggleMiniMap && (
              <button
                onClick={onToggleMiniMap}
                className="control-button group"
                aria-label="Toggle reading map"
              >
                <IoNavigateOutline className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}
            
            {onToggleContextualInfo && (
              <button
                onClick={onToggleContextualInfo}
                className="control-button group"
                aria-label="Toggle contextual info"
              >
                <IoLocateOutline className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Center: Enhanced Chapter Info with Hybrid Navigation Context */}
      <div className={classNames(
        'flex-1 text-center',
        {
          'mx-8': !capabilities.isSmallScreen,
          'mx-4': capabilities.isSmallScreen
        }
      )}>
        <div className={classNames(
          'font-semibold text-gray-900 dark:text-gray-100',
          {
            'text-base mb-1': !capabilities.isSmallScreen,
            'text-sm mb-0.5': capabilities.isSmallScreen
          }
        )}>
          {isLoading ? 'Loading...' : (
            capabilities.isSmallScreen 
              ? `Ch. ${currentChapter + 1}`
              : (chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`)
          )}
        </div>
        
        {/* Enhanced Progress Information */}
        {!capabilities.isSmallScreen && navigationContext && (
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
            <div>
              {!isLoading && chapters[currentChapter] && (
                <>
                  {chapters[currentChapter].estimatedReadTime} min read • 
                  {Math.round(progress.overallProgress)}% complete
                </>
              )}
            </div>
            
            {/* Hybrid navigation context */}
            {navigationContext.currentPage.totalInChapter > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <span>
                  Page {navigationContext.currentPage.number} of {navigationContext.currentPage.totalInChapter}
                </span>
                {showPageBoundaries && (
                  <>
                    <span>•</span>
                    <span className="text-blue-500 dark:text-blue-400">
                      Global: {navigationContext.currentPage.globalNumber} / {navigationContext.currentPage.totalInBook}
                    </span>
                  </>
                )}
              </div>
            )}
            
            {/* Current section context */}
            {navigationContext.nearbyElements.currentSection && (
              <div className="text-gray-400 dark:text-gray-500 italic truncate max-w-64 mx-auto">
                {navigationContext.nearbyElements.currentSection}
              </div>
            )}
          </div>
        )}
        
        {/* Mobile simplified view */}
        {capabilities.isSmallScreen && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {!isLoading && (
              <div className="flex items-center justify-center space-x-2">
                <span>{Math.round(progress.overallProgress)}% complete</span>
                {navigationContext && navigationContext.currentPage.totalInChapter > 1 && (
                  <>
                    <span>•</span>
                    <span>
                      Pg {navigationContext.currentPage.number}/{navigationContext.currentPage.totalInChapter}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Settings & Modes */}
      <div className={classNames(
        'flex items-center',
        {
          'gap-2': !capabilities.isSmallScreen,
          'gap-1': capabilities.isSmallScreen
        }
      )}>
        <button
          onClick={handleThemeToggle}
          className={classNames(
            'control-button group',
            {
              'min-h-[44px] min-w-[44px] flex items-center justify-center': capabilities.isSmallScreen
            }
          )}
          aria-label="Toggle Theme"
        >
          {getThemeIcon()}
        </button>
        <button
          onClick={onToggleReadingMode}
          className={classNames(
            'control-button group relative',
            {
              'bg-primary/10 text-primary': settings.readingMode !== 'normal',
              'min-h-[44px] min-w-[44px] flex items-center justify-center': capabilities.isSmallScreen
            }
          )}
          aria-label={getReadingModeLabel()}
          title={getReadingModeLabel()}
        >
          <IoEye className="w-5 h-5 transition-transform group-hover:scale-110" />
          {settings.readingMode !== 'normal' && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
          )}
        </button>
        {!capabilities.isSmallScreen && (
          <button
            onClick={onToggleFullscreen}
            className="control-button group"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <IoContract className="w-5 h-5 transition-transform group-hover:scale-110" />
            ) : (
              <IoExpand className="w-5 h-5 transition-transform group-hover:scale-110" />
            )}
          </button>
        )}
        <button
          onClick={onToggleSettings}
          className={classNames(
            'control-button group',
            {
              'min-h-[44px] min-w-[44px] flex items-center justify-center': capabilities.isSmallScreen
            }
          )}
          aria-label="Settings"
        >
          <IoSettings className="w-5 h-5 transition-transform group-hover:scale-110" />
        </button>
      </div>
    </div>
  );
});

ControlsBar.displayName = 'ControlsBar';

export default ControlsBar;