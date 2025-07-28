'use client';

import { PageBreakPoint, SmartPageBreakOptions } from './types';

/**
 * Content analysis result containing semantic information about text structure
 */
export interface ContentAnalysis {
  breakPoints: PageBreakPoint[];
  semanticElements: SemanticElement[];
  contentMetrics: ContentMetrics;
  readabilityScore: number;
}

/**
 * Semantic element detected in content
 */
export interface SemanticElement {
  type: 'heading' | 'paragraph' | 'image' | 'table' | 'quote' | 'list' | 'code';
  level?: number; // For headings (1-6)
  offset: number;
  length: number;
  content: string;
  importance: number; // 1-10 scale
  canBreakAfter: boolean;
  canBreakBefore: boolean;
}

/**
 * Content metrics for optimal pagination
 */
export interface ContentMetrics {
  totalWords: number;
  averageWordsPerParagraph: number;
  sentenceCount: number;
  averageSentenceLength: number;
  complexityScore: number; // Based on sentence structure, vocabulary
  estimatedReadingTime: number; // In minutes
  imageCount: number;
  tableCount: number;
  headingCount: number;
  density: 'low' | 'medium' | 'high';
}

/**
 * Advanced content analyzer for intelligent page breaking
 */
export class ContentAnalyzer {
  private options: SmartPageBreakOptions;

  constructor(options: SmartPageBreakOptions) {
    this.options = options;
  }

  /**
   * Perform comprehensive content analysis
   */
  public analyzeContent(htmlContent: string): ContentAnalysis {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const semanticElements = this.extractSemanticElements(tempDiv);
    const contentMetrics = this.calculateContentMetrics(tempDiv, semanticElements);
    const breakPoints = this.generateBreakPoints(semanticElements, contentMetrics);
    const readabilityScore = this.calculateReadabilityScore(tempDiv, contentMetrics);

    return {
      breakPoints,
      semanticElements,
      contentMetrics,
      readabilityScore
    };
  }

  /**
   * Extract semantic elements from DOM with enhanced detection
   */
  private extractSemanticElements(container: HTMLElement): SemanticElement[] {
    const elements: SemanticElement[] = [];
    let currentOffset = 0;

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const tagName = element.tagName.toLowerCase();
            
            // Filter out script, style, and other non-content elements
            if (['script', 'style', 'meta', 'link'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Accept semantic elements
            if (this.isSemanticElement(tagName)) {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
          
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        const textContent = this.getCleanTextContent(element);
        
        if (textContent.length < 3) continue; // Skip very short elements

        const semanticElement = this.createSemanticElement(
          element,
          tagName,
          textContent,
          currentOffset
        );

        if (semanticElement) {
          elements.push(semanticElement);
          currentOffset += textContent.length;
        }
      }
    }

    return elements.sort((a, b) => a.offset - b.offset);
  }

  /**
   * Check if element is semantically significant
   */
  private isSemanticElement(tagName: string): boolean {
    const semanticTags = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Headings
      'p', 'div', 'section', 'article', // Text containers
      'blockquote', 'aside', // Special text
      'img', 'figure', 'picture', // Images
      'table', 'tbody', 'thead', // Tables
      'ul', 'ol', 'li', // Lists
      'pre', 'code', // Code blocks
      'hr' // Separators
    ];
    
    return semanticTags.includes(tagName);
  }

  /**
   * Create semantic element with enhanced analysis
   */
  private createSemanticElement(
    element: Element,
    tagName: string,
    textContent: string,
    offset: number
  ): SemanticElement | null {
    let type: SemanticElement['type'];
    let level: number | undefined;
    let importance = 5; // Default importance
    let canBreakAfter = true;
    let canBreakBefore = true;

    // Determine element type and properties
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      type = 'heading';
      level = parseInt(tagName.substring(1));
      importance = 10 - level; // h1 = 9, h2 = 8, etc.
      canBreakBefore = true;
      canBreakAfter = true;
    } else if (tagName === 'p' || tagName === 'div') {
      type = 'paragraph';
      importance = this.calculateParagraphImportance(textContent);
      canBreakAfter = this.canBreakAfterParagraph(textContent);
      canBreakBefore = this.canBreakBeforeParagraph(element);
    } else if (tagName === 'img' || tagName === 'figure') {
      type = 'image';
      importance = 8; // Images are important breaks
      canBreakAfter = true;
      canBreakBefore = this.options.respectImages;
    } else if (tagName === 'table') {
      type = 'table';
      importance = 8; // Tables should not be broken
      canBreakAfter = this.options.respectTables;
      canBreakBefore = this.options.respectTables;
    } else if (tagName === 'blockquote') {
      type = 'quote';
      importance = 7;
      canBreakAfter = this.options.respectQuotes;
      canBreakBefore = this.options.respectQuotes;
    } else if (['ul', 'ol'].includes(tagName)) {
      type = 'list';
      importance = 6;
      canBreakAfter = true;
      canBreakBefore = true;
    } else if (['pre', 'code'].includes(tagName)) {
      type = 'code';
      importance = 7;
      canBreakAfter = this.options.respectCodeBlocks;
      canBreakBefore = this.options.respectCodeBlocks;
    } else {
      return null; // Unknown element type
    }

    return {
      type,
      level,
      offset,
      length: textContent.length,
      content: textContent.substring(0, 200), // Truncate for storage
      importance,
      canBreakAfter,
      canBreakBefore
    };
  }

  /**
   * Calculate paragraph importance based on content analysis
   */
  private calculateParagraphImportance(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let importance = 5; // Base importance
    
    // Short paragraphs (likely transitions) are better break points
    if (words.length < 20) importance += 2;
    else if (words.length > 100) importance -= 1;
    
    // Single sentence paragraphs are often good breaks
    if (sentences.length === 1 && words.length > 5) importance += 1;
    
    // Paragraphs starting with transition words
    const transitionWords = ['however', 'moreover', 'furthermore', 'meanwhile', 'consequently'];
    const firstWord = words[0]?.toLowerCase();
    if (transitionWords.includes(firstWord)) importance += 1;
    
    // Paragraphs ending with strong punctuation
    const lastChar = text.trim().slice(-1);
    if (['!', '?'].includes(lastChar)) importance += 1;
    
    return Math.max(1, Math.min(10, importance));
  }

  /**
   * Check if we can break after a paragraph
   */
  private canBreakAfterParagraph(text: string): boolean {
    if (!this.options.respectParagraphs) return true;
    
    // Don't break after very short paragraphs that might be incomplete
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) return false;
    
    // Don't break if paragraph doesn't end with proper punctuation
    const lastChar = text.trim().slice(-1);
    if (this.options.respectSentences && !['.', '!', '?', ':', ';'].includes(lastChar)) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if we can break before a paragraph
   */
  private canBreakBeforeParagraph(element: Element): boolean {
    if (!this.options.respectParagraphs) return true;
    
    // Check if this paragraph is a continuation (e.g., dialogue)
    const text = element.textContent?.trim() || '';
    
    // Don't break before dialogue continuations
    if (text.startsWith('"') && !text.endsWith('"')) return false;
    
    // Don't break before list continuations
    if (/^\d+\./.test(text) || /^[a-z]\)/.test(text)) return false;
    
    return true;
  }

  /**
   * Generate intelligent break points from semantic analysis
   */
  private generateBreakPoints(
    elements: SemanticElement[],
    metrics: ContentMetrics
  ): PageBreakPoint[] {
    const breakPoints: PageBreakPoint[] = [];

    elements.forEach((element, index) => {
      // Calculate break priority based on multiple factors
      let priority = element.importance;
      
      // Boost priority for preferred break elements
      if (this.isPreferredBreakElement(element)) {
        priority = Math.min(10, priority + 2);
      }
      
      // Consider context - what comes before and after
      const contextBoost = this.calculateContextBoost(elements, index);
      priority = Math.min(10, priority + contextBoost);
      
      // Adjust based on content density
      if (metrics.density === 'high' && element.type === 'paragraph') {
        priority += 1; // More breaks needed in dense content
      } else if (metrics.density === 'low' && element.type === 'paragraph') {
        priority -= 1; // Fewer breaks needed in sparse content
      }
      
      // Create break point if element can be broken after
      if (element.canBreakAfter && priority >= 3) {
        breakPoints.push({
          id: `break-${element.offset}-${element.type}`,
          type: element.type,
          offset: element.offset + element.length,
          element: `${element.type}${element.level ? element.level : ''}`,
          priority: Math.max(1, Math.min(10, Math.round(priority))),
          semanticContext: this.generateSemanticContext(element, elements, index)
        });
      }
    });

    // Add explicit break points for preferred elements
    this.addExplicitBreakPoints(breakPoints);
    
    // Sort by priority (highest first) then by offset
    return breakPoints.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.offset - b.offset;
    });
  }

  /**
   * Check if element matches preferred break patterns
   */
  private isPreferredBreakElement(element: SemanticElement): boolean {
    return this.options.preferredBreakElements.some(selector => {
      if (selector.startsWith('.')) {
        // Class-based selector - would need actual DOM element to check
        return false; // Skip for now
      } else {
        // Tag-based selector
        const tagMatch = selector === element.type || 
                        (element.type === 'heading' && selector.startsWith('h'));
        return tagMatch;
      }
    });
  }

  /**
   * Calculate context boost based on surrounding elements
   */
  private calculateContextBoost(elements: SemanticElement[], index: number): number {
    let boost = 0;
    
    const current = elements[index];
    const previous = index > 0 ? elements[index - 1] : null;
    const next = index < elements.length - 1 ? elements[index + 1] : null;
    
    // Boost if following a heading
    if (previous?.type === 'heading') boost += 1;
    
    // Boost if before a heading
    if (next?.type === 'heading') boost += 1;
    
    // Boost if transitioning between different content types
    if (previous && previous.type !== current.type) boost += 0.5;
    if (next && next.type !== current.type) boost += 0.5;
    
    // Boost for natural content boundaries
    if (current.type === 'paragraph' && next?.type === 'image') boost += 1;
    if (current.type === 'image' && next?.type === 'paragraph') boost += 1;
    
    return boost;
  }

  /**
   * Generate semantic context description
   */
  private generateSemanticContext(
    element: SemanticElement,
    elements: SemanticElement[],
    index: number
  ): string {
    const context = [];
    
    // Add element type and basic info
    if (element.type === 'heading') {
      context.push(`H${element.level}: ${element.content.substring(0, 50)}`);
    } else {
      context.push(`${element.type}: ${element.content.substring(0, 50)}`);
    }
    
    // Add context about surrounding elements
    const previous = index > 0 ? elements[index - 1] : null;
    const next = index < elements.length - 1 ? elements[index + 1] : null;
    
    if (previous) context.push(`after ${previous.type}`);
    if (next) context.push(`before ${next.type}`);
    
    return context.join(', ');
  }

  /**
   * Add explicit break points for special markers
   */
  private addExplicitBreakPoints(breakPoints: PageBreakPoint[]): void {
    // Add break points for HR elements, page break classes, etc.
    // This would typically be done during the DOM traversal
    // but is included here for completeness
  }

  /**
   * Calculate comprehensive content metrics
   */
  private calculateContentMetrics(
    container: HTMLElement,
    elements: SemanticElement[]
  ): ContentMetrics {
    const textContent = this.getCleanTextContent(container);
    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const paragraphs = elements.filter(e => e.type === 'paragraph');
    const images = elements.filter(e => e.type === 'image');
    const tables = elements.filter(e => e.type === 'table');
    const headings = elements.filter(e => e.type === 'heading');
    
    const averageWordsPerParagraph = paragraphs.length > 0 ? 
      words.length / paragraphs.length : 0;
    
    const averageSentenceLength = sentences.length > 0 ? 
      words.length / sentences.length : 0;
    
    // Simple complexity score based on sentence length and vocabulary
    const complexityScore = this.calculateComplexityScore(words, sentences);
    
    // Estimate reading time (250 WPM average)
    const estimatedReadingTime = Math.ceil(words.length / 250);
    
    // Determine content density
    let density: 'low' | 'medium' | 'high' = 'medium';
    const elementsPerWord = elements.length / Math.max(1, words.length);
    if (elementsPerWord > 0.1) density = 'high';
    else if (elementsPerWord < 0.02) density = 'low';
    
    return {
      totalWords: words.length,
      averageWordsPerParagraph,
      sentenceCount: sentences.length,
      averageSentenceLength,
      complexityScore,
      estimatedReadingTime,
      imageCount: images.length,
      tableCount: tables.length,
      headingCount: headings.length,
      density
    };
  }

  /**
   * Calculate text complexity score
   */
  private calculateComplexityScore(words: string[], sentences: string[]): number {
    if (words.length === 0 || sentences.length === 0) return 5;
    
    // Flesch Reading Ease approximation
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0) / words.length;
    
    const flesch = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllables);
    
    // Convert to 1-10 scale (higher = more complex)
    if (flesch >= 90) return 2; // Very easy
    if (flesch >= 80) return 3; // Easy
    if (flesch >= 70) return 4; // Fairly easy
    if (flesch >= 60) return 5; // Standard
    if (flesch >= 50) return 6; // Fairly difficult
    if (flesch >= 30) return 7; // Difficult
    return 8; // Very difficult
  }

  /**
   * Approximate syllable counting
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let count = 0;
    let previousChar = '';
    
    for (const char of word) {
      if (vowels.includes(char) && !vowels.includes(previousChar)) {
        count++;
      }
      previousChar = char;
    }
    
    // Adjust for silent e
    if (word.endsWith('e')) count--;
    
    return Math.max(1, count);
  }

  /**
   * Calculate readability score for optimal page sizing
   */
  private calculateReadabilityScore(
    container: HTMLElement,
    metrics: ContentMetrics
  ): number {
    let score = 5; // Base score
    
    // Adjust based on complexity
    if (metrics.complexityScore <= 4) score += 1; // Easy text = larger pages
    else if (metrics.complexityScore >= 7) score -= 1; // Complex text = smaller pages
    
    // Adjust based on content density
    if (metrics.density === 'high') score -= 1; // Dense content = smaller pages
    else if (metrics.density === 'low') score += 1; // Sparse content = larger pages
    
    // Adjust based on element diversity
    const elementTypes = new Set(['paragraph', 'heading', 'image', 'table'].filter(type => {
      switch (type) {
        case 'paragraph': return metrics.totalWords > 0;
        case 'heading': return metrics.headingCount > 0;
        case 'image': return metrics.imageCount > 0;
        case 'table': return metrics.tableCount > 0;
        default: return false;
      }
    }));
    
    if (elementTypes.size <= 1) score += 1; // Simple content = larger pages
    else if (elementTypes.size >= 3) score -= 1; // Mixed content = smaller pages
    
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Get clean text content from element
   */
  private getCleanTextContent(element: Element): string {
    const text = element.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  }
}

/**
 * Factory function to create content analyzer with sensible defaults
 */
export function createContentAnalyzer(
  customOptions?: Partial<SmartPageBreakOptions>
): ContentAnalyzer {
  const defaultOptions: SmartPageBreakOptions = {
    respectSentences: true,
    respectParagraphs: true,
    respectHeadings: true,
    respectImages: true,
    respectTables: true,
    respectQuotes: true,
    respectCodeBlocks: true,
    minimumWordsPerPage: 100,
    maximumWordsPerPage: 500,
    allowSplitParagraphs: false,
    preferredBreakElements: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr',
      'blockquote',
      'section',
      '.page-break',
      '.chapter-break'
    ]
  };

  const options = { ...defaultOptions, ...customOptions };
  return new ContentAnalyzer(options);
}

/**
 * Utility functions for content analysis
 */
export const ContentAnalysisUtils = {
  /**
   * Analyze content and return analysis results
   */
  async analyzeContent(htmlContent: string): Promise<ContentAnalysis> {
    const analyzer = new ContentAnalyzer({
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
    });
    return analyzer.analyzeContent(htmlContent);
  },

  /**
   * Find optimal break point near target offset
   */
  findOptimalBreakPoint(
    breakPoints: PageBreakPoint[],
    targetOffset: number,
    maxDistance: number = 200
  ): PageBreakPoint | null {
    const candidates = breakPoints.filter(
      bp => Math.abs(bp.offset - targetOffset) <= maxDistance
    );

    if (candidates.length === 0) return null;

    // Score candidates based on proximity and priority
    const scored = candidates.map(bp => {
      const distance = Math.abs(bp.offset - targetOffset);
      const proximityScore = 1 - (distance / maxDistance);
      const priorityScore = bp.priority / 10;
      const combinedScore = (proximityScore * 0.6) + (priorityScore * 0.4);
      
      return { breakPoint: bp, score: combinedScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].breakPoint;
  },

  /**
   * Validate break point quality
   */
  validateBreakQuality(
    breakPoint: PageBreakPoint,
    context: { previousWords: number; nextWords: number }
  ): number {
    let quality = breakPoint.priority;

    // Penalize breaks that create very uneven pages
    const ratio = context.previousWords / Math.max(1, context.nextWords);
    if (ratio > 3 || ratio < 0.33) quality -= 2;

    // Boost quality for natural boundaries
    if (['heading', 'section'].includes(breakPoint.type)) quality += 1;

    return Math.max(1, Math.min(10, quality));
  }
};