'use client';

import { useCallback, useMemo } from 'react';
import { 
  EPUBChapter, 
  ReadingSettings, 
  BookmarkWithNote, 
  Highlight,
  ReadingProgress,
  NavigationContext,
  PageBreakMap,
  PageInfo
} from './types';
import { useHybridPaginationState } from './useHybridPaginationState';
import { usePerformanceOptimization } from './usePerformanceOptimization';
import { useFallbackSystems } from './useFallbackSystems';

interface HybridPaginationMasterHook {
  // Core state
  progress: ReadingProgress;
  navigationContext: NavigationContext;
  
  // Current page information
  currentPageInfo: PageInfo | null;
  currentPageMap: PageBreakMap | null;
  
  // Navigation methods
  navigateToGlobalPage: (globalPageNumber: number) => Promise<void>;
  navigateToChapterPage: (chapterIndex: number, pageNumber: number) => Promise<void>;
  navigateToPosition: (chapterIndex: number, offset: number) => Promise<void>;
  navigateNext: () => Promise<void>;
  navigatePrevious: () => Promise<void>;
  
  // Page state
  canNavigateNext: boolean;
  canNavigatePrevious: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  
  // System status
  isCalculating: boolean;
  calculationProgress: number;
  isUsingFallback: boolean;
  systemHealth: 'healthy' | 'degraded' | 'fallback';
  
  // Performance metrics
  performanceMetrics: {
    renderTime: number;
    calculationTime: number;
    memoryUsage: number;
    frameRate: number;
  };
  
  // Utility methods
  recalculateAllPages: () => Promise<void>;
  clearCache: () => void;
  attemptRecovery: () => Promise<boolean>;
  getReadingAnalytics: () => {
    timeOnCurrentPage: number;
    averageTimePerPage: number;
    readingVelocity: { wordsPerMinute: number; pagesPerSession: number };
    estimatedTimeRemaining: number;
  };
}

export const useHybridPaginationMaster = (
  chapters: EPUBChapter[],
  settings: ReadingSettings,
  bookmarks: BookmarkWithNote[],
  highlights: Highlight[],
  containerDimensions: { width: number; height: number },
  onProgressChange?: (progress: ReadingProgress) => void
): HybridPaginationMasterHook => {
  
  // Initialize fallback systems first (highest priority)
  const fallbackSystems = useFallbackSystems(chapters, settings);
  
  // Initialize performance optimization
  const performanceOptimization = usePerformanceOptimization(
    chapters,
    0, // Will be updated from progress
    settings
  );
  
  // Initialize main pagination state management
  const paginationState = useHybridPaginationState(
    chapters,
    settings,
    bookmarks,
    highlights,
    containerDimensions,
    onProgressChange
  );

  // Enhanced navigation methods with error handling
  const safeNavigateToGlobalPage = useCallback(async (globalPageNumber: number): Promise<void> => {
    try {
      await paginationState.navigateToGlobalPage(globalPageNumber);
    } catch (error) {
      const handled = fallbackSystems.handleNavigationError(error as Error, {
        component: 'HybridPagination',
        operation: 'navigateToGlobalPage',
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      if (!handled) {
        console.error('Failed to navigate to global page:', error);
        // Attempt basic navigation to the closest chapter
        const targetChapter = Math.min(Math.floor(globalPageNumber / 10), chapters.length - 1);
        await paginationState.navigateToChapterPage(targetChapter, 0);
      }
    }
  }, [paginationState, fallbackSystems, chapters.length]);

  const safeNavigateToChapterPage = useCallback(async (
    chapterIndex: number, 
    pageNumber: number
  ): Promise<void> => {
    try {
      await paginationState.navigateToChapterPage(chapterIndex, pageNumber);
    } catch (error) {
      const handled = fallbackSystems.handleNavigationError(error as Error, {
        component: 'HybridPagination',
        operation: 'navigateToChapterPage',
        chapterIndex,
        pageNumber,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      if (!handled) {
        // Fallback to basic progress
        const basicProgress = fallbackSystems.createBasicProgress(chapterIndex, chapters.length);
        onProgressChange?.(basicProgress);
      }
    }
  }, [paginationState, fallbackSystems, chapters.length, onProgressChange]);

  const safeNavigateToPosition = useCallback(async (
    chapterIndex: number, 
    offset: number
  ): Promise<void> => {
    try {
      await paginationState.navigateToPosition(chapterIndex, offset);
    } catch (error) {
      const handled = fallbackSystems.handleNavigationError(error as Error, {
        component: 'HybridPagination',
        operation: 'navigateToPosition',
        chapterIndex,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      if (!handled) {
        // Fallback to chapter start
        await safeNavigateToChapterPage(chapterIndex, 0);
      }
    }
  }, [paginationState, fallbackSystems, safeNavigateToChapterPage]);

  const safeNavigateNext = useCallback(async (): Promise<void> => {
    try {
      await paginationState.navigateNext();
    } catch (error) {
      fallbackSystems.handleNavigationError(error as Error, {
        component: 'HybridPagination',
        operation: 'navigateNext',
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      // Simple fallback: move to next chapter
      const nextChapter = Math.min(paginationState.progress.currentChapter + 1, chapters.length - 1);
      if (nextChapter > paginationState.progress.currentChapter) {
        await safeNavigateToChapterPage(nextChapter, 0);
      }
    }
  }, [paginationState, fallbackSystems, chapters.length, safeNavigateToChapterPage]);

  const safeNavigatePrevious = useCallback(async (): Promise<void> => {
    try {
      await paginationState.navigatePrevious();
    } catch (error) {
      fallbackSystems.handleNavigationError(error as Error, {
        component: 'HybridPagination',
        operation: 'navigatePrevious',
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      // Simple fallback: move to previous chapter
      const prevChapter = Math.max(paginationState.progress.currentChapter - 1, 0);
      if (prevChapter < paginationState.progress.currentChapter) {
        await safeNavigateToChapterPage(prevChapter, 0);
      }
    }
  }, [paginationState, fallbackSystems, safeNavigateToChapterPage]);

  // Get current page information with fallback
  const currentPageMap = useMemo(() => {
    const pageMap = paginationState.getPageBreakMap(paginationState.progress.currentChapter);
    
    if (!pageMap && !fallbackSystems.fallbackState.isUsingFallback) {
      // Create fallback page map if needed
      const chapter = chapters[paginationState.progress.currentChapter];
      if (chapter) {
        return fallbackSystems.createFallbackPageMap(chapter, paginationState.progress.currentChapter);
      }
    }
    
    return pageMap;
  }, [
    paginationState,
    fallbackSystems,
    chapters
  ]);

  const currentPageInfo = useMemo(() => {
    if (!currentPageMap) return null;
    
    const pageIndex = paginationState.progress.chapterPagePosition;
    return currentPageMap.pages[pageIndex] || currentPageMap.pages[0] || null;
  }, [currentPageMap, paginationState.progress.chapterPagePosition]);

  // Navigation state
  const pageInfo = paginationState.getCurrentPageInfo();
  const canNavigateNext = pageInfo.canGoNext;
  const canNavigatePrevious = pageInfo.canGoPrevious;
  const isFirstPage = pageInfo.isFirstPage;
  const isLastPage = pageInfo.isLastPage;

  // System health status
  const systemHealth = useMemo((): 'healthy' | 'degraded' | 'fallback' => {
    if (fallbackSystems.fallbackState.isUsingFallback) {
      return 'fallback';
    } else if (!fallbackSystems.isSystemHealthy() || performanceOptimization.metrics.frameRate < 30) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }, [fallbackSystems, performanceOptimization.metrics.frameRate]);

  // Enhanced cache clearing with fallback handling
  const clearCache = useCallback(() => {
    try {
      paginationState.invalidateCache();
      performanceOptimization.clearCache();
      fallbackSystems.resetFallbackState();
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Force clear using fallback methods
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('pagination-cache');
          localStorage.removeItem('performance-cache');
        } catch (storageError) {
          console.warn('Could not clear localStorage cache:', storageError);
        }
      }
    }
  }, [paginationState, performanceOptimization, fallbackSystems]);

  // Enhanced recalculation with error handling
  const recalculateAllPages = useCallback(async (): Promise<void> => {
    try {
      await paginationState.recalculateAllPages();
    } catch (error) {
      console.error('Page recalculation failed:', error);
      fallbackSystems.reportError(error as Error, {
        component: 'HybridPagination',
        operation: 'recalculateAllPages',
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      // Try recovery
      const recovered = await fallbackSystems.attemptRecovery();
      if (recovered) {
        // Retry calculation after recovery
        try {
          await paginationState.recalculateAllPages();
        } catch (retryError) {
          console.error('Recalculation failed even after recovery:', retryError);
        }
      }
    }
  }, [paginationState, fallbackSystems]);

  // Master recovery method
  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    console.log('Attempting master recovery...');
    
    try {
      // Step 1: Clear all caches
      clearCache();
      
      // Step 2: Use fallback systems to recover
      const fallbackRecovered = await fallbackSystems.attemptRecovery();
      
      // Step 3: Try to reinitialize pagination
      if (fallbackRecovered) {
        await recalculateAllPages();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Master recovery failed:', error);
      return false;
    }
  }, [clearCache, fallbackSystems, recalculateAllPages]);

  return {
    // Core state
    progress: paginationState.progress,
    navigationContext: paginationState.navigationContext,
    
    // Current page information
    currentPageInfo,
    currentPageMap,
    
    // Safe navigation methods
    navigateToGlobalPage: safeNavigateToGlobalPage,
    navigateToChapterPage: safeNavigateToChapterPage,
    navigateToPosition: safeNavigateToPosition,
    navigateNext: safeNavigateNext,
    navigatePrevious: safeNavigatePrevious,
    
    // Navigation state
    canNavigateNext,
    canNavigatePrevious,
    isFirstPage,
    isLastPage,
    
    // System status
    isCalculating: paginationState.paginationState.isCalculating,
    calculationProgress: paginationState.paginationState.calculationProgress,
    isUsingFallback: fallbackSystems.fallbackState.isUsingFallback,
    systemHealth,
    
    // Performance metrics
    performanceMetrics: {
      renderTime: performanceOptimization.metrics.renderTime,
      calculationTime: performanceOptimization.metrics.calculationTime,
      memoryUsage: performanceOptimization.metrics.memoryUsage,
      frameRate: performanceOptimization.metrics.frameRate
    },
    
    // Utility methods
    recalculateAllPages,
    clearCache,
    attemptRecovery,
    getReadingAnalytics: paginationState.getReadingAnalytics
  };
};