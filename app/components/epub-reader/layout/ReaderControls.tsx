import React from 'react';
import { useEPUBState, useEPUBUI, useEPUBReaderContext } from '../../../contexts/EPUBReaderContext';
import ControlsBar from '../../ControlsBar';
import ProgressBar from '../../ProgressBar';
import { BookmarkIcon } from 'lucide-react';

export const ReaderControls: React.FC = () => {
  const state = useEPUBState();
  const { uiState } = useEPUBUI();
  const context = useEPUBReaderContext();

  const currentChapter = state.chapters[state.progress.currentChapter];
  const overallProgress = context.calculateOverallProgress();

  // Check if current position is bookmarked
  const isBookmarked = state.bookmarks.some(bookmark => 
    bookmark.chapterIndex === state.progress.currentChapter &&
    Math.abs(bookmark.position - state.progress.chapterProgress) < 0.01
  );

  const handleBookmarkToggle = () => {
    if (isBookmarked) {
      const bookmark = state.bookmarks.find(b => 
        b.chapterIndex === state.progress.currentChapter &&
        Math.abs(b.position - state.progress.chapterProgress) < 0.01
      );
      if (bookmark) {
        context.deleteBookmark(bookmark.id);
      }
    } else {
      context.addBookmark({
        chapterIndex: state.progress.currentChapter,
        chapterTitle: currentChapter?.title || 'Unknown Chapter',
        position: state.progress.chapterProgress,
        note: '',
        category: 'default'
      });
    }
  };

  const handleToggleReadingMode = () => {
    // Cycle through reading modes since pageLayout is removed
    const modes: ReadingSettings['readingMode'][] = ['normal', 'focus', 'immersive'];
    const currentIndex = modes.indexOf(state.settings.readingMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    context.updateSettings({ readingMode: nextMode });
  };

  return (
    <>
      {/* Main Controls Bar */}
      {!uiState.isImmersiveMode && (
        <ControlsBar
          onToggleTOC={() => context.updateUIState({ showTOC: !uiState.showTOC })}
          onToggleBookmarks={() => context.updateUIState({ showBookmarks: !uiState.showBookmarks })}
          onToggleSearch={() => context.search.toggleSearchModal()}
          onToggleSettings={() => context.updateUIState({ showSettings: !uiState.showSettings })}
          onToggleHighlights={() => context.updateUIState({ showHighlights: !uiState.showHighlights })}
          onToggleFullscreen={context.fullscreen.toggleFullscreen}
          onToggleReadingMode={handleToggleReadingMode}
          settings={state.settings}
          onUpdateSettings={context.updateSettings}
          isLoading={state.isLoading}
          currentChapter={state.progress.currentChapter}
          chapters={state.chapters}
          isFullscreen={uiState.isFullscreen}
          progress={state.progress}
        />
      )}

      {/* Immersive Mode Floating Controls */}
      {uiState.isImmersiveMode && (
        <div className="fixed top-4 right-4 z-50 opacity-20 hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            <button
              onClick={() => context.updateUIState({ showSettings: true })}
              className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              title="Settings"
            >
              ⚙️
            </button>
            <button
              onClick={() => context.fullscreen.toggleImmersiveMode()}
              className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              title="Exit Immersive Mode"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {!uiState.isImmersiveMode && (
        <ProgressBar
          progress={overallProgress}
          currentChapter={state.progress.currentChapter + 1}
          totalChapters={state.chapters.length}
          chapterTitle={currentChapter?.title || 'Unknown Chapter'}
          wordsRead={state.progress.wordsRead}
          timeSpent={state.progress.timeSpent}
          className="fixed bottom-0 left-0 right-0 z-40"
        />
      )}

      {/* Floating Bookmark Button */}
      {!uiState.isImmersiveMode && (
        <button
          onClick={handleBookmarkToggle}
          className={`
            fixed bottom-20 right-6 z-40 p-3 rounded-full shadow-lg transition-all duration-200
            ${isBookmarked 
              ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }
            hover:scale-110 active:scale-95
          `}
          title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
        >
          <BookmarkIcon 
            size={20} 
            fill={isBookmarked ? 'currentColor' : 'none'}
          />
        </button>
      )}
    </>
  );
};