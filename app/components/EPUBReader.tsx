'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { IoBookmarkOutline, IoBookmark, IoSettings, IoEye } from 'react-icons/io5';
import debounce from 'lodash.debounce';
import classNames from 'classnames';
import { useMobileCapabilities } from '../hooks/useMobileTouch';

// Import optimized components
import ErrorBoundary from './ErrorBoundary';
import ControlsBar from './ControlsBar';
import ProgressBar from './ProgressBar';
import HybridProgressBar from './HybridProgressBar';
import NavigationBreadcrumbs from './NavigationBreadcrumbs';
import ReadingMiniMap from './ReadingMiniMap';
import ContextualInfo from './ContextualInfo';
import TOCModal from './TOCModal';
import BookmarksModal from './BookmarksModal';
import SearchModal from './SearchModal';
import SettingsModal from './SettingsModal';
import HighlightsModal from './HighlightsModal';
import ReaderView from './ReaderView';
import ChapterView from './ChapterView';
import LoadingState from './LoadingState';
import { useEPUBLoader } from '../hooks/useEPUBLoader';
import { useEpubJsBook } from '../hooks/useEpubJsBook';
import { useToast } from '../hooks/useToast';
import { useHighlights } from '../hooks/useHighlights';
import { ToastContainer } from './Toast';
import {
  EPUBChapter,
  BookmarkWithNote,
  ReadingSettings,
  ReadingProgress,
  SearchResult,
  Highlight,
  NavigationContext,
  PageBreakMap,
  PageInfo
} from './types';

interface EPUBReaderProps {
  file: File;
  onHighlight?: (text: string) => void;
}

const EPUBReader = ({ file, onHighlight }: EPUBReaderProps) => {
  // Mobile capabilities
  const capabilities = useMobileCapabilities();
  
  // Use the new epubjs hook
  const {
    book,
    chapters,
    currentChapter,
    isLoading,
    error,
    loadingProgress,
    loadChapter,
    goToChapter,
    nextChapter,
    prevChapter,
    searchBook
  } = useEpubJsBook(file);
  
  // Current chapter content
  const [chapterContent, setChapterContent] = useState<string>('');
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  
  // Toast notifications
  const { toasts, removeToast, success, error: showError, info } = useToast();
  
  // UI state
  const [showTOC, setShowTOC] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reading state
  const [progress, setProgress] = useState<ReadingProgress>({
    currentChapter: 0,
    totalChapters: 0,
    chapterProgress: 0,
    overallProgress: 0,
    timeSpent: 0,
    wordsRead: 0,
    sessionsToday: 1,
    streak: 1,
    globalPagePosition: 0,
    totalGlobalPages: 1,
    chapterPagePosition: 0,
    chapterTotalPages: 1
  });
  const [chapterProgress, setChapterProgress] = useState(0);

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
        readingMode: 'normal',
        theme: 'light',
        backgroundMusic: false,
        autoPageTurn: false,
        readingGoal: 30
      };
    }
    
    const stored = localStorage.getItem('epub-settings');
    if (stored) {
      const parsedSettings = JSON.parse(stored);
      // Add default animation if not present
      if (!parsedSettings.pageAnimation) {
        // Auto-detect based on device/preferences
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        parsedSettings.pageAnimation = prefersReducedMotion ? 'fade' : (isMobile ? 'slide' : 'flip');
      }
      return parsedSettings;
    }
    
    // Auto-detect animation type for new users
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
    return {
      fontSize: 16,
      fontFamily: 'serif',
      lineHeight: 1.6,
      letterSpacing: 0,
      columnWidth: 65,
      marginSize: 40,
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Highlights using custom hook (use file name as book ID)
  const bookId = file?.name.replace(/\.epub$/i, '') || 'unknown';
  const {
    highlights,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    getHighlightsForChapter,
    exportHighlights,
    importHighlights
  } = useHighlights(bookId);

  // Enhanced Navigation State
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showContextualInfo, setShowContextualInfo] = useState(false);
  const [pageBreakMaps, setPageBreakMaps] = useState<Map<number, PageBreakMap>>(new Map());
  const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo | null>(null);
  const [isCalculatingPages, setIsCalculatingPages] = useState(false);
  const [pageCalculationProgress, setPageCalculationProgress] = useState(0);
  
  // Enhanced progress state with hybrid navigation support
  const [enhancedProgress, setEnhancedProgress] = useState<ReadingProgress>({
    ...progress,
    globalPagePosition: 0,
    totalGlobalPages: 0,
    chapterPagePosition: 0,
    chapterTotalPages: 1
  });

  // Hybrid navigation hook - only initialize when page breaks are ready
  const hybridNavigation = useHybridNavigation(
    chapters,
    pageBreakMaps,
    enhancedProgress,
    bookmarks,
    highlights,
    (newProgress) => {
      setEnhancedProgress(prev => ({ ...prev, ...newProgress }));
      setProgress(prev => ({ ...prev, ...newProgress }));
      
      // Update current page info when navigation changes
      if (typeof newProgress.currentChapter === 'number' && typeof newProgress.chapterPagePosition === 'number') {
        const chapterMap = pageBreakMaps.get(newProgress.currentChapter);
        if (chapterMap && chapterMap.pages[newProgress.chapterPagePosition]) {
          setCurrentPageInfo(chapterMap.pages[newProgress.chapterPagePosition]);
        }
      }
    }
  );

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

<<<<<<< HEAD
  // Load EPUB using the optimized hook and calculate page breaks
=======
  // Update progress when chapters are loaded
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
  useEffect(() => {
    if (chapters.length > 0) {
      setProgress(prev => ({
        ...prev,
        currentChapter,
        totalChapters: chapters.length
      }));
    }
  }, [chapters, currentChapter]);

  // Load chapter content when chapter changes
  useEffect(() => {
    if (!book || chapters.length === 0) return;

    const loadCurrentChapter = async () => {
      setIsLoadingChapter(true);
      try {
<<<<<<< HEAD
        const { chapters: loadedChapters, resources: loadedResources } = await loadEPUB(file);
        setChapters(loadedChapters);
        setResources(loadedResources);
        
        // Don't try to render until page breaks are calculated
        if (loadedChapters.length === 0) {
          showError('No chapters found', 'The EPUB file appears to be empty');
          return;
        }
        
        // Calculate page breaks for all chapters
        setIsCalculatingPages(true);
        setPageCalculationProgress(0);
        info('Calculating page layout...');
        
        try {
          const newPageBreakMaps = new Map<number, PageBreakMap>();
          let globalPageOffset = 0;
          let totalGlobalPages = 0;
          
          // Calculate page breaks for each chapter
          for (let i = 0; i < loadedChapters.length; i++) {
            const chapter = loadedChapters[i];
            setPageCalculationProgress(Math.round((i / loadedChapters.length) * 100));
            
            // Analyze chapter content
            const analysis = await ContentAnalysisUtils.analyzeContent(chapter.content);
            
            // Create page breaker with current settings
            const pageBreaker = new SmartPageBreaker(
              {
                fontSize: settings.fontSize,
                lineHeight: settings.lineHeight,
                columnWidth: settings.columnWidth,
                marginSize: settings.marginSize,
                pageLayout: settings.pageLayout,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                preferredWordsPerPage: 300,
                allowOrphanLines: false,
                respectImageBoundaries: true,
                respectTableBoundaries: true
              },
              {
                respectSentences: true,
                respectParagraphs: true,
                respectHeadings: true,
                respectImages: true,
                respectTables: true,
                respectQuotes: true,
                respectCodeBlocks: true,
                minimumWordsPerPage: 200,
                maximumWordsPerPage: 400,
                allowSplitParagraphs: false,
                preferredBreakElements: ['p', 'div', 'section', 'article']
              }
            );
            
            // Generate optimal pages
            const pageBreakResult = pageBreaker.generateOptimalPages(
              chapter.content,
              analysis,
              i,
              globalPageOffset
            );
            
            // Create page break map
            const pageBreakMap: PageBreakMap = {
              chapterIndex: i,
              pages: pageBreakResult.pages,
              breakPoints: analysis.breakPoints,
              lastCalculated: Date.now(),
              settings: {
                fontSize: settings.fontSize,
                lineHeight: settings.lineHeight,
                columnWidth: settings.columnWidth,
                marginSize: settings.marginSize,
                pageLayout: settings.pageLayout,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                preferredWordsPerPage: 300,
                allowOrphanLines: false,
                respectImageBoundaries: true,
                respectTableBoundaries: true
              }
            };
            
            newPageBreakMaps.set(i, pageBreakMap);
            globalPageOffset += pageBreakResult.pages.length;
            totalGlobalPages += pageBreakResult.pages.length;
          }
          
          setPageBreakMaps(newPageBreakMaps);
          
          // Set initial page info for first chapter
          const firstChapterMap = newPageBreakMaps.get(0);
          if (firstChapterMap && firstChapterMap.pages.length > 0) {
            setCurrentPageInfo(firstChapterMap.pages[0]);
          }
          
          // Update progress with proper page counts
          setProgress(prev => ({
            ...prev,
            totalPages: firstChapterMap?.pages.length || 1,
            chapterTotalPages: firstChapterMap?.pages.length || 1
          }));
          
          setEnhancedProgress(prev => ({
            ...prev,
            totalGlobalPages,
            chapterTotalPages: firstChapterMap?.pages.length || 1
          }));
          
          success('Book loaded successfully', `${loadedChapters.length} chapters, ${totalGlobalPages} pages`);
        } catch (err) {
          console.error('Failed to calculate page breaks:', err);
          showError('Failed to calculate page layout', 'The book will use default pagination');
          // Create minimal page break maps as fallback
          const fallbackMaps = new Map<number, PageBreakMap>();
          loadedChapters.forEach((chapter, i) => {
            fallbackMaps.set(i, {
              chapterIndex: i,
              pages: [{
                id: `page-${i}-0`,
                pageNumber: 0,
                globalPageNumber: i,
                startOffset: 0,
                endOffset: chapter.content.length,
                wordCount: chapter.wordCount,
                estimatedReadTime: chapter.estimatedReadTime,
                hasImages: false,
                hasTables: false,
                contentDensity: 'medium',
                breakQuality: 5
              }],
              breakPoints: [],
              lastCalculated: Date.now(),
              settings: {
                fontSize: settings.fontSize,
                lineHeight: settings.lineHeight,
                columnWidth: settings.columnWidth,
                marginSize: settings.marginSize,
                pageLayout: settings.pageLayout,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                preferredWordsPerPage: 300,
                allowOrphanLines: false,
                respectImageBoundaries: true,
                respectTableBoundaries: true
              }
            });
          });
          setPageBreakMaps(fallbackMaps);
        } finally {
          setIsCalculatingPages(false);
          setPageCalculationProgress(100);
=======
        const content = await loadChapter(currentChapter);
        setChapterContent(content);
        setChapterProgress(0);
        
        // Show success message only on initial load
        if (currentChapter === 0 && !error) {
          success('Book loaded successfully', `${chapters.length} chapters available`);
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
        }
      } catch (err) {
        console.error('Failed to load chapter:', err);
        showError('Failed to load chapter', 'Please try again');
      } finally {
        setIsLoadingChapter(false);
      }
    };

<<<<<<< HEAD
    loadEPUBFile();
  }, [file, loadEPUB, success, showError, info, settings.fontSize, settings.lineHeight, settings.columnWidth, settings.marginSize, settings.pageLayout]);
=======
    loadCurrentChapter();
  }, [book, chapters, currentChapter, loadChapter, success, showError, error]);
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)

  // Enhanced search with epubjs
  const handleSearch = useMemo(
    () => debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      try {
        const results = await searchBook(query);
        setSearchResults(results);
        setCurrentSearchIndex(0);
        
        if (results.length === 0) {
          info(`No results found for "${query}"`);
        } else {
          info(`Found ${results.length} result${results.length === 1 ? '' : 's'} for "${query}"`);
        }
      } catch (error) {
        console.error('Search error:', error);
        showError('Search failed', 'An error occurred while searching. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400),
    [searchBook, info, showError]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  // Navigation handlers
  const handlePrevChapter = useCallback(() => {
    prevChapter();
  }, [prevChapter]);

  const handleNextChapter = useCallback(() => {
    nextChapter();
  }, [nextChapter]);

  const handleChapterSelect = useCallback((index: number) => {
    goToChapter(index);
    setShowTOC(false);
    setShowBookmarks(false);
  }, [goToChapter]);

  const handleProgressChange = useCallback((progress: number) => {
    setChapterProgress(progress);
  }, []);

  const handlePageChange = useCallback((currentPage: number, totalPages: number) => {
    setProgress(prev => ({
      ...prev,
      currentPage: currentPage + 1, // Convert from 0-based to 1-based
      totalPages
    }));
  }, []);

  // Bookmark handlers
  const toggleBookmark = useCallback(() => {
    const bookmarkId = `${currentChapter}-${chapterProgress}-${Date.now()}`;
    
    const existingBookmark = bookmarks.find(b => 
      b.chapterIndex === currentChapter && 
      Math.abs(b.chapterProgress - chapterProgress) < 5
    );

    if (existingBookmark) {
      setBookmarks(prev => prev.filter(b => b.id !== existingBookmark.id));
      success('Bookmark removed', `Removed bookmark from ${chapters[currentChapter]?.title || 'chapter'}`);
    } else {
      const newBookmark: BookmarkWithNote = {
        id: bookmarkId,
        chapterIndex: currentChapter,
        chapterProgress: chapterProgress,
        note: '',
        category: '',
        createdAt: Date.now()
      };
      setBookmarks(prev => [...prev, newBookmark]);
      success('Bookmark added', `Bookmarked ${chapters[currentChapter]?.title || 'chapter'}`);
    }
  }, [currentChapter, chapterProgress, bookmarks, success, chapters]);

  const updateBookmarkNote = useCallback((bookmarkId: string, note: string) => {
    setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, note } : b));
    info('Note updated', 'Bookmark note has been saved');
  }, [info]);

  const updateBookmarkCategory = useCallback((bookmarkId: string, category: string) => {
    setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, category } : b));
    info('Category updated', `Bookmark moved to ${category || 'default'} category`);
  }, [info]);

  const deleteBookmark = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    success('Bookmark deleted', 'Bookmark has been permanently removed');
  }, [success]);

  const handleBookmarkSelect = useCallback((chapterIndex: number, position: number) => {
    goToChapter(chapterIndex);
    setChapterProgress(position);
    setShowBookmarks(false);
  }, [goToChapter]);

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
    goToChapter(chapterIndex);
    setChapterProgress(position);
    setShowSearch(false);
  }, [goToChapter]);

  // Highlight handlers
  const handleHighlightCreate = useCallback((text: string, color: Highlight['color'], startOffset: number, endOffset: number) => {
    const highlight = addHighlight({
      chapterIndex: currentChapter,
      text,
      color,
      startOffset,
      endOffset,
      pageNumber: 1 // Not used in chapter mode
    });
    
    // Call the original onHighlight callback for AI analysis
    if (onHighlight) {
      onHighlight(text);
    }
    
    return highlight;
  }, [currentChapter, addHighlight, onHighlight]);

  const handleHighlightSelect = useCallback((chapterIndex: number, startOffset: number) => {
    goToChapter(chapterIndex);
    // TODO: Scroll to highlight position
    setShowHighlights(false);
  }, [goToChapter]);

  const handleHighlightUpdateNote = useCallback((id: string, note: string) => {
    updateHighlight(id, { note });
  }, [updateHighlight]);

  const handleHighlightUpdateColor = useCallback((id: string, color: Highlight['color']) => {
    updateHighlight(id, { color });
  }, [updateHighlight]);

  // Enhanced fullscreen handling with better cross-browser compatibility
  const toggleFullscreen = useCallback(async () => {
    try {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || 
                                       (document as any).webkitFullscreenElement || 
                                       (document as any).mozFullScreenElement || 
                                       (document as any).msFullscreenElement);
      
      if (!isCurrentlyFullscreen) {
        // Enter fullscreen
        const elem = document.getElementById('reader-container') || document.documentElement;
        
        // Try different fullscreen methods in order of preference
        if (elem.requestFullscreen) {
          await elem.requestFullscreen({ navigationUI: 'hide' });
        } else if ((elem as any).webkitRequestFullscreen) {
          // Safari
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          // Firefox
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          // IE/Edge
          await (elem as any).msRequestFullscreen();
        } else {
          // Fallback for unsupported browsers
          setIsFullscreen(true);
          document.body.style.overflow = 'hidden';
          elem.style.position = 'fixed';
          elem.style.top = '0';
          elem.style.left = '0';
          elem.style.width = '100vw';
          elem.style.height = '100vh';
          elem.style.zIndex = '9999';
          elem.style.backgroundColor = 'var(--background)';
          info('Pseudo-fullscreen mode activated');
          return;
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        } else {
          // Fallback exit
          setIsFullscreen(false);
          document.body.style.overflow = '';
          const elem = document.getElementById('reader-container');
          if (elem) {
            elem.style.position = '';
            elem.style.top = '';
            elem.style.left = '';
            elem.style.width = '';
            elem.style.height = '';
            elem.style.zIndex = '';
            elem.style.backgroundColor = '';
          }
        }
      }
    } catch (err) {
      console.warn('Fullscreen operation failed:', err);
      showError('Fullscreen not supported', 'This feature may not be available on your device or browser');
    }
  }, [showError, info]);

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
    const chaptersCompleted = currentChapter;
    const currentChapterProgressFraction = chapterProgress / 100;
    const overallProgress = ((chaptersCompleted + currentChapterProgressFraction) / chapters.length) * 100;

    setProgress(prev => ({
      ...prev,
      currentChapter,
      totalChapters: chapters.length,
      chapterProgress,
      overallProgress: Math.min(100, Math.max(0, overallProgress))
    }));
  }, [currentChapter, chapterProgress, chapters]);

  // Handle fullscreen change events with proper state sync
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(document.fullscreenElement || 
                                 (document as any).webkitFullscreenElement || 
                                 (document as any).mozFullScreenElement || 
                                 (document as any).msFullscreenElement);
      setIsFullscreen(isNowFullscreen);
      
      // Force a re-render to ensure content is visible
      if (isNowFullscreen) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
        setShowHighlights(false);
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
          case 'h':
            e.preventDefault();
            setShowHighlights(true);
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
    return b.chapterIndex === currentChapter && 
           Math.abs(b.chapterProgress - chapterProgress) < 5;
  });

  // Convert chapters to EPUBChapter format for compatibility
  const epubChapters: EPUBChapter[] = chapters.map((ch, idx) => ({
    id: ch.id,
    href: ch.href,
    title: ch.title,
    subtitle: '',
    level: 1,
    content: '', // Not needed for TOC
    wordCount: 0,
    estimatedReadTime: Math.ceil(idx * 5) // Rough estimate
  }));

  return (
    <div 
      id="reader-container"
      className={classNames(
        'h-full transition-all duration-300',
        {
          'bg-background': true,
          [settings.theme]: true
        }
<<<<<<< HEAD
      )}>
      {/* Enhanced Navigation Breadcrumbs */}
      {settings.readingMode !== 'immersive' && (
        <NavigationBreadcrumbs
          navigationContext={hybridNavigation.navigationContext}
          compact={capabilities.isSmallScreen}
          showQuickJump={!capabilities.isSmallScreen}
        />
      )}

      {/* Controls */}
      <ControlsBar
        onToggleTOC={() => setShowTOC(true)}
        onToggleBookmarks={() => setShowBookmarks(true)}
        onToggleSearch={() => setShowSearch(true)}
        onToggleSettings={() => setShowSettings(true)}
        onToggleHighlights={() => setShowHighlights(true)}
        onToggleFullscreen={toggleFullscreen}
        onToggleReadingMode={toggleReadingMode}
        onToggleMiniMap={() => setShowMiniMap(!showMiniMap)}
        onToggleContextualInfo={() => setShowContextualInfo(!showContextualInfo)}
        settings={settings}
        onUpdateSettings={updateSettings}
        isLoading={isLoading}
        currentChapter={progress.currentChapter}
        chapters={chapters}
        isFullscreen={isFullscreen}
        progress={enhancedProgress}
        navigationContext={hybridNavigation.navigationContext}
        onNavigateNext={() => hybridNavigation.navigateToChapterPage(progress.currentChapter, progress.chapterPagePosition + 1)}
        onNavigatePrevious={() => hybridNavigation.navigateToChapterPage(progress.currentChapter, Math.max(0, progress.chapterPagePosition - 1))}
        onNavigateToChapterStart={() => hybridNavigation.navigateToChapterPage(progress.currentChapter, 0)}
        onNavigateToChapterEnd={() => {
          const pageMap = pageBreakMaps.get(progress.currentChapter);
          const lastPage = (pageMap?.pages.length || 1) - 1;
          hybridNavigation.navigateToChapterPage(progress.currentChapter, lastPage);
        }}
        showPageBoundaries={true}
        canNavigateNext={progress.currentChapter < chapters.length - 1 || progress.chapterPagePosition < progress.chapterTotalPages - 1}
        canNavigatePrevious={progress.currentChapter > 0 || progress.chapterPagePosition > 0}
      />
=======
      )}
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        height: '100%',
        overflow: 'hidden'
      }}>
      {/* Controls */}
      <div style={{ gridRow: '1' }}>
        <ControlsBar
          onToggleTOC={() => setShowTOC(true)}
          onToggleBookmarks={() => setShowBookmarks(true)}
          onToggleSearch={() => setShowSearch(true)}
          onToggleSettings={() => setShowSettings(true)}
          onToggleHighlights={() => setShowHighlights(true)}
          onToggleFullscreen={toggleFullscreen}
          onToggleReadingMode={toggleReadingMode}
          settings={settings}
          onUpdateSettings={updateSettings}
          isLoading={isLoading}
          currentChapter={currentChapter}
          chapters={epubChapters}
          isFullscreen={isFullscreen}
          progress={progress}
        />
      </div>
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
      
      {/* Immersive Mode Floating Controls */}
      {settings.readingMode === 'immersive' && (
        <div className={classNames(
          'fixed z-40 flex gap-2 transition-opacity duration-300',
          {
            'top-4 right-4': !capabilities.isSmallScreen,
            'top-2 right-2': capabilities.isSmallScreen,
            'opacity-20 hover:opacity-100': !capabilities.isTouchDevice,
            'opacity-60': capabilities.isTouchDevice
          }
        )}>
          <button
            onClick={() => setShowSettings(true)}
            className={classNames(
              'control-button group bg-black/20 backdrop-blur-sm',
              {
                'p-3': !capabilities.isSmallScreen,
                'p-2 min-h-[44px] min-w-[44px]': capabilities.isSmallScreen
              }
            )}
            aria-label="Settings"
          >
            <IoSettings className={classNames({
              'w-4 h-4': !capabilities.isSmallScreen,
              'w-5 h-5': capabilities.isSmallScreen
            }, 'text-white')} />
          </button>
          <button
            onClick={toggleReadingMode}
            className={classNames(
              'control-button group bg-black/20 backdrop-blur-sm',
              {
                'p-3': !capabilities.isSmallScreen,
                'p-2 min-h-[44px] min-w-[44px]': capabilities.isSmallScreen
              }
            )}
            aria-label="Exit Immersive Mode"
          >
            <IoEye className={classNames({
              'w-4 h-4': !capabilities.isSmallScreen,
              'w-5 h-5': capabilities.isSmallScreen
            }, 'text-white')} />
          </button>
        </div>
      )}

      {/* Modals */}
      {showTOC && (
        <TOCModal
          chapters={epubChapters}
          currentChapter={currentChapter}
          onSelect={handleChapterSelect}
          onClose={() => setShowTOC(false)}
          progress={progress}
        />
      )}

      {showBookmarks && (
        <BookmarksModal
          bookmarks={bookmarks}
          chapters={epubChapters}
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
          highlights={highlights}
          currentIndex={currentSearchIndex}
          onNavigate={navigateSearchResult}
          onSelect={handleSearchSelect}
          onSelectHighlight={(highlight) => {
            goToChapter(highlight.chapterIndex);
            setShowSearch(false);
          }}
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

      {showHighlights && (
        <HighlightsModal
          highlights={highlights}
          chapters={epubChapters}
          onSelect={handleHighlightSelect}
          onDelete={deleteHighlight}
          onUpdateNote={handleHighlightUpdateNote}
          onUpdateColor={handleHighlightUpdateColor}
          onExport={exportHighlights}
          onImport={importHighlights}
          onClose={() => setShowHighlights(false)}
        />
      )}

      {/* Reader Content */}
      <ErrorBoundary>
        <div style={{ gridRow: '2', overflow: 'hidden', position: 'relative' }}>
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-600 dark:text-red-400 text-xl mb-2">Error Loading Book</div>
                <div className="text-gray-600 dark:text-gray-400">{error}</div>
              </div>
            </div>
          ) : isLoading || isCalculatingPages ? (
            <LoadingState 
<<<<<<< HEAD
              progress={isCalculatingPages ? pageCalculationProgress : loadingProgress} 
              stage={isCalculatingPages ? 'Calculating page layout...' : loadingStage}
              showSkeleton={loadingProgress > 50 || isCalculatingPages}
=======
              progress={loadingProgress} 
              stage="Loading EPUB..."
              showSkeleton={loadingProgress > 50}
            />
          ) : chapters.length > 0 ? (
            <ChapterView
              key={`${currentChapter}-${isFullscreen}`}
              content={chapterContent}
              settings={settings}
              highlights={getHighlightsForChapter(currentChapter)}
              onHighlight={handleHighlightCreate}
              onProgressChange={handleProgressChange}
              onNavigate={(direction) => {
                if (direction === 'prev') handlePrevChapter();
                else handleNextChapter();
              }}
              isFirstChapter={currentChapter === 0}
              isLastChapter={currentChapter === chapters.length - 1}
              isLoading={isLoadingChapter}
              chapterTitle={chapters[currentChapter]?.title}
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
            />
          ) : chapters.length > 0 && pageBreakMaps.size > 0 ? (
            <div className="flex flex-1 min-h-0">
              {/* Main Reader Content */}
              <div className="flex-1 relative">
                <HybridReaderView
                  key={`${progress.currentChapter}-${isFullscreen}`}
                  content={chapters[progress.currentChapter]?.content || ''}
                  settings={settings}
                  pageBreakMap={pageBreakMaps.get(progress.currentChapter) || null}
                  currentPageInfo={currentPageInfo}
                  navigationContext={hybridNavigation.navigationContext}
                  highlights={getHighlightsForChapter(progress.currentChapter)}
                  onHighlight={handleHighlightCreate}
                  onHighlightClick={(highlight) => {
                    hybridNavigation.navigateToPosition(highlight.chapterIndex, highlight.startOffset);
                  }}
                  onNavigateNext={() => {
                    const pageMap = pageBreakMaps.get(progress.currentChapter);
                    const nextPage = progress.chapterPagePosition + 1;
                    if (pageMap && nextPage < pageMap.pages.length) {
                      hybridNavigation.navigateToChapterPage(progress.currentChapter, nextPage);
                    } else {
                      handleNextChapter();
                    }
                  }}
                  onNavigatePrevious={() => {
                    const prevPage = progress.chapterPagePosition - 1;
                    if (prevPage >= 0) {
                      hybridNavigation.navigateToChapterPage(progress.currentChapter, prevPage);
                    } else {
                      handlePrevChapter();
                    }
                  }}
                  onProgressChange={handleProgressChange}
                  isLoading={false}
                  isTransitioning={false}
                />
              </div>

              {/* Side Navigation Panels */}
              {!capabilities.isSmallScreen && settings.readingMode !== 'immersive' && (
                <div className="flex flex-col space-y-4 p-4 w-80 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
                  {/* Reading Mini Map */}
                  {showMiniMap && (
                    <ReadingMiniMap
                      navigationContext={hybridNavigation.navigationContext}
                      chapters={chapters}
                      pageBreakMaps={pageBreakMaps}
                      bookmarks={bookmarks}
                      highlights={highlights}
                      onNavigateToPage={(globalPage) => hybridNavigation.navigateToGlobalPage(globalPage)}
                      onNavigateToChapter={(chapterIndex) => hybridNavigation.navigateToChapterPage(chapterIndex, 0)}
                      collapsed={false}
                      onToggleCollapsed={() => setShowMiniMap(false)}
                    />
                  )}

                  {/* Contextual Information */}
                  {showContextualInfo && (
                    <ContextualInfo
                      navigationContext={hybridNavigation.navigationContext}
                      progress={enhancedProgress}
                      currentPageInfo={currentPageInfo || undefined}
                      currentChapter={chapters[progress.currentChapter]}
                      showVelocity={true}
                      showContentAnalysis={true}
                      showReadingGoals={true}
                    />
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </ErrorBoundary>

      {/* Enhanced Progress Bar */}
      {!isLoading && chapters.length > 0 && (
<<<<<<< HEAD
        <div className={classNames(
          'transition-all duration-300',
          {
            'opacity-0 hover:opacity-100': settings.readingMode === 'immersive' || isFullscreen,
            'opacity-100': settings.readingMode !== 'immersive' && !isFullscreen,
            'fixed bottom-0 left-0 right-0 z-40': isFullscreen,
            'relative': !isFullscreen
          }
        )}>
          <HybridProgressBar 
            navigationContext={hybridNavigation.navigationContext}
            progress={enhancedProgress} 
=======
        <div 
          style={{ gridRow: '3' }}
          className={classNames(
            'transition-all duration-300',
            {
              'opacity-0 hover:opacity-100': settings.readingMode === 'immersive' || isFullscreen,
              'opacity-100': settings.readingMode !== 'immersive' && !isFullscreen,
              'fixed bottom-0 left-0 right-0 z-40': isFullscreen
            }
          )}
        >
          <ProgressBar 
            progress={progress} 
>>>>>>> 887e3a3 (feat: implement premium image optimization and enhanced UX experience)
            settings={settings}
            onToggleStats={() => setShowStats(true)}
            onNavigateToProgress={(globalProgress) => {
              const targetGlobalPage = Math.floor((globalProgress / 100) * enhancedProgress.totalGlobalPages);
              hybridNavigation.navigateToGlobalPage(targetGlobalPage);
            }}
            compact={capabilities.isSmallScreen}
            showEstimates={!capabilities.isSmallScreen}
          />
        </div>
      )}

      {/* Mobile Navigation Components */}
      {capabilities.isSmallScreen && (
        <>
          {/* Floating Mini Map (Mobile) */}
          {showMiniMap && (
            <div className="fixed bottom-20 right-4 z-50 max-w-xs">
              <ReadingMiniMap
                navigationContext={hybridNavigation.navigationContext}
                chapters={chapters}
                pageBreakMaps={pageBreakMaps}
                bookmarks={bookmarks}
                highlights={highlights}
                onNavigateToPage={(globalPage) => hybridNavigation.navigateToGlobalPage(globalPage)}
                onNavigateToChapter={(chapterIndex) => hybridNavigation.navigateToChapterPage(chapterIndex, 0)}
                collapsed={false}
                onToggleCollapsed={() => setShowMiniMap(false)}
              />
            </div>
          )}

          {/* Floating Contextual Info (Mobile) */}
          {showContextualInfo && (
            <ContextualInfo
              navigationContext={hybridNavigation.navigationContext}
              progress={enhancedProgress}
              currentPageInfo={currentPageInfo || undefined}
              currentChapter={chapters[progress.currentChapter]}
              position="floating"
              autoHide={settings.readingMode === 'immersive'}
              showVelocity={true}
              showContentAnalysis={false}
              showReadingGoals={true}
            />
          )}
        </>
      )}

      {/* Floating Bookmark Button */}
      {!isLoading && chapters.length > 0 && (
        <button
          onClick={toggleBookmark}
          className={classNames(
            'fixed rounded-full shadow-xl transition-all duration-300 z-40 backdrop-blur-sm',
            {
              'bg-blue-600/90 text-white hover:bg-blue-700/90': !currentBookmark,
              'bg-yellow-500/90 text-white hover:bg-yellow-600/90': currentBookmark,
              'bottom-8 right-8 p-4': !capabilities.isSmallScreen && !isFullscreen,
              'bottom-6 right-6 p-3 min-h-[56px] min-w-[56px]': capabilities.isSmallScreen && !isFullscreen,
              'bottom-4 right-4 p-3': isFullscreen,
              'opacity-30 hover:opacity-100': settings.readingMode === 'immersive' && !capabilities.isTouchDevice,
              'opacity-80': settings.readingMode === 'immersive' && capabilities.isTouchDevice,
              'hover:scale-110': !capabilities.isTouchDevice,
              'active:scale-95': capabilities.isTouchDevice
            }
          )}
          aria-label={currentBookmark ? 'Remove bookmark' : 'Add bookmark'}
          style={{
            bottom: isFullscreen ? '16px' : undefined,
            right: isFullscreen ? '16px' : undefined
          }}
        >
          {currentBookmark ? (
            <IoBookmark className={classNames({
              'w-6 h-6': !capabilities.isSmallScreen,
              'w-5 h-5': capabilities.isSmallScreen
            })} />
          ) : (
            <IoBookmarkOutline className={classNames({
              'w-6 h-6': !capabilities.isSmallScreen,
              'w-5 h-5': capabilities.isSmallScreen
            })} />
          )}
        </button>
      )}
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

EPUBReader.displayName = 'EPUBReader';

export default EPUBReader;