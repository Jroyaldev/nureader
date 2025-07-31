import React, { useCallback } from 'react';
import { EPUBReaderProps, ReadingSettings } from '../types';
import { useEPUBReaderState } from '../../hooks/useEPUBReaderState';
import { useEPUBNavigation } from '../../hooks/useEPUBNavigation';
import { useEPUBSearch } from '../../hooks/useEPUBSearch';
import { useEPUBFullscreen } from '../../hooks/useEPUBFullscreen';
import { useEPUBKeyboardShortcuts } from '../../hooks/useEPUBKeyboardShortcuts';
import { EPUBReaderProvider } from '../../contexts/EPUBReaderContext';
import { EPUBReaderLayout } from './layout/EPUBReaderLayout';
import { ReaderContent } from './views/ReaderContent';
import { ReaderControls } from './layout/ReaderControls';
import { Modals } from './modals/Modals';
import Toast from '../Toast';

/**
 * Refactored EPUBReader component with clean architecture
 * 
 * This component now follows the separation of concerns principle:
 * - State management is handled by custom hooks
 * - UI components are separated into logical modules
 * - Context provides state sharing across components
 * - Each hook has a single responsibility
 */
export const EPUBReader: React.FC<EPUBReaderProps> = ({ file }) => {
  // Initialize all hooks
  const {
    state,
    updateProgress,
    updateSettings,
    updateUIState,
    updateSearchState,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    exportHighlights,
    importHighlights
  } = useEPUBReaderState(file);

  // Navigation handlers
  const navigation = useEPUBNavigation(state, updateProgress);

  // Search handlers
  const search = useEPUBSearch(
    state,
    updateSearchState,
    updateUIState,
    navigation.goToPosition
  );

  // Fullscreen handlers
  const fullscreen = useEPUBFullscreen(state, updateUIState);

  // Reading mode toggle
  const toggleReadingMode = useCallback(() => {
    // Cycle through reading modes since pageLayout is removed
    const modes: ReadingSettings['readingMode'][] = ['normal', 'focus', 'immersive'];
    const currentIndex = modes.indexOf(state.settings.readingMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateSettings({ readingMode: nextMode });
  }, [state.settings.readingMode, updateSettings]);

  // Keyboard shortcuts
  useEPUBKeyboardShortcuts(state, {
    navigation,
    search,
    fullscreen,
    updateUIState,
    addBookmark,
    toggleReadingMode
  });

  // Create context value
  const contextValue = {
    state,
    updateProgress,
    updateSettings,
    updateUIState,
    updateSearchState,
    navigation,
    search,
    fullscreen,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    exportHighlights,
    importHighlights,
    toggleReadingMode,
    calculateOverallProgress: navigation.calculateOverallProgress
  };

  return (
    <EPUBReaderProvider value={contextValue}>
      <EPUBReaderLayout>
        {/* Main Content Area */}
        <ReaderContent />
        
        {/* Controls and Navigation */}
        <ReaderControls />
        
        {/* All Modals */}
        <Modals />
        
        {/* Toast Notifications */}
        <Toast />
      </EPUBReaderLayout>
    </EPUBReaderProvider>
  );
};

// Export the component as default for backward compatibility
export default EPUBReader;