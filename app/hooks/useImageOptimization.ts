'use client';

import { useCallback, useRef, useEffect } from 'react';

interface ImageCacheEntry {
  url: string;
  blob: Blob;
  lastAccessed: number;
  size: number;
}

interface UseImageOptimizationOptions {
  maxCacheSize?: number; // Max cache size in bytes (default: 50MB)
  maxCacheEntries?: number; // Max number of cached images (default: 100)
  preloadDistance?: number; // How many images ahead to preload (default: 3)
}

export const useImageOptimization = (options: UseImageOptimizationOptions = {}) => {
  const {
    maxCacheSize = 50 * 1024 * 1024, // 50MB
    maxCacheEntries = 100,
    preloadDistance = 3
  } = options;

  const imageCache = useRef<Map<string, ImageCacheEntry>>(new Map());
  const preloadedImages = useRef<Set<string>>(new Set());

  // Get network connection info if available
  const getConnectionSpeed = useCallback(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!connection) return 'unknown';
    
    // Classify connection speed
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      return 'slow';
    } else if (connection.effectiveType === '3g') {
      return 'medium';
    } else {
      return 'fast';
    }
  }, []);

  // Check if WebP is supported
  const supportsWebP = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }, []);

  // Clean up old cache entries
  const cleanupCache = useCallback(() => {
    const entries = Array.from(imageCache.current.entries());
    let totalSize = entries.reduce((sum, [, entry]) => sum + entry.size, 0);

    if (entries.length > maxCacheEntries || totalSize > maxCacheSize) {
      // Sort by last accessed time (oldest first)
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      // Remove oldest entries until we're under limits
      while ((entries.length > maxCacheEntries || totalSize > maxCacheSize) && entries.length > 0) {
        const [key, entry] = entries.shift()!;
        
        // Revoke the blob URL to free memory
        URL.revokeObjectURL(entry.url);
        imageCache.current.delete(key);
        totalSize -= entry.size;
      }
    }
  }, [maxCacheSize, maxCacheEntries]);

  // Optimize image based on connection and device capabilities
  const optimizeImage = useCallback(async (blob: Blob, maxWidth?: number): Promise<Blob> => {
    const connectionSpeed = getConnectionSpeed();
    const isSlowConnection = connectionSpeed === 'slow';
    
    // For slow connections or large images, compress more aggressively
    const targetWidth = maxWidth || (isSlowConnection ? 800 : 1200);
    const quality = isSlowConnection ? 0.7 : 0.9;

    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        // Calculate new dimensions
        const { width, height } = img;
        const aspectRatio = height / width;
        
        let newWidth = width;
        let newHeight = height;
        
        if (width > targetWidth) {
          newWidth = targetWidth;
          newHeight = targetWidth * aspectRatio;
        }

        // Set canvas size
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and compress
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        canvas.toBlob(
          (optimizedBlob) => {
            resolve(optimizedBlob || blob);
          },
          supportsWebP() ? 'image/webp' : 'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  }, [getConnectionSpeed, supportsWebP]);

  // Get cached or optimize image
  const getCachedImage = useCallback(async (
    originalSrc: string,
    blob?: Blob,
    optimize: boolean = true
  ): Promise<string> => {
    // Check cache first
    const cached = imageCache.current.get(originalSrc);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.url;
    }

    if (!blob) {
      return originalSrc; // Fallback to original
    }

    try {
      // Optimize if requested and conditions are met
      let finalBlob = blob;
      if (optimize && blob.size > 100 * 1024) { // Only optimize images > 100KB
        finalBlob = await optimizeImage(blob);
      }

      // Create object URL
      const url = URL.createObjectURL(finalBlob);

      // Cache the result
      const entry: ImageCacheEntry = {
        url,
        blob: finalBlob,
        lastAccessed: Date.now(),
        size: finalBlob.size
      };

      imageCache.current.set(originalSrc, entry);

      // Clean up cache if needed
      cleanupCache();

      return url;
    } catch (error) {
      console.warn('Image optimization failed:', error);
      return originalSrc;
    }
  }, [optimizeImage, cleanupCache]);

  // Preload images that are likely to be viewed soon
  const preloadImage = useCallback(async (src: string, blob?: Blob) => {
    if (preloadedImages.current.has(src)) return;
    
    preloadedImages.current.add(src);
    
    try {
      if (blob) {
        await getCachedImage(src, blob, true);
      } else {
        // Preload external image
        const img = new Image();
        img.src = src;
      }
    } catch (error) {
      console.warn('Image preload failed:', error);
    }
  }, [getCachedImage]);

  // Batch preload multiple images
  const preloadImages = useCallback(async (
    images: Array<{ src: string; blob?: Blob }>
  ) => {
    const connectionSpeed = getConnectionSpeed();
    const maxConcurrent = connectionSpeed === 'slow' ? 2 : 4;
    
    // Process in batches to avoid overwhelming the browser
    for (let i = 0; i < images.length; i += maxConcurrent) {
      const batch = images.slice(i, i + maxConcurrent);
      await Promise.allSettled(
        batch.map(({ src, blob }) => preloadImage(src, blob))
      );
    }
  }, [preloadImage, getConnectionSpeed]);

  // Generate responsive image sizes
  const getResponsiveImage = useCallback((
    originalBlob: Blob,
    sizes: number[] = [480, 768, 1024, 1200]
  ): Promise<{ [key: number]: Blob }> => {
    return new Promise(async (resolve) => {
      const results: { [key: number]: Blob } = {};
      
      for (const size of sizes) {
        try {
          const optimizedBlob = await optimizeImage(originalBlob, size);
          results[size] = optimizedBlob;
        } catch (error) {
          console.warn(`Failed to generate ${size}px version:`, error);
        }
      }
      
      resolve(results);
    });
  }, [optimizeImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Revoke all blob URLs to prevent memory leaks
      for (const [, entry] of imageCache.current) {
        URL.revokeObjectURL(entry.url);
      }
      imageCache.current.clear();
      preloadedImages.current.clear();
    };
  }, []);

  return {
    getCachedImage,
    preloadImage,
    preloadImages,
    getResponsiveImage,
    optimizeImage,
    getConnectionSpeed,
    supportsWebP,
    cacheStats: {
      size: imageCache.current.size,
      totalBytes: Array.from(imageCache.current.values()).reduce((sum, entry) => sum + entry.size, 0)
    }
  };
};