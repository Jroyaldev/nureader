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
}: ProgressBarProps) => (
  <div className={classNames(
    'px-6 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 transition-all duration-300',
    {
      'bg-transparent border-transparent': settings.readingMode === 'immersive'
    }
  )}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Chapter {progress.currentChapter + 1} • Page {progress.currentPage} of {progress.totalPages}
      </div>
      <button
        onClick={onToggleStats}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
      >
        View Stats
      </button>
    </div>
    <div className="relative">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress.overallProgress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
        <span>{Math.round(progress.overallProgress)}% complete</span>
        <span>{progress.wordsRead.toLocaleString()} words read</span>
      </div>
    </div>
  </div>
));

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;