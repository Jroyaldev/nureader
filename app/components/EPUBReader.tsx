'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import {
  IoChevronBack,
  IoChevronForward,
  IoMenuOutline,
  IoBookmark,
  IoSearch,
  IoSunny,
  IoMoon,
  IoClose,
  IoSettings,
  IoExpand,
  IoContract,
  IoPlay,
  IoPause,
  IoVolumeHigh,
  IoText,
  IoColorPalette,
  IoEye,
  IoBookmarkOutline,
  IoFastFood,
  IoNotifications
} from 'react-icons/io5';
import { DOMParser, XMLSerializer } from 'xmldom';
import debounce from 'lodash.debounce';
import DOMPurify from 'dompurify';
import classNames from 'classnames';

interface EPUBReaderProps {
  file: File;
  onHighlight?: (text: string) => void;
}

interface EPUBChapter {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  level: number;
  content: string;
  wordCount: number;
  estimatedReadTime: number;
}

interface EPUBResource {
  id: string;
  href: string;
  mediaType: string;
  data: string;
}

interface BookmarkWithNote {
  chapterIndex: number;
  position: number;
  note: string;
  category: string;
  createdAt: number;
  id: string;
}

interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  columnWidth: number;
  marginSize: number;
  pageLayout: 'single' | 'double' | 'continuous';
  readingMode: 'normal' | 'focus' | 'immersive';
  theme: 'light' | 'dark' | 'sepia';
  backgroundMusic: boolean;
  autoPageTurn: boolean;
  readingGoal: number;
}

interface ReadingProgress {
  currentChapter: number;
  currentPage: number;
  totalPages: number;
  overallProgress: number;
  timeSpent: number;
  wordsRead: number;
  sessionsToday: number;
  streak: number;
}

/**
 * Enhanced Controls Bar with more intuitive grouping and animations
 */
const ControlsBar = ({
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
}: {
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
}) => (
  <div className={classNames(
    'flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 transition-all duration-300',
    {
      'bg-transparent border-transparent': settings.readingMode === 'immersive'
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
        onClick={() => onUpdateSettings({ theme: settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'sepia' : 'light' })}
        className="control-button group"
        aria-label="Toggle Theme"
      >
        {settings.theme === 'light' ? (
          <IoMoon className="w-5 h-5 transition-transform group-hover:scale-110" />
        ) : settings.theme === 'dark' ? (
          <IoColorPalette className="w-5 h-5 transition-transform group-hover:scale-110" />
        ) : (
          <IoSunny className="w-5 h-5 transition-transform group-hover:scale-110" />
        )}
      </button>
      <button
        onClick={onToggleReadingMode}
        className="control-button group"
        aria-label="Toggle Reading Mode"
      >
        <IoEye className="w-5 h-5 transition-transform group-hover:scale-110" />
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

/**
 * Enhanced Modal with better animations and accessibility
 */
const Modal = ({
  title,
  onClose,
  children,
  size = 'medium'
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
}) => {
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={classNames(
        'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300',
        sizeClasses[size]
      )}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
};

/**
 * Enhanced TOC with chapter previews and better navigation
 */
const TOCModal = ({
  chapters,
  currentChapter,
  onSelect,
  onClose,
  progress
}: {
  chapters: EPUBChapter[];
  currentChapter: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  progress: ReadingProgress;
}) => (
  <Modal title="Table of Contents" onClose={onClose} size="large">
    <div className="grid gap-4">
      {chapters.map((chapter, index) => (
        <div
          key={chapter.id}
          className={classNames(
            'group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
            {
              'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20': index === currentChapter,
              'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600': index !== currentChapter
            }
          )}
          onClick={() => onSelect(index)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={classNames(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  {
                    'bg-blue-600 text-white': index === currentChapter,
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300': index !== currentChapter
                  }
                )}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {chapter.title}
                  </div>
                  {chapter.subtitle && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {chapter.subtitle}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4">
                <span>{chapter.wordCount.toLocaleString()} words</span>
                <span>{chapter.estimatedReadTime} min read</span>
                {index < currentChapter && (
                  <span className="text-green-600 dark:text-green-400 font-medium">✓ Complete</span>
                )}
                {index === currentChapter && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Currently reading</span>
                )}
              </div>
            </div>
            <div className="ml-4">
              {index <= currentChapter && (
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700 relative">
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-blue-600 transition-all duration-300"
                    style={{
                      clipPath: index === currentChapter 
                        ? `polygon(0 0, ${Math.min(100, Math.max(0, progress.overallProgress))}% 0, ${Math.min(100, Math.max(0, progress.overallProgress))}% 100%, 0 100%)` 
                        : 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </Modal>
);

/**
 * Advanced Bookmarks with categories and notes
 */
const BookmarksModal = ({
  bookmarks,
  chapters,
  onSelect,
  onDelete,
  onUpdateNote,
  onUpdateCategory,
  onClose
}: {
  bookmarks: BookmarkWithNote[];
  chapters: EPUBChapter[];
  onSelect: (chapterIndex: number, position: number) => void;
  onDelete: (bookmarkId: string) => void;
  onUpdateNote: (bookmarkId: string, note: string) => void;
  onUpdateCategory: (bookmarkId: string, category: string) => void;
  onClose: () => void;
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null);
  
  const categories = ['all', ...Array.from(new Set(bookmarks.map(b => b.category).filter(Boolean)))];
  const filteredBookmarks = selectedCategory === 'all' 
    ? bookmarks 
    : bookmarks.filter(b => b.category === selectedCategory);

  return (
    <Modal title="Bookmarks" onClose={onClose} size="large">
      {bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <IoBookmarkOutline className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <div className="text-gray-500 dark:text-gray-400">No bookmarks added yet.</div>
          <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Click the bookmark button while reading to save your place.
          </div>
        </div>
      ) : (
        <>
          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={classNames(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  {
                    'bg-blue-600 text-white': selectedCategory === category,
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600': selectedCategory !== category
                  }
                )}
              >
                {category === 'all' ? 'All' : category || 'Uncategorized'} 
                ({category === 'all' ? bookmarks.length : bookmarks.filter(b => b.category === category).length})
              </button>
            ))}
          </div>

          {/* Bookmarks List */}
          <div className="space-y-4">
            {filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <button
                    onClick={() => onSelect(bookmark.chapterIndex, bookmark.position)}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {chapters[bookmark.chapterIndex]?.title || `Chapter ${bookmark.chapterIndex + 1}`}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(bookmark.createdAt).toLocaleDateString()} • 
                      Position {bookmark.position}%
                    </div>
                  </button>
                  <button
                    onClick={() => onDelete(bookmark.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    aria-label="Delete bookmark"
                  >
                    <IoClose className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Category and Note */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bookmark.category || ''}
                      onChange={(e) => onUpdateCategory(bookmark.id, e.target.value)}
                      placeholder="Category..."
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <textarea
                    value={bookmark.note || ''}
                    onChange={(e) => onUpdateNote(bookmark.id, e.target.value)}
                    placeholder="Add a note about this bookmark..."
                    className="w-full text-sm p-2 rounded bg-gray-100 dark:bg-gray-700 border-none resize-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};

/**
 * Enhanced Search with instant results and better highlighting
 */
const SearchModal = ({
  query,
  onChange,
  results,
  currentIndex,
  onNavigate,
  onSelect,
  onClose,
  isSearching
}: {
  query: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  results: { chapterIndex: number; snippet: string; position: number }[];
  currentIndex: number;
  onNavigate: (direction: 'next' | 'prev') => void;
  onSelect: (chapterIndex: number, position: number) => void;
  onClose: () => void;
  isSearching: boolean;
}) => (
  <Modal title="Search" onClose={onClose} size="large">
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={onChange}
          placeholder="Search for text, quotes, or concepts..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 pr-10"
          autoFocus
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results */}
      {query && !isSearching && (
        <>
          {results.length > 0 ? (
            <>
              {/* Results Summary */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{results.length} results found</span>
                {results.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('prev')}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Previous Result"
                    >
                      <IoChevronBack className="w-4 h-4" />
                    </button>
                    <span>{currentIndex + 1} of {results.length}</span>
                    <button
                      onClick={() => onNavigate('next')}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Next Result"
                    >
                      <IoChevronForward className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Results List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={classNames(
                      'p-4 rounded-xl cursor-pointer transition-all duration-200',
                      {
                        'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800': index === currentIndex,
                        'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800': index !== currentIndex
                      }
                    )}
                    onClick={() => onSelect(result.chapterIndex, result.position)}
                  >
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Chapter {result.chapterIndex + 1} • Position {result.position}%
                    </div>
                    <div 
                      className="text-gray-900 dark:text-gray-100 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <IoSearch className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <div className="text-gray-500 dark:text-gray-400">No results found for "{query}"</div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Try different keywords or check your spelling.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  </Modal>
);

/**
 * Settings Modal with comprehensive reading customization
 */
const SettingsModal = ({
  settings,
  onUpdateSettings,
  onClose
}: {
  settings: ReadingSettings;
  onUpdateSettings: (settings: Partial<ReadingSettings>) => void;
  onClose: () => void;
}) => (
  <Modal title="Reading Settings" onClose={onClose} size="large">
    <div className="space-y-8">
      {/* Typography Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Typography</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="32"
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Family
            </label>
            <select
              value={settings.fontFamily}
              onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="serif">Serif (Traditional)</option>
              <option value="sans-serif">Sans-serif (Modern)</option>
              <option value="monospace">Monospace (Code)</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Line Height: {settings.lineHeight}
            </label>
            <input
              type="range"
              min="1.2"
              max="2.5"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => onUpdateSettings({ lineHeight: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Letter Spacing: {settings.letterSpacing}px
            </label>
            <input
              type="range"
              min="-1"
              max="3"
              step="0.5"
              value={settings.letterSpacing}
              onChange={(e) => onUpdateSettings({ letterSpacing: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Layout Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Layout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page Layout
            </label>
            <div className="flex gap-2">
              {(['single', 'double', 'continuous'] as const).map(layout => (
                <button
                  key={layout}
                  onClick={() => onUpdateSettings({ pageLayout: layout })}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    {
                      'bg-blue-600 text-white': settings.pageLayout === layout,
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300': settings.pageLayout !== layout
                    }
                  )}
                >
                  {layout === 'single' ? 'Single Page' : layout === 'double' ? 'Double Page' : 'Continuous'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reading Mode
            </label>
            <div className="flex gap-2">
              {(['normal', 'focus', 'immersive'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => onUpdateSettings({ readingMode: mode })}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    {
                      'bg-blue-600 text-white': settings.readingMode === mode,
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300': settings.readingMode !== mode
                    }
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Margin Size: {settings.marginSize}px
            </label>
            <input
              type="range"
              min="20"
              max="120"
              step="10"
              value={settings.marginSize}
              onChange={(e) => onUpdateSettings({ marginSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Column Width: {settings.columnWidth}ch
            </label>
            <input
              type="range"
              min="45"
              max="85"
              step="5"
              value={settings.columnWidth}
              onChange={(e) => onUpdateSettings({ columnWidth: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Theme</h3>
        <div className="flex gap-4">
          {(['light', 'dark', 'sepia'] as const).map(theme => (
            <button
              key={theme}
              onClick={() => onUpdateSettings({ theme })}
              className={classNames(
                'flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                {
                  'border-blue-600': settings.theme === theme,
                  'border-gray-200 dark:border-gray-700': settings.theme !== theme
                }
              )}
            >
              <div className={classNames(
                'w-full h-16 rounded-lg mb-2',
                {
                  'bg-white border border-gray-200': theme === 'light',
                  'bg-gray-900': theme === 'dark',
                  'bg-amber-50': theme === 'sepia'
                }
              )} />
              <div className="text-sm font-medium capitalize">{theme}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Advanced Features</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoPageTurn}
              onChange={(e) => onUpdateSettings({ autoPageTurn: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto page turn (experimental)
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.backgroundMusic}
              onChange={(e) => onUpdateSettings({ backgroundMusic: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Background ambient sounds
            </span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Reading Goal: {settings.readingGoal} minutes
            </label>
            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={settings.readingGoal}
              onChange={(e) => onUpdateSettings({ readingGoal: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  </Modal>
);

/**
 * Enhanced Progress Bar with detailed statistics
 */
const ProgressBar = ({ 
  progress, 
  settings,
  onToggleStats 
}: { 
  progress: ReadingProgress;
  settings: ReadingSettings;
  onToggleStats: () => void;
}) => (
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
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
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
);

/**
 * Enhanced Reader View with smooth pagination and animations
 */
const ReaderView = ({
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
  chapterProgress
}: {
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToPage = useCallback((page: number, smooth = true) => {
    if (!containerRef.current || isTransitioning) return;

    if (page < 1) {
      if (!isFirstChapter) {
        setIsTransitioning(true);
        onPrevChapter();
        setTimeout(() => setIsTransitioning(false), 300);
      }
      return;
    }
    if (page > totalPages) {
      if (!isLastChapter) {
        setIsTransitioning(true);
        onNextChapter();
        setTimeout(() => setIsTransitioning(false), 300);
      }
      return;
    }

    const pageHeight = containerRef.current.clientHeight;
    const scrollTop = (page - 1) * pageHeight;
    
    if (smooth) {
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    } else {
      containerRef.current.scrollTop = scrollTop;
    }
    
    onPageChange(page);
  }, [isTransitioning, isFirstChapter, isLastChapter, totalPages, onPrevChapter, onNextChapter, onPageChange]);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
  }, [currentPage, totalPages, goToPage]);

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
  }, [content, totalPages, onPageChange, onTotalPagesChange]);

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
          'flex-1 overflow-hidden relative transition-all duration-300',
          themeClasses[settings.theme],
          modeClasses[settings.readingMode],
          {
            'opacity-70': isTransitioning
          }
        )}
        style={{
          fontSize: `${settings.fontSize}px`,
          fontFamily: settings.fontFamily,
          lineHeight: settings.lineHeight,
          letterSpacing: `${settings.letterSpacing}px`
        }}
      >
        <div
          ref={contentRef}
          className="prose max-w-none transition-all duration-300"
          style={{
            padding: `${settings.marginSize}px`,
            maxWidth: `${settings.columnWidth}ch`,
            margin: settings.pageLayout === 'single' ? '0 auto' : undefined,
            columns: settings.pageLayout === 'double' ? 2 : undefined,
            columnGap: settings.pageLayout === 'double' ? `${settings.marginSize * 2}px` : undefined
          }}
        />
        
        {/* Page turn animations */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 animate-pulse" />
        )}
      </div>
      
      {/* Navigation Controls */}
      {settings.readingMode !== 'immersive' && (
        <div className="flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 && isFirstChapter}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 group"
            aria-label="Previous page"
          >
            <IoChevronBack className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Previous</span>
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 group"
            aria-label="Next page"
          >
            <span className="text-sm font-medium">Next</span>
            <IoChevronForward className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function EPUBReader({ file, onHighlight }: EPUBReaderProps) {
  // Core state
  const [chapters, setChapters] = useState<EPUBChapter[]>([]);
  const [resources, setResources] = useState<Map<string, EPUBResource>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showTOC, setShowTOC] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reading state
  const [progress, setProgress] = useState<ReadingProgress>({
    currentChapter: 0,
    currentPage: 1,
    totalPages: 1,
    overallProgress: 0,
    timeSpent: 0,
    wordsRead: 0,
    sessionsToday: 1,
    streak: 1
  });

  // Settings with local storage persistence
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    if (typeof window === 'undefined') {
      return {
        fontSize: 16,
        fontFamily: 'serif',
        lineHeight: 1.6,
        letterSpacing: 0,
        columnWidth: 65,
        marginSize: 40,
        pageLayout: 'single',
        readingMode: 'normal',
        theme: 'light',
        backgroundMusic: false,
        autoPageTurn: false,
        readingGoal: 30
      };
    }
    
    const stored = localStorage.getItem('epub-settings');
    if (stored) {
      return { ...JSON.parse(stored) };
    }
    
    return {
      fontSize: 16,
      fontFamily: 'serif',
      lineHeight: 1.6,
      letterSpacing: 0,
      columnWidth: 65,
      marginSize: 40,
      pageLayout: 'single',
      readingMode: 'normal',
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      backgroundMusic: false,
      autoPageTurn: false,
      readingGoal: 30
    };
  });

  // Bookmarks with enhanced features
  const [bookmarks, setBookmarks] = useState<BookmarkWithNote[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('epub-bookmarks');
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn('Failed to load bookmarks from localStorage:', err);
      return [];
    }
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ chapterIndex: number; snippet: string; position: number }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Update settings handler
  const updateSettings = useCallback((newSettings: Partial<ReadingSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('epub-settings', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save settings to localStorage:', err);
      }
      return updated;
    });
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    if (settings.theme === 'sepia') {
      document.documentElement.style.setProperty('--background', '252 248 227');
      document.documentElement.style.setProperty('--foreground', '120 53 15');
    } else {
      document.documentElement.style.removeProperty('--background');
      document.documentElement.style.removeProperty('--foreground');
    }
  }, [settings.theme]);

  // Save bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('epub-bookmarks', JSON.stringify(bookmarks));
    } catch (err) {
      console.warn('Failed to save bookmarks to localStorage:', err);
    }
  }, [bookmarks]);

  // EPUB loading logic (enhanced from original)
  useEffect(() => {
    const loadEpub = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setResources(new Map());

        const zip = new JSZip();
        const content = await zip.loadAsync(file);

        // Read container.xml
        const containerXml = await content.file('META-INF/container.xml')?.async('text');
        if (!containerXml) throw new Error('Invalid EPUB: Missing container.xml');

        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerXml, 'text/xml');
        const rootfile = containerDoc.getElementsByTagName('rootfile')[0];
        const opfPath = rootfile.getAttribute('full-path');
        if (!opfPath) throw new Error('Invalid EPUB: Missing OPF path');

        // Read OPF file
        const opfContent = await content.file(opfPath)?.async('text');
        if (!opfContent) throw new Error('Invalid EPUB: Missing OPF file');

        const opfDoc = parser.parseFromString(opfContent, 'application/xml');
        const manifest = opfDoc.getElementsByTagName('manifest')[0];
        const spine = opfDoc.getElementsByTagName('spine')[0];

        // Process manifest items
        const items = new Map<string, { id: string; href: string; mediaType: string }>();
        const resourcesMap = new Map<string, EPUBResource>();

        const manifestItems = Array.from(manifest.getElementsByTagName('item'));
        for (const item of manifestItems) {
          const id = item.getAttribute('id');
          const href = item.getAttribute('href');
          const mediaType = item.getAttribute('media-type');

          if (id && href && mediaType) {
            items.set(id, { id, href, mediaType });

            // Load binary resources
            if (
              mediaType.startsWith('image/') ||
              mediaType.startsWith('application/') ||
              mediaType.startsWith('font/')
            ) {
              const baseDir = opfPath.split('/').slice(0, -1).join('/');
              const resourcePath = baseDir ? `${baseDir}/${href}` : href;
              const resourceFile = content.file(resourcePath);
              if (resourceFile) {
                const data = await resourceFile.async('base64');
                resourcesMap.set(href, {
                  id,
                  href,
                  mediaType,
                  data: `data:${mediaType};base64,${data}`
                });
              }
            }
          }
        }

        setResources(resourcesMap);

        // Process spine
        const spineItems = Array.from(spine.getElementsByTagName('itemref'))
          .map((itemref) => itemref.getAttribute('idref'))
          .filter((idref): idref is string => idref !== null);

        // Load chapters with enhanced metadata
        const loadedChapters: EPUBChapter[] = [];
        for (const [index, idref] of spineItems.entries()) {
          const item = items.get(idref);
          if (!item) continue;

          const baseDir = opfPath.split('/').slice(0, -1).join('/');
          const chapterPath = baseDir ? `${baseDir}/${item.href}` : item.href;
          const chapterContent = await content.file(chapterPath)?.async('text');
          if (!chapterContent) continue;

          const chapterData = await processChapterContent(chapterContent, resourcesMap, item.href, index + 1);
          loadedChapters.push({
            id: item.id,
            href: item.href,
            ...chapterData
          });
        }

        setChapters(loadedChapters);
        setProgress(prev => ({
          ...prev,
          totalPages: 1 // Will be updated per chapter
        }));
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading EPUB:', err);
        setError(err instanceof Error ? err.message : 'Failed to load the book');
        setIsLoading(false);
      }
    };

    loadEpub();
  }, [file]);

  // Enhanced chapter content processing
  const processChapterContent = async (
    chapterContent: string,
    resources: Map<string, EPUBResource>,
    chapterHref: string,
    chapterNumber: number
  ) => {
    const parser = new DOMParser();
    let contentElement: Element | null = null;
    let title = `Chapter ${chapterNumber}`;
    let subtitle = '';
    let level = 1;

    try {
      const chapterDoc = parser.parseFromString(chapterContent, 'application/xhtml+xml');
      
      // Check for parsing errors
      const parseErrors = chapterDoc.getElementsByTagName('parsererror');
      if (parseErrors.length > 0) {
        throw new Error('XML parsing failed');
      }
      
      contentElement = chapterDoc.getElementsByTagName('body')[0];

      const mainTitle = chapterDoc.getElementsByTagName('title')[0]?.textContent || '';
      const h1 = chapterDoc.getElementsByTagName('h1')[0]?.textContent || '';
      const h2 = chapterDoc.getElementsByTagName('h2')[0]?.textContent || '';

      title = mainTitle || h1 || title;
      if (h1 && h2) {
        title = h1;
        subtitle = h2;
      }
    } catch (err) {
      console.warn('Primary XHTML parsing failed, trying HTML parsing:', err);
      
      // Fallback to HTML parsing
      try {
        const htmlDoc = parser.parseFromString(chapterContent, 'text/html');
        contentElement = htmlDoc.body;
        
        if (contentElement) {
          const h1 = htmlDoc.getElementsByTagName('h1')[0]?.textContent || '';
          const h2 = htmlDoc.getElementsByTagName('h2')[0]?.textContent || '';
          title = h1 || title;
          if (h1 && h2) {
            title = h1;
            subtitle = h2;
          }
        }
      } catch (htmlErr) {
        console.warn('HTML parsing also failed, trying fragment:', htmlErr);
      }
    }

    if (!contentElement) {
      try {
        // Last resort: wrap in a simple div and try parsing
        const fragmentDoc = parser.parseFromString(
          `<div>${chapterContent}</div>`,
          'text/html'
        );
        contentElement = fragmentDoc.body?.firstElementChild;
      } catch (err) {
        console.error('All parsing methods failed:', err);
        // Return basic processed content without DOM parsing
        const textContent = chapterContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
        return { 
          title, 
          subtitle, 
          level, 
          content: DOMPurify.sanitize(chapterContent),
          wordCount,
          estimatedReadTime: Math.ceil(wordCount / 250)
        };
      }
    }

    let processedContent = chapterContent;
    if (contentElement instanceof Element) {
      try {
        const serializer = new XMLSerializer();
        processedContent = serializer
          .serializeToString(contentElement)
          .replace(/^<div[^>]*>/, '')
          .replace(/<\/div>$/, '')
          .replace(/<body[^>]*>/, '')
          .replace(/<\/body>/, '');
      } catch (err) {
        console.error('Content serialization failed:', err);
      }
    }

    // Enhanced image processing with better path resolution
    const baseDir = chapterHref.split('/').slice(0, -1).join('/') + '/';
    processedContent = processedContent.replace(/src="([^"]+)"/g, (match, originalSrc) => {
      if (originalSrc.startsWith('data:') || originalSrc.startsWith('http')) {
        return match;
      }

      let normalizedSrc = originalSrc.replace(/^\.\//, '');
      while (normalizedSrc.includes('../')) {
        const parts = baseDir.split('/');
        parts.pop();
        normalizedSrc = normalizedSrc.replace('../', '');
        const newBase = parts.join('/');
        normalizedSrc = newBase ? `${newBase}/${normalizedSrc}` : normalizedSrc;
      }

      if (!normalizedSrc.startsWith(baseDir) && baseDir !== '/') {
        normalizedSrc = baseDir + normalizedSrc;
      }

      const segments = normalizedSrc.split('/');
      const lastSegments = segments.slice(-2).join('/');

      let resource = resources.get(normalizedSrc) || resources.get(lastSegments);
      if (resource) {
        return `src="${resource.data}"`;
      } else {
        console.warn('Image resource not found for:', originalSrc, normalizedSrc);
        return match;
      }
    });

    // Clean up EPUB-specific attributes
    processedContent = processedContent
      .replace(/xmlns="[^"]*"/g, '')
      .replace(/xmlns:epub="[^"]*"/g, '')
      .replace(/epub:type="[^"]*"/g, '')
      .replace(/xml:lang="[^"]*"/g, '');

    // Calculate word count and reading time
    const textContent = processedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
    const estimatedReadTime = Math.ceil(wordCount / 250); // 250 words per minute average

    processedContent = DOMPurify.sanitize(processedContent);

    return { 
      title, 
      subtitle, 
      level, 
      content: processedContent,
      wordCount,
      estimatedReadTime
    };
  };

  // Enhanced search with better performance
  const handleSearch = useMemo(
    () => debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      // Use setTimeout to avoid blocking UI
      setTimeout(() => {
        const results: { chapterIndex: number; snippet: string; position: number }[] = [];
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

        chapters.forEach((chapter, index) => {
          try {
            let match;
            let foundCount = 0;
            const content = chapter.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            
            if (!content) return; // Skip empty content
            
            // Reset regex lastIndex to avoid issues with global regex
            regex.lastIndex = 0;
            
            while ((match = regex.exec(content)) !== null && foundCount < 5) {
              const snippetStart = Math.max(match.index - 50, 0);
              const snippetEnd = Math.min(match.index + query.length + 50, content.length);
              let snippet = content.substring(snippetStart, snippetEnd);
              
              // Escape the snippet content before adding highlight markup
              snippet = snippet.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              snippet = snippet.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark class="bg-yellow-200 dark:bg-yellow-800">${m}</mark>`);
              
              if (snippetStart > 0) snippet = '...' + snippet;
              if (snippetEnd < content.length) snippet = snippet + '...';

              const position = Math.round((match.index / content.length) * 100);
              
              results.push({ chapterIndex: index, snippet, position });
              foundCount++;
              
              // Prevent infinite loops with zero-width matches
              if (match.index === regex.lastIndex) {
                regex.lastIndex++;
              }
            }
          } catch (searchErr) {
            console.warn(`Search failed for chapter ${index}:`, searchErr);
          }
        });

        setSearchResults(results);
        setCurrentSearchIndex(0);
        setIsSearching(false);
      }, 100);
    }, 300),
    [chapters]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  // Navigation handlers
  const handlePrevChapter = useCallback(() => {
    if (progress.currentChapter > 0) {
      setProgress(prev => ({
        ...prev,
        currentChapter: prev.currentChapter - 1,
        currentPage: 1
      }));
    }
  }, [progress.currentChapter]);

  const handleNextChapter = useCallback(() => {
    if (progress.currentChapter < chapters.length - 1) {
      setProgress(prev => ({
        ...prev,
        currentChapter: prev.currentChapter + 1,
        currentPage: 1
      }));
    }
  }, [progress.currentChapter, chapters.length]);

  const handleChapterSelect = useCallback((index: number) => {
    setProgress(prev => ({
      ...prev,
      currentChapter: index,
      currentPage: 1
    }));
    setShowTOC(false);
    setShowBookmarks(false);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setProgress(prev => ({
      ...prev,
      currentPage: page
    }));
  }, []);

  const handleTotalPagesChange = useCallback((totalPages: number) => {
    setProgress(prev => ({
      ...prev,
      totalPages: totalPages
    }));
  }, []);

  // Bookmark handlers
  const toggleBookmark = useCallback(() => {
    const bookmarkId = `${progress.currentChapter}-${progress.currentPage}-${Date.now()}`;
    const currentPosition = progress.totalPages > 0 
      ? Math.round((progress.currentPage / progress.totalPages) * 100) 
      : 0;
    
    const existingBookmark = bookmarks.find(b => 
      b.chapterIndex === progress.currentChapter && 
      Math.abs(b.position - currentPosition) < 5
    );

    if (existingBookmark) {
      setBookmarks(prev => prev.filter(b => b.id !== existingBookmark.id));
    } else {
      const newBookmark: BookmarkWithNote = {
        id: bookmarkId,
        chapterIndex: progress.currentChapter,
        position: currentPosition,
        note: '',
        category: '',
        createdAt: Date.now()
      };
      setBookmarks(prev => [...prev, newBookmark]);
    }
  }, [progress, bookmarks]);

  const updateBookmarkNote = useCallback((bookmarkId: string, note: string) => {
    setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, note } : b));
  }, []);

  const updateBookmarkCategory = useCallback((bookmarkId: string, category: string) => {
    setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, category } : b));
  }, []);

  const deleteBookmark = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
  }, []);

  const handleBookmarkSelect = useCallback((chapterIndex: number, position: number) => {
    setProgress(prev => ({
      ...prev,
      currentChapter: chapterIndex,
      currentPage: prev.totalPages > 0 
        ? Math.max(1, Math.round((position / 100) * prev.totalPages))
        : 1
    }));
    setShowBookmarks(false);
  }, []);

  // Search navigation
  const navigateSearchResult = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex(prev => {
      if (direction === 'next') {
        return prev < searchResults.length - 1 ? prev + 1 : 0;
      } else {
        return prev > 0 ? prev - 1 : searchResults.length - 1;
      }
    });
  }, [searchResults.length]);

  const handleSearchSelect = useCallback((chapterIndex: number, position: number) => {
    setProgress(prev => ({
      ...prev,
      currentChapter: chapterIndex,
      currentPage: prev.totalPages > 0 
        ? Math.max(1, Math.round((position / 100) * prev.totalPages))
        : 1
    }));
    setShowSearch(false);
  }, []);

  // Fullscreen handling
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen operation failed:', err);
      // Fallback: just toggle the state for styling purposes
      setIsFullscreen(prev => !prev);
    }
  }, []);

  // Reading mode cycling
  const toggleReadingMode = useCallback(() => {
    const modes: ReadingSettings['readingMode'][] = ['normal', 'focus', 'immersive'];
    const currentIndex = modes.indexOf(settings.readingMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateSettings({ readingMode: nextMode });
  }, [settings.readingMode, updateSettings]);

  // Calculate overall progress
  useEffect(() => {
    if (chapters.length === 0) return;
    
    // Calculate progress based on chapters completed + current chapter progress
    const chaptersCompleted = progress.currentChapter;
    const currentChapterProgress = progress.totalPages > 0 ? (progress.currentPage - 1) / progress.totalPages : 0;
    const overallProgress = ((chaptersCompleted + currentChapterProgress) / chapters.length) * 100;
    
    // Calculate words read
    const wordsReadFromCompletedChapters = chapters.slice(0, progress.currentChapter)
      .reduce((total, chapter) => total + chapter.wordCount, 0);
    
    const wordsReadFromCurrentChapter = (chapters[progress.currentChapter]?.wordCount || 0) * currentChapterProgress;
    
    const totalWordsRead = wordsReadFromCompletedChapters + wordsReadFromCurrentChapter;

    setProgress(prev => ({
      ...prev,
      overallProgress: Math.min(100, Math.max(0, overallProgress)),
      wordsRead: Math.round(totalWordsRead)
    }));
  }, [progress.currentChapter, progress.currentPage, progress.totalPages, chapters]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Modal close on Escape
      if (e.key === 'Escape') {
        setShowTOC(false);
        setShowBookmarks(false);
        setShowSearch(false);
        setShowSettings(false);
        setShowStats(false);
        return;
      }

      // Global shortcuts with Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 't':
            e.preventDefault();
            setShowTOC(true);
            break;
          case 'b':
            e.preventDefault();
            toggleBookmark();
            break;
          case 'f':
            e.preventDefault();
            setShowSearch(true);
            break;
          case ',':
            e.preventDefault();
            setShowSettings(true);
            break;
          case 'Enter':
            e.preventDefault();
            toggleFullscreen();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleBookmark, toggleFullscreen]);

  const currentBookmark = bookmarks.find(b => {
    const currentPosition = progress.totalPages > 0 
      ? Math.round((progress.currentPage / progress.totalPages) * 100) 
      : 0;
    return b.chapterIndex === progress.currentChapter && 
           Math.abs(b.position - currentPosition) < 5;
  });

  const chapterProgress = progress.totalPages > 0 ? (progress.currentPage / progress.totalPages) * 100 : 0;

  return (
    <div className={classNames(
      'flex flex-col h-full transition-all duration-300',
      {
        'fixed inset-0 z-50': isFullscreen,
        [settings.theme]: true
      }
    )}>
      {/* Controls */}
      {settings.readingMode !== 'immersive' && (
        <ControlsBar
          onToggleTOC={() => setShowTOC(true)}
          onToggleBookmarks={() => setShowBookmarks(true)}
          onToggleSearch={() => setShowSearch(true)}
          onToggleSettings={() => setShowSettings(true)}
          onToggleFullscreen={toggleFullscreen}
          onToggleReadingMode={toggleReadingMode}
          settings={settings}
          onUpdateSettings={updateSettings}
          isLoading={isLoading}
          currentChapter={progress.currentChapter}
          chapters={chapters}
          isFullscreen={isFullscreen}
          progress={progress}
        />
      )}

      {/* Modals */}
      {showTOC && (
        <TOCModal
          chapters={chapters}
          currentChapter={progress.currentChapter}
          onSelect={handleChapterSelect}
          onClose={() => setShowTOC(false)}
          progress={progress}
        />
      )}

      {showBookmarks && (
        <BookmarksModal
          bookmarks={bookmarks}
          chapters={chapters}
          onSelect={handleBookmarkSelect}
          onDelete={deleteBookmark}
          onUpdateNote={updateBookmarkNote}
          onUpdateCategory={updateBookmarkCategory}
          onClose={() => setShowBookmarks(false)}
        />
      )}

      {showSearch && (
        <SearchModal
          query={searchQuery}
          onChange={handleSearchChange}
          results={searchResults}
          currentIndex={currentSearchIndex}
          onNavigate={navigateSearchResult}
          onSelect={handleSearchSelect}
          onClose={() => setShowSearch(false)}
          isSearching={isSearching}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Reader Content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-600 dark:text-red-400 text-xl mb-2">Error Loading Book</div>
              <div className="text-gray-600 dark:text-gray-400">{error}</div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="text-gray-600 dark:text-gray-400">Loading your book...</div>
            </div>
          </div>
        ) : chapters.length > 0 ? (
          <ReaderView
            content={chapters[progress.currentChapter]?.content || ''}
            settings={settings}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            onPageChange={handlePageChange}
            onTotalPagesChange={handleTotalPagesChange}
            isFirstChapter={progress.currentChapter === 0}
            isLastChapter={progress.currentChapter === chapters.length - 1}
            currentPage={progress.currentPage}
            totalPages={progress.totalPages}
            chapterProgress={chapterProgress}
          />
        ) : null}
      </div>

      {/* Progress Bar */}
      {!isLoading && chapters.length > 0 && settings.readingMode !== 'immersive' && (
        <ProgressBar 
          progress={progress} 
          settings={settings}
          onToggleStats={() => setShowStats(true)}
        />
      )}

      {/* Floating Bookmark Button */}
      {!isLoading && chapters.length > 0 && (
        <button
          onClick={toggleBookmark}
          className={classNames(
            'fixed bottom-8 right-8 p-4 rounded-full shadow-xl transition-all duration-300 z-40',
            {
              'bg-blue-600 text-white hover:bg-blue-700': !currentBookmark,
              'bg-yellow-500 text-white hover:bg-yellow-600': currentBookmark,
              'bottom-4 right-4 p-3': isFullscreen
            }
          )}
          aria-label={currentBookmark ? 'Remove bookmark' : 'Add bookmark'}
        >
          {currentBookmark ? (
            <IoBookmark className="w-6 h-6" />
          ) : (
            <IoBookmarkOutline className="w-6 h-6" />
          )}
        </button>
      )}
    </div>
  );
}