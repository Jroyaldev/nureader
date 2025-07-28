'use client';

import { 
  PageBreakPoint, 
  DocumentStructure, 
  ContentDensityMetrics, 
  AnalysisContext,
  SmartPageBreakOptions,
  OptimalBreakPoint,
  HeadingInfo,
  ParagraphInfo,
  SectionInfo,
  SpecialContentInfo
} from './types';

export interface BreakPointScorer {
  scoreBreakPoint(element: Element, context: AnalysisContext): number;
  findOptimalBreakPoints(
    content: string, 
    structure: DocumentStructure, 
    density: ContentDensityMetrics, 
    context: AnalysisContext,
    options: SmartPageBreakOptions
  ): OptimalBreakPoint[];
  calculateBreakQuality(
    position: number,
    contentBefore: string,
    contentAfter: string,
    structure: DocumentStructure
  ): number;
  assessBreakImpact(
    breakPoint: OptimalBreakPoint,
    structure: DocumentStructure,
    density: ContentDensityMetrics
  ): OptimalBreakPoint['impactAssessment'];
}

class BreakPointScorerImpl implements BreakPointScorer {
  
  /**
   * Score a potential break point based on element type and context
   */
  scoreBreakPoint(element: Element, context: AnalysisContext): number {
    const tagName = element.tagName.toLowerCase();
    let score = 5; // Base score
    
    // Element type scoring
    switch (tagName) {
      case 'h1':
        score = 10; // Perfect break point
        break;
      case 'h2':
        score = 9;
        break;
      case 'h3':
        score = 8;
        break;
      case 'h4':
      case 'h5':
      case 'h6':
        score = 7;
        break;
      case 'hr':
        score = 10; // Perfect break point
        break;
      case 'section':
      case 'article':
        score = 8;
        break;
      case 'blockquote':
        score = 6;
        break;
      case 'p':
        score = this.scoreParagraphBreak(element);
        break;
      case 'div':
        score = this.scoreDivBreak(element);
        break;
      case 'img':
      case 'figure':
        score = 2; // Poor break point - avoid breaking around images
        break;
      case 'table':
        score = 2; // Poor break point - avoid breaking tables
        break;
      case 'ul':
      case 'ol':
      case 'dl':
        score = 4; // Moderate break point
        break;
      default:
        score = 3; // Low priority for other elements
    }
    
    // Context-based adjustments
    score = this.adjustScoreForContext(score, element, context);
    
    // Semantic adjustments
    score = this.adjustScoreForSemantics(score, element);
    
    // Reading flow adjustments
    score = this.adjustScoreForReadingFlow(score, element);
    
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Find optimal break points using comprehensive analysis
   */
  findOptimalBreakPoints(
    content: string,
    structure: DocumentStructure,
    density: ContentDensityMetrics,
    context: AnalysisContext,
    options: SmartPageBreakOptions
  ): OptimalBreakPoint[] {
    const breakPoints: OptimalBreakPoint[] = [];
    
    // Calculate target break intervals based on density and preferences
    const targetWordsPerPage = this.calculateTargetWordsPerPage(density, context);
    const contentWords = content.split(/\s+/).filter(w => w.length > 0);
    const totalWords = contentWords.length;
    
    if (totalWords <= targetWordsPerPage) {
      // Content fits on one page
      return [];
    }
    
    // Generate break points from different sources
    const headingBreaks = this.generateHeadingBreakPoints(structure.headings, options);
    const paragraphBreaks = this.generateParagraphBreakPoints(structure.paragraphs, options);
    const sectionBreaks = this.generateSectionBreakPoints(structure.sections, options);
    const semanticBreaks = this.generateSemanticBreakPoints(structure.semanticBlocks, options);
    const visualBreaks = this.generateVisualBreakPoints(structure.specialContent, options);
    
    // Combine all potential break points
    const allCandidates = [
      ...headingBreaks,
      ...paragraphBreaks,
      ...sectionBreaks,
      ...semanticBreaks,
      ...visualBreaks
    ];
    
    // Sort by position
    allCandidates.sort((a, b) => a.position - b.position);
    
    // Select optimal break points using dynamic programming approach
    const selectedBreaks = this.selectOptimalBreaks(
      allCandidates,
      targetWordsPerPage,
      totalWords,
      content,
      structure,
      density
    );
    
    // Assess impact for each selected break point
    return selectedBreaks.map(bp => ({
      ...bp,
      impactAssessment: this.assessBreakImpact(bp, structure, density)
    }));
  }

  /**
   * Calculate quality score for a specific break position
   */
  calculateBreakQuality(
    position: number,
    contentBefore: string,
    contentAfter: string,
    structure: DocumentStructure
  ): number {
    let quality = 5; // Base quality
    
    // Analyze content before break
    const beforeAnalysis = this.analyzeContentSegment(contentBefore);
    const afterAnalysis = this.analyzeContentSegment(contentAfter);
    
    // Sentence boundary scoring
    if (beforeAnalysis.endsWithSentence) quality += 2;
    if (afterAnalysis.startsWithSentence) quality += 1;
    
    // Paragraph boundary scoring
    if (beforeAnalysis.endsWithParagraph) quality += 3;
    if (afterAnalysis.startsWithParagraph) quality += 2;
    
    // Avoid orphan/widow lines
    if (beforeAnalysis.wordCount < 10) quality -= 3; // Orphan
    if (afterAnalysis.wordCount < 10) quality -= 3; // Widow
    
    // Topic continuity
    const topicContinuity = this.calculateTopicContinuity(contentBefore, contentAfter);
    if (topicContinuity < 0.3) quality += 2; // Natural topic break
    else if (topicContinuity > 0.7) quality -= 2; // Interrupts topic
    
    // Structural context
    const structuralContext = this.getStructuralContext(position, structure);
    quality += structuralContext.qualityAdjustment;
    
    return Math.max(1, Math.min(10, quality));
  }

  /**
   * Assess the impact of a break point on reading experience
   */
  assessBreakImpact(
    breakPoint: OptimalBreakPoint,
    structure: DocumentStructure,
    density: ContentDensityMetrics
  ): OptimalBreakPoint['impactAssessment'] {
    const impact: OptimalBreakPoint['impactAssessment'] = {
      readingFlow: 'neutral',
      comprehension: 'neutral',
      accessibility: 'neutral'
    };
    
    // Reading flow assessment
    if (breakPoint.type === 'heading' || breakPoint.type === 'section') {
      impact.readingFlow = 'positive';
    } else if (breakPoint.quality >= 7) {
      impact.readingFlow = 'positive';
    } else if (breakPoint.quality <= 3) {
      impact.readingFlow = 'negative';
    }
    
    // Comprehension assessment
    if (breakPoint.type === 'heading') {
      impact.comprehension = 'positive'; // Headings help with navigation
    } else if (breakPoint.type === 'semantic') {
      impact.comprehension = 'positive'; // Semantic breaks maintain context
    } else if (breakPoint.quality <= 4) {
      impact.comprehension = 'negative'; // Poor breaks hurt comprehension
    }
    
    // Accessibility assessment
    if (breakPoint.type === 'heading' || breakPoint.type === 'section') {
      impact.accessibility = 'positive'; // Clear navigation landmarks
    }
    
    // Check for problematic breaks
    const problematicElements = this.findProblematicElements(breakPoint.position, structure);
    if (problematicElements.length > 0) {
      impact.readingFlow = 'negative';
      impact.comprehension = 'negative';
      impact.accessibility = 'negative';
    }
    
    return impact;
  }

  // Private helper methods

  private scoreParagraphBreak(element: Element): number {
    const text = element.textContent?.trim() || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let score = 5; // Base paragraph score
    
    // Length-based scoring
    if (words.length < 30) score += 1; // Short paragraphs break well
    else if (words.length > 100) score -= 1; // Long paragraphs break poorly
    
    // Content-based scoring
    if (text.endsWith('.') || text.endsWith('!') || text.endsWith('?')) {
      score += 1; // Good sentence ending
    }
    
    // Check for continuation indicators
    const nextSibling = element.nextElementSibling;
    if (nextSibling?.textContent) {
      const nextText = nextSibling.textContent.trim().toLowerCase();
      const continuationWords = ['however', 'therefore', 'moreover', 'furthermore'];
      if (continuationWords.some(word => nextText.startsWith(word))) {
        score -= 2; // Poor break before continuation
      }
    }
    
    return score;
  }

  private scoreDivBreak(element: Element): number {
    let score = 3; // Base div score
    
    // Check for semantic classes
    const className = element.className.toLowerCase();
    if (className.includes('chapter')) score += 4;
    else if (className.includes('section')) score += 3;
    else if (className.includes('break')) score += 2;
    else if (className.includes('separator')) score += 2;
    
    // Check for structural indicators
    if (element.querySelector('h1, h2, h3, h4, h5, h6')) {
      score += 2; // Contains heading
    }
    
    return score;
  }

  private adjustScoreForContext(score: number, element: Element, context: AnalysisContext): number {
    // User preference adjustments
    const prefs = context.userPreferences;
    if (prefs) {
      // Check avoid splitting preferences
      if (prefs.avoidSplitting?.includes('paragraphs') && element.tagName === 'P') {
        score -= 2;
      }
      if (prefs.avoidSplitting?.includes('sections') && ['SECTION', 'ARTICLE'].includes(element.tagName)) {
        score -= 2;
      }
      
      // Check prioritized elements
      if (prefs.prioritizeElements?.some(selector => element.matches(selector))) {
        score += 2;
      }
    }
    
    // Device context adjustments
    const deviceContext = context.deviceContext;
    if (deviceContext) {
      if (deviceContext.screenSize === 'small') {
        // On small screens, prefer more frequent breaks
        if (score >= 5) score += 1;
      }
      
      if (deviceContext.isTouch) {
        // Touch devices benefit from clear section breaks
        if (['H1', 'H2', 'SECTION'].includes(element.tagName)) {
          score += 1;
        }
      }
    }
    
    return score;
  }

  private adjustScoreForSemantics(score: number, element: Element): number {
    const text = element.textContent?.toLowerCase() || '';
    
    // Semantic indicators that improve break quality
    const goodBreakWords = ['chapter', 'section', 'part', 'conclusion', 'summary'];
    if (goodBreakWords.some(word => text.includes(word))) {
      score += 2;
    }
    
    // Semantic indicators that worsen break quality
    const poorBreakWords = ['continued', 'moreover', 'furthermore', 'however'];
    if (poorBreakWords.some(word => text.includes(word))) {
      score -= 1;
    }
    
    return score;
  }

  private adjustScoreForReadingFlow(score: number, element: Element): number {
    // Check reading flow context
    const prevSibling = element.previousElementSibling;
    const nextSibling = element.nextElementSibling;
    
    // Good flow patterns
    if (prevSibling?.tagName === 'P' && element.tagName.match(/^H[1-6]$/)) {
      score += 1; // Paragraph to heading is good flow
    }
    
    if (element.tagName === 'HR') {
      score += 2; // Horizontal rules indicate intentional breaks
    }
    
    // Poor flow patterns
    if (element.tagName === 'P' && nextSibling?.tagName === 'P') {
      // Breaking between related paragraphs
      const thisText = element.textContent?.trim() || '';
      const nextText = nextSibling.textContent?.trim() || '';
      
      if (this.areRelatedParagraphs(thisText, nextText)) {
        score -= 1;
      }
    }
    
    return score;
  }

  private areRelatedParagraphs(text1: string, text2: string): boolean {
    // Simple relatedness check based on shared words
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const sharedWords = words1.filter(w => words2.includes(w));
    const relatedness = sharedWords.length / Math.max(words1.length, words2.length);
    
    return relatedness > 0.3; // 30% word overlap indicates relatedness
  }

  private calculateTargetWordsPerPage(density: ContentDensityMetrics, context: AnalysisContext): number {
    let baseTarget = 300; // Default words per page
    
    // Adjust based on content complexity
    if (density.complexity === 'high') {
      baseTarget = 200; // Fewer words for complex content
    } else if (density.complexity === 'low') {
      baseTarget = 400; // More words for simple content
    }
    
    // Adjust for reading level
    if (context.readingLevel === 'beginner') {
      baseTarget *= 0.7;
    } else if (context.readingLevel === 'advanced') {
      baseTarget *= 1.2;
    }
    
    // Adjust for user preferences
    if (context.userPreferences?.preferredBreakLength) {
      baseTarget = context.userPreferences.preferredBreakLength;
    }
    
    // Adjust for device context
    if (context.deviceContext?.screenSize === 'small') {
      baseTarget *= 0.8; // Smaller pages on small screens
    } else if (context.deviceContext?.screenSize === 'large') {
      baseTarget *= 1.2; // Larger pages on large screens
    }
    
    return Math.max(100, Math.min(600, baseTarget));
  }

  private generateHeadingBreakPoints(headings: HeadingInfo[], options: SmartPageBreakOptions): OptimalBreakPoint[] {
    if (!options.respectHeadings) return [];
    
    return headings
      .filter(h => h.importance >= 6) // Only important headings
      .map(h => ({
        id: `heading-break-${h.id}`,
        position: h.position,
        type: 'heading' as const,
        quality: Math.min(10, h.breakPriority + h.importance * 0.3),
        reasoning: `Level ${h.level} heading: "${h.text.substring(0, 50)}..."`,
        impactAssessment: {
          readingFlow: 'positive' as const,
          comprehension: 'positive' as const,
          accessibility: 'positive' as const
        }
      }));
  }

  private generateParagraphBreakPoints(paragraphs: ParagraphInfo[], options: SmartPageBreakOptions): OptimalBreakPoint[] {
    if (!options.respectParagraphs) return [];
    
    return paragraphs
      .filter(p => p.breakQuality >= 6) // Only good paragraph breaks
      .map(p => ({
        id: `paragraph-break-${p.id}`,
        position: p.position + p.characterCount, // Break after paragraph
        type: 'paragraph' as const,
        quality: p.breakQuality,
        reasoning: `End of ${p.wordCount}-word paragraph with ${p.readingDifficulty} difficulty`,
        impactAssessment: {
          readingFlow: 'neutral' as const,
          comprehension: 'neutral' as const,
          accessibility: 'neutral' as const
        }
      }));
  }

  private generateSectionBreakPoints(sections: SectionInfo[], options: SmartPageBreakOptions): OptimalBreakPoint[] {
    return sections
      .filter(s => s.breakPriority >= 7 || s.isChapterBoundary)
      .map(s => ({
        id: `section-break-${s.id}`,
        position: s.position,
        type: 'section' as const,
        quality: Math.min(10, s.breakPriority + (s.isChapterBoundary ? 2 : 0)),
        reasoning: `${s.isChapterBoundary ? 'Chapter' : 'Section'} boundary: "${s.title}"`,
        impactAssessment: {
          readingFlow: 'positive' as const,
          comprehension: 'positive' as const,
          accessibility: 'positive' as const
        }
      }));
  }

  private generateSemanticBreakPoints(blocks: any[], options: SmartPageBreakOptions): OptimalBreakPoint[] {
    const breakPoints = [];
    
    // Look for transitions between different semantic block types
    for (let i = 0; i < blocks.length - 1; i++) {
      const current = blocks[i];
      const next = blocks[i + 1];
      
      if (current.type !== next.type && current.confidence === 'high' && next.confidence === 'high') {
        breakPoints.push({
          id: `semantic-break-${i}`,
          position: current.endPosition,
          type: 'semantic' as const,
          quality: 7,
          reasoning: `Transition from ${current.type} to ${next.type} block`,
          impactAssessment: {
            readingFlow: 'positive' as const,
            comprehension: 'positive' as const,
            accessibility: 'neutral' as const
          }
        });
      }
    }
    
    return breakPoints;
  }

  private generateVisualBreakPoints(specialContent: SpecialContentInfo[], options: SmartPageBreakOptions): OptimalBreakPoint[] {
    const breakPoints: OptimalBreakPoint[] = [];
    
    specialContent.forEach(content => {
      // Add break points before significant visual elements
      if (content.semanticImportance >= 7 && content.breakImpact === 'high') {
        breakPoints.push({
          id: `visual-break-before-${content.id}`,
          position: Math.max(0, content.position - 10), // Slightly before the element
          type: 'visual' as const,
          quality: 6,
          reasoning: `Before important ${content.type}: ${content.contentType}`,
          impactAssessment: {
            readingFlow: 'neutral' as const,
            comprehension: 'neutral' as const,
            accessibility: 'positive' as const
          }
        });
      }
    });
    
    return breakPoints;
  }

  private selectOptimalBreaks(
    candidates: OptimalBreakPoint[],
    targetWordsPerPage: number,
    totalWords: number,
    content: string,
    structure: DocumentStructure,
    density: ContentDensityMetrics
  ): OptimalBreakPoint[] {
    const selected: OptimalBreakPoint[] = [];
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    let currentWordIndex = 0;
    let targetWordIndex = targetWordsPerPage;
    
    while (targetWordIndex < totalWords) {
      // Find candidates near the target position
      const targetCharPosition = this.wordIndexToCharPosition(targetWordIndex, content);
      const nearbyBreaks = candidates.filter(bp => 
        Math.abs(bp.position - targetCharPosition) < targetWordsPerPage * 6 // Approximately 6 chars per word
      );
      
      if (nearbyBreaks.length === 0) {
        // No good breaks nearby, look for any break within extended range
        const extendedBreaks = candidates.filter(bp =>
          bp.position > this.wordIndexToCharPosition(currentWordIndex, content) &&
          bp.position < this.wordIndexToCharPosition(Math.min(targetWordIndex + targetWordsPerPage * 0.5, totalWords), content)
        );
        
        if (extendedBreaks.length > 0) {
          // Select the best quality break
          const bestBreak = extendedBreaks.reduce((best, current) => 
            current.quality > best.quality ? current : best
          );
          selected.push(bestBreak);
          currentWordIndex = this.charPositionToWordIndex(bestBreak.position, content);
        } else {
          // Force a break at target position
          selected.push({
            id: `forced-break-${selected.length}`,
            position: targetCharPosition,
            type: 'paragraph',
            quality: 3,
            reasoning: 'Forced break due to page length constraints',
            impactAssessment: {
              readingFlow: 'negative' as const,
              comprehension: 'negative' as const,
              accessibility: 'neutral' as const
            }
          });
          currentWordIndex = targetWordIndex;
        }
      } else {
        // Score nearby breaks considering position proximity
        const scoredBreaks = nearbyBreaks.map(bp => {
          const distanceFromTarget = Math.abs(bp.position - targetCharPosition);
          const proximityScore = Math.max(0, 1 - (distanceFromTarget / (targetWordsPerPage * 3)));
          const combinedScore = bp.quality * 0.7 + proximityScore * 10 * 0.3;
          
          return { breakPoint: bp, score: combinedScore };
        });
        
        // Select the best scoring break
        const bestScoredBreak = scoredBreaks.reduce((best, current) =>
          current.score > best.score ? current : best
        );
        
        selected.push(bestScoredBreak.breakPoint);
        currentWordIndex = this.charPositionToWordIndex(bestScoredBreak.breakPoint.position, content);
      }
      
      targetWordIndex = currentWordIndex + targetWordsPerPage;
    }
    
    return selected;
  }

  private wordIndexToCharPosition(wordIndex: number, content: string): number {
    const words = content.split(/\s+/);
    let charPosition = 0;
    
    for (let i = 0; i < Math.min(wordIndex, words.length); i++) {
      charPosition += words[i].length + 1; // +1 for space
    }
    
    return Math.max(0, charPosition - 1); // -1 to account for final space
  }

  private charPositionToWordIndex(charPosition: number, content: string): number {
    const wordsBeforePosition = content.substring(0, charPosition).split(/\s+/).filter(w => w.length > 0);
    return wordsBeforePosition.length;
  }

  private analyzeContentSegment(content: string) {
    const trimmed = content.trim();
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    
    return {
      wordCount: words.length,
      endsWithSentence: /[.!?]$/.test(trimmed),
      startsWithSentence: /^[A-Z]/.test(trimmed),
      endsWithParagraph: /\n\s*$/.test(content),
      startsWithParagraph: /^\s*[A-Z]/.test(content)
    };
  }

  private calculateTopicContinuity(contentBefore: string, contentAfter: string): number {
    // Simple topic continuity based on word overlap
    const wordsBefore = contentBefore.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const wordsAfter = contentAfter.toLowerCase().split(/\s+/).slice(0, 50).filter(w => w.length > 3); // First 50 words after
    
    if (wordsBefore.length === 0 || wordsAfter.length === 0) return 0;
    
    const sharedWords = wordsBefore.filter(w => wordsAfter.includes(w));
    return sharedWords.length / Math.min(wordsBefore.length, wordsAfter.length);
  }

  private getStructuralContext(position: number, structure: DocumentStructure) {
    let qualityAdjustment = 0;
    
    // Check if position is near headings
    const nearbyHeading = structure.headings.find(h => 
      Math.abs(h.position - position) < 100
    );
    if (nearbyHeading) {
      qualityAdjustment += nearbyHeading.importance * 0.3;
    }
    
    // Check if position is in special content
    const inSpecialContent = structure.specialContent.find(sc =>
      position >= sc.position && position <= sc.position + 200 // Approximate element length
    );
    if (inSpecialContent && inSpecialContent.breakImpact === 'high') {
      qualityAdjustment -= 3; // Penalize breaks in special content
    }
    
    return { qualityAdjustment };
  }

  private findProblematicElements(position: number, structure: DocumentStructure): SpecialContentInfo[] {
    // Find elements that should not be broken
    return structure.specialContent.filter(element => {
      const elementStart = element.position;
      const elementEnd = element.position + 500; // Approximate element size
      
      // Check if break position intersects with element
      return position > elementStart && position < elementEnd && 
             element.breakImpact === 'high';
    });
  }
}

// Export singleton instance
export const breakPointScorer = new BreakPointScorerImpl();

// Export class for testing
export { BreakPointScorerImpl };