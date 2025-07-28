'use client';

import { 
  ContentDensityMetrics, 
  AnalysisContext, 
  ReadingSettings,
  DocumentStructure 
} from './types';

export interface ContentDensityAnalyzer {
  calculateContentDensity(content: string): ContentDensityMetrics;
  analyzeReadingVelocity(density: ContentDensityMetrics, context: AnalysisContext): number;
  calculateCognitiveLoad(content: string, structure?: DocumentStructure): number;
  optimizeForReadingFlow(density: ContentDensityMetrics, settings: ReadingSettings): ReadingFlowOptimizations;
  detectContentPatterns(content: string): ContentPatterns;
  assessReadabilityFactors(content: string): ReadabilityAssessment;
}

export interface ReadingFlowOptimizations {
  recommendedFontSize: number;
  recommendedLineHeight: number;
  recommendedWordsPerPage: number;
  recommendedReadingSpeed: number; // Words per minute
  breakFrequencyAdjustment: number; // Multiplier for break frequency
  focusModeRecommended: boolean;
  pauseRecommendations: PauseRecommendation[];
}

export interface PauseRecommendation {
  position: number;
  type: 'micro' | 'short' | 'medium' | 'long';
  reason: string;
  duration: number; // Seconds
}

export interface ContentPatterns {
  dialogueSegments: ContentSegment[];
  narrativeSegments: ContentSegment[];
  descriptiveSegments: ContentSegment[];
  technicalSegments: ContentSegment[];
  transitionPoints: TransitionPoint[];
  intensityMap: IntensityPoint[];
}

export interface ContentSegment {
  startPosition: number;
  endPosition: number;
  type: 'dialogue' | 'narrative' | 'descriptive' | 'technical' | 'expository';
  intensity: number; // 1-10 reading intensity
  complexity: 'low' | 'medium' | 'high';
  recommendedPace: 'slow' | 'normal' | 'fast';
}

export interface TransitionPoint {
  position: number;
  fromType: string;
  toType: string;
  abruptness: number; // 1-10, higher = more abrupt
  recommendedPause: number; // Milliseconds
}

export interface IntensityPoint {
  position: number;
  intensity: number; // 1-10 reading intensity
  factors: string[]; // What contributes to this intensity
}

export interface ReadabilityAssessment {
  fleschScore: number; // 0-100 Flesch Reading Ease
  fleschKincaidLevel: number; // Grade level
  averageSentenceLength: number;
  averageWordLength: number;
  syllableComplexity: number;
  passiveVoiceRatio: number;
  readingTimeEstimate: number; // Minutes
  difficultyFactors: DifficultyFactor[];
}

export interface DifficultyFactor {
  type: 'vocabulary' | 'syntax' | 'concept' | 'structure' | 'density';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // 1-10 impact on reading difficulty
}

class ContentDensityAnalyzerImpl implements ContentDensityAnalyzer {
  
  /**
   * Calculate comprehensive content density metrics
   */
  calculateContentDensity(content: string): ContentDensityMetrics {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Basic text analysis
    const textContent = tempDiv.textContent || '';
    const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = Array.from(tempDiv.querySelectorAll('p')).filter(p => p.textContent?.trim().length);
    
    // Visual elements analysis
    const images = tempDiv.querySelectorAll('img, figure');
    const tables = tempDiv.querySelectorAll('table');
    const lists = tempDiv.querySelectorAll('ul, ol');
    const codeBlocks = tempDiv.querySelectorAll('pre, code');
    const quotes = tempDiv.querySelectorAll('blockquote');
    
    // Calculate basic metrics
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const paragraphCount = paragraphs.length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const avgSentencesPerParagraph = paragraphCount > 0 ? sentenceCount / paragraphCount : 0;
    const avgWordsPerParagraph = paragraphCount > 0 ? wordCount / paragraphCount : 0;
    
    // Advanced content analysis
    const technicalContent = this.analyzeTechnicalContent(textContent);
    const dialogueContent = this.analyzeDialogueContent(tempDiv);
    const narrativeFlow = this.analyzeNarrativeFlow(textContent);
    
    // Complexity assessment
    const complexity = this.assessContentComplexity(
      avgWordsPerSentence,
      avgWordsPerParagraph,
      technicalContent.ratio,
      images.length + tables.length
    );
    
    // Reading velocity calculation
    const estimatedReadingVelocity = this.calculateBaseReadingVelocity(
      complexity,
      technicalContent.ratio,
      dialogueContent.ratio,
      narrativeFlow.score
    );
    
    // Cognitive load assessment
    const cognitiveLoadScore = this.calculateBaseCognitiveLoad(
      avgWordsPerSentence,
      technicalContent.ratio,
      images.length + tables.length,
      complexity
    );
    
    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      avgWordsPerSentence,
      avgSentencesPerParagraph,
      avgWordsPerParagraph,
      visualElementCount: images.length + tables.length,
      imageCount: images.length,
      tableCount: tables.length,
      listCount: lists.length,
      codeBlockCount: codeBlocks.length,
      quoteCount: quotes.length,
      complexity,
      technicalContentRatio: technicalContent.ratio,
      dialogueRatio: dialogueContent.ratio,
      narrativeFlowScore: narrativeFlow.score,
      estimatedReadingVelocity,
      cognitiveLoadScore,
      lastAnalyzed: Date.now()
    };
  }

  /**
   * Analyze reading velocity based on content characteristics
   */
  analyzeReadingVelocity(density: ContentDensityMetrics, context: AnalysisContext): number {
    let baseVelocity = density.estimatedReadingVelocity;
    
    // Adjust for reading level
    if (context.readingLevel === 'beginner') {
      baseVelocity *= 0.7;
    } else if (context.readingLevel === 'advanced') {
      baseVelocity *= 1.2;
    }
    
    // Adjust for genre if available
    if (context.genre) {
      switch (context.genre) {
        case 'fiction':
          baseVelocity *= 1.1; // Fiction typically reads faster
          break;
        case 'technical':
          baseVelocity *= 0.6; // Technical content reads slower
          break;
        case 'academic':
          baseVelocity *= 0.7; // Academic content reads slower
          break;
        case 'poetry':
          baseVelocity *= 0.5; // Poetry reads much slower
          break;
      }
    }
    
    // Adjust for device context
    if (context.deviceContext) {
      if (context.deviceContext.screenSize === 'small') {
        baseVelocity *= 0.9; // Slower on small screens
      }
      
      if (context.deviceContext.isTouch) {
        baseVelocity *= 0.95; // Slightly slower on touch devices
      }
    }
    
    // Cognitive load adjustment
    const cognitiveLoadFactor = 1 - (density.cognitiveLoadScore / 20); // Reduce velocity as load increases
    baseVelocity *= Math.max(0.5, cognitiveLoadFactor);
    
    return Math.max(100, Math.min(400, baseVelocity));
  }

  /**
   * Calculate cognitive load based on content analysis
   */
  calculateCognitiveLoad(content: string, structure?: DocumentStructure): number {
    const textContent = content.replace(/<[^>]*>/g, ' ').trim();
    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let load = 0;
    
    // Sentence complexity
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    if (avgWordsPerSentence > 25) load += 3;
    else if (avgWordsPerSentence > 20) load += 2;
    else if (avgWordsPerSentence > 15) load += 1;
    
    // Vocabulary complexity
    const longWords = words.filter(w => w.length > 6).length;
    const longWordRatio = longWords / words.length;
    load += longWordRatio * 10;
    
    // Technical content
    const technicalPatterns = [
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\d+\.\d+\b/g, // Decimal numbers
      /\b[a-z]+\([^)]*\)/g, // Function calls
      /\b[A-Z][a-z]*[A-Z]/g, // CamelCase
    ];
    
    let technicalMatches = 0;
    technicalPatterns.forEach(pattern => {
      const matches = textContent.match(pattern);
      if (matches) technicalMatches += matches.length;
    });
    
    const technicalRatio = technicalMatches / words.length;
    load += technicalRatio * 15;
    
    // Visual complexity (if structure provided)
    if (structure) {
      const visualElementRatio = structure.specialContent.length / Math.max(structure.paragraphs.length, 1);
      load += visualElementRatio * 5;
      
      // Structural complexity
      const headingDepthVariance = this.calculateHeadingDepthVariance(structure.headings);
      load += headingDepthVariance;
    }
    
    // Sentence structure complexity
    const complexSentencePatterns = [
      /\b(although|because|since|while|whereas|if|unless|until)\b/gi,
      /\b(however|therefore|nevertheless|furthermore|moreover)\b/gi,
      /[;:]/g
    ];
    
    let complexStructures = 0;
    complexSentencePatterns.forEach(pattern => {
      const matches = textContent.match(pattern);
      if (matches) complexStructures += matches.length;
    });
    
    load += (complexStructures / sentences.length) * 10;
    
    return Math.max(0, Math.min(10, load));
  }

  /**
   * Generate reading flow optimizations
   */
  optimizeForReadingFlow(density: ContentDensityMetrics, settings: ReadingSettings): ReadingFlowOptimizations {
    const baseSize = settings.fontSize;
    const baseLineHeight = settings.lineHeight;
    
    // Font size optimization
    let recommendedFontSize = baseSize;
    if (density.complexity === 'high') {
      recommendedFontSize = Math.min(baseSize * 1.1, baseSize + 2);
    } else if (density.complexity === 'low') {
      recommendedFontSize = Math.max(baseSize * 0.95, baseSize - 1);
    }
    
    // Line height optimization
    let recommendedLineHeight = baseLineHeight;
    if (density.avgWordsPerSentence > 20) {
      recommendedLineHeight = Math.min(baseLineHeight * 1.15, 2.0);
    }
    
    // Words per page optimization
    let recommendedWordsPerPage = 300; // Base recommendation
    if (density.complexity === 'high') {
      recommendedWordsPerPage = 200;
    } else if (density.technicalContentRatio > 0.3) {
      recommendedWordsPerPage = 250;
    } else if (density.dialogueRatio > 0.5) {
      recommendedWordsPerPage = 350; // Dialogue reads faster
    }
    
    // Reading speed optimization
    const recommendedReadingSpeed = this.optimizeReadingSpeed(density);
    
    // Break frequency optimization
    let breakFrequencyAdjustment = 1.0;
    if (density.cognitiveLoadScore > 7) {
      breakFrequencyAdjustment = 1.3; // More frequent breaks
    } else if (density.cognitiveLoadScore < 4) {
      breakFrequencyAdjustment = 0.8; // Less frequent breaks
    }
    
    // Focus mode recommendation
    const focusModeRecommended = density.complexity === 'high' || 
                                 density.cognitiveLoadScore > 6 ||
                                 density.technicalContentRatio > 0.25;
    
    // Generate pause recommendations
    const pauseRecommendations = this.generatePauseRecommendations(density);
    
    return {
      recommendedFontSize,
      recommendedLineHeight,
      recommendedWordsPerPage,
      recommendedReadingSpeed,
      breakFrequencyAdjustment,
      focusModeRecommended,
      pauseRecommendations
    };
  }

  /**
   * Detect content patterns for adaptive reading
   */
  detectContentPatterns(content: string): ContentPatterns {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const dialogueSegments = this.detectDialogueSegments(tempDiv);
    const narrativeSegments = this.detectNarrativeSegments(tempDiv);
    const descriptiveSegments = this.detectDescriptiveSegments(tempDiv);
    const technicalSegments = this.detectTechnicalSegments(tempDiv);
    const transitionPoints = this.detectTransitionPoints(tempDiv);
    const intensityMap = this.generateIntensityMap(tempDiv);
    
    return {
      dialogueSegments,
      narrativeSegments,
      descriptiveSegments,
      technicalSegments,
      transitionPoints,
      intensityMap
    };
  }

  /**
   * Assess readability using multiple metrics
   */
  assessReadabilityFactors(content: string): ReadabilityAssessment {
    const textContent = content.replace(/<[^>]*>/g, ' ').trim();
    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = this.countTotalSyllables(words);
    
    // Basic metrics
    const averageSentenceLength = words.length / Math.max(sentences.length, 1);
    const averageWordLength = words.reduce((acc, word) => acc + word.length, 0) / words.length;
    const syllableComplexity = syllables / words.length;
    
    // Flesch Reading Ease Score
    const fleschScore = 206.835 - (1.015 * averageSentenceLength) - (84.6 * syllableComplexity);
    
    // Flesch-Kincaid Grade Level
    const fleschKincaidLevel = (0.39 * averageSentenceLength) + (11.8 * syllableComplexity) - 15.59;
    
    // Passive voice analysis
    const passiveVoiceRatio = this.calculatePassiveVoiceRatio(textContent);
    
    // Reading time estimate (based on average reading speed)
    const readingTimeEstimate = words.length / 250; // 250 WPM average
    
    // Difficulty factors
    const difficultyFactors = this.identifyDifficultyFactors(
      textContent,
      averageSentenceLength,
      averageWordLength,
      syllableComplexity,
      passiveVoiceRatio
    );
    
    return {
      fleschScore: Math.max(0, Math.min(100, fleschScore)),
      fleschKincaidLevel: Math.max(0, fleschKincaidLevel),
      averageSentenceLength,
      averageWordLength,
      syllableComplexity,
      passiveVoiceRatio,
      readingTimeEstimate,
      difficultyFactors
    };
  }

  // Private helper methods

  private analyzeTechnicalContent(text: string) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const technicalPatterns = [
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\d+\.\d+\b/g, // Numbers with decimals
      /\b[a-z]+\([^)]*\)/g, // Function calls
      /\b[A-Z][a-z]*[A-Z]/g, // CamelCase
      /\b\w+\.\w+\b/g, // Dotted notation
      /\b(API|URL|HTTP|HTML|CSS|JSON|XML|SQL)\b/gi, // Technical acronyms
    ];
    
    let technicalMatches = 0;
    technicalPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) technicalMatches += matches.length;
    });
    
    return {
      count: technicalMatches,
      ratio: words.length > 0 ? technicalMatches / words.length : 0
    };
  }

  private analyzeDialogueContent(container: Element) {
    const text = container.textContent || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    // Count quoted text
    const quotedText = text.match(/"[^"]*"/g) || [];
    const singleQuotedText = text.match(/'[^']*'/g) || [];
    const smartQuotedText = text.match(/[""][^""]*[""]/g) || [];
    
    // Count dialogue indicators
    const dialogueIndicators = text.match(/\b(said|asked|replied|answered|whispered|shouted|exclaimed|murmured|declared)\b/gi) || [];
    
    const totalDialogueWords = [
      ...quotedText,
      ...singleQuotedText,
      ...smartQuotedText
    ].join(' ').split(/\s+/).filter(w => w.length > 0).length;
    
    return {
      count: quotedText.length + singleQuotedText.length + smartQuotedText.length + dialogueIndicators.length,
      ratio: words.length > 0 ? totalDialogueWords / words.length : 0
    };
  }

  private analyzeNarrativeFlow(text: string) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const transitionWords = [
      'then', 'next', 'after', 'before', 'while', 'during', 'meanwhile',
      'suddenly', 'immediately', 'later', 'earlier', 'finally', 'first'
    ];
    
    let transitionCount = 0;
    const temporalMarkers: string[] = [];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      transitionWords.forEach(word => {
        if (lowerSentence.includes(word)) {
          transitionCount++;
          temporalMarkers.push(word);
        }
      });
    });
    
    const score = sentences.length > 0 ? (transitionCount / sentences.length) * 10 : 0;
    
    return {
      score: Math.min(10, score),
      transitionCount,
      temporalMarkers,
      sentenceCount: sentences.length
    };
  }

  private assessContentComplexity(
    avgWordsPerSentence: number,
    avgWordsPerParagraph: number,
    technicalRatio: number,
    visualElementCount: number
  ): 'low' | 'medium' | 'high' {
    let complexityScore = 0;
    
    // Sentence length complexity
    if (avgWordsPerSentence > 20) complexityScore += 2;
    else if (avgWordsPerSentence > 15) complexityScore += 1;
    
    // Paragraph length complexity
    if (avgWordsPerParagraph > 100) complexityScore += 2;
    else if (avgWordsPerParagraph > 75) complexityScore += 1;
    
    // Technical content complexity
    if (technicalRatio > 0.3) complexityScore += 3;
    else if (technicalRatio > 0.15) complexityScore += 2;
    else if (technicalRatio > 0.05) complexityScore += 1;
    
    // Visual element complexity
    if (visualElementCount > 10) complexityScore += 1;
    
    if (complexityScore >= 5) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  private calculateBaseReadingVelocity(
    complexity: 'low' | 'medium' | 'high',
    technicalRatio: number,
    dialogueRatio: number,
    narrativeFlowScore: number
  ): number {
    let baseVelocity = 250; // Average words per minute
    
    // Complexity adjustment
    if (complexity === 'high') baseVelocity *= 0.7;
    else if (complexity === 'medium') baseVelocity *= 0.85;
    else baseVelocity *= 1.1;
    
    // Technical content adjustment
    baseVelocity *= (1 - technicalRatio * 0.6);
    
    // Dialogue adjustment (dialogue typically reads faster)
    baseVelocity *= (1 + dialogueRatio * 0.3);
    
    // Narrative flow adjustment
    baseVelocity *= (1 + (narrativeFlowScore / 10) * 0.2);
    
    return Math.max(150, Math.min(350, baseVelocity));
  }

  private calculateBaseCognitiveLoad(
    avgWordsPerSentence: number,
    technicalRatio: number,
    visualElementCount: number,
    complexity: 'low' | 'medium' | 'high'
  ): number {
    let load = 0;
    
    // Base complexity load
    if (complexity === 'high') load += 4;
    else if (complexity === 'medium') load += 2;
    
    // Sentence complexity load
    if (avgWordsPerSentence > 25) load += 3;
    else if (avgWordsPerSentence > 20) load += 2;
    else if (avgWordsPerSentence > 15) load += 1;
    
    // Technical content load
    load += technicalRatio * 8;
    
    // Visual element load
    load += Math.min(2, visualElementCount * 0.1);
    
    return Math.max(0, Math.min(10, load));
  }

  private calculateHeadingDepthVariance(headings: any[]): number {
    if (headings.length === 0) return 0;
    
    const levels = headings.map(h => h.level);
    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
    const variance = levels.reduce((acc, level) => acc + Math.pow(level - avgLevel, 2), 0) / levels.length;
    
    return Math.min(2, variance / 2); // Normalize to 0-2 range
  }

  private optimizeReadingSpeed(density: ContentDensityMetrics): number {
    let speed = density.estimatedReadingVelocity;
    
    // Adjust for cognitive load
    if (density.cognitiveLoadScore > 7) {
      speed *= 0.8; // Slow down for high cognitive load
    } else if (density.cognitiveLoadScore < 4) {
      speed *= 1.1; // Speed up for low cognitive load
    }
    
    // Adjust for content type ratios
    if (density.dialogueRatio > 0.5) {
      speed *= 1.15; // Dialogue reads faster
    }
    
    if (density.technicalContentRatio > 0.3) {
      speed *= 0.7; // Technical content reads slower
    }
    
    return Math.max(100, Math.min(400, speed));
  }

  private generatePauseRecommendations(density: ContentDensityMetrics): PauseRecommendation[] {
    const recommendations: PauseRecommendation[] = [];
    
    // High cognitive load sections need more pauses
    if (density.cognitiveLoadScore > 7) {
      recommendations.push({
        position: 0,
        type: 'medium',
        reason: 'High cognitive load content detected',
        duration: 3
      });
    }
    
    // Complex content needs micro-pauses
    if (density.complexity === 'high') {
      recommendations.push({
        position: 0,
        type: 'micro',
        reason: 'Complex sentence structure',
        duration: 1
      });
    }
    
    // Technical content needs longer pauses
    if (density.technicalContentRatio > 0.3) {
      recommendations.push({
        position: 0,
        type: 'short',
        reason: 'Technical content requires processing time',
        duration: 2
      });
    }
    
    return recommendations;
  }

  // Content pattern detection methods

  private detectDialogueSegments(container: Element): ContentSegment[] {
    const segments: ContentSegment[] = [];
    const paragraphs = Array.from(container.querySelectorAll('p'));
    
    paragraphs.forEach((p, index) => {
      const text = p.textContent || '';
      const hasDialogue = /["'""'']/g.test(text);
      const hasSpeechVerb = /\b(said|asked|replied|answered|whispered|shouted)\b/i.test(text);
      
      if (hasDialogue || hasSpeechVerb) {
        const position = this.getElementCharacterPosition(p, container);
        segments.push({
          startPosition: position,
          endPosition: position + text.length,
          type: 'dialogue',
          intensity: hasDialogue && hasSpeechVerb ? 7 : 5,
          complexity: 'low',
          recommendedPace: 'fast'
        });
      }
    });
    
    return segments;
  }

  private detectNarrativeSegments(container: Element): ContentSegment[] {
    const segments: ContentSegment[] = [];
    const paragraphs = Array.from(container.querySelectorAll('p'));
    
    paragraphs.forEach((p, index) => {
      const text = p.textContent || '';
      const narrativeWords = text.match(/\b(then|next|after|before|while|when|suddenly)\b/gi) || [];
      const pastTenseVerbs = text.match(/\b\w+ed\b/g) || [];
      
      if (narrativeWords.length > 0 || pastTenseVerbs.length > text.split(/\s+/).length * 0.3) {
        const position = this.getElementCharacterPosition(p, container);
        const intensity = Math.min(8, 4 + narrativeWords.length);
        
        segments.push({
          startPosition: position,
          endPosition: position + text.length,
          type: 'narrative',
          intensity,
          complexity: intensity > 6 ? 'medium' : 'low',
          recommendedPace: 'normal'
        });
      }
    });
    
    return segments;
  }

  private detectDescriptiveSegments(container: Element): ContentSegment[] {
    const segments: ContentSegment[] = [];
    const paragraphs = Array.from(container.querySelectorAll('p'));
    
    paragraphs.forEach((p, index) => {
      const text = p.textContent || '';
      const adjectives = text.match(/\b\w+ly\b|\b\w+ing\b/g) || [];
      const sensoryWords = text.match(/\b(see|hear|feel|smell|taste|look|sound)\b/gi) || [];
      
      const descriptiveRatio = (adjectives.length + sensoryWords.length * 2) / text.split(/\s+/).length;
      
      if (descriptiveRatio > 0.15) {
        const position = this.getElementCharacterPosition(p, container);
        const intensity = Math.min(9, 3 + Math.floor(descriptiveRatio * 20));
        
        segments.push({
          startPosition: position,
          endPosition: position + text.length,
          type: 'descriptive',
          intensity,
          complexity: descriptiveRatio > 0.25 ? 'high' : 'medium',
          recommendedPace: 'slow'
        });
      }
    });
    
    return segments;
  }

  private detectTechnicalSegments(container: Element): ContentSegment[] {
    const segments: ContentSegment[] = [];
    const paragraphs = Array.from(container.querySelectorAll('p'));
    
    paragraphs.forEach((p, index) => {
      const text = p.textContent || '';
      const technicalTerms = text.match(/\b[A-Z]{2,}\b|\b\w+\(\w*\)|\b\d+\.\d+\b/g) || [];
      const technicalRatio = technicalTerms.length / text.split(/\s+/).length;
      
      if (technicalRatio > 0.1) {
        const position = this.getElementCharacterPosition(p, container);
        const intensity = Math.min(10, 5 + Math.floor(technicalRatio * 30));
        
        segments.push({
          startPosition: position,
          endPosition: position + text.length,
          type: 'technical',
          intensity,
          complexity: technicalRatio > 0.25 ? 'high' : 'medium',
          recommendedPace: 'slow'
        });
      }
    });
    
    return segments;
  }

  private detectTransitionPoints(container: Element): TransitionPoint[] {
    const points: TransitionPoint[] = [];
    const paragraphs = Array.from(container.querySelectorAll('p'));
    
    for (let i = 0; i < paragraphs.length - 1; i++) {
      const current = paragraphs[i];
      const next = paragraphs[i + 1];
      
      const currentType = this.classifyParagraphType(current.textContent || '');
      const nextType = this.classifyParagraphType(next.textContent || '');
      
      if (currentType !== nextType) {
        const position = this.getElementCharacterPosition(next, container);
        const abruptness = this.calculateTransitionAbruptness(currentType, nextType);
        
        points.push({
          position,
          fromType: currentType,
          toType: nextType,
          abruptness,
          recommendedPause: abruptness * 200 // 200ms per abruptness point
        });
      }
    }
    
    return points;
  }

  private generateIntensityMap(container: Element): IntensityPoint[] {
    const points: IntensityPoint[] = [];
    const paragraphs = Array.from(container.querySelectorAll('p'));
    
    paragraphs.forEach((p, index) => {
      const text = p.textContent || '';
      const position = this.getElementCharacterPosition(p, container);
      
      // Calculate intensity based on various factors
      let intensity = 5; // Base intensity
      const factors: string[] = [];
      
      // Sentence complexity
      const avgWordsPerSentence = this.calculateAvgWordsPerSentence(text);
      if (avgWordsPerSentence > 20) {
        intensity += 2;
        factors.push('Complex sentences');
      }
      
      // Technical content
      const technicalRatio = this.calculateTechnicalRatio(text);
      if (technicalRatio > 0.2) {
        intensity += 3;
        factors.push('Technical content');
      }
      
      // Emotional intensity
      const emotionalWords = text.match(/\b(intense|dramatic|shocking|amazing|terrible|wonderful)\b/gi);
      if (emotionalWords && emotionalWords.length > 0) {
        intensity += 2;
        factors.push('Emotional content');
      }
      
      // Dialogue
      const hasDialogue = /["'""'']/g.test(text);
      if (hasDialogue) {
        intensity -= 1; // Dialogue is typically easier
        factors.push('Dialogue');
      }
      
      points.push({
        position,
        intensity: Math.max(1, Math.min(10, intensity)),
        factors
      });
    });
    
    return points;
  }

  // Readability assessment helpers

  private countTotalSyllables(words: string[]): number {
    return words.reduce((total, word) => total + this.countSyllables(word), 0);
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let syllableCount = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        syllableCount++;
      }
      previousWasVowel = isVowel;
    }
    
    // Handle silent 'e'
    if (word.endsWith('e')) {
      syllableCount--;
    }
    
    // Handle 'le' endings
    if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) {
      syllableCount++;
    }
    
    return Math.max(1, syllableCount);
  }

  private calculatePassiveVoiceRatio(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    const passivePatterns = [
      /\b(am|is|are|was|were|being|been)\s+\w+ed\b/gi,
      /\b(am|is|are|was|were|being|been)\s+\w+en\b/gi
    ];
    
    let passiveCount = 0;
    sentences.forEach(sentence => {
      passivePatterns.forEach(pattern => {
        if (pattern.test(sentence)) {
          passiveCount++;
        }
      });
    });
    
    return passiveCount / sentences.length;
  }

  private identifyDifficultyFactors(
    text: string,
    avgSentenceLength: number,
    avgWordLength: number,
    syllableComplexity: number,
    passiveVoiceRatio: number
  ): DifficultyFactor[] {
    const factors: DifficultyFactor[] = [];
    
    // Vocabulary complexity
    if (avgWordLength > 5.5) {
      factors.push({
        type: 'vocabulary',
        severity: avgWordLength > 6.5 ? 'high' : 'medium',
        description: 'Long words increase reading difficulty',
        impact: Math.min(10, Math.floor(avgWordLength))
      });
    }
    
    // Sentence complexity
    if (avgSentenceLength > 20) {
      factors.push({
        type: 'syntax',
        severity: avgSentenceLength > 25 ? 'high' : 'medium',
        description: 'Long sentences require more working memory',
        impact: Math.min(10, Math.floor(avgSentenceLength / 3))
      });
    }
    
    // Syllable complexity
    if (syllableComplexity > 1.7) {
      factors.push({
        type: 'vocabulary',
        severity: syllableComplexity > 2.0 ? 'high' : 'medium',
        description: 'Multi-syllabic words slow reading speed',
        impact: Math.min(10, Math.floor(syllableComplexity * 4))
      });
    }
    
    // Passive voice
    if (passiveVoiceRatio > 0.3) {
      factors.push({
        type: 'syntax',
        severity: passiveVoiceRatio > 0.5 ? 'high' : 'medium',
        description: 'Passive voice reduces clarity',
        impact: Math.min(10, Math.floor(passiveVoiceRatio * 15))
      });
    }
    
    // Technical density
    const technicalRatio = this.calculateTechnicalRatio(text);
    if (technicalRatio > 0.15) {
      factors.push({
        type: 'concept',
        severity: technicalRatio > 0.3 ? 'high' : 'medium',
        description: 'Technical content requires specialized knowledge',
        impact: Math.min(10, Math.floor(technicalRatio * 25))
      });
    }
    
    return factors;
  }

  // Utility methods

  private getElementCharacterPosition(element: Element, container: Element): number {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT
    );
    
    let position = 0;
    let node;
    
    while ((node = walker.nextNode())) {
      if (element.contains(node)) {
        return position;
      }
      position += node.textContent?.length || 0;
    }
    
    return position;
  }

  private classifyParagraphType(text: string): string {
    if (/["'""'']/g.test(text)) return 'dialogue';
    if (/\b(then|next|after|before|while)\b/gi.test(text)) return 'narrative';
    if (/\b(however|therefore|moreover|furthermore)\b/gi.test(text)) return 'expository';
    if (/\b(beautiful|ugly|bright|dark|loud|quiet)\b/gi.test(text)) return 'descriptive';
    return 'general';
  }

  private calculateTransitionAbruptness(fromType: string, toType: string): number {
    // Define transition smoothness matrix
    const transitionMatrix: Record<string, Record<string, number>> = {
      dialogue: { narrative: 3, descriptive: 5, expository: 7, technical: 8 },
      narrative: { dialogue: 3, descriptive: 2, expository: 6, technical: 7 },
      descriptive: { dialogue: 5, narrative: 2, expository: 4, technical: 6 },
      expository: { dialogue: 7, narrative: 6, descriptive: 4, technical: 3 },
      technical: { dialogue: 8, narrative: 7, descriptive: 6, expository: 3 }
    };
    
    return transitionMatrix[fromType]?.[toType] || 5;
  }

  private calculateAvgWordsPerSentence(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return sentences.length > 0 ? words.length / sentences.length : 0;
  }

  private calculateTechnicalRatio(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const technicalTerms = text.match(/\b[A-Z]{2,}\b|\b\w+\(\w*\)|\b\d+\.\d+\b/g) || [];
    return words.length > 0 ? technicalTerms.length / words.length : 0;
  }
}

// Export singleton instance
export const contentDensityAnalyzer = new ContentDensityAnalyzerImpl();

// Export class for testing
export { ContentDensityAnalyzerImpl };