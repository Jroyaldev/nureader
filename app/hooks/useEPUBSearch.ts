import { useCallback, useMemo } from 'react';
import { EPUBReaderState, SearchState } from './useEPUBReaderState';
import { useToast } from './useToast';

export interface SearchHandlers {
  performSearch: (query: string) => void;
  clearSearch: () => void;
  goToNextResult: () => void;
  goToPreviousResult: () => void;
  goToResult: (index: number) => void;
  toggleSearchModal: () => void;
}

export const useEPUBSearch = (
  state: EPUBReaderState,
  updateSearchState: (searchState: Partial<SearchState>) => void,
  updateUIState: (uiState: Partial<typeof state.uiState>) => void,
  goToPosition: (chapterIndex: number, position: number) => void
): SearchHandlers => {
  const { toast } = useToast();

  // Enhanced search function with better performance
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      updateSearchState({ results: [], currentResultIndex: -1 });
      return;
    }

    updateSearchState({ isSearching: true, query });

    // Use requestIdleCallback for better performance
    const searchPromise = new Promise<SearchState['results']>((resolve) => {
      const performSearchWork = () => {
        const results: SearchState['results'] = [];
        const searchTerm = query.toLowerCase();

        state.chapters.forEach((chapter, chapterIndex) => {
          if (!chapter.content) return;

          // Remove HTML tags for searching
          const textContent = chapter.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const lowerContent = textContent.toLowerCase();
          
          let searchIndex = 0;
          while (true) {
            const foundIndex = lowerContent.indexOf(searchTerm, searchIndex);
            if (foundIndex === -1) break;

            // Extract snippet around the found text
            const snippetStart = Math.max(0, foundIndex - 50);
            const snippetEnd = Math.min(textContent.length, foundIndex + searchTerm.length + 50);
            let snippet = textContent.substring(snippetStart, snippetEnd);
            
            // Add ellipsis if needed
            if (snippetStart > 0) snippet = '...' + snippet;
            if (snippetEnd < textContent.length) snippet = snippet + '...';

            // Highlight the search term in the snippet
            const snippetLower = snippet.toLowerCase();
            const termIndex = snippetLower.indexOf(searchTerm);
            if (termIndex !== -1) {
              snippet = snippet.substring(0, termIndex) + 
                       '<mark>' + snippet.substring(termIndex, termIndex + searchTerm.length) + '</mark>' +
                       snippet.substring(termIndex + searchTerm.length);
            }

            // Calculate approximate position in chapter (0-1)
            const position = foundIndex / textContent.length;

            results.push({
              chapterIndex,
              chapterTitle: chapter.title,
              snippet,
              position
            });

            searchIndex = foundIndex + 1;
            
            // Limit results to prevent performance issues
            if (results.length >= 100) break;
          }

          if (results.length >= 100) return;
        });

        resolve(results);
      };

      // Use requestIdleCallback if available, otherwise use setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(performSearchWork);
      } else {
        setTimeout(performSearchWork, 0);
      }
    });

    try {
      const results = await searchPromise;
      updateSearchState({
        results,
        currentResultIndex: results.length > 0 ? 0 : -1,
        isSearching: false
      });

      if (results.length === 0) {
        toast(`No results found for "${query}"`, 'info');
      } else {
        toast(`Found ${results.length} result${results.length === 1 ? '' : 's'}`, 'success');
      }
    } catch (error) {
      console.error('Search failed:', error);
      updateSearchState({ isSearching: false });
      toast('Search failed', 'error');
    }
  }, [state.chapters, updateSearchState, toast]);

  const clearSearch = useCallback(() => {
    updateSearchState({
      query: '',
      results: [],
      currentResultIndex: -1,
      isSearching: false
    });
  }, [updateSearchState]);

  const goToResult = useCallback((index: number) => {
    const result = state.searchState.results[index];
    if (!result) return;

    updateSearchState({ currentResultIndex: index });
    goToPosition(result.chapterIndex, result.position);
    
    // Close search modal and show the result
    updateUIState({ showSearch: false });
  }, [state.searchState.results, updateSearchState, goToPosition, updateUIState]);

  const goToNextResult = useCallback(() => {
    const { results, currentResultIndex } = state.searchState;
    if (results.length === 0) return;

    const nextIndex = currentResultIndex < results.length - 1 ? currentResultIndex + 1 : 0;
    goToResult(nextIndex);
  }, [state.searchState, goToResult]);

  const goToPreviousResult = useCallback(() => {
    const { results, currentResultIndex } = state.searchState;
    if (results.length === 0) return;

    const prevIndex = currentResultIndex > 0 ? currentResultIndex - 1 : results.length - 1;
    goToResult(prevIndex);
  }, [state.searchState, goToResult]);

  const toggleSearchModal = useCallback(() => {
    updateUIState({ showSearch: !state.uiState.showSearch });
    if (!state.uiState.showSearch) {
      // Clear search when opening modal
      clearSearch();
    }
  }, [state.uiState.showSearch, updateUIState, clearSearch]);

  // Memoized search statistics
  const searchStats = useMemo(() => {
    const { results, currentResultIndex } = state.searchState;
    return {
      totalResults: results.length,
      currentResult: currentResultIndex >= 0 ? currentResultIndex + 1 : 0,
      hasResults: results.length > 0,
      hasMultipleResults: results.length > 1
    };
  }, [state.searchState.results, state.searchState.currentResultIndex]);

  return {
    performSearch,
    clearSearch,
    goToNextResult,
    goToPreviousResult,
    goToResult,
    toggleSearchModal,
    searchStats
  };
};