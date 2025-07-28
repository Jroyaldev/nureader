'use client';

import { 
  PageInfo, 
  PageBreakPoint, 
  PageCalculationSettings, 
  SmartPageBreakOptions 
} from './types';
import { 
  ContentAnalysis, 
  ContentMetrics, 
  SemanticElement, 
  ContentAnalysisUtils 
} from './contentAnalyzer';

/**
 * Page break result with quality metrics
 */
export interface PageBreakResult {
  pages: PageInfo[];
  totalQualityScore: number;
  averageQualityScore: number;
  problematicBreaks: PageBreakIssue[];
  optimizationSuggestions: string[];
}

/**
 * Issues found with page breaks
 */
export interface PageBreakIssue {
  pageNumber: number;
  issueType: 'orphan' | 'widow' | 'split-element' | 'uneven-pages' | 'poor-break';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix?: string;
}

/**
 * Page break optimization options
 */
export interface PageBreakOptimizationOptions {
  maxIterations: number;
  qualityThreshold: number;
  allowablePageSizeVariation: number; // Percentage
  prioritizeReadability: boolean;
  enableAdvancedOptimization: boolean;
}

/**
 * Smart page breaker using advanced algorithms for natural boundaries
 */
export class SmartPageBreaker {
  private settings: PageCalculationSettings;
  private options: SmartPageBreakOptions;
  private optimizationOptions: PageBreakOptimizationOptions;

  constructor(
    settings: PageCalculationSettings,
    options: SmartPageBreakOptions,
    optimizationOptions?: Partial<PageBreakOptimizationOptions>
  ) {
    this.settings = settings;
    this.options = options;
    this.optimizationOptions = {
      maxIterations: 3,
      qualityThreshold: 7.0,
      allowablePageSizeVariation: 25,
      prioritizeReadability: true,
      enableAdvancedOptimization: true,
      ...optimizationOptions
    };
  }

  /**
   * Generate optimal page breaks using advanced algorithms
   */
  public generateOptimalPages(
    content: string,
    analysis: ContentAnalysis,
    chapterIndex: number,
    globalPageOffset: number = 0
  ): PageBreakResult {
    // Start with baseline page breaks
    let currentResult = this.generateBaselinePages(
      content, 
      analysis, 
      chapterIndex, 
      globalPageOffset
    );

    // Apply optimization iterations if enabled
    if (this.optimizationOptions.enableAdvancedOptimization) {
      currentResult = this.optimizePageBreaks(content, analysis, currentResult);
    }

    return currentResult;
  }

  /**
   * Generate baseline page breaks using content analysis
   */
  private generateBaselinePages(
    content: string,
    analysis: ContentAnalysis,
    chapterIndex: number,
    globalPageOffset: number
  ): PageBreakResult {
    const targetWordsPerPage = this.calculateTargetWordsPerPage(analysis.contentMetrics);
    const pages: PageInfo[] = [];
    const issues: PageBreakIssue[] = [];

    // Use HTML-aware page generation
    const htmlPages = this.generatePagesFromHTML(
      content,
      targetWordsPerPage,
      globalPageOffset
    );

    // Convert HTML pages to PageInfo format
    htmlPages.forEach((htmlPage, index) => {
      const pageInfo: PageInfo = {
        id: `page-${index}-${Date.now()}`,
        pageNumber: index,
        globalPageNumber: globalPageOffset + index,
        startOffset: htmlPage.startOffset,
        endOffset: htmlPage.endOffset,
        wordCount: htmlPage.wordCount,
        estimatedReadTime: Math.ceil(htmlPage.wordCount / 250),
        hasImages: htmlPage.hasImages,
        hasTables: htmlPage.hasTables,
        contentDensity: htmlPage.wordCount < 200 ? 'low' : htmlPage.wordCount > 400 ? 'high' : 'medium',
        breakQuality: htmlPage.breakQuality
      };
      pages.push(pageInfo);
    });

    const qualityScores = pages.map(p => p.breakQuality);
    const totalQuality = qualityScores.reduce((sum, score) => sum + score, 0);
    const averageQuality = pages.length > 0 ? totalQuality / pages.length : 0;

    return {
      pages,
      totalQualityScore: totalQuality,
      averageQualityScore: averageQuality,
      problematicBreaks: issues,
      optimizationSuggestions: this.generateOptimizationSuggestions(pages, issues)
    };
  }

  /**
   * Generate a single page with optimal break point
   */
  private generateSinglePage(
    textContent: string,
    breakPoints: PageBreakPoint[],
    semanticElements: SemanticElement[],
    startOffset: number,
    targetWordsPerPage: number,
    pageNumber: number,
    globalPageNumber: number
  ): { page: PageInfo; issues: PageBreakIssue[] } {
    const issues: PageBreakIssue[] = [];
    
    // Calculate target end offset based on word count
    const estimatedCharsPerWord = 5; // Average character per word
    const targetCharCount = targetWordsPerPage * estimatedCharsPerWord;
    const idealEndOffset = Math.min(
      startOffset + targetCharCount,
      textContent.length
    );

    // Find the best break point near the target
    const breakPoint = this.findOptimalBreakPoint(
      breakPoints,
      startOffset,
      idealEndOffset,
      textContent
    );

    let endOffset = breakPoint?.offset || idealEndOffset;

    // Ensure we don't go past the end
    endOffset = Math.min(endOffset, textContent.length);

    // Validate and adjust the break point
    const adjustedOffset = this.validateAndAdjustBreakPoint(
      textContent,
      startOffset,
      endOffset,
      breakPoint
    );

    endOffset = adjustedOffset.offset;
    
    if (adjustedOffset.issues.length > 0) {
      issues.push(...adjustedOffset.issues.map(issue => ({
        ...issue,
        pageNumber
      })));
    }

    // Calculate page content metrics
    const pageContent = textContent.substring(startOffset, endOffset);
    const words = pageContent.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Detect special content in this page
    const hasImages = this.detectImagesInRange(semanticElements, startOffset, endOffset);
    const hasTables = this.detectTablesInRange(semanticElements, startOffset, endOffset);

    // Calculate content density for this page
    const contentDensity = this.calculatePageContentDensity(
      semanticElements,
      startOffset,
      endOffset,
      wordCount
    );

    // Calculate break quality
    const breakQuality = this.calculateBreakQuality(
      breakPoint,
      textContent,
      startOffset,
      endOffset,
      wordCount,
      targetWordsPerPage
    );

    // Estimate reading time (250 WPM average)
    const estimatedReadTime = Math.ceil(wordCount / 250);

    const page: PageInfo = {
      id: `page-${globalPageNumber}-${Date.now()}`,
      pageNumber,
      globalPageNumber,
      startOffset,
      endOffset,
      wordCount,
      estimatedReadTime,
      hasImages,
      hasTables,
      contentDensity,
      breakQuality
    };

    // Check for common page break issues
    this.detectPageIssues(page, textContent, targetWordsPerPage, issues);

    return { page, issues };
  }

  /**
   * Find optimal break point using advanced scoring
   */
  private findOptimalBreakPoint(
    breakPoints: PageBreakPoint[],
    startOffset: number,
    idealEndOffset: number,
    textContent: string
  ): PageBreakPoint | null {
    // Filter break points in reasonable range
    const maxSearchDistance = Math.floor((idealEndOffset - startOffset) * 0.4);
    const minEndOffset = idealEndOffset - maxSearchDistance;
    const maxEndOffset = idealEndOffset + maxSearchDistance;

    const candidates = breakPoints.filter(bp => 
      bp.offset > startOffset && 
      bp.offset >= minEndOffset && 
      bp.offset <= maxEndOffset
    );

    if (candidates.length === 0) {
      // Fallback: find sentence boundaries
      return this.findSentenceBoundary(textContent, startOffset, idealEndOffset);
    }

    // Score each candidate
    const scoredCandidates = candidates.map(bp => {
      const distance = Math.abs(bp.offset - idealEndOffset);
      const maxDistance = Math.max(maxSearchDistance, 1);
      
      // Proximity score (closer to ideal = better)
      const proximityScore = 1 - (distance / maxDistance);
      
      // Semantic score (based on break point priority)
      const semanticScore = bp.priority / 10;
      
      // Content context score
      const contextScore = this.calculateContextScore(textContent, bp.offset);
      
      // Combined score with weights
      const combinedScore = (proximityScore * 0.4) + 
                           (semanticScore * 0.4) + 
                           (contextScore * 0.2);

      return { breakPoint: bp, score: combinedScore };
    });

    // Sort by score and return the best
    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates[0].breakPoint;
  }

  /**
   * Find sentence boundary as fallback break point
   */
  private findSentenceBoundary(
    textContent: string,
    startOffset: number,
    idealEndOffset: number
  ): PageBreakPoint | null {
    const searchStart = Math.max(startOffset, idealEndOffset - 100);
    const searchEnd = Math.min(textContent.length, idealEndOffset + 100);
    const searchText = textContent.substring(searchStart, searchEnd);

    // Look for sentence endings
    const sentenceEndings = /[.!?]\s+/g;
    let match;
    let bestMatch: { offset: number; quality: number } | null = null;

    while ((match = sentenceEndings.exec(searchText)) !== null) {
      const absoluteOffset = searchStart + match.index + match[0].length;
      const distance = Math.abs(absoluteOffset - idealEndOffset);
      const quality = 1 - (distance / 200); // Closer = better quality

      if (!bestMatch || quality > bestMatch.quality) {
        bestMatch = { offset: absoluteOffset, quality };
      }
    }

    if (bestMatch) {
      return {
        id: `sentence-break-${bestMatch.offset}`,
        type: 'paragraph',
        offset: bestMatch.offset,
        element: 'sentence-boundary',
        priority: Math.floor(bestMatch.quality * 6) + 2, // 2-8 range
        semanticContext: 'Sentence boundary fallback'
      };
    }

    return null;
  }

  /**
   * Calculate context score for break point quality
   */
  private calculateContextScore(textContent: string, offset: number): number {
    const contextBefore = textContent.substring(Math.max(0, offset - 50), offset);
    const contextAfter = textContent.substring(offset, Math.min(textContent.length, offset + 50));

    let score = 0.5; // Base score

    // Good breaks after punctuation
    if (/[.!?]\s*$/.test(contextBefore)) score += 0.3;

    // Good breaks before capital letters (new sentences)
    if (/^\s*[A-Z]/.test(contextAfter)) score += 0.2;

    // Avoid breaks in the middle of words
    if (/\w$/.test(contextBefore) && /^\w/.test(contextAfter)) score -= 0.5;

    // Avoid breaks in quoted text
    const quotes = (contextBefore.match(/"/g) || []).length;
    if (quotes % 2 === 1) score -= 0.3;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Validate and adjust break point for quality
   */
  private validateAndAdjustBreakPoint(
    textContent: string,
    startOffset: number,
    endOffset: number,
    breakPoint: PageBreakPoint | null
  ): { offset: number; issues: Omit<PageBreakIssue, 'pageNumber'>[] } {
    const issues: Omit<PageBreakIssue, 'pageNumber'>[] = [];
    let adjustedOffset = endOffset;

    // Check if we're breaking in the middle of a word
    if (endOffset < textContent.length) {
      const charBefore = textContent[endOffset - 1];
      const charAfter = textContent[endOffset];

      if (/\w/.test(charBefore) && /\w/.test(charAfter)) {
        // Find the next word boundary
        const nextSpace = textContent.indexOf(' ', endOffset);
        const prevSpace = textContent.lastIndexOf(' ', endOffset);

        if (nextSpace !== -1 && (nextSpace - endOffset) < 20) {
          adjustedOffset = nextSpace + 1;
        } else if (prevSpace !== -1 && (endOffset - prevSpace) < 20) {
          adjustedOffset = prevSpace;
        } else {
          issues.push({
            issueType: 'poor-break',
            severity: 'medium',
            description: 'Page break occurs in the middle of a word',
            suggestedFix: 'Adjust break to word boundary'
          });
        }
      }
    }

    // Check for orphan/widow lines if we have break point context
    if (breakPoint) {
      const pageContent = textContent.substring(startOffset, adjustedOffset);
      const lines = pageContent.split('\n').filter(line => line.trim().length > 0);

      if (lines.length === 1 && pageContent.length > 100) {
        issues.push({
          issueType: 'orphan',
          severity: 'medium',
          description: 'Page contains only one line of text',
          suggestedFix: 'Consider merging with adjacent page'
        });
      }
    }

    // Ensure minimum content per page
    const minChars = this.options.minimumWordsPerPage * 4; // Rough estimate
    if ((adjustedOffset - startOffset) < minChars && adjustedOffset < textContent.length) {
      const extendedOffset = Math.min(
        textContent.length,
        startOffset + minChars
      );
      
      // Find next reasonable break
      const nextSpace = textContent.indexOf(' ', extendedOffset);
      if (nextSpace !== -1) {
        adjustedOffset = nextSpace;
      } else {
        adjustedOffset = extendedOffset;
      }
    }

    return { offset: adjustedOffset, issues };
  }

  /**
   * Calculate target words per page based on content analysis
   */
  private calculateTargetWordsPerPage(metrics: ContentMetrics): number {
    // Start with a reasonable base target based on reading research
    // Typical comfortable reading is 250-350 words per page
    let baseTarget = 300;
    
    // Adjust slightly based on screen size (but keep it reasonable)
    const screenArea = this.settings.screenWidth * this.settings.screenHeight;
    const normalArea = 1920 * 1080; // Reference desktop size
    const areaRatio = Math.sqrt(screenArea / normalArea);
    
    // Scale by area ratio but cap the adjustment
    baseTarget = Math.floor(baseTarget * Math.max(0.7, Math.min(1.3, areaRatio)));

    // Adjust based on content complexity
    if (metrics.complexityScore > 7) {
      baseTarget = Math.floor(baseTarget * 0.8); // Smaller pages for complex text
    } else if (metrics.complexityScore < 4) {
      baseTarget = Math.floor(baseTarget * 1.1); // Slightly larger pages for simple text
    }

    // Adjust based on content density
    if (metrics.density === 'high') {
      baseTarget = Math.floor(baseTarget * 0.9);
    } else if (metrics.density === 'low') {
      baseTarget = Math.floor(baseTarget * 1.1);
    }

    // Ensure within reasonable bounds (never too large)
    return Math.max(
      this.options.minimumWordsPerPage,
      Math.min(Math.min(this.options.maximumWordsPerPage, 450), baseTarget)
    );
  }

  /**
   * Detect images in page range
   */
  private detectImagesInRange(
    elements: SemanticElement[],
    startOffset: number,
    endOffset: number
  ): boolean {
    return elements.some(element => 
      element.type === 'image' && 
      element.offset >= startOffset && 
      element.offset < endOffset
    );
  }

  /**
   * Detect tables in page range
   */
  private detectTablesInRange(
    elements: SemanticElement[],
    startOffset: number,
    endOffset: number
  ): boolean {
    return elements.some(element => 
      element.type === 'table' && 
      element.offset >= startOffset && 
      element.offset < endOffset
    );
  }

  /**
   * Calculate content density for a specific page
   */
  private calculatePageContentDensity(
    elements: SemanticElement[],
    startOffset: number,
    endOffset: number,
    wordCount: number
  ): 'low' | 'medium' | 'high' {
    const pageElements = elements.filter(element => 
      element.offset >= startOffset && element.offset < endOffset
    );

    const elementDensity = pageElements.length / Math.max(1, wordCount / 100);
    
    if (elementDensity > 2) return 'high';
    if (elementDensity < 0.5) return 'low';
    return 'medium';
  }

  /**
   * Calculate break quality score
   */
  private calculateBreakQuality(
    breakPoint: PageBreakPoint | null,
    textContent: string,
    startOffset: number,
    endOffset: number,
    wordCount: number,
    targetWordCount: number
  ): number {
    let quality = 5; // Base quality

    // Quality from break point
    if (breakPoint) {
      quality = breakPoint.priority;
    } else {
      // Check if it's a natural boundary
      if (endOffset >= textContent.length) {
        quality = 10; // Perfect - end of content
      } else {
        const contextScore = this.calculateContextScore(textContent, endOffset);
        quality = Math.floor(contextScore * 8) + 2;
      }
    }

    // Adjust based on page size relative to target
    const sizeRatio = wordCount / Math.max(1, targetWordCount);
    if (sizeRatio > 1.5 || sizeRatio < 0.6) {
      quality = Math.max(1, quality - 2); // Penalize very uneven pages
    }

    // Boost quality for ending on punctuation
    if (endOffset > 0 && endOffset < textContent.length) {
      const lastChar = textContent[endOffset - 1];
      if (['.', '!', '?'].includes(lastChar)) {
        quality = Math.min(10, quality + 1);
      }
    }

    return Math.max(1, Math.min(10, quality));
  }

  /**
   * Detect common page issues
   */
  private detectPageIssues(
    page: PageInfo,
    textContent: string,
    targetWordCount: number,
    issues: PageBreakIssue[]
  ): void {
    // Check for severely uneven page sizes
    const sizeRatio = page.wordCount / Math.max(1, targetWordCount);
    if (sizeRatio > 2 || sizeRatio < 0.3) {
      issues.push({
        pageNumber: page.pageNumber,
        issueType: 'uneven-pages',
        severity: sizeRatio > 3 || sizeRatio < 0.2 ? 'high' : 'medium',
        description: `Page size is ${Math.round(sizeRatio * 100)}% of target`,
        suggestedFix: 'Adjust break points to balance page sizes'
      });
    }

    // Check for split elements (images, tables)
    if (page.hasImages || page.hasTables) {
      // This would require more detailed analysis of where elements are positioned
      // relative to page boundaries - simplified for now
    }

    // Check break quality
    if (page.breakQuality <= 3) {
      issues.push({
        pageNumber: page.pageNumber,
        issueType: 'poor-break',
        severity: page.breakQuality <= 2 ? 'high' : 'medium',
        description: `Poor page break quality (${page.breakQuality}/10)`,
        suggestedFix: 'Find better break point or adjust content'
      });
    }
  }

  /**
   * Optimize page breaks through iterative improvement
   */
  private optimizePageBreaks(
    content: string,
    analysis: ContentAnalysis,
    initialResult: PageBreakResult
  ): PageBreakResult {
    let currentResult = initialResult;
    let bestResult = initialResult;
    
    for (let iteration = 0; iteration < this.optimizationOptions.maxIterations; iteration++) {
      // Identify the most problematic pages
      const highSeverityIssues = currentResult.problematicBreaks.filter(
        issue => issue.severity === 'high'
      );

      if (highSeverityIssues.length === 0 && 
          currentResult.averageQualityScore >= this.optimizationOptions.qualityThreshold) {
        break; // Optimization complete
      }

      // Apply targeted improvements
      const improvedResult = this.applyTargetedImprovements(
        content,
        analysis,
        currentResult,
        highSeverityIssues
      );

      // Keep the best result
      if (improvedResult.averageQualityScore > bestResult.averageQualityScore) {
        bestResult = improvedResult;
      }

      currentResult = improvedResult;
    }

    return bestResult;
  }

  /**
   * Apply targeted improvements to problematic pages
   */
  private applyTargetedImprovements(
    content: string,
    analysis: ContentAnalysis,
    currentResult: PageBreakResult,
    issues: PageBreakIssue[]
  ): PageBreakResult {
    // For now, return the current result
    // In a full implementation, this would:
    // 1. Identify pages with issues
    // 2. Try alternative break points
    // 3. Adjust page boundaries
    // 4. Recalculate quality scores
    
    return currentResult;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    pages: PageInfo[],
    issues: PageBreakIssue[]
  ): string[] {
    const suggestions: string[] = [];

    // Analyze common issues
    const issueTypes = issues.reduce((acc, issue) => {
      acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (issueTypes['uneven-pages'] > pages.length * 0.2) {
      suggestions.push('Consider adjusting target words per page for more consistent sizing');
    }

    if (issueTypes['poor-break'] > pages.length * 0.1) {
      suggestions.push('Content may benefit from additional semantic markup for better break points');
    }

    // Page size analysis
    const wordCounts = pages.map(p => p.wordCount);
    const avgWordCount = wordCounts.reduce((sum, count) => sum + count, 0) / pages.length;
    const variance = wordCounts.reduce((sum, count) => sum + Math.pow(count - avgWordCount, 2), 0) / pages.length;
    const standardDeviation = Math.sqrt(variance);

    if (standardDeviation > avgWordCount * 0.4) {
      suggestions.push('High page size variation detected - consider enabling advanced optimization');
    }

    // Quality analysis
    const avgQuality = pages.reduce((sum, page) => sum + page.breakQuality, 0) / pages.length;
    if (avgQuality < 6) {
      suggestions.push('Overall break quality is low - consider adjusting content structure or break preferences');
    }

    return suggestions;
  }

  /**
   * Clean content for analysis
   */
  private cleanContent(content: string): string {
    return content
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Generate pages from HTML content preserving structure
   */
  private generatePagesFromHTML(
    htmlContent: string,
    targetWordsPerPage: number,
    globalPageOffset: number
  ): Array<{
    startOffset: number;
    endOffset: number;
    wordCount: number;
    hasImages: boolean;
    hasTables: boolean;
    breakQuality: number;
  }> {
    const pages: Array<{
      startOffset: number;
      endOffset: number;
      wordCount: number;
      hasImages: boolean;
      hasTables: boolean;
      breakQuality: number;
    }> = [];

    // Simple regex-based approach to find good break points in HTML
    const blockElements = [
      '</p>', '</div>', '</section>', '</article>', 
      '</h1>', '</h2>', '</h3>', '</h4>', '</h5>', '</h6>',
      '</blockquote>', '</li>', '</td>', '</th>'
    ];

    let currentOffset = 0;
    let currentWordCount = 0;
    let pageStartOffset = 0;
    let lastGoodBreak = 0;
    let inTag = false;
    let tagDepth = 0;

    // Walk through the HTML character by character
    for (let i = 0; i < htmlContent.length; i++) {
      const char = htmlContent[i];
      
      // Track if we're inside a tag
      if (char === '<') {
        inTag = true;
        
        // Check if this is a closing tag of a block element
        for (const blockEnd of blockElements) {
          if (htmlContent.substr(i, blockEnd.length) === blockEnd) {
            lastGoodBreak = i + blockEnd.length;
            break;
          }
        }
      } else if (char === '>') {
        inTag = false;
      }
      
      // Count words in text content (outside tags)
      if (!inTag && /\s/.test(char)) {
        // Check if previous characters formed a word
        let j = i - 1;
        while (j >= 0 && !/\s/.test(htmlContent[j]) && htmlContent[j] !== '>') {
          j--;
        }
        if (i - j > 1) {
          currentWordCount++;
        }
      }
      
      // Check if we should create a page break
      if (currentWordCount >= targetWordsPerPage && lastGoodBreak > pageStartOffset) {
        // Scan the page content for special elements
        const pageContent = htmlContent.substring(pageStartOffset, lastGoodBreak);
        const hasImages = /<img[^>]*>/i.test(pageContent);
        const hasTables = /<table[^>]*>/i.test(pageContent);
        
        pages.push({
          startOffset: pageStartOffset,
          endOffset: lastGoodBreak,
          wordCount: currentWordCount,
          hasImages,
          hasTables,
          breakQuality: 8 // Good quality for block element boundaries
        });
        
        // Reset for next page
        pageStartOffset = lastGoodBreak;
        currentWordCount = 0;
        
        // Safety check
        if (pages.length > 1000) {
          console.warn('SmartPageBreaker: Maximum page limit reached');
          break;
        }
      }
    }
    
    // Handle remaining content
    if (pageStartOffset < htmlContent.length) {
      const pageContent = htmlContent.substring(pageStartOffset);
      const plainText = pageContent.replace(/<[^>]*>/g, ' ').trim();
      const words = plainText.split(/\s+/).filter(w => w.length > 0);
      
      pages.push({
        startOffset: pageStartOffset,
        endOffset: htmlContent.length,
        wordCount: words.length,
        hasImages: /<img[^>]*>/i.test(pageContent),
        hasTables: /<table[^>]*>/i.test(pageContent),
        breakQuality: 10 // Perfect quality for end of content
      });
    }
    
    return pages;
  }
}

/**
 * Factory function to create smart page breaker
 */
export function createSmartPageBreaker(
  settings: PageCalculationSettings,
  options: SmartPageBreakOptions,
  optimizationOptions?: Partial<PageBreakOptimizationOptions>
): SmartPageBreaker {
  return new SmartPageBreaker(settings, options, optimizationOptions);
}

/**
 * Utility functions for page breaking
 */
export const PageBreakUtils = {
  /**
   * Calculate page break efficiency
   */
  calculateEfficiency(result: PageBreakResult): number {
    if (result.pages.length === 0) return 0;

    const qualityWeight = 0.6;
    const consistencyWeight = 0.4;

    // Quality score
    const qualityScore = result.averageQualityScore / 10;

    // Consistency score (lower variation = higher score)
    const wordCounts = result.pages.map(p => p.wordCount);
    const avgWordCount = wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length;
    const variance = wordCounts.reduce((sum, count) => sum + Math.pow(count - avgWordCount, 2), 0) / wordCounts.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / avgWordCount;
    const consistencyScore = Math.max(0, 1 - coefficientOfVariation);

    return (qualityScore * qualityWeight) + (consistencyScore * consistencyWeight);
  },

  /**
   * Validate page break result
   */
  validateResult(result: PageBreakResult, contentLength: number): boolean {
    if (result.pages.length === 0) return false;

    // Check that pages cover the entire content
    const firstPage = result.pages[0];
    const lastPage = result.pages[result.pages.length - 1];

    if (firstPage.startOffset !== 0) return false;
    if (lastPage.endOffset < contentLength * 0.95) return false; // Allow small tolerance

    // Check for gaps or overlaps
    for (let i = 1; i < result.pages.length; i++) {
      const prevPage = result.pages[i - 1];
      const currentPage = result.pages[i];

      if (currentPage.startOffset !== prevPage.endOffset) {
        return false; // Gap or overlap detected
      }
    }

    return true;
  },

  /**
   * Get page statistics
   */
  getPageStatistics(result: PageBreakResult): {
    totalPages: number;
    averageWordCount: number;
    minWordCount: number;
    maxWordCount: number;
    standardDeviation: number;
    qualityDistribution: Record<string, number>;
  } {
    const pages = result.pages;
    const wordCounts = pages.map(p => p.wordCount);
    const qualities = pages.map(p => p.breakQuality);

    const avgWordCount = wordCounts.reduce((sum, count) => sum + count, 0) / pages.length;
    const variance = wordCounts.reduce((sum, count) => sum + Math.pow(count - avgWordCount, 2), 0) / pages.length;
    const standardDeviation = Math.sqrt(variance);

    const qualityDistribution = qualities.reduce((acc, quality) => {
      const range = Math.floor(quality);
      acc[`${range}-${range + 1}`] = (acc[`${range}-${range + 1}`] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPages: pages.length,
      averageWordCount: avgWordCount,
      minWordCount: Math.min(...wordCounts),
      maxWordCount: Math.max(...wordCounts),
      standardDeviation,
      qualityDistribution
    };
  }
};