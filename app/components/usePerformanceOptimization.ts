'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { EPUBChapter, PageBreakMap, ReadingSettings } from './types';

interface PerformanceMetrics {
  renderTime: number;
  calculationTime: number;
  memoryUsage: number;
  frameRate: number;
  isOptimized: boolean;
}

interface VirtualizationState {
  visibleRange: { start: number; end: number };
  bufferSize: number;
  isVirtualized: boolean;
  preloadedChapters: Set<number>;
}

interface PerformanceOptimizationHook {
  // Performance monitoring
  metrics: PerformanceMetrics;
  startPerformanceMonitoring: () => void;
  stopPerformanceMonitoring: () => void;
  
  // Memory management
  cleanupMemory: () => void;
  preloadChapter: (chapterIndex: number) => Promise<void>;
  unloadChapter: (chapterIndex: number) => void;
  
  // Virtualization
  virtualizationState: VirtualizationState;
  updateVisibleRange: (start: number, end: number) => void;
  shouldRenderChapter: (chapterIndex: number) => boolean;
  
  // Optimization strategies
  optimizeForDevice: () => void;
  enableLazyLoading: boolean;
  enableImageLazyLoading: boolean;
  enableTextVirtualization: boolean;
  
  // Cache management
  clearCache: () => void;
  getCacheSize: () => number;
  optimizeCache: () => void;
}

export const usePerformanceOptimization = (
  chapters: EPUBChapter[],
  currentChapterIndex: number,
  settings: ReadingSettings
): PerformanceOptimizationHook => {
  
  // Performance metrics state
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    calculationTime: 0,
    memoryUsage: 0,
    frameRate: 60,
    isOptimized: false
  });

  // Virtualization state
  const [virtualizationState, setVirtualizationState] = useState<VirtualizationState>({
    visibleRange: { start: Math.max(0, currentChapterIndex - 1), end: Math.min(chapters.length - 1, currentChapterIndex + 1) },
    bufferSize: 3, // Number of chapters to keep in memory
    isVirtualized: chapters.length > 10, // Enable virtualization for large books
    preloadedChapters: new Set([currentChapterIndex])
  });

  // Cache and memory management
  const chapterCache = useRef<Map<number, {
    content: string;
    processedContent: string;
    lastAccessed: number;
    size: number;
  }>>(new Map());
  
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const performanceObserver = useRef<PerformanceObserver | null>(null);
  const frameRateMonitor = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const frameCount = useRef<number>(0);

  // Device capabilities detection
  const deviceCapabilities = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        isLowEndDevice: false,
        hasLimitedMemory: false,
        supportsIntersectionObserver: false,
        supportsRequestIdleCallback: false
      };
    }

    // Detect low-end devices
    const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                          (navigator as any).deviceMemory <= 2 ||
                          /Android.*[0-6]\./i.test(navigator.userAgent);
    
    const hasLimitedMemory = (navigator as any).deviceMemory <= 4;
    
    return {
      isLowEndDevice,
      hasLimitedMemory,
      supportsIntersectionObserver: 'IntersectionObserver' in window,
      supportsRequestIdleCallback: 'requestIdleCallback' in window
    };
  }, []);

  // Optimization flags based on device capabilities
  const enableLazyLoading = deviceCapabilities.hasLimitedMemory || chapters.length > 20;
  const enableImageLazyLoading = deviceCapabilities.isLowEndDevice || deviceCapabilities.hasLimitedMemory;
  const enableTextVirtualization = chapters.length > 50 || deviceCapabilities.isLowEndDevice;

  // Performance monitoring functions
  const startPerformanceMonitoring = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Monitor Long Tasks API
    if ('PerformanceObserver' in window && performanceObserver.current === null) {
      try {
        performanceObserver.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'longtask') {
              console.warn('Long task detected:', entry.duration);
              setMetrics(prev => ({
                ...prev,
                isOptimized: prev.isOptimized && entry.duration < 50
              }));
            }
          });
        });
        
        performanceObserver.current.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }

    // Monitor frame rate
    const monitorFrameRate = () => {
      const now = performance.now();
      frameCount.current++;
      
      if (lastFrameTime.current) {
        const delta = now - lastFrameTime.current;
        if (frameCount.current % 60 === 0) { // Update every 60 frames
          const fps = Math.round(1000 / (delta / 60));
          setMetrics(prev => ({
            ...prev,
            frameRate: fps,
            isOptimized: fps >= 50 // Consider optimized if >= 50 FPS
          }));
        }
      }
      
      lastFrameTime.current = now;
      frameRateMonitor.current = requestAnimationFrame(monitorFrameRate);
    };

    frameRateMonitor.current = requestAnimationFrame(monitorFrameRate);
  }, []);

  const stopPerformanceMonitoring = useCallback(() => {
    if (performanceObserver.current) {
      performanceObserver.current.disconnect();
      performanceObserver.current = null;
    }
    
    if (frameRateMonitor.current) {
      cancelAnimationFrame(frameRateMonitor.current);
      frameRateMonitor.current = null;
    }
  }, []);

  // Memory management functions
  const cleanupMemory = useCallback(() => {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    const { start, end } = virtualizationState.visibleRange;
    
    // Clean up old cache entries
    for (const [chapterIndex, cacheEntry] of chapterCache.current.entries()) {
      const isInVisibleRange = chapterIndex >= start && chapterIndex <= end;
      const isExpired = now - cacheEntry.lastAccessed > maxAge;
      
      if (!isInVisibleRange && isExpired) {
        chapterCache.current.delete(chapterIndex);
      }
    }

    // Clean up image cache
    if (imageCache.current.size > 50) { // Limit image cache size
      const sortedImages = Array.from(imageCache.current.entries())
        .sort(([, a], [, b]) => (a as any).lastAccessed - (b as any).lastAccessed);
      
      // Remove oldest 25% of images
      const toRemove = sortedImages.slice(0, Math.floor(sortedImages.length * 0.25));
      toRemove.forEach(([src]) => imageCache.current.delete(src));
    }

    // Force garbage collection if available (development only)
    if (process.env.NODE_ENV === 'development' && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (error) {
        // Ignore garbage collection errors
      }
    }

    // Update memory usage metric
    if ((performance as any).memory) {
      const memInfo = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit
      }));
    }
  }, [virtualizationState.visibleRange]);

  // Chapter preloading with intelligent prioritization
  const preloadChapter = useCallback(async (chapterIndex: number): Promise<void> => {
    if (chapterIndex < 0 || chapterIndex >= chapters.length) return;
    if (chapterCache.current.has(chapterIndex)) return;

    const chapter = chapters[chapterIndex];
    if (!chapter) return;

    try {
      const startTime = performance.now();
      
      // Process chapter content
      const processedContent = chapter.content; // Could add additional processing here
      
      // Calculate cache entry size (approximate)
      const size = new Blob([processedContent]).size;
      
      // Store in cache
      chapterCache.current.set(chapterIndex, {
        content: chapter.content,
        processedContent,
        lastAccessed: Date.now(),
        size
      });

      // Update preloaded chapters set
      setVirtualizationState(prev => ({
        ...prev,
        preloadedChapters: new Set(prev.preloadedChapters).add(chapterIndex)
      }));

      const endTime = performance.now();
      setMetrics(prev => ({
        ...prev,
        calculationTime: endTime - startTime
      }));

      console.log(`Preloaded chapter ${chapterIndex} in ${endTime - startTime}ms`);
    } catch (error) {
      console.error(`Failed to preload chapter ${chapterIndex}:`, error);
    }
  }, [chapters]);

  const unloadChapter = useCallback((chapterIndex: number) => {
    chapterCache.current.delete(chapterIndex);
    setVirtualizationState(prev => {
      const newPreloaded = new Set(prev.preloadedChapters);
      newPreloaded.delete(chapterIndex);
      return { ...prev, preloadedChapters: newPreloaded };
    });
  }, []);

  // Virtualization functions
  const updateVisibleRange = useCallback((start: number, end: number) => {
    setVirtualizationState(prev => ({
      ...prev,
      visibleRange: { start, end }
    }));

    // Preload chapters in visible range
    for (let i = start; i <= end; i++) {
      if (!chapterCache.current.has(i)) {
        preloadChapter(i);
      }
    }

    // Schedule cleanup of chapters outside visible range
    if (deviceCapabilities.supportsRequestIdleCallback) {
      requestIdleCallback(() => cleanupMemory());
    } else {
      setTimeout(cleanupMemory, 100);
    }
  }, [preloadChapter, cleanupMemory, deviceCapabilities.supportsRequestIdleCallback]);

  const shouldRenderChapter = useCallback((chapterIndex: number): boolean => {
    if (!virtualizationState.isVirtualized) return true;
    
    const { start, end } = virtualizationState.visibleRange;
    return chapterIndex >= start && chapterIndex <= end;
  }, [virtualizationState]);

  // Device-specific optimizations
  const optimizeForDevice = useCallback(() => {
    const optimizations: Partial<VirtualizationState> = {};

    if (deviceCapabilities.isLowEndDevice) {
      optimizations.bufferSize = 1; // Minimal buffer for low-end devices
      optimizations.isVirtualized = true;
    } else if (deviceCapabilities.hasLimitedMemory) {
      optimizations.bufferSize = 2; // Small buffer for limited memory
      optimizations.isVirtualized = chapters.length > 5;
    } else {
      optimizations.bufferSize = 5; // Larger buffer for capable devices
      optimizations.isVirtualized = chapters.length > 20;
    }

    setVirtualizationState(prev => ({ ...prev, ...optimizations }));
    
    setMetrics(prev => ({
      ...prev,
      isOptimized: true
    }));
  }, [deviceCapabilities, chapters.length]);

  // Cache management
  const clearCache = useCallback(() => {
    chapterCache.current.clear();
    imageCache.current.clear();
    setVirtualizationState(prev => ({
      ...prev,
      preloadedChapters: new Set()
    }));
  }, []);

  const getCacheSize = useCallback((): number => {
    let totalSize = 0;
    for (const [, entry] of chapterCache.current.entries()) {
      totalSize += entry.size;
    }
    return totalSize;
  }, []);

  const optimizeCache = useCallback(() => {
    const maxCacheSize = deviceCapabilities.hasLimitedMemory ? 5 * 1024 * 1024 : 20 * 1024 * 1024; // 5MB or 20MB
    const currentSize = getCacheSize();
    
    if (currentSize > maxCacheSize) {
      // Remove least recently used entries
      const sortedEntries = Array.from(chapterCache.current.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      let removedSize = 0;
      const targetRemoval = currentSize - maxCacheSize;
      
      for (const [chapterIndex, entry] of sortedEntries) {
        if (removedSize >= targetRemoval) break;
        if (!shouldRenderChapter(chapterIndex)) {
          chapterCache.current.delete(chapterIndex);
          removedSize += entry.size;
        }
      }
    }
  }, [deviceCapabilities.hasLimitedMemory, getCacheSize, shouldRenderChapter]);

  // Auto-optimize based on current chapter
  useEffect(() => {
    const newStart = Math.max(0, currentChapterIndex - virtualizationState.bufferSize);
    const newEnd = Math.min(chapters.length - 1, currentChapterIndex + virtualizationState.bufferSize);
    
    if (newStart !== virtualizationState.visibleRange.start || newEnd !== virtualizationState.visibleRange.end) {
      updateVisibleRange(newStart, newEnd);
    }
  }, [currentChapterIndex, chapters.length, virtualizationState.bufferSize, virtualizationState.visibleRange, updateVisibleRange]);

  // Optimize on mount
  useEffect(() => {
    optimizeForDevice();
    startPerformanceMonitoring();
    
    return () => {
      stopPerformanceMonitoring();
      cleanupMemory();
    };
  }, [optimizeForDevice, startPerformanceMonitoring, stopPerformanceMonitoring, cleanupMemory]);

  // Regular cache optimization
  useEffect(() => {
    const interval = setInterval(() => {
      optimizeCache();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [optimizeCache]);

  // Memory pressure handling
  useEffect(() => {
    if ('memory' in performance) {
      const checkMemoryPressure = () => {
        const memInfo = (performance as any).memory;
        const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        
        if (usageRatio > 0.8) { // High memory usage
          console.warn('High memory usage detected, cleaning up...');
          cleanupMemory();
          optimizeCache();
        }
      };

      const interval = setInterval(checkMemoryPressure, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [cleanupMemory, optimizeCache]);

  return {
    metrics,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    cleanupMemory,
    preloadChapter,
    unloadChapter,
    virtualizationState,
    updateVisibleRange,
    shouldRenderChapter,
    optimizeForDevice,
    enableLazyLoading,
    enableImageLazyLoading,
    enableTextVirtualization,
    clearCache,
    getCacheSize,
    optimizeCache
  };
};

// Utility functions for performance optimization

// Debounced resize observer for responsive recalculation
export const useOptimizedResizeObserver = (
  callback: (entries: ResizeObserverEntry[]) => void,
  delay: number = 150
) => {
  const debouncedCallback = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return (entries: ResizeObserverEntry[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(entries), delay);
      };
    },
    [callback, delay]
  );

  const observerRef = useRef<ResizeObserver | null>(null);

  const observe = useCallback((element: Element) => {
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver(debouncedCallback);
    }
    observerRef.current.observe(element);
  }, [debouncedCallback]);

  const unobserve = useCallback((element: Element) => {
    observerRef.current?.unobserve(element);
  }, []);

  const disconnect = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  return { observe, unobserve, disconnect };
};

// Lazy image loading with intersection observer
export const useLazyImageLoading = () => {
  const imageObserverRef = useRef<IntersectionObserver | null>(null);

  const observeImages = useCallback((container: HTMLElement) => {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all images immediately
      const images = container.querySelectorAll('img[data-src]');
      images.forEach((img) => {
        const imgElement = img as HTMLImageElement;
        imgElement.src = imgElement.dataset.src || '';
        imgElement.removeAttribute('data-src');
      });
      return;
    }

    if (!imageObserverRef.current) {
      imageObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              img.classList.remove('lazy');
              imageObserverRef.current?.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px' // Start loading 50px before image enters viewport
      });
    }

    const lazyImages = container.querySelectorAll('img[data-src]');
    lazyImages.forEach((img) => {
      imageObserverRef.current?.observe(img);
    });
  }, []);

  const disconnect = useCallback(() => {
    imageObserverRef.current?.disconnect();
    imageObserverRef.current = null;
  }, []);

  return { observeImages, disconnect };
};