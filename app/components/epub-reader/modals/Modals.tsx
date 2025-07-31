import React from 'react';
import { useEPUBState, useEPUBUI, useEPUBReaderContext } from '../../../contexts/EPUBReaderContext';
import TOCModal from '../../TOCModal';
import BookmarksModal from '../../BookmarksModal';
import SearchModal from '../../SearchModal';
import SettingsModal from '../../SettingsModal';
import HighlightsModal from '../../HighlightsModal';
import HighlightColorPicker from '../../HighlightColorPicker';

// Stats Modal Component (inline for now)
const StatsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  stats: {
    totalChapters: number;
    currentChapter: number;
    overallProgress: number;
    wordsRead: number;
    timeSpent: number;
    bookmarksCount: number;
    highlightsCount: number;
  };
}> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Reading Statistics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.currentChapter}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Current Chapter
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalChapters}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Chapters
              </div>
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {stats.overallProgress.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Overall Progress
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {stats.wordsRead.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Words Read
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatTime(stats.timeSpent)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Time Spent
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.bookmarksCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Bookmarks
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
                {stats.highlightsCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Highlights
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Modals: React.FC = () => {
  const state = useEPUBState();
  const { uiState } = useEPUBUI();
  const context = useEPUBReaderContext();

  const stats = {
    totalChapters: state.chapters.length,
    currentChapter: state.progress.currentChapter + 1,
    overallProgress: context.calculateOverallProgress(),
    wordsRead: state.progress.wordsRead,
    timeSpent: state.progress.timeSpent,
    bookmarksCount: state.bookmarks.length,
    highlightsCount: state.highlights.length
  };

  return (
    <>
      {/* Table of Contents Modal */}
      <TOCModal
        isOpen={uiState.showTOC}
        onClose={() => context.updateUIState({ showTOC: false })}
        chapters={state.chapters}
        currentChapter={state.progress.currentChapter}
        onChapterSelect={(chapterIndex) => {
          context.navigation.goToChapter(chapterIndex);
          context.updateUIState({ showTOC: false });
        }}
      />

      {/* Bookmarks Modal */}
      <BookmarksModal
        isOpen={uiState.showBookmarks}
        onClose={() => context.updateUIState({ showBookmarks: false })}
        bookmarks={state.bookmarks}
        chapters={state.chapters}
        onBookmarkSelect={(bookmark) => {
          context.navigation.goToPosition(bookmark.chapterIndex, bookmark.position);
          context.updateUIState({ showBookmarks: false });
        }}
        onBookmarkUpdate={context.updateBookmark}
        onBookmarkDelete={context.deleteBookmark}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={uiState.showSearch}
        onClose={() => context.updateUIState({ showSearch: false })}
        searchQuery={state.searchState.query}
        searchResults={state.searchState.results}
        currentResultIndex={state.searchState.currentResultIndex}
        isSearching={state.searchState.isSearching}
        onSearch={context.search.performSearch}
        onResultSelect={context.search.goToResult}
        onNextResult={context.search.goToNextResult}
        onPreviousResult={context.search.goToPreviousResult}
        onClearSearch={context.search.clearSearch}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={uiState.showSettings}
        onClose={() => context.updateUIState({ showSettings: false })}
        settings={state.settings}
        onSettingsChange={context.updateSettings}
      />

      {/* Highlights Modal */}
      <HighlightsModal
        isOpen={uiState.showHighlights}
        onClose={() => context.updateUIState({ showHighlights: false })}
        highlights={state.highlights}
        chapters={state.chapters}
        onHighlightSelect={(highlight) => {
          context.navigation.goToPosition(highlight.chapterIndex, highlight.startPosition);
          context.updateUIState({ showHighlights: false });
        }}
        onHighlightUpdate={context.updateHighlight}
        onHighlightDelete={context.deleteHighlight}
        onExportHighlights={context.exportHighlights}
        onImportHighlights={context.importHighlights}
      />

      {/* Statistics Modal */}
      <StatsModal
        isOpen={uiState.showStats}
        onClose={() => context.updateUIState({ showStats: false })}
        stats={stats}
      />

      {/* Highlight Color Picker */}
      <HighlightColorPicker
        isOpen={uiState.showColorPicker}
        onClose={() => context.updateUIState({ showColorPicker: false })}
        selectedColor={state.settings.highlightColor}
        onColorSelect={(color) => {
          context.updateSettings({ highlightColor: color });
          context.updateUIState({ showColorPicker: false });
        }}
        selectedText={uiState.selectedText}
        onHighlightCreate={(highlight) => {
          context.addHighlight({
            ...highlight,
            chapterIndex: state.progress.currentChapter
          });
          context.updateUIState({ 
            showColorPicker: false,
            selectedText: '',
            selectionRange: null
          });
        }}
      />
    </>
  );
};