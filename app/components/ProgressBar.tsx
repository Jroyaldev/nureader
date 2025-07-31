'use client';

import React from 'react';
import classNames from 'classnames';
import { ReadingProgress, ReadingSettings } from './types';

interface ProgressBarProps {
  progress: ReadingProgress;
  settings: ReadingSettings;
  onToggleStats: () => void;
}

const ProgressBar = React.memo(({ 
  progress, 
  settings,
  onToggleStats 
}: ProgressBarProps) => {
  // Calculate display values with fallbacks
  const currentChapter = Math.max(0, progress.currentChapter);
  const totalChapters = Math.max(1, progress.totalChapters || 1);
  const overallProgress = Math.max(0, Math.min(100, progress.overallProgress || 0));
  const chapterProgress = Math.max(0, Math.min(100, progress.chapterProgress || 0));
  const wordsRead = Math.max(0, progress.wordsRead || 0);
  
  return (
    <div className={classNames(
      'px-6 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 transition-all duration-300',
      {
        'bg-transparent border-transparent': settings.readingMode === 'immersive'
      }
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Chapter {currentChapter + 1} of {totalChapters}</span>
          {chapterProgress > 0 && (
            <>
              <span className="mx-2">•</span>
              <span className="text-xs">{Math.round(chapterProgress)}% of chapter</span>
            </>
          )}
        </div>
        <button
          onClick={onToggleStats}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1"
        >
          View Stats
        </button>
      </div>
      <div className="relative">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>{Math.round(overallProgress)}% complete</span>
          <span>{wordsRead.toLocaleString()} words read</span>
        </div>
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;