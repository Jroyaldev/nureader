import { useEffect, useCallback } from 'react';
import { EPUBReaderState } from './useEPUBReaderState';
import { NavigationHandlers } from './useEPUBNavigation';
import { SearchHandlers } from './useEPUBSearch';
import { FullscreenHandlers } from './useEPUBFullscreen';

export interface KeyboardShortcutHandlers {
  navigation: NavigationHandlers;
  search: SearchHandlers;
  fullscreen: FullscreenHandlers;
  updateUIState: (uiState: Partial<typeof state.uiState>) => void;
  addBookmark: (bookmark: any) => void;
  toggleReadingMode: () => void;
}

export const useEPUBKeyboardShortcuts = (
  state: EPUBReaderState,
  handlers: KeyboardShortcutHandlers
) => {
  const {
    navigation,
    search,
    fullscreen,
    updateUIState,
    addBookmark,
    toggleReadingMode
  } = handlers;

  // Handle global keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isAnyModalOpen = Object.values({
      showTOC: state.uiState.showTOC,
      showBookmarks: state.uiState.showBookmarks,
      showSearch: state.uiState.showSearch,
      showSettings: state.uiState.showSettings,
      showHighlights: state.uiState.showHighlights,
      showStats: state.uiState.showStats,
      showColorPicker: state.uiState.showColorPicker
    }).some(Boolean);

    // Handle Escape key - close any open modal
    if (event.key === 'Escape') {
      if (isAnyModalOpen) {
        updateUIState({
          showTOC: false,
          showBookmarks: false,
          showSearch: false,
          showSettings: false,
          showHighlights: false,
          showStats: false,
          showColorPicker: false
        });
        event.preventDefault();
        return;
      }
    }

    // Don't handle other shortcuts if user is typing in an input
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.contentEditable === 'true') {
      return;
    }

    // Navigation shortcuts
    switch (event.key) {
      case 'ArrowLeft':
      case 'h':
        if (!isAnyModalOpen) {
          navigation.goToPreviousPage();
          event.preventDefault();
        }
        break;
        
      case 'ArrowRight':
      case 'l':
        if (!isAnyModalOpen) {
          navigation.goToNextPage();
          event.preventDefault();
        }
        break;
        
      case 'ArrowUp':
      case 'k':
        if (!isAnyModalOpen) {
          navigation.goToPreviousChapter();
          event.preventDefault();
        }
        break;
        
      case 'ArrowDown':
      case 'j':
        if (!isAnyModalOpen) {
          navigation.goToNextChapter();
          event.preventDefault();
        }
        break;
        
      case 'Home':
        if (!isAnyModalOpen) {
          navigation.goToChapter(0);
          event.preventDefault();
        }
        break;
        
      case 'End':
        if (!isAnyModalOpen) {
          navigation.goToChapter(state.chapters.length - 1);
          event.preventDefault();
        }
        break;
    }

    // Ctrl/Cmd + key shortcuts
    if (isCtrlOrCmd) {
      switch (event.key.toLowerCase()) {
        case 't':
          updateUIState({ showTOC: !state.uiState.showTOC });
          event.preventDefault();
          break;
          
        case 'b':
          if (event.shiftKey) {
            // Ctrl/Cmd + Shift + B: Show bookmarks
            updateUIState({ showBookmarks: !state.uiState.showBookmarks });
          } else {
            // Ctrl/Cmd + B: Add bookmark
            const currentChapter = state.chapters[state.progress.currentChapter];
            if (currentChapter) {
              addBookmark({
                chapterIndex: state.progress.currentChapter,
                chapterTitle: currentChapter.title,
                position: state.progress.chapterProgress,
                note: '',
                category: 'default'
              });
            }
          }
          event.preventDefault();
          break;
          
        case 'f':
          search.toggleSearchModal();
          event.preventDefault();
          break;
          
        case 'h':
          updateUIState({ showHighlights: !state.uiState.showHighlights });
          event.preventDefault();
          break;
          
        case ',':
          updateUIState({ showSettings: !state.uiState.showSettings });
          event.preventDefault();
          break;
          
        case 's':
          if (event.shiftKey) {
            // Ctrl/Cmd + Shift + S: Show stats
            updateUIState({ showStats: !state.uiState.showStats });
          }
          event.preventDefault();
          break;
          
        case 'enter':
          fullscreen.toggleFullscreen();
          event.preventDefault();
          break;
          
        case 'm':
          toggleReadingMode();
          event.preventDefault();
          break;
          
        case 'i':
          fullscreen.toggleImmersiveMode();
          event.preventDefault();
          break;
      }
    }

    // Search navigation shortcuts (when search modal is open)
    if (state.uiState.showSearch && state.searchState.results.length > 0) {
      switch (event.key) {
        case 'F3':
        case 'Enter':
          if (event.shiftKey) {
            search.goToPreviousResult();
          } else {
            search.goToNextResult();
          }
          event.preventDefault();
          break;
      }
    }

    // Number keys for quick chapter navigation (1-9)
    if (!isAnyModalOpen && !isCtrlOrCmd && event.key >= '1' && event.key <= '9') {
      const chapterIndex = parseInt(event.key) - 1;
      if (chapterIndex < state.chapters.length) {
        navigation.goToChapter(chapterIndex);
        event.preventDefault();
      }
    }

    // Space bar for page navigation
    if (event.key === ' ' && !isAnyModalOpen) {
      if (event.shiftKey) {
        navigation.goToPreviousPage();
      } else {
        navigation.goToNextPage();
      }
      event.preventDefault();
    }
  }, [
    state.uiState,
    state.searchState,
    state.chapters,
    state.progress,
    navigation,
    search,
    fullscreen,
    updateUIState,
    addBookmark,
    toggleReadingMode
  ]);

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Return keyboard shortcut information for help/documentation
  const shortcuts = {
    navigation: {
      'Arrow Keys / h,j,k,l': 'Navigate pages and chapters',
      'Space / Shift+Space': 'Next/Previous page',
      'Home / End': 'First/Last chapter',
      '1-9': 'Quick chapter navigation'
    },
    modals: {
      'Ctrl/Cmd + T': 'Toggle Table of Contents',
      'Ctrl/Cmd + B': 'Add bookmark',
      'Ctrl/Cmd + Shift + B': 'Show bookmarks',
      'Ctrl/Cmd + F': 'Search',
      'Ctrl/Cmd + H': 'Show highlights',
      'Ctrl/Cmd + ,': 'Settings',
      'Ctrl/Cmd + Shift + S': 'Show statistics',
      'Escape': 'Close any modal'
    },
    display: {
      'Ctrl/Cmd + Enter': 'Toggle fullscreen',
      'Ctrl/Cmd + I': 'Toggle immersive mode',
      'Ctrl/Cmd + M': 'Toggle reading mode'
    },
    search: {
      'F3 / Enter': 'Next search result',
      'Shift + F3 / Shift + Enter': 'Previous search result'
    }
  };

  return { shortcuts };
};