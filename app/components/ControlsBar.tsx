'use client';

import React from 'react';
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
  IoEye
} from 'react-icons/io5';
import classNames from 'classnames';
import { ReadingSettings, ReadingProgress, EPUBChapter } from './types';

interface ControlsBarProps {
  onToggleTOC: () => void;
  onToggleBookmarks: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  onToggleReadingMode: () => void;
  settings: ReadingSettings;
  onUpdateSettings: (settings: Partial<ReadingSettings>) => void;
  isLoading: boolean;
  currentChapter: number;
  chapters: EPUBChapter[];
  isFullscreen: boolean;
  progress: ReadingProgress;
}

const ControlsBar = React.memo(({
  onToggleTOC,
  onToggleBookmarks,
  onToggleSearch,
  onToggleSettings,
  onToggleFullscreen,
  onToggleReadingMode,
  settings,
  onUpdateSettings,
  isLoading,
  currentChapter,
  chapters,
  isFullscreen,
  progress
}: ControlsBarProps) => {
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
      'flex items-center justify-between px-6 py-4 backdrop-blur-md border-b transition-all duration-300',
      {
        'bg-white/90 dark:bg-gray-900/90 border-gray-200/50 dark:border-gray-700/50': settings.readingMode !== 'immersive',
        'bg-transparent border-transparent opacity-0 hover:opacity-100 hover:bg-white/5 dark:hover:bg-gray-900/5': settings.readingMode === 'immersive'
      }
    )}>
      {/* Left Controls: Navigation */}
      <div className="flex items-center gap-2">
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
      </div>

      {/* Center: Chapter Info with Progress */}
      <div className="flex-1 mx-8 text-center">
        <div className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {isLoading ? 'Loading...' : chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {!isLoading && chapters[currentChapter] && (
            <>
              {chapters[currentChapter].estimatedReadTime} min read • 
              {Math.round(progress.overallProgress)}% complete
            </>
          )}
        </div>
      </div>

      {/* Right Controls: Settings & Modes */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleThemeToggle}
          className="control-button group"
          aria-label="Toggle Theme"
        >
          {getThemeIcon()}
        </button>
        <button
          onClick={onToggleReadingMode}
          className={classNames(
            'control-button group relative',
            {
              'bg-primary/10 text-primary': settings.readingMode !== 'normal'
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
        <button
          onClick={onToggleSettings}
          className="control-button group"
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