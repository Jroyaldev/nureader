import React, { createContext, useContext, ReactNode } from 'react';
import { EPUBReaderState } from '../hooks/useEPUBReaderState';
import { NavigationHandlers } from '../hooks/useEPUBNavigation';
import { SearchHandlers } from '../hooks/useEPUBSearch';
import { FullscreenHandlers } from '../hooks/useEPUBFullscreen';
import { Bookmark, Highlight } from '../components/types';

export interface EPUBReaderContextValue {
  // State
  state: EPUBReaderState;
  
  // State update functions
  updateProgress: (progress: Partial<typeof state.progress>) => void;
  updateSettings: (settings: Partial<typeof state.settings>) => void;
  updateUIState: (uiState: Partial<typeof state.uiState>) => void;
  updateSearchState: (searchState: Partial<typeof state.searchState>) => void;
  
  // Navigation handlers
  navigation: NavigationHandlers;
  
  // Search handlers
  search: SearchHandlers & { searchStats: any };
  
  // Fullscreen handlers
  fullscreen: FullscreenHandlers;
  
  // Bookmark functions
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  deleteBookmark: (id: string) => void;
  
  // Highlight functions
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  updateHighlight: (id: string, updates: Partial<Highlight>) => void;
  deleteHighlight: (id: string) => void;
  exportHighlights: () => string;
  importHighlights: (data: string) => void;
  
  // Additional functions
  toggleReadingMode: () => void;
  calculateOverallProgress: () => number;
}

const EPUBReaderContext = createContext<EPUBReaderContextValue | null>(null);

export interface EPUBReaderProviderProps {
  children: ReactNode;
  value: EPUBReaderContextValue;
}

export const EPUBReaderProvider: React.FC<EPUBReaderProviderProps> = ({ 
  children, 
  value 
}) => {
  return (
    <EPUBReaderContext.Provider value={value}>
      {children}
    </EPUBReaderContext.Provider>
  );
};

export const useEPUBReaderContext = (): EPUBReaderContextValue => {
  const context = useContext(EPUBReaderContext);
  if (!context) {
    throw new Error('useEPUBReaderContext must be used within an EPUBReaderProvider');
  }
  return context;
};

// Convenience hooks for specific parts of the context
export const useEPUBState = () => {
  const { state } = useEPUBReaderContext();
  return state;
};

export const useEPUBNavigation = () => {
  const { navigation } = useEPUBReaderContext();
  return navigation;
};

export const useEPUBSearch = () => {
  const { search } = useEPUBReaderContext();
  return search;
};

export const useEPUBFullscreen = () => {
  const { fullscreen } = useEPUBReaderContext();
  return fullscreen;
};

export const useEPUBBookmarks = () => {
  const { addBookmark, updateBookmark, deleteBookmark, state } = useEPUBReaderContext();
  return {
    bookmarks: state.bookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark
  };
};

export const useEPUBHighlights = () => {
  const { 
    addHighlight, 
    updateHighlight, 
    deleteHighlight, 
    exportHighlights, 
    importHighlights, 
    state 
  } = useEPUBReaderContext();
  return {
    highlights: state.highlights,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    exportHighlights,
    importHighlights
  };
};

export const useEPUBSettings = () => {
  const { state, updateSettings } = useEPUBReaderContext();
  return {
    settings: state.settings,
    updateSettings
  };
};

export const useEPUBProgress = () => {
  const { state, updateProgress, calculateOverallProgress } = useEPUBReaderContext();
  return {
    progress: state.progress,
    updateProgress,
    calculateOverallProgress
  };
};

export const useEPUBUI = () => {
  const { state, updateUIState } = useEPUBReaderContext();
  return {
    uiState: state.uiState,
    updateUIState
  };
};