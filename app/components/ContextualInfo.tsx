'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  IoTimeOutline,
  IoSpeedometerOutline,
  IoStatsChartOutline,
  IoTrendingUpOutline,
  IoImageOutline,
  IoGridOutline,
  IoTextOutline,
  IoBookmarkOutline,
  IoColorWandOutline,
  IoFlameOutline,
  IoTrophyOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';
import classNames from 'classnames';
import { NavigationContext, ReadingProgress, PageInfo, EPUBChapter } from './types';
import { useMobileCapabilities } from './useMobileTouch';

interface ContextualInfoProps {
  navigationContext: NavigationContext;
  progress: ReadingProgress;
  currentPageInfo?: PageInfo;
  currentChapter?: EPUBChapter;
  className?: string;
  position?: 'top' | 'bottom' | 'floating';
  autoHide?: boolean;
  showVelocity?: boolean;
  showContentAnalysis?: boolean;
  showReadingGoals?: boolean;
}

interface ReadingVelocityData {
  currentWPM: number;
  averageWPM: number;
  trend: 'up' | 'down' | 'stable';
  efficiency: number;
  sessionTime: number;
}

interface ContentAnalysis {
  textDensity: 'low' | 'medium' | 'high';
  readingDifficulty: 'easy' | 'medium' | 'challenging';
  estimatedTime: number;
  contentTypes: Array<{
    type: 'text' | 'images' | 'tables' | 'quotes' | 'headings';
    count: number;
    percentage: number;
  }>;
}

const ContextualInfo = React.memo(({
  navigationContext,
  progress,
  currentPageInfo,
  currentChapter,
  className,
  position = 'bottom',
  autoHide = false,
  showVelocity = true,
  showContentAnalysis = true,
  showReadingGoals = true
}: ContextualInfoProps) => {
  const capabilities = useMobileCapabilities();
  const [isVisible, setIsVisible] = useState(!autoHide);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  // Calculate reading velocity
  const velocityData = useMemo((): ReadingVelocityData => {
    const sessionTime = progress.timeSpent / 60000; // Convert to minutes
    const currentWPM = sessionTime > 0 ? Math.round(progress.wordsRead / sessionTime) : 0;
    const averageWPM = 200; // Default average reading speed
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (currentWPM > averageWPM * 1.1) trend = 'up';
    else if (currentWPM < averageWPM * 0.9) trend = 'down';
    
    const efficiency = averageWPM > 0 ? Math.min(100, (currentWPM / averageWPM) * 100) : 100;
    
    return {
      currentWPM,
      averageWPM,
      trend,
      efficiency,
      sessionTime
    };
  }, [progress]);

  // Analyze current page content
  const contentAnalysis = useMemo((): ContentAnalysis => {
    if (!currentPageInfo || !currentChapter) {
      return {
        textDensity: 'medium',
        readingDifficulty: 'medium',
        estimatedTime: 2,
        contentTypes: []
      };
    }

    const textDensity = currentPageInfo.contentDensity;
    const readingDifficulty = currentPageInfo.wordCount > 300 ? 'challenging' : 
                             currentPageInfo.wordCount > 150 ? 'medium' : 'easy';
    
    const estimatedTime = Math.ceil(currentPageInfo.wordCount / velocityData.currentWPM || 200);
    
    const contentTypes: Array<{
      type: 'text' | 'images' | 'tables' | 'quotes' | 'headings';
      count: number;
      percentage: number;
    }> = [
      {
        type: 'text',
        count: currentPageInfo.wordCount,
        percentage: 100
      }
    ];

    if (currentPageInfo.hasImages) {
      contentTypes.push({
        type: 'images',
        count: 1, // Simplified - would need actual image count
        percentage: 10
      });
    }

    if (currentPageInfo.hasTables) {
      contentTypes.push({
        type: 'tables',
        count: 1, // Simplified - would need actual table count
        percentage: 15
      });
    }

    return {
      textDensity,
      readingDifficulty,
      estimatedTime,
      contentTypes
    };
  }, [currentPageInfo, currentChapter, velocityData.currentWPM]);

  // Calculate reading goals progress
  const goalProgress = useMemo(() => {
    const dailyGoal = progress.sessionsToday || 1;
    const weeklyGoal = progress.streak * 7;
    
    return {
      dailyProgress: Math.min(100, (progress.sessionsToday / dailyGoal) * 100),
      weeklyProgress: Math.min(100, (progress.streak / 7) * 100),
      streakBonus: progress.streak > 7 ? Math.min(50, (progress.streak - 7) * 5) : 0
    };
  }, [progress]);

  // Auto-hide functionality
  useEffect(() => {
    if (!autoHide) return;

    const handleActivity = () => {
      setLastInteraction(Date.now());
      setIsVisible(true);
    };

    const hideTimer = setInterval(() => {
      if (Date.now() - lastInteraction > 5000) { // 5 seconds
        setIsVisible(false);
      }
    }, 1000);

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      clearInterval(hideTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [autoHide, lastInteraction]);

  // Format time
  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Get content type icon
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'images': return <IoImageOutline className="w-3 h-3" />;
      case 'tables': return <IoGridOutline className="w-3 h-3" />;
      case 'text': return <IoTextOutline className="w-3 h-3" />;
      default: return <IoTextOutline className="w-3 h-3" />;
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'challenging': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!isVisible && autoHide) {
    return null;
  }

  return (
    <div className={classNames(
      'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md',
      'border border-gray-200/50 dark:border-gray-700/50 rounded-lg',
      'transition-all duration-300',
      {
        'p-4': !capabilities.isSmallScreen,
        'p-3': capabilities.isSmallScreen,
        'fixed z-40': position === 'floating',
        'sticky': position === 'top' || position === 'bottom',
        'bottom-4 right-4 max-w-sm': position === 'floating',
        'opacity-80 hover:opacity-100': autoHide
      },
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <IoInformationCircleOutline className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Reading Context
          </h3>
        </div>
        
        {position === 'floating' && autoHide && (
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label="Hide contextual info"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Current Page Analysis */}
        {showContentAnalysis && currentPageInfo && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Current Page
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <IoTextOutline className="w-3 h-3 text-gray-500" />
                <span>{currentPageInfo.wordCount} words</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <IoTimeOutline className="w-3 h-3 text-gray-500" />
                <span>{formatTime(contentAnalysis.estimatedTime)}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <IoStatsChartOutline className={classNames('w-3 h-3', getDifficultyColor(contentAnalysis.readingDifficulty))} />
                <span className={getDifficultyColor(contentAnalysis.readingDifficulty)}>
                  {contentAnalysis.readingDifficulty}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <div className={classNames(
                  'w-2 h-2 rounded-full',
                  {
                    'bg-green-500': contentAnalysis.textDensity === 'low',
                    'bg-yellow-500': contentAnalysis.textDensity === 'medium',
                    'bg-red-500': contentAnalysis.textDensity === 'high'
                  }
                )} />
                <span>{contentAnalysis.textDensity} density</span>
              </div>
            </div>

            {/* Content types */}
            {contentAnalysis.contentTypes.length > 1 && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">Contains:</span>
                {contentAnalysis.contentTypes.slice(1).map((type, index) => (
                  <div key={type.type} className="flex items-center space-x-1">
                    {getContentTypeIcon(type.type)}
                    <span>{type.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reading Velocity */}
        {showVelocity && velocityData.sessionTime > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Reading Speed
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <IoSpeedometerOutline className="w-3 h-3 text-blue-500" />
                <span>{velocityData.currentWPM} wpm</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <IoTrendingUpOutline className={classNames(
                  'w-3 h-3',
                  {
                    'text-green-500': velocityData.trend === 'up',
                    'text-red-500': velocityData.trend === 'down',
                    'text-gray-500': velocityData.trend === 'stable'
                  }
                )} />
                <span className={classNames({
                  'text-green-600 dark:text-green-400': velocityData.trend === 'up',
                  'text-red-600 dark:text-red-400': velocityData.trend === 'down',
                  'text-gray-600 dark:text-gray-400': velocityData.trend === 'stable'
                })}>
                  {velocityData.trend}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <IoStatsChartOutline className="w-3 h-3 text-purple-500" />
                <span>{Math.round(velocityData.efficiency)}% efficiency</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <IoTimeOutline className="w-3 h-3 text-gray-500" />
                <span>{formatTime(velocityData.sessionTime)}</span>
              </div>
            </div>

            {/* Efficiency bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className={classNames(
                  'h-1 rounded-full transition-all duration-300',
                  {
                    'bg-green-500': velocityData.efficiency >= 80,
                    'bg-yellow-500': velocityData.efficiency >= 60,
                    'bg-red-500': velocityData.efficiency < 60
                  }
                )}
                style={{ width: `${Math.min(100, velocityData.efficiency)}%` }}
              />
            </div>
          </div>
        )}

        {/* Reading Goals */}
        {showReadingGoals && progress.streak > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Progress
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <IoFlameOutline className="w-3 h-3 text-orange-500" />
                <span>{progress.streak} day streak</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <IoTrophyOutline className="w-3 h-3 text-yellow-500" />
                <span>{progress.sessionsToday} sessions today</span>
              </div>
              
              {progress.wordsRead > 0 && (
                <>
                  <div className="flex items-center space-x-1">
                    <IoBookmarkOutline className="w-3 h-3 text-blue-500" />
                    <span>{progress.wordsRead.toLocaleString()} words</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <IoStatsChartOutline className="w-3 h-3 text-green-500" />
                    <span>{Math.round(progress.overallProgress)}% complete</span>
                  </div>
                </>
              )}
            </div>

            {/* Streak visualization */}
            {goalProgress.streakBonus > 0 && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-orange-600 dark:text-orange-400">Streak bonus:</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div
                    className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${goalProgress.streakBonus}%` }}
                  />
                </div>
                <span className="text-orange-600 dark:text-orange-400">+{goalProgress.streakBonus}%</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Context */}
        {navigationContext.nearbyElements.currentSection && (
          <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Section:</span>{' '}
              {navigationContext.nearbyElements.currentSection.length > 40 
                ? navigationContext.nearbyElements.currentSection.substring(0, 40) + '...'
                : navigationContext.nearbyElements.currentSection
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ContextualInfo.displayName = 'ContextualInfo';

export default ContextualInfo;