'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  IoBookOutline,
  IoDocumentTextOutline,
  IoCopyOutline,
  IoTimeOutline,
  IoStatsChartOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';
import classNames from 'classnames';
import { NavigationContext, ReadingProgress, ReadingSettings } from './types';
import { useMobileCapabilities } from './useMobileTouch';

interface HybridProgressBarProps {
  navigationContext: NavigationContext;
  progress: ReadingProgress;
  settings: ReadingSettings;
  onToggleStats?: () => void;
  onNavigateToProgress?: (globalProgress: number) => void;
  className?: string;
  compact?: boolean;
  showEstimates?: boolean;
}

const HybridProgressBar = React.memo(({
  navigationContext,
  progress,
  settings,
  onToggleStats,
  onNavigateToProgress,
  className,
  compact = false,
  showEstimates = true
}: HybridProgressBarProps) => {
  const capabilities = useMobileCapabilities();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate reading estimates
  const readingEstimates = useMemo(() => {
    const wordsPerMinute = 200; // Average reading speed
    const remainingWords = Math.max(0, 
      (navigationContext.currentPage.totalInBook - navigationContext.currentPage.globalNumber) * 250 // Estimate 250 words per page
    );
    const timeRemaining = Math.ceil(remainingWords / wordsPerMinute);
    
    return {
      timeRemaining,
      wordsRemaining: remainingWords,
      sessionProgress: progress.sessionsToday || 0,
      readingVelocity: progress.wordsRead > 0 && progress.timeSpent > 0 
        ? Math.round((progress.wordsRead / (progress.timeSpent / 60000)))
        : wordsPerMinute
    };
  }, [navigationContext, progress]);

  // Handle progress bar click/drag navigation
  const handleProgressInteraction = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onNavigateToProgress) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    
    onNavigateToProgress(percentage);
  }, [onNavigateToProgress]);

  // Format time duration
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  };

  // Calculate chapter progress within the book
  const chapterProgressInBook = useMemo(() => {
    if (navigationContext.totalChapters === 0) return 0;
    return ((navigationContext.currentChapter.index + 1) / navigationContext.totalChapters) * 100;
  }, [navigationContext]);

  // Calculate page progress within chapter
  const pageProgressInChapter = useMemo(() => {
    if (navigationContext.currentPage.totalInChapter <= 1) return 100;
    return (navigationContext.currentPage.number / navigationContext.currentPage.totalInChapter) * 100;
  }, [navigationContext]);

  // Get progress color based on reading velocity
  const getProgressColor = (velocity: number) => {
    if (velocity > 250) return 'from-green-500 to-green-600';
    if (velocity > 150) return 'from-blue-500 to-blue-600';
    if (velocity > 100) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <div className={classNames(
      'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md transition-all duration-300',
      'border-t border-gray-200/50 dark:border-gray-700/50',
      {
        'bg-transparent border-transparent': settings.readingMode === 'immersive',
        'px-6 py-4': !capabilities.isSmallScreen && !compact,
        'px-4 py-3': capabilities.isSmallScreen || compact,
        'py-2': compact
      },
      className
    )}>
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          {/* Current Position Info */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <IoDocumentTextOutline className="w-4 h-4" />
            <span>
              {compact 
                ? `Ch. ${navigationContext.currentChapter.index + 1}`
                : `Chapter ${navigationContext.currentChapter.index + 1} of ${navigationContext.totalChapters}`
              }
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <IoCopyOutline className="w-4 h-4" />
            <span>
              {compact 
                ? `Page ${navigationContext.currentPage.number}`
                : `Page ${navigationContext.currentPage.number} of ${navigationContext.currentPage.totalInChapter}`
              }
            </span>
          </div>

          {!compact && navigationContext.currentPage.totalInBook > navigationContext.currentPage.totalInChapter && (
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-500">
              <IoBookOutline className="w-4 h-4" />
              <span>Global: {navigationContext.currentPage.globalNumber} / {navigationContext.currentPage.totalInBook}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {showEstimates && !compact && readingEstimates.timeRemaining > 0 && (
            <div 
              className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 cursor-help"
              onMouseEnter={() => setShowTooltip('timeRemaining')}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <IoTimeOutline className="w-3 h-3" />
              <span>{formatTime(readingEstimates.timeRemaining)} left</span>
            </div>
          )}

          {onToggleStats && (
            <button
              onClick={onToggleStats}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded px-1"
              aria-label="View reading statistics"
            >
              <div className="flex items-center space-x-1">
                <IoStatsChartOutline className="w-4 h-4" />
                {!compact && <span>Stats</span>}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Level Progress Bars */}
      <div className="space-y-3">
        {/* Global Book Progress */}
        <div className="relative">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Overall Progress</span>
            <span>{Math.round(progress.overallProgress)}%</span>
          </div>
          
          <div 
            className={classNames(
              'relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden cursor-pointer',
              {
                'hover:bg-gray-250 dark:hover:bg-gray-650 transition-colors': onNavigateToProgress
              }
            )}
            onClick={handleProgressInteraction}
            role={onNavigateToProgress ? "slider" : undefined}
            aria-valuenow={Math.round(progress.overallProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Book reading progress"
          >
            <div
              className={classNames(
                'h-2 rounded-full transition-all duration-500 ease-out bg-gradient-to-r',
                getProgressColor(readingEstimates.readingVelocity)
              )}
              style={{ width: `${progress.overallProgress}%` }}
            />
            
            {/* Chapter markers */}
            {!compact && navigationContext.totalChapters > 1 && (
              <div className="absolute inset-0 flex">
                {Array.from({ length: navigationContext.totalChapters - 1 }, (_, i) => (
                  <div
                    key={i}
                    className="border-r border-white/50 dark:border-gray-900/50"
                    style={{ 
                      width: `${100 / navigationContext.totalChapters}%`,
                      marginLeft: i === 0 ? `${100 / navigationContext.totalChapters}%` : '0'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chapter Progress (if not compact) */}
        {!compact && (
          <div className="relative">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Chapter Progress</span>
              <span>{Math.round(navigationContext.currentChapter.progress)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${navigationContext.currentChapter.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Page Progress (if multiple pages in chapter) */}
        {navigationContext.currentPage.totalInChapter > 1 && (
          <div className="relative">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Page in Chapter</span>
              <span>{Math.round(pageProgressInChapter)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
              <div
                className="bg-gradient-to-r from-gray-400 to-gray-500 h-1 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${pageProgressInChapter}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Progress Statistics */}
      {!compact && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-4">
            <span>{progress.wordsRead.toLocaleString()} words read</span>
            {progress.timeSpent > 0 && (
              <span>{formatTime(Math.floor(progress.timeSpent / 60000))} reading time</span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {progress.streak > 0 && (
              <span className="text-orange-500 dark:text-orange-400">
                {progress.streak} day streak
              </span>
            )}
            <span>{readingEstimates.readingVelocity} wpm</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
          {showTooltip === 'timeRemaining' && (
            <>
              <div>Estimated reading time remaining</div>
              <div className="text-gray-300">
                Based on {readingEstimates.readingVelocity} words per minute
              </div>
            </>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black dark:border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
});

HybridProgressBar.displayName = 'HybridProgressBar';

export default HybridProgressBar;