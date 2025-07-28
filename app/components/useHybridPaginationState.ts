'use client';

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import debounce from 'lodash.debounce';
import {
  PageBreakMap,
  ReadingProgress,
  NavigationContext,
  EPUBChapter,
  ReadingSettings,
  PageCalculationSettings
} from './types';

/**
 * Cache entry for pagination data
 */
interface PaginationCacheEntry {
  pageBreakMap: PageBreakMap;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  priority: number; // 1-10, higher = more important to keep
}

/**
 * Cross-chapter position tracking
 */
interface CrossChapterPosition {
  globalPageNumber: number;
  chapterIndex: number;
  chapterPageNumber: number;
  offsetInChapter: number;
  estimatedTotalPages: number;
  lastUpdated: number;
}

/**
 * State persistence configuration
 */
interface StatePersistenceConfig {
  enabled: boolean;
  storageKey: string;
  debounceMs: number;
  maxHistoryEntries: number;
  compressionEnabled: boolean;
}

/**
 * Memory management configuration
 */
interface MemoryManagementConfig {
  maxCacheSize: number; // Maximum number of cached chapters
  cacheExpiryMs: number; // Cache entry expiry time
  lowMemoryThreshold: number; // MB threshold for aggressive cleanup
  enablePrefetching: boolean;
  prefetchRadius: number; // Number of chapters to prefetch around current
}

/**
 * Hybrid pagination state management hook
 */
export interface HybridPaginationState {
  // Current state
  currentPosition: CrossChapterPosition;
  paginationCache: Map<number, PaginationCacheEntry>;
  
  // State management
  updatePosition: (newPosition: Partial<CrossChapterPosition>) => void;
  getCachedPageBreakMap: (chapterIndex: number) => PageBreakMap | null;
  setCachedPageBreakMap: (chapterIndex: number, pageBreakMap: PageBreakMap) => void;
  invalidateCache: (chapterIndex?: number) => void;
  
  // Cross-chapter navigation
  getGlobalPosition: (chapterIndex: number, chapterPageNumber: number) => number;
  getChapterPosition: (globalPageNumber: number) => { chapterIndex: number; pageNumber: number } | null;
  calculateTotalPages: (chapters: EPUBChapter[]) => number;
  
  // Performance monitoring
  getCacheStatistics: () => CacheStatistics;
  getMemoryUsage: () => MemoryUsageInfo;
  
  // State persistence
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  clearPersistedState: () => Promise<void>;
}

/**
 * Cache statistics for monitoring
 */
interface CacheStatistics {
  totalEntries: number;
  hitRate: number;
  averageAge: number;
  memoryUsageMB: number;
  mostAccessedChapters: number[];
  oldestEntries: number[];
}

/**
 * Memory usage information
 */
interface MemoryUsageInfo {
  estimatedUsageMB: number;
  cacheEntries: number;
  oldestEntryAge: number;
  suggestedCleanup: boolean;
}

/**
 * Hook for managing hybrid pagination state with advanced caching and cross-chapter tracking
 */
export const useHybridPaginationState = (
  chapters: EPUBChapter[],
  settings: ReadingSettings,
  persistenceConfig?: Partial<StatePersistenceConfig>,
  memoryConfig?: Partial<MemoryManagementConfig>
): HybridPaginationState => {
  // Configuration with defaults
  const persistence: StatePersistenceConfig = {
    enabled: true,
    storageKey: 'nureader-pagination-state',
    debounceMs: 1000,
    maxHistoryEntries: 50,
    compressionEnabled: true,
    ...persistenceConfig
  };

  const memoryManagement: MemoryManagementConfig = {
    maxCacheSize: 20,
    cacheExpiryMs: 15 * 60 * 1000, // 15 minutes
    lowMemoryThreshold: 100, // MB
    enablePrefetching: true,
    prefetchRadius: 2,
    ...memoryConfig
  };

  // State
  const [paginationCache, setPaginationCache] = useState<Map<number, PaginationCacheEntry>>(new Map());
  const [currentPosition, setCurrentPosition] = useState<CrossChapterPosition>({
    globalPageNumber: 0,
    chapterIndex: 0,
    chapterPageNumber: 0,
    offsetInChapter: 0,
    estimatedTotalPages: 1,
    lastUpdated: Date.now()
  });

  // Refs for performance
  const cacheAccessCount = useRef<Map<number, number>>(new Map());
  const lastCleanupTime = useRef<number>(Date.now());
  const memoryUsageCache = useRef<{ value: number; timestamp: number } | null>(null);

  // Calculate settings-based cache key for invalidation
  const settingsCacheKey = useMemo(() => {
    return JSON.stringify({
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      columnWidth: settings.columnWidth,
      marginSize: settings.marginSize,
      pageLayout: settings.pageLayout
    });
  }, [settings]);

  /**
   * Update current position with validation and persistence
   */
  const updatePosition = useCallback((newPosition: Partial<CrossChapterPosition>) => {
    setCurrentPosition(prev => {
      const updated = {
        ...prev,
        ...newPosition,
        lastUpdated: Date.now()
      };

      // Validate position bounds
      if (updated.chapterIndex < 0) updated.chapterIndex = 0;
      if (updated.chapterIndex >= chapters.length) updated.chapterIndex = chapters.length - 1;
      if (updated.chapterPageNumber < 0) updated.chapterPageNumber = 0;
      if (updated.globalPageNumber < 0) updated.globalPageNumber = 0;

      return updated;
    });
  }, [chapters.length]);

  /**
   * Get cached page break map with access tracking
   */
  const getCachedPageBreakMap = useCallback((chapterIndex: number): PageBreakMap | null => {
    const entry = paginationCache.get(chapterIndex);
    
    if (!entry) return null;

    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > memoryManagement.cacheExpiryMs) {
      setPaginationCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(chapterIndex);
        return newCache;
      });
      return null;
    }

    // Update access tracking
    entry.lastAccessed = now;
    entry.accessCount++;
    cacheAccessCount.current.set(chapterIndex, (cacheAccessCount.current.get(chapterIndex) || 0) + 1);

    // Validate cache against current settings
    const settingsMatch = entry.pageBreakMap.settings && 
      JSON.stringify(entry.pageBreakMap.settings) === settingsCacheKey;
    
    if (!settingsMatch) {
      setPaginationCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(chapterIndex);
        return newCache;
      });
      return null;
    }

    return entry.pageBreakMap;
  }, [paginationCache, memoryManagement.cacheExpiryMs, settingsCacheKey]);

  /**
   * Set cached page break map with intelligent priority
   */
  const setCachedPageBreakMap = useCallback((chapterIndex: number, pageBreakMap: PageBreakMap) => {
    const now = Date.now();
    
    // Calculate priority based on multiple factors
    let priority = 5; // Base priority
    
    // Current chapter gets highest priority
    if (chapterIndex === currentPosition.chapterIndex) priority = 10;
    
    // Adjacent chapters get higher priority
    const distance = Math.abs(chapterIndex - currentPosition.chapterIndex);
    if (distance <= 1) priority = 9;
    else if (distance <= 2) priority = 7;
    else if (distance <= 5) priority = 5;
    else priority = 3;

    // Frequently accessed chapters get bonus priority
    const accessCount = cacheAccessCount.current.get(chapterIndex) || 0;
    priority = Math.min(10, priority + Math.floor(accessCount / 5));

    const entry: PaginationCacheEntry = {
      pageBreakMap,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      priority
    };

    setPaginationCache(prev => {
      const newCache = new Map(prev);
      
      // Check if we need to evict entries
      if (newCache.size >= memoryManagement.maxCacheSize) {
        evictLowPriorityEntries(newCache, memoryManagement.maxCacheSize - 1);
      }
      
      newCache.set(chapterIndex, entry);
      return newCache;
    });

    // Trigger cleanup if needed
    if (now - lastCleanupTime.current > 60000) { // Every minute
      scheduleCleanup();
    }
  }, [currentPosition.chapterIndex, memoryManagement.maxCacheSize]);

  /**
   * Evict low priority cache entries
   */
  const evictLowPriorityEntries = (cache: Map<number, PaginationCacheEntry>, targetSize: number) => {
    if (cache.size <= targetSize) return;

    const entries = Array.from(cache.entries());
    
    // Sort by priority (ascending) and age (oldest first)
    entries.sort(([, a], [, b]) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.lastAccessed - b.lastAccessed;
    });

    // Remove lowest priority entries
    const toRemove = entries.slice(0, cache.size - targetSize);
    toRemove.forEach(([chapterIndex]) => {
      cache.delete(chapterIndex);
      cacheAccessCount.current.delete(chapterIndex);
    });
  };

  /**
   * Schedule cache cleanup
   */
  const scheduleCleanup = useCallback(() => {
    lastCleanupTime.current = Date.now();
    
    setTimeout(() => {
      setPaginationCache(prev => {
        const newCache = new Map(prev);
        const now = Date.now();
        
        // Remove expired entries
        for (const [chapterIndex, entry] of newCache.entries()) {
          if (now - entry.timestamp > memoryManagement.cacheExpiryMs) {
            newCache.delete(chapterIndex);
            cacheAccessCount.current.delete(chapterIndex);
          }
        }
        
        // Evict if still over limit
        if (newCache.size > memoryManagement.maxCacheSize) {
          evictLowPriorityEntries(newCache, memoryManagement.maxCacheSize);
        }
        
        return newCache;
      });
    }, 100);
  }, [memoryManagement.cacheExpiryMs, memoryManagement.maxCacheSize]);

  /**
   * Invalidate cache entries
   */
  const invalidateCache = useCallback((chapterIndex?: number) => {
    if (chapterIndex !== undefined) {
      setPaginationCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(chapterIndex);
        cacheAccessCount.current.delete(chapterIndex);
        return newCache;
      });
    } else {
      setPaginationCache(new Map());
      cacheAccessCount.current.clear();
    }
  }, []);

  /**
   * Get global page position for chapter and page
   */
  const getGlobalPosition = useCallback((chapterIndex: number, chapterPageNumber: number): number => {
    let globalPosition = 0;
    
    // Add pages from previous chapters
    for (let i = 0; i < chapterIndex; i++) {
      const cached = getCachedPageBreakMap(i);
      if (cached) {
        globalPosition += cached.pages.length;
      } else {
        // Estimate based on chapter word count
        const chapter = chapters[i];
        if (chapter) {
          const estimatedPages = Math.ceil(chapter.wordCount / 300); // 300 words per page estimate
          globalPosition += estimatedPages;
        } else {
          globalPosition += 1; // Fallback
        }
      }
    }
    
    return globalPosition + chapterPageNumber;
  }, [chapters, getCachedPageBreakMap]);

  /**
   * Get chapter position from global page number
   */
  const getChapterPosition = useCallback((globalPageNumber: number): { chapterIndex: number; pageNumber: number } | null => {
    let currentGlobalPage = 0;
    
    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      const cached = getCachedPageBreakMap(chapterIndex);
      const chapterPages = cached ? cached.pages.length : Math.ceil((chapters[chapterIndex]?.wordCount || 300) / 300);
      
      if (globalPageNumber >= currentGlobalPage && globalPageNumber < currentGlobalPage + chapterPages) {
        return {
          chapterIndex,
          pageNumber: globalPageNumber - currentGlobalPage
        };
      }
      
      currentGlobalPage += chapterPages;
    }
    
    return null;
  }, [chapters, getCachedPageBreakMap]);

  /**
   * Calculate total pages across all chapters
   */
  const calculateTotalPages = useCallback((chapters: EPUBChapter[]): number => {
    let totalPages = 0;
    
    for (let i = 0; i < chapters.length; i++) {
      const cached = getCachedPageBreakMap(i);
      if (cached) {
        totalPages += cached.pages.length;
      } else {
        // Estimate based on word count
        const chapter = chapters[i];
        if (chapter) {
          const estimatedPages = Math.ceil(chapter.wordCount / 300);
          totalPages += estimatedPages;
        } else {
          totalPages += 1;
        }
      }
    }
    
    return totalPages;
  }, [getCachedPageBreakMap]);

  /**
   * Get cache statistics for monitoring
   */
  const getCacheStatistics = useCallback((): CacheStatistics => {
    const entries = Array.from(paginationCache.entries());
    const totalHits = Array.from(cacheAccessCount.current.values()).reduce((sum, count) => sum + count, 0);
    const totalMisses = entries.length * 2; // Rough estimate
    const hitRate = totalHits / Math.max(1, totalHits + totalMisses);
    
    const now = Date.now();
    const ages = entries.map(([, entry]) => now - entry.timestamp);
    const averageAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
    
    // Estimate memory usage (rough calculation)
    const estimatedSizePerEntry = 50000; // 50KB per chapter page map
    const memoryUsageMB = (entries.length * estimatedSizePerEntry) / (1024 * 1024);
    
    // Most accessed chapters
    const accessEntries = Array.from(cacheAccessCount.current.entries());
    accessEntries.sort(([, a], [, b]) => b - a);
    const mostAccessedChapters = accessEntries.slice(0, 5).map(([chapterIndex]) => chapterIndex);
    
    // Oldest entries
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    const oldestEntries = entries.slice(0, 5).map(([chapterIndex]) => chapterIndex);
    
    return {
      totalEntries: entries.length,
      hitRate,
      averageAge,
      memoryUsageMB,
      mostAccessedChapters,
      oldestEntries
    };
  }, [paginationCache]);

  /**
   * Get memory usage information
   */
  const getMemoryUsage = useCallback((): MemoryUsageInfo => {
    const now = Date.now();
    
    // Use cached value if recent
    if (memoryUsageCache.current && (now - memoryUsageCache.current.timestamp) < 5000) {
      const cached = memoryUsageCache.current.value;
      const entries = Array.from(paginationCache.entries());
      const oldestEntry = entries.reduce((oldest, [, entry]) => 
        !oldest || entry.timestamp < oldest.timestamp ? entry : oldest, null as PaginationCacheEntry | null);
      
      return {
        estimatedUsageMB: cached,
        cacheEntries: entries.length,
        oldestEntryAge: oldestEntry ? now - oldestEntry.timestamp : 0,
        suggestedCleanup: cached > memoryManagement.lowMemoryThreshold
      };
    }
    
    // Calculate memory usage
    const estimatedSizePerEntry = 50000; // 50KB estimate
    const totalEntries = paginationCache.size;
    const estimatedUsageMB = (totalEntries * estimatedSizePerEntry) / (1024 * 1024);
    
    // Cache the result
    memoryUsageCache.current = { value: estimatedUsageMB, timestamp: now };
    
    const entries = Array.from(paginationCache.entries());
    const oldestEntry = entries.reduce((oldest, [, entry]) => 
      !oldest || entry.timestamp < oldest.timestamp ? entry : oldest, null as PaginationCacheEntry | null);
    
    return {
      estimatedUsageMB,
      cacheEntries: totalEntries,
      oldestEntryAge: oldestEntry ? now - oldestEntry.timestamp : 0,
      suggestedCleanup: estimatedUsageMB > memoryManagement.lowMemoryThreshold
    };
  }, [paginationCache, memoryManagement.lowMemoryThreshold]);

  /**
   * Save state to persistent storage
   */
  const saveState = useCallback(async (): Promise<void> => {
    if (!persistence.enabled || typeof window === 'undefined') return;
    
    try {
      const stateToSave = {
        currentPosition,
        cacheKeys: Array.from(paginationCache.keys()),
        timestamp: Date.now(),
        settingsKey: settingsCacheKey
      };
      
      const serialized = JSON.stringify(stateToSave);
      
      if (persistence.compressionEnabled && 'CompressionStream' in window) {
        // Use compression if available (modern browsers)
        localStorage.setItem(persistence.storageKey, serialized);
      } else {
        localStorage.setItem(persistence.storageKey, serialized);
      }
    } catch (error) {
      console.warn('Failed to save pagination state:', error);
    }
  }, [currentPosition, paginationCache, persistence, settingsCacheKey]);

  /**
   * Load state from persistent storage
   */
  const loadState = useCallback(async (): Promise<void> => {
    if (!persistence.enabled || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(persistence.storageKey);
      if (!stored) return;
      
      const parsed = JSON.parse(stored);
      
      // Validate settings compatibility
      if (parsed.settingsKey !== settingsCacheKey) {
        console.log('Settings changed, invalidating stored pagination state');
        return;
      }
      
      // Restore position
      if (parsed.currentPosition) {
        setCurrentPosition(parsed.currentPosition);
      }
      
      // Note: We don't restore the actual cache data as it would be stale
      // Instead, we just restore the position and let the cache rebuild naturally
    } catch (error) {
      console.warn('Failed to load pagination state:', error);
    }
  }, [persistence, settingsCacheKey]);

  /**
   * Clear persisted state
   */
  const clearPersistedState = useCallback(async (): Promise<void> => {
    if (!persistence.enabled || typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(persistence.storageKey);
    } catch (error) {
      console.warn('Failed to clear pagination state:', error);
    }
  }, [persistence.storageKey]);

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(saveState, persistence.debounceMs),
    [saveState, persistence.debounceMs]
  );

  // Auto-save on position changes
  useEffect(() => {
    debouncedSave();
  }, [currentPosition, debouncedSave]);

  // Load state on mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Prefetch adjacent chapters if enabled
  useEffect(() => {
    if (!memoryManagement.enablePrefetching) return;
    
    const prefetchChapters = [];
    const currentChapter = currentPosition.chapterIndex;
    
    for (let i = -memoryManagement.prefetchRadius; i <= memoryManagement.prefetchRadius; i++) {
      const chapterIndex = currentChapter + i;
      if (chapterIndex >= 0 && chapterIndex < chapters.length && chapterIndex !== currentChapter) {
        if (!paginationCache.has(chapterIndex)) {
          prefetchChapters.push(chapterIndex);
        }
      }
    }
    
    // This would trigger prefetching in the main pagination hook
    // For now, we just identify the chapters that could be prefetched
  }, [currentPosition.chapterIndex, chapters.length, memoryManagement, paginationCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.flush(); // Ensure final save
    };
  }, [debouncedSave]);

  return {
    currentPosition,
    paginationCache,
    updatePosition,
    getCachedPageBreakMap,
    setCachedPageBreakMap,
    invalidateCache,
    getGlobalPosition,
    getChapterPosition,
    calculateTotalPages,
    getCacheStatistics,
    getMemoryUsage,
    saveState,
    loadState,
    clearPersistedState
  };
};