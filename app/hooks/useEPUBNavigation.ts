import { useCallback } from 'react';
import { EPUBReaderState } from './useEPUBReaderState';
import { useToast } from './useToast';

export interface NavigationHandlers {
  goToChapter: (chapterIndex: number) => void;
  goToNextChapter: () => void;
  goToPreviousChapter: () => void;
  goToPage: (pageNumber: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToPosition: (chapterIndex: number, position: number) => void;
  updateChapterProgress: (progress: number) => void;
  calculateOverallProgress: () => number;
}

export const useEPUBNavigation = (
  state: EPUBReaderState,
  updateProgress: (progress: Partial<typeof state.progress>) => void
): NavigationHandlers => {
  const { toast } = useToast();

  const goToChapter = useCallback((chapterIndex: number) => {
    if (chapterIndex < 0 || chapterIndex >= state.chapters.length) {
      toast('Invalid chapter index', 'error');
      return;
    }

    updateProgress({
      currentChapter: chapterIndex,
      currentPage: 0,
      chapterProgress: 0
    });
  }, [state.chapters.length, updateProgress, toast]);

  const goToNextChapter = useCallback(() => {
    const nextChapter = state.progress.currentChapter + 1;
    if (nextChapter < state.chapters.length) {
      goToChapter(nextChapter);
    } else {
      toast('You are at the last chapter', 'info');
    }
  }, [state.progress.currentChapter, state.chapters.length, goToChapter, toast]);

  const goToPreviousChapter = useCallback(() => {
    const prevChapter = state.progress.currentChapter - 1;
    if (prevChapter >= 0) {
      goToChapter(prevChapter);
    } else {
      toast('You are at the first chapter', 'info');
    }
  }, [state.progress.currentChapter, goToChapter, toast]);

  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber < 0 || pageNumber >= state.progress.totalPages) {
      toast('Invalid page number', 'error');
      return;
    }

    // Calculate which chapter this page belongs to
    let currentPage = 0;
    let targetChapter = 0;
    
    for (let i = 0; i < state.chapters.length; i++) {
      const chapterPages = state.chapters[i].pages || 1;
      if (currentPage + chapterPages > pageNumber) {
        targetChapter = i;
        break;
      }
      currentPage += chapterPages;
    }

    const pageInChapter = pageNumber - currentPage;
    const chapterPages = state.chapters[targetChapter]?.pages || 1;
    const chapterProgress = pageInChapter / chapterPages;

    updateProgress({
      currentChapter: targetChapter,
      currentPage: pageNumber,
      chapterProgress
    });
  }, [state.progress.totalPages, state.chapters, updateProgress, toast]);

  const goToNextPage = useCallback(() => {
    const nextPage = state.progress.currentPage + 1;
    if (nextPage < state.progress.totalPages) {
      goToPage(nextPage);
    } else {
      toast('You are at the last page', 'info');
    }
  }, [state.progress.currentPage, state.progress.totalPages, goToPage, toast]);

  const goToPreviousPage = useCallback(() => {
    const prevPage = state.progress.currentPage - 1;
    if (prevPage >= 0) {
      goToPage(prevPage);
    } else {
      toast('You are at the first page', 'info');
    }
  }, [state.progress.currentPage, goToPage, toast]);

  const goToPosition = useCallback((chapterIndex: number, position: number) => {
    if (chapterIndex < 0 || chapterIndex >= state.chapters.length) {
      toast('Invalid chapter index', 'error');
      return;
    }

    const clampedPosition = Math.max(0, Math.min(1, position));
    const chapterPages = state.chapters[chapterIndex]?.pages || 1;
    const pageInChapter = Math.floor(clampedPosition * chapterPages);
    
    // Calculate absolute page number
    let absolutePage = 0;
    for (let i = 0; i < chapterIndex; i++) {
      absolutePage += state.chapters[i].pages || 1;
    }
    absolutePage += pageInChapter;

    updateProgress({
      currentChapter: chapterIndex,
      currentPage: absolutePage,
      chapterProgress: clampedPosition
    });
  }, [state.chapters, updateProgress, toast]);

  const updateChapterProgress = useCallback((progress: number) => {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const currentChapter = state.chapters[state.progress.currentChapter];
    
    if (!currentChapter) return;

    const chapterPages = currentChapter.pages || 1;
    const pageInChapter = Math.floor(clampedProgress * chapterPages);
    
    // Calculate absolute page number
    let absolutePage = 0;
    for (let i = 0; i < state.progress.currentChapter; i++) {
      absolutePage += state.chapters[i].pages || 1;
    }
    absolutePage += pageInChapter;

    updateProgress({
      currentPage: absolutePage,
      chapterProgress: clampedProgress
    });
  }, [state.chapters, state.progress.currentChapter, updateProgress]);

  const calculateOverallProgress = useCallback(() => {
    if (state.progress.totalPages === 0) return 0;
    return (state.progress.currentPage / state.progress.totalPages) * 100;
  }, [state.progress.currentPage, state.progress.totalPages]);

  return {
    goToChapter,
    goToNextChapter,
    goToPreviousChapter,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToPosition,
    updateChapterProgress,
    calculateOverallProgress
  };
};