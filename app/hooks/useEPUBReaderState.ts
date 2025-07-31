import { useState, useEffect, useCallback } from 'react';
import { EPUBChapter, EPUBResource, Bookmark, Highlight, ReadingProgress, ReadingSettings } from '../components/types';
import { useEPUBLoader } from './useEPUBLoader';
import { useHighlights } from './useHighlights';
import { useToast } from './useToast';

export interface SearchState {
  isOpen: boolean;
  query: string;
  results: Array<{
    chapterIndex: number;
    chapterTitle: string;
    snippet: string;
    position: number;
  }>;
  currentResultIndex: number;
  isSearching: boolean;
}

export interface UIState {
  showTOC: boolean;
  showBookmarks: boolean;
  showSearch: boolean;
  showSettings: boolean;
  showHighlights: boolean;
  showStats: boolean;
  isFullscreen: boolean;
  isImmersiveMode: boolean;
  showColorPicker: boolean;
  selectedText: string;
  selectionRange: Range | null;
}

export interface EPUBReaderState {
  // Core EPUB data
  chapters: EPUBChapter[];
  resources: Map<string, EPUBResource>;
  
  // Reading state
  progress: ReadingProgress;
  settings: ReadingSettings;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  
  // UI state
  uiState: UIState;
  searchState: SearchState;
  
  // Loading state
  isLoading: boolean;
  loadingProgress: number;
  loadingStage: string;
  error: string | null;
}

const defaultSettings: ReadingSettings = {
  fontSize: 18,
  fontFamily: 'Georgia',
  lineHeight: 1.6,
  letterSpacing: 0,
  columnWidth: 800,
  marginSize: 20,
  readingMode: 'normal',
  theme: 'light',
  backgroundMusic: false,
  autoPageTurn: false,
  readingGoal: 30
};

const defaultProgress: ReadingProgress = {
  currentChapter: 0,
  currentPage: 0,
  totalPages: 0,
  overallProgress: 0,
  chapterProgress: 0,
  timeSpent: 0,
  wordsRead: 0,
  sessionsToday: 0,
  streak: 0
};

const defaultUIState: UIState = {
  showTOC: false,
  showBookmarks: false,
  showSearch: false,
  showSettings: false,
  showHighlights: false,
  showStats: false,
  isFullscreen: false,
  isImmersiveMode: false,
  showColorPicker: false,
  selectedText: '',
  selectionRange: null
};

const defaultSearchState: SearchState = {
  isOpen: false,
  query: '',
  results: [],
  currentResultIndex: -1,
  isSearching: false
};

export const useEPUBReaderState = (file: File | null) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const { loadEPUB, loadingState } = useEPUBLoader();
  
  // Core state
  const [chapters, setChapters] = useState<EPUBChapter[]>([]);
  const [resources, setResources] = useState<Map<string, EPUBResource>>(new Map());
  const [progress, setProgress] = useState<ReadingProgress>(defaultProgress);
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [uiState, setUIState] = useState<UIState>(defaultUIState);
  const [searchState, setSearchState] = useState<SearchState>(defaultSearchState);
  
  // Initialize highlights hook
  const {
    highlights,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    exportHighlights,
    importHighlights
  } = useHighlights(chapters);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('epub-reader-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('epub-reader-bookmarks');
    if (savedBookmarks) {
      try {
        const parsed = JSON.parse(savedBookmarks);
        setBookmarks(parsed);
      } catch (error) {
        console.warn('Failed to parse saved bookmarks:', error);
      }
    }
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    localStorage.setItem('epub-reader-settings', JSON.stringify(settings));
  }, [settings]);

  // Save bookmarks to localStorage when changed
  useEffect(() => {
    localStorage.setItem('epub-reader-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Load EPUB file when provided
  useEffect(() => {
    if (file) {
      loadEPUB(file)
        .then(({ chapters: loadedChapters, resources: loadedResources }) => {
          setChapters(loadedChapters);
          setResources(loadedResources);
          setProgress(prev => ({
            ...prev,
            currentChapter: 0,
            currentPage: 0,
            totalPages: loadedChapters.reduce((total, chapter) => total + (chapter.pages || 1), 0)
          }));
          toastSuccess('EPUB loaded successfully!');
        })
        .catch((error) => {
          console.error('Failed to load EPUB:', error);
          toastError('Failed to load EPUB file');
        });
    }
  }, [file, loadEPUB, toastSuccess, toastError]);

  // State update functions
  const updateProgress = useCallback((newProgress: Partial<ReadingProgress>) => {
    setProgress(prev => ({ ...prev, ...newProgress, lastReadAt: new Date() }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ReadingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const updateUIState = useCallback((newUIState: Partial<UIState>) => {
    setUIState(prev => ({ ...prev, ...newUIState }));
  }, []);

  const updateSearchState = useCallback((newSearchState: Partial<SearchState>) => {
    setSearchState(prev => ({ ...prev, ...newSearchState }));
  }, []);

  // Bookmark management
  const addBookmark = useCallback((bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setBookmarks(prev => [...prev, newBookmark]);
    toastSuccess('Bookmark added!');
  }, [toastSuccess]);

  const updateBookmark = useCallback((id: string, updates: Partial<Bookmark>) => {
    setBookmarks(prev => prev.map(bookmark => 
      bookmark.id === id ? { ...bookmark, ...updates } : bookmark
    ));
  }, []);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
    toastSuccess('Bookmark removed!');
  }, [toastSuccess]);

  // Combine all state into a single object
  const state: EPUBReaderState = {
    chapters,
    resources,
    progress,
    settings,
    bookmarks,
    highlights,
    uiState,
    searchState,
    isLoading: loadingState.isLoading,
    loadingProgress: loadingState.progress,
    loadingStage: loadingState.stage,
    error: loadingState.error
  };

  return {
    state,
    // State update functions
    updateProgress,
    updateSettings,
    updateUIState,
    updateSearchState,
    // Bookmark functions
    addBookmark,
    updateBookmark,
    deleteBookmark,
    // Highlight functions
    addHighlight,
    updateHighlight,
    deleteHighlight,
    exportHighlights,
    importHighlights
  };
};