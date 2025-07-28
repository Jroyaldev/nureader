'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import debounce from 'lodash.debounce';
import {
  PageBreakMap,
  PageInfo,
  PageBreakPoint,
  PageCalculationSettings,
  SmartPageBreakOptions,
  EPUBChapter,
  ReadingSettings,
  AnalysisContext,
  OptimalBreakPoint
} from './types';
import { contentAnalyzer } from './contentAnalyzer';
import { documentStructureAnalyzer } from './documentStructure';
import { breakPointScorer } from './breakPointScorer';
import { contentDensityAnalyzer } from './contentDensityAnalyzer';

interface SmartPaginationHook {
  calculatePageBreaks: (
    chapter: EPUBChapter,
    chapterIndex: number,
    settings: ReadingSettings,
    containerDimensions: { width: number; height: number }
  ) => Promise<PageBreakMap>;
  getPageBreakMap: (chapterIndex: number) => PageBreakMap | null;
  invalidateCache: (chapterIndex?: number) => void;
  isCalculating: boolean;
  calculationProgress: number;
}

export const useSmartPagination = (): SmartPaginationHook => {
  const [pageBreakMaps, setPageBreakMaps] = useState<Map<number, PageBreakMap>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const calculationCache = useRef<Map<string, PageBreakMap>>(new Map());
  const workerRef = useRef<Worker | null>(null);

  // Smart page break options based on reading research and usability
  const smartOptions: SmartPageBreakOptions = useMemo(() => ({
    respectSentences: true,
    respectParagraphs: true,
    respectHeadings: true,
    respectImages: true,
    respectTables: true,
    respectQuotes: true,
    respectCodeBlocks: true,
    minimumWordsPerPage: 100,
    maximumWordsPerPage: 500,
    allowSplitParagraphs: false, // Never split paragraphs mid-sentence
    preferredBreakElements: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Headings are excellent break points
      'hr', // Horizontal rules
      'blockquote', // Quote boundaries
      'div.chapter-break', // Custom chapter breaks
      'section', // Section boundaries
      '.page-break', // Explicit page break markers
    ]
  }), []);

  // Generate a cache key for page calculation settings
  const generateCacheKey = useCallback((
    chapterIndex: number,
    settings: PageCalculationSettings
  ): string => {
    return `${chapterIndex}-${JSON.stringify(settings)}`;
  }, []);

  // Main calculation function with advanced content analysis
  const calculatePageBreaks = useCallback(async (
    chapter: EPUBChapter,
    chapterIndex: number,
    settings: ReadingSettings,
    containerDimensions: { width: number; height: number }
  ): Promise<PageBreakMap> => {
    const calculationSettings: PageCalculationSettings = {
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      columnWidth: settings.columnWidth,
      marginSize: settings.marginSize,
      pageLayout: settings.pageLayout,
      screenWidth: containerDimensions.width,
      screenHeight: containerDimensions.height,
      preferredWordsPerPage: 300, // Will be optimized based on content analysis
      allowOrphanLines: false,
      respectImageBoundaries: true,
      respectTableBoundaries: true
    };

    const cacheKey = generateCacheKey(chapterIndex, calculationSettings);
    const cached = calculationCache.current.get(cacheKey);
    
    if (cached && Date.now() - cached.lastCalculated < 300000) { // 5 minute cache
      return cached;
    }

    setIsCalculating(true);
    setCalculationProgress(0);

    try {
      // Step 1: Comprehensive content analysis (30% progress)
      setCalculationProgress(10);
      const documentStructure = contentAnalyzer.analyzeDocumentStructure(chapter.content);
      
      setCalculationProgress(20);
      const contentDensity = contentAnalyzer.calculateContentDensity(chapter.content);
      
      setCalculationProgress(30);
      
      // Create analysis context
      const analysisContext: AnalysisContext = {
        chapterIndex,
        bookTitle: chapter.title,
        readingLevel: 'intermediate', // Could be user preference
        userPreferences: {
          preferredBreakLength: calculationSettings.preferredWordsPerPage,
          avoidSplitting: ['images', 'tables', 'code'],
          prioritizeElements: smartOptions.preferredBreakElements
        },
        deviceContext: {
          screenSize: containerDimensions.width < 768 ? 'small' : 
                     containerDimensions.width < 1200 ? 'medium' : 'large',
          isTouch: 'ontouchstart' in window,
          orientation: containerDimensions.width > containerDimensions.height ? 'landscape' : 'portrait'
        }
      };

      // Step 2: Generate optimized reading flow settings (50% progress)
      setCalculationProgress(40);
      const readingFlowOptimizations = contentDensityAnalyzer.optimizeForReadingFlow(contentDensity, settings);
      
      // Update calculation settings based on content analysis
      calculationSettings.preferredWordsPerPage = readingFlowOptimizations.recommendedWordsPerPage;
      
      setCalculationProgress(50);

      // Step 3: Find optimal break points using advanced analysis (75% progress)
      setCalculationProgress(60);
      const optimalBreakPoints = breakPointScorer.findOptimalBreakPoints(
        chapter.content,
        documentStructure,
        contentDensity,
        analysisContext,
        smartOptions
      );

      setCalculationProgress(75);

      // Step 4: Convert optimal break points to page info and legacy break points (90% progress)
      const pages = convertOptimalBreakPointsToPages(
        optimalBreakPoints,
        chapter.content,
        calculationSettings,
        contentDensity
      );

      const legacyBreakPoints = convertOptimalBreakPointsToLegacy(optimalBreakPoints);

      setCalculationProgress(90);

      // Step 5: Generate final page break map (100% progress)
      const pageBreakMap: PageBreakMap = {
        chapterIndex,
        pages,
        breakPoints: legacyBreakPoints,
        lastCalculated: Date.now(),
        settings: calculationSettings
      };

      setCalculationProgress(100);

      // Cache the result
      calculationCache.current.set(cacheKey, pageBreakMap);
      setPageBreakMaps(prev => new Map(prev).set(chapterIndex, pageBreakMap));

      return pageBreakMap;
    } finally {
      setIsCalculating(false);
      setCalculationProgress(0);
    }
  }, [generateCacheKey, smartOptions]);

  // Helper function to convert optimal break points to page info
  const convertOptimalBreakPointsToPages = useCallback((
    optimalBreakPoints: OptimalBreakPoint[],
    content: string,
    settings: PageCalculationSettings,
    density: ContentDensityMetrics
  ): PageInfo[] => {
    const pages: PageInfo[] = [];
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Add a break point at the beginning and end
    const allBreakPoints = [
      { position: 0, quality: 10 },
      ...optimalBreakPoints.map(bp => ({ position: bp.position, quality: bp.quality })),
      { position: textContent.length, quality: 10 }
    ].sort((a, b) => a.position - b.position);

    // Create pages from break points
    for (let i = 0; i < allBreakPoints.length - 1; i++) {
      const startOffset = allBreakPoints[i].position;
      const endOffset = allBreakPoints[i + 1].position;
      const pageContent = textContent.substring(startOffset, endOffset);
      const words = pageContent.trim().split(/\s+/).filter(w => w.length > 0);
      
      // Check for images and tables in this page's content
      const pageHtml = content.substring(startOffset, endOffset);
      const hasImages = /<img[^>]*>/i.test(pageHtml) || /<figure[^>]*>/i.test(pageHtml);
      const hasTables = /<table[^>]*>/i.test(pageHtml);
      
      // Determine content density
      let contentDensity: 'low' | 'medium' | 'high' = 'medium';
      const wordsPerPage = settings.preferredWordsPerPage || 300;
      if (words.length < wordsPerPage * 0.7) contentDensity = 'low';
      else if (words.length > wordsPerPage * 1.3) contentDensity = 'high';

      const pageInfo: PageInfo = {
        id: `page-${i}-${Date.now()}`,
        pageNumber: i,
        globalPageNumber: i, // This would be calculated across all chapters
        startOffset,
        endOffset,
        wordCount: words.length,
        estimatedReadTime: Math.ceil(words.length / (density.estimatedReadingVelocity / 60)), // Convert WPM to WPS
        hasImages,
        hasTables,
        contentDensity,
        breakQuality: allBreakPoints[i + 1].quality
      };

      pages.push(pageInfo);
    }

    return pages;
  }, []);

  // Helper function to convert optimal break points to legacy format
  const convertOptimalBreakPointsToLegacy = useCallback((
    optimalBreakPoints: OptimalBreakPoint[]
  ): PageBreakPoint[] => {
    return optimalBreakPoints.map((bp, index) => ({
      id: bp.id,
      type: bp.type === 'heading' ? 'heading' : 
            bp.type === 'section' ? 'section' : 
            bp.type === 'visual' ? 'image' : 'paragraph',
      offset: bp.position,
      element: `break-${index}`,
      priority: bp.quality,
      semanticContext: bp.reasoning
    }));
  }, []);

  // Debounced version for frequent recalculations
  const debouncedCalculatePageBreaks = useMemo(
    () => debounce(calculatePageBreaks, 300),
    [calculatePageBreaks]
  );

  const getPageBreakMap = useCallback((chapterIndex: number): PageBreakMap | null => {
    return pageBreakMaps.get(chapterIndex) || null;
  }, [pageBreakMaps]);

  const invalidateCache = useCallback((chapterIndex?: number) => {
    if (chapterIndex !== undefined) {
      setPageBreakMaps(prev => {
        const newMap = new Map(prev);
        newMap.delete(chapterIndex);
        return newMap;
      });
      // Remove from calculation cache
      for (const key of calculationCache.current.keys()) {
        if (key.startsWith(`${chapterIndex}-`)) {
          calculationCache.current.delete(key);
        }
      }
    } else {
      setPageBreakMaps(new Map());
      calculationCache.current.clear();
    }
  }, []);

  return {
    calculatePageBreaks: debouncedCalculatePageBreaks,
    getPageBreakMap,
    invalidateCache,
    isCalculating,
    calculationProgress
  };
};

// Utility functions for page break analysis
export const getPageAtOffset = (pageMap: PageBreakMap, offset: number): PageInfo | null => {
  return pageMap.pages.find(page => 
    offset >= page.startOffset && offset < page.endOffset
  ) || null;
};

export const getPageAtGlobalPosition = (
  pageMaps: PageBreakMap[],
  globalPageNumber: number
): { pageMap: PageBreakMap; page: PageInfo } | null => {
  let currentGlobalPage = 0;
  
  for (const pageMap of pageMaps) {
    for (const page of pageMap.pages) {
      if (currentGlobalPage === globalPageNumber) {
        return { pageMap, page };
      }
      currentGlobalPage++;
    }
  }
  
  return null;
};

export const calculateGlobalPageNumber = (
  pageMaps: PageBreakMap[],
  chapterIndex: number,
  pageNumber: number
): number => {
  let globalPage = 0;
  
  for (let i = 0; i < chapterIndex; i++) {
    const pageMap = pageMaps.find(pm => pm.chapterIndex === i);
    if (pageMap) {
      globalPage += pageMap.pages.length;
    }
  }
  
  return globalPage + pageNumber;
};