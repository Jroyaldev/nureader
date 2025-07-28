'use client';

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import debounce from 'lodash.debounce';
import {
  NavigationContext,
  NavigationBreadcrumb,
  QuickJumpTarget,
  PageBreakMap,
  ReadingProgress,
  EPUBChapter,
  BookmarkWithNote,
  Highlight
} from './types';

interface HybridNavigationHook {
  navigationContext: NavigationContext;
  navigateToGlobalPage: (globalPageNumber: number) => Promise<void>;
  navigateToChapterPage: (chapterIndex: number, pageNumber: number) => Promise<void>;
  navigateToPosition: (chapterIndex: number, offset: number) => Promise<void>;
  getQuickJumpTargets: () => QuickJumpTarget[];
  getBreadcrumbs: () => NavigationBreadcrumb[];
  findNearestHeading: (chapterIndex: number, offset: number) => string | null;
  calculateReadingVelocity: () => { wordsPerMinute: number; pagesPerSession: number };
  predictReadingTime: (fromGlobalPage: number, toGlobalPage: number) => number;
  isValidPosition: (chapterIndex: number, pageNumber?: number) => boolean;
}

export const useHybridNavigation = (
  chapters: EPUBChapter[],
  pageBreakMaps: Map<number, PageBreakMap>,
  progress: ReadingProgress,
  bookmarks: BookmarkWithNote[],
  highlights: Highlight[],
  onNavigate: (newProgress: Partial<ReadingProgress>) => void
): HybridNavigationHook => {
  const [navigationHistory, setNavigationHistory] = useState<ReadingProgress[]>([]);
  const [readingSessions, setReadingSessions] = useState<Array<{
    startTime: number;
    endTime: number;
    wordsRead: number;
    pagesRead: number;
  }>>([]);
  
  const lastPositionRef = useRef<ReadingProgress | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // Calculate total global pages across all chapters
  const totalGlobalPages = useMemo(() => {
    let total = 0;
    for (let i = 0; i < chapters.length; i++) {
      const pageMap = pageBreakMaps.get(i);
      total += pageMap?.pages.length || 1; // Fallback to 1 page if not calculated
    }
    return total;
  }, [chapters.length, pageBreakMaps]);

  // Calculate current global page position
  const currentGlobalPage = useMemo(() => {
    let globalPage = 0;
    for (let i = 0; i < progress.currentChapter; i++) {
      const pageMap = pageBreakMaps.get(i);
      globalPage += pageMap?.pages.length || 1;
    }
    return globalPage + progress.chapterPagePosition;
  }, [progress.currentChapter, progress.chapterPagePosition, pageBreakMaps]);

  // Find the nearest heading for contextual navigation
  const findNearestHeading = useCallback((chapterIndex: number, offset: number): string | null => {
    const chapter = chapters[chapterIndex];
    if (!chapter) return null;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chapter.content;
    
    const headings = Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let nearestHeading: string | null = null;
    let smallestDistance = Infinity;

    headings.forEach(heading => {
      const headingText = heading.textContent || '';
      const headingOffset = chapter.content.indexOf(headingText);
      
      if (headingOffset <= offset && (offset - headingOffset) < smallestDistance) {
        smallestDistance = offset - headingOffset;
        nearestHeading = headingText;
      }
    });

    return nearestHeading;
  }, [chapters]);

  // Get contextual section information
  const getCurrentSection = useCallback(() => {
    if (!chapters[progress.currentChapter]) return null;
    
    const pageMap = pageBreakMaps.get(progress.currentChapter);
    if (!pageMap) return null;

    const currentPage = pageMap.pages[progress.chapterPagePosition];
    if (!currentPage) return null;

    return findNearestHeading(progress.currentChapter, currentPage.startOffset);
  }, [progress.currentChapter, progress.chapterPagePosition, pageBreakMaps, findNearestHeading]);

  // Create placeholder refs for navigation functions
  const navigateToGlobalPageRef = useRef<(globalPageNumber: number) => Promise<void>>(() => Promise.resolve());
  const navigateToChapterPageRef = useRef<(chapterIndex: number, pageNumber: number) => Promise<void>>(() => Promise.resolve());
  const navigateToPositionRef = useRef<(chapterIndex: number, offset: number) => Promise<void>>(() => Promise.resolve());

  // Generate navigation breadcrumbs
  const getBreadcrumbs = useCallback((): NavigationBreadcrumb[] => {
    const breadcrumbs: NavigationBreadcrumb[] = [];

    // Book level
    breadcrumbs.push({
      type: 'book',
      title: 'Book Start',
      position: 0,
      onClick: () => navigateToGlobalPageRef.current(0)
    });

    // Chapter level
    if (chapters[progress.currentChapter]) {
      breadcrumbs.push({
        type: 'chapter',
        title: chapters[progress.currentChapter].title,
        position: progress.currentChapter,
        onClick: () => navigateToChapterPageRef.current(progress.currentChapter, 0)
      });
    }

    // Section level (if available)
    const currentSection = getCurrentSection();
    if (currentSection && currentSection.trim()) {
      breadcrumbs.push({
        type: 'section',
        title: currentSection.length > 30 ? 
          currentSection.substring(0, 30) + '...' : 
          currentSection,
        position: progress.chapterPagePosition,
        onClick: () => {
          // Navigate to section start
          const pageMap = pageBreakMaps.get(progress.currentChapter);
          if (pageMap) {
            const currentPage = pageMap.pages[progress.chapterPagePosition];
            if (currentPage) {
              navigateToPositionRef.current(progress.currentChapter, currentPage.startOffset);
            }
          }
        }
      });
    }

    // Page level
    breadcrumbs.push({
      type: 'page',
      title: `Page ${progress.chapterPagePosition + 1}`,
      position: progress.chapterPagePosition,
      onClick: () => {} // Current page, no action needed
    });

    return breadcrumbs;
  }, [
    chapters, 
    progress.currentChapter, 
    progress.chapterPagePosition, 
    getCurrentSection, 
    pageBreakMaps
  ]);

  // Generate quick jump targets
  const getQuickJumpTargets = useCallback((): QuickJumpTarget[] => {
    const targets: QuickJumpTarget[] = [];

    // Chapter starts and ends
    chapters.forEach((chapter, index) => {
      const pageMap = pageBreakMaps.get(index);
      const totalPagesInChapter = pageMap?.pages.length || 1;
      
      let globalPageStart = 0;
      for (let i = 0; i < index; i++) {
        const prevPageMap = pageBreakMaps.get(i);
        globalPageStart += prevPageMap?.pages.length || 1;
      }

      targets.push({
        type: 'chapter-start',
        title: `Chapter ${index + 1}: ${chapter.title}`,
        description: `Start of chapter (${chapter.wordCount} words)`,
        globalPageNumber: globalPageStart,
        chapterIndex: index,
        pageNumber: 0,
        onClick: () => navigateToChapterPageRef.current(index, 0)
      });

      if (totalPagesInChapter > 1) {
        targets.push({
          type: 'chapter-end',
          title: `End of ${chapter.title}`,
          description: `Last page of chapter`,
          globalPageNumber: globalPageStart + totalPagesInChapter - 1,
          chapterIndex: index,
          pageNumber: totalPagesInChapter - 1,
          onClick: () => navigateToChapterPageRef.current(index, totalPagesInChapter - 1)
        });
      }
    });

    // Bookmarks
    bookmarks.forEach(bookmark => {
      const chapter = chapters[bookmark.chapterIndex];
      if (chapter) {
        const pageMap = pageBreakMaps.get(bookmark.chapterIndex);
        let globalPage = 0;
        let pageNumber = 0;

        if (pageMap) {
          // Find page containing this bookmark
          const page = pageMap.pages.find(p => 
            bookmark.position >= (p.startOffset / chapter.content.length) * 100 &&
            bookmark.position <= (p.endOffset / chapter.content.length) * 100
          );
          if (page) {
            pageNumber = page.pageNumber;
            globalPage = page.globalPageNumber;
          }
        }

        targets.push({
          type: 'bookmark',
          title: bookmark.note || 'Untitled Bookmark',
          description: `Chapter ${bookmark.chapterIndex + 1}: ${chapter.title}`,
          globalPageNumber: globalPage,
          chapterIndex: bookmark.chapterIndex,
          pageNumber: pageNumber,
          onClick: () => navigateToPositionRef.current(bookmark.chapterIndex, 
            Math.floor((bookmark.position / 100) * chapter.content.length))
        });
      }
    });

    // Recent highlights
    const recentHighlights = highlights
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5); // Show 5 most recent

    recentHighlights.forEach(highlight => {
      const chapter = chapters[highlight.chapterIndex];
      if (chapter) {
        const pageMap = pageBreakMaps.get(highlight.chapterIndex);
        let globalPage = 0;
        let pageNumber = 0;

        if (pageMap) {
          const page = pageMap.pages.find(p => 
            highlight.startOffset >= p.startOffset && 
            highlight.startOffset < p.endOffset
          );
          if (page) {
            pageNumber = page.pageNumber;
            globalPage = page.globalPageNumber;
          }
        }

        targets.push({
          type: 'highlight',
          title: highlight.text.length > 50 ? 
            highlight.text.substring(0, 50) + '...' : 
            highlight.text,
          description: `${highlight.color} highlight in ${chapter.title}`,
          globalPageNumber: globalPage,
          chapterIndex: highlight.chapterIndex,
          pageNumber: pageNumber,
          onClick: () => navigateToPositionRef.current(highlight.chapterIndex, highlight.startOffset)
        });
      }
    });

    // Sort by global page number for logical ordering
    return targets.sort((a, b) => a.globalPageNumber - b.globalPageNumber);
  }, [chapters, pageBreakMaps, bookmarks, highlights]);

  // Validation function
  const isValidPosition = useCallback((chapterIndex: number, pageNumber?: number): boolean => {
    if (chapterIndex < 0 || chapterIndex >= chapters.length) {
      return false;
    }

    if (pageNumber !== undefined) {
      const pageMap = pageBreakMaps.get(chapterIndex);
      const totalPages = pageMap?.pages.length || 1;
      return pageNumber >= 0 && pageNumber < totalPages;
    }

    return true;
  }, [chapters.length, pageBreakMaps]);

  // Navigation functions
  const navigateToChapterPage = useCallback(async (
    chapterIndex: number, 
    pageNumber: number
  ): Promise<void> => {
    if (!isValidPosition(chapterIndex, pageNumber)) {
      console.warn('Invalid navigation position:', { chapterIndex, pageNumber });
      return;
    }

    const pageMap = pageBreakMaps.get(chapterIndex);
    const chapterTotalPages = pageMap?.pages.length || 1;
    const normalizedPageNumber = Math.max(0, Math.min(pageNumber, chapterTotalPages - 1));

    // Calculate global page position
    let globalPageNumber = 0;
    for (let i = 0; i < chapterIndex; i++) {
      const prevPageMap = pageBreakMaps.get(i);
      globalPageNumber += prevPageMap?.pages.length || 1;
    }
    globalPageNumber += normalizedPageNumber;

    // Update navigation history
    setNavigationHistory(prev => {
      const newHistory = [...prev, progress];
      return newHistory.slice(-20); // Keep last 20 positions
    });

    // Calculate progress within chapter
    const chapterProgress = chapterTotalPages > 1 ? 
      (normalizedPageNumber / (chapterTotalPages - 1)) * 100 : 0;

    // Update progress
    onNavigate({
      currentChapter: chapterIndex,
      currentPage: normalizedPageNumber + 1, // Convert to 1-based for display
      chapterPagePosition: normalizedPageNumber,
      chapterTotalPages: chapterTotalPages,
      globalPagePosition: globalPageNumber,
      totalGlobalPages: totalGlobalPages,
      overallProgress: totalGlobalPages > 1 ? 
        (globalPageNumber / (totalGlobalPages - 1)) * 100 : 0
    });
  }, [pageBreakMaps, progress, totalGlobalPages, onNavigate, isValidPosition]);

  const navigateToPosition = useCallback(async (
    chapterIndex: number, 
    offset: number
  ): Promise<void> => {
    const pageMap = pageBreakMaps.get(chapterIndex);
    if (!pageMap) {
      // Fallback to chapter start
      await navigateToChapterPage(chapterIndex, 0);
      return;
    }

    // Find the page containing this offset
    const targetPage = pageMap.pages.find(page => 
      offset >= page.startOffset && offset < page.endOffset
    );

    if (targetPage) {
      await navigateToChapterPage(chapterIndex, targetPage.pageNumber);
    } else {
      // Fallback to closest page
      const closestPage = pageMap.pages.reduce((closest, page) => {
        const currentDistance = Math.abs(page.startOffset - offset);
        const closestDistance = Math.abs(closest.startOffset - offset);
        return currentDistance < closestDistance ? page : closest;
      });
      
      await navigateToChapterPage(chapterIndex, closestPage.pageNumber);
    }
  }, [pageBreakMaps, navigateToChapterPage]);

  const navigateToGlobalPage = useCallback(async (globalPageNumber: number): Promise<void> => {
    let currentGlobalPage = 0;
    
    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      const pageMap = pageBreakMaps.get(chapterIndex);
      const chapterPages = pageMap?.pages.length || 1;
      
      if (globalPageNumber >= currentGlobalPage && globalPageNumber < currentGlobalPage + chapterPages) {
        const pageNumber = globalPageNumber - currentGlobalPage;
        await navigateToChapterPage(chapterIndex, pageNumber);
        return;
      }
      
      currentGlobalPage += chapterPages;
    }
    
    // Fallback: navigate to last page
    if (chapters.length > 0) {
      const lastChapterIndex = chapters.length - 1;
      const lastPageMap = pageBreakMaps.get(lastChapterIndex);
      const lastPageNumber = (lastPageMap?.pages.length || 1) - 1;
      await navigateToChapterPage(lastChapterIndex, lastPageNumber);
    }
  }, [chapters, pageBreakMaps, navigateToChapterPage]);

  // Reading velocity tracking
  const calculateReadingVelocity = useCallback(() => {
    if (readingSessions.length === 0) {
      return { wordsPerMinute: 200, pagesPerSession: 5 }; // Default estimates
    }

    const recentSessions = readingSessions.slice(-10); // Last 10 sessions
    const totalTime = recentSessions.reduce((sum, session) => 
      sum + (session.endTime - session.startTime), 0);
    const totalWords = recentSessions.reduce((sum, session) => 
      sum + session.wordsRead, 0);
    const totalPages = recentSessions.reduce((sum, session) => 
      sum + session.pagesRead, 0);

    const wordsPerMinute = totalTime > 0 ? (totalWords / (totalTime / 60000)) : 200;
    const pagesPerSession = recentSessions.length > 0 ? 
      (totalPages / recentSessions.length) : 5;

    return { wordsPerMinute, pagesPerSession };
  }, [readingSessions]);

  // Predict reading time between pages
  const predictReadingTime = useCallback((
    fromGlobalPage: number, 
    toGlobalPage: number
  ): number => {
    const { wordsPerMinute } = calculateReadingVelocity();
    let totalWords = 0;

    // Calculate words between pages
    let currentGlobalPage = 0;
    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      const pageMap = pageBreakMaps.get(chapterIndex);
      const chapterPages = pageMap?.pages.length || 1;

      for (let pageIndex = 0; pageIndex < chapterPages; pageIndex++) {
        if (currentGlobalPage >= fromGlobalPage && currentGlobalPage < toGlobalPage) {
          if (pageMap && pageMap.pages[pageIndex]) {
            totalWords += pageMap.pages[pageIndex].wordCount;
          } else {
            // Estimate based on chapter average
            totalWords += Math.floor(chapters[chapterIndex].wordCount / chapterPages);
          }
        }
        currentGlobalPage++;
      }
    }

    return Math.ceil(totalWords / wordsPerMinute); // Return minutes
  }, [chapters, pageBreakMaps, calculateReadingVelocity]);

  // Generate navigation context
  const navigationContext: NavigationContext = useMemo(() => ({
    bookTitle: 'Current Book', // This would come from EPUB metadata
    totalChapters: chapters.length,
    currentChapter: {
      index: progress.currentChapter,
      title: chapters[progress.currentChapter]?.title || '',
      progress: progress.chapterPagePosition > 0 && progress.chapterTotalPages > 1 ? 
        (progress.chapterPagePosition / (progress.chapterTotalPages - 1)) * 100 : 0
    },
    currentPage: {
      number: progress.chapterPagePosition + 1,
      globalNumber: currentGlobalPage + 1,
      totalInChapter: progress.chapterTotalPages,
      totalInBook: totalGlobalPages
    },
    nearbyElements: {
      currentSection: getCurrentSection() || undefined,
      previousHeading: progress.chapterPagePosition > 0 ? 
        findNearestHeading(progress.currentChapter, 
          (pageBreakMaps.get(progress.currentChapter)?.pages[progress.chapterPagePosition - 1]?.startOffset || 0)
        ) || undefined : undefined,
      nextHeading: progress.chapterPagePosition < progress.chapterTotalPages - 1 ? 
        findNearestHeading(progress.currentChapter,
          (pageBreakMaps.get(progress.currentChapter)?.pages[progress.chapterPagePosition + 1]?.startOffset || 0)
        ) || undefined : undefined
    },
    navigationPath: getBreadcrumbs(),
    quickJumpTargets: getQuickJumpTargets()
  }), [
    chapters,
    progress,
    currentGlobalPage,
    totalGlobalPages,
    getCurrentSection,
    findNearestHeading,
    pageBreakMaps,
    getBreadcrumbs,
    getQuickJumpTargets
  ]);

  // Track reading sessions
  useEffect(() => {
    const now = Date.now();
    const timeDiff = now - startTimeRef.current;
    
    // Update session if position changed significantly or time threshold reached
    if (
      lastPositionRef.current && 
      (Math.abs(lastPositionRef.current.globalPagePosition - currentGlobalPage) > 0 || 
       timeDiff > 300000) // 5 minutes
    ) {
      const wordsRead = Math.abs(progress.wordsRead - (lastPositionRef.current.wordsRead || 0));
      const pagesRead = Math.abs(currentGlobalPage - lastPositionRef.current.globalPagePosition);
      
      if (timeDiff > 10000 && (wordsRead > 0 || pagesRead > 0)) { // Minimum 10 seconds
        setReadingSessions(prev => [...prev, {
          startTime: startTimeRef.current,
          endTime: now,
          wordsRead,
          pagesRead
        }].slice(-50)); // Keep last 50 sessions
      }
      
      startTimeRef.current = now;
    }
    
    lastPositionRef.current = progress;
  }, [progress, currentGlobalPage]);

  // Update navigation function refs after they're defined
  useEffect(() => {
    navigateToGlobalPageRef.current = navigateToGlobalPage;
    navigateToChapterPageRef.current = navigateToChapterPage;
    navigateToPositionRef.current = navigateToPosition;
  }, [navigateToGlobalPage, navigateToChapterPage, navigateToPosition]);

  return {
    navigationContext,
    navigateToGlobalPage,
    navigateToChapterPage,
    navigateToPosition,
    getQuickJumpTargets,
    getBreadcrumbs,
    findNearestHeading,
    calculateReadingVelocity,
    predictReadingTime,
    isValidPosition
  };
};