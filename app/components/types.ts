export interface EPUBChapter {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  level: number;
  content: string;
  wordCount: number;
  estimatedReadTime: number;
}

export interface EPUBResource {
  id: string;
  href: string;
  mediaType: string;
  data: string;
  base64Data?: string; // For images, keep base64 as fallback
  size?: number; // File size in bytes
  blob?: Blob; // For images, the actual blob data
}

export interface Bookmark {
  id: string;
  chapterIndex: number;
  chapterProgress: number; // 0-100% within chapter
  note?: string;
  createdAt: Date;
}

export interface BookmarkWithNote {
  id: string;
  chapterIndex: number;
  chapterProgress: number; // 0-100% within chapter
  note: string;
  category: string;
  createdAt: number;
}

export interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  columnWidth: number;
  marginSize: number;
  readingMode: 'normal' | 'focus' | 'immersive';
  theme: 'light' | 'dark' | 'sepia';
  backgroundMusic: boolean;
  autoPageTurn: boolean;
  readingGoal: number;
}

export interface ReadingProgress {
  currentChapter: number;
  totalChapters: number;
  chapterProgress: number; // 0-100% within current chapter
  overallProgress: number; // 0-100% of entire book
  timeSpent: number;
  wordsRead: number;
  sessionsToday: number;
  streak: number;
  // Enhanced hybrid navigation
  globalPagePosition: number; // Absolute page position across entire book
  totalGlobalPages: number; // Total pages across all chapters
  chapterPagePosition: number; // Page within current chapter
  chapterTotalPages: number; // Total pages in current chapter
  sectionPosition?: string; // Optional section/paragraph ID for precise positioning
}

// New interfaces for hybrid pagination
export interface PageBreakPoint {
  id: string;
  type: 'paragraph' | 'section' | 'heading' | 'image' | 'table' | 'list' | 'code' | 'quote';
  offset: number; // Character offset in chapter
  element: string; // CSS selector or element ID
  priority: number; // Break priority (1-10, higher = better break point)
  semanticContext: string; // Context for intelligent breaking
}

export interface PageBreakMap {
  chapterIndex: number;
  pages: PageInfo[];
  breakPoints: PageBreakPoint[];
  lastCalculated: number; // Timestamp for cache validation
  settings: PageCalculationSettings; // Settings used for calculation
}

export interface PageInfo {
  id: string;
  pageNumber: number; // 0-based within chapter
  globalPageNumber: number; // 0-based across entire book
  startOffset: number; // Character offset where page starts
  endOffset: number; // Character offset where page ends
  startElement?: string; // First element selector
  endElement?: string; // Last element selector
  wordCount: number;
  estimatedReadTime: number; // In seconds
  hasImages: boolean;
  hasTables: boolean;
  contentDensity: 'low' | 'medium' | 'high'; // Text density
  breakQuality: number; // Quality score of page break (1-10)
}

export interface PageCalculationSettings {
  fontSize: number;
  lineHeight: number;
  columnWidth: number;
  marginSize: number;
  pageLayout: ReadingSettings['pageLayout'];
  screenWidth: number;
  screenHeight: number;
  preferredWordsPerPage: number; // Target words per page
  allowOrphanLines: boolean; // Allow single lines at page top/bottom
  respectImageBoundaries: boolean;
  respectTableBoundaries: boolean;
}

export interface NavigationContext {
  bookTitle: string;
  totalChapters: number;
  currentChapter: {
    index: number;
    title: string;
    progress: number; // 0-100
  };
  currentPage: {
    number: number;
    globalNumber: number;
    totalInChapter: number;
    totalInBook: number;
  };
  nearbyElements: {
    previousHeading?: string;
    nextHeading?: string;
    currentSection?: string;
  };
  navigationPath: NavigationBreadcrumb[];
  quickJumpTargets: QuickJumpTarget[];
}

export interface NavigationBreadcrumb {
  type: 'book' | 'chapter' | 'section' | 'page';
  title: string;
  position: number;
  onClick: () => void;
}

export interface QuickJumpTarget {
  type: 'chapter-start' | 'chapter-end' | 'bookmark' | 'highlight' | 'search-result';
  title: string;
  description: string;
  globalPageNumber: number;
  chapterIndex: number;
  pageNumber: number;
  onClick: () => void;
}

export interface SmartPageBreakOptions {
  respectSentences: boolean;
  respectParagraphs: boolean;
  respectHeadings: boolean;
  respectImages: boolean;
  respectTables: boolean;
  respectQuotes: boolean;
  respectCodeBlocks: boolean;
  minimumWordsPerPage: number;
  maximumWordsPerPage: number;
  allowSplitParagraphs: boolean;
  preferredBreakElements: string[]; // CSS selectors for preferred break points
}

export interface SearchResult {
  chapterIndex: number;
  snippet: string;
  position: number;
}

export interface Highlight {
  id: string;
  chapterIndex: number;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
  startOffset: number;
  endOffset: number;
  note?: string;
  createdAt: number;
  pageNumber?: number;
}

export interface HighlightRange {
  startContainer: Node;
  startOffset: number;
  endContainer: Node;
  endOffset: number;
}

// Content Analysis System Interfaces

export interface DocumentStructure {
  headings: HeadingInfo[];
  paragraphs: ParagraphInfo[];
  sections: SectionInfo[];
  specialContent: SpecialContentInfo[];
  readingFlow: ReadingFlowInfo;
  semanticBlocks: SemanticBlock[];
  lastAnalyzed: number;
}

export interface HeadingInfo {
  id: string;
  level: number; // 1-6 for H1-H6
  text: string;
  position: number; // Character position in document
  importance: number; // 1-10 importance score
  semanticWeight: number; // 1-10 semantic relevance score
  breakPriority: number; // 1-10 page break priority score
  hierarchyPath: string[]; // Path from root to this heading
  hasSubheadings: boolean;
  sectionLength: number; // Characters in this section
  keywords: string[]; // Extracted keywords
  contextualRelevance: number; // 1-10 relevance to surrounding content
}

export interface ParagraphInfo {
  id: string;
  text: string; // Truncated preview text
  fullText: string; // Complete paragraph text
  wordCount: number;
  sentenceCount: number;
  characterCount: number;
  position: number; // Character position in document
  density: 'low' | 'medium' | 'high';
  semanticImportance: number; // 1-10 importance score
  breakQuality: number; // 1-10 quality as break point
  readingDifficulty: 'easy' | 'medium' | 'hard';
  topicCoherence: number; // 1-10 coherence with surrounding paragraphs
  transitionStrength: number; // 1-10 strength of transitions
  rhetoricalFunction: 'narrative' | 'descriptive' | 'expository' | 'argumentative' | 'persuasive';
  containsSpecialElements: boolean;
  estimatedReadTime: number; // In seconds
}

export interface SectionInfo {
  id: string;
  title: string;
  wordCount: number;
  paragraphCount: number;
  headingCount: number;
  position: number; // Character position in document
  depth: number; // Nesting depth
  semanticBoundary: boolean; // Is this a semantic boundary?
  breakPriority: number; // 1-10 page break priority score
  contentType: string; // Type of content (introduction, conclusion, etc.)
  structuralImportance: number; // 1-10 structural importance
  thematicCoherence: number; // 1-10 thematic coherence
  readingComplexity: 'low' | 'medium' | 'high';
  hasVisualElements: boolean;
  isChapterBoundary: boolean;
  estimatedReadTime: number; // In seconds
}

export interface SpecialContentInfo {
  id: string;
  type: 'image' | 'table' | 'list' | 'code' | 'quote';
  position: number; // Character position in document
  element: Element; // Reference to DOM element
  metadata: Record<string, any>; // Type-specific metadata
  breakImpact: 'low' | 'medium' | 'high'; // Impact on page breaks
  contentType: string; // Specific content classification
  surroundingContext: string; // Context around the element
  accessibilityScore: number; // 1-10 accessibility score
  semanticImportance: number; // 1-10 semantic importance
}

export interface ReadingFlowInfo {
  transitionQuality: number; // 1-10 quality of transitions
  coherenceScore: number; // 1-10 overall coherence
  rhythmScore: number; // 1-10 reading rhythm quality
  naturalPauses: NaturalPause[];
  readingDifficulty: 'easy' | 'medium' | 'hard';
  flowInterruptions: FlowInterruption[];
  narrativeStructure: NarrativeStructure;
  pacing: PacingInfo;
  emotionalTone: EmotionalTone;
  cognitiveLoad: number; // 1-10 cognitive load score
}

export interface NaturalPause {
  position: number;
  type: 'sentence_end' | 'exclamation_question' | 'semicolon' | 'colon' | 'paragraph_break' | 'em_dash';
  strength: 'low' | 'medium' | 'high';
}

export interface FlowInterruption {
  type: 'table_interruption' | 'code_interruption' | 'image_interruption';
  position: number;
  severity: 'low' | 'medium' | 'high';
  element: Element;
}

export interface NarrativeStructure {
  hasDialogue: boolean;
  dialogueRatio: number;
  narrativeMarkerCount: number;
  temporalMarkerCount: number;
  structure: 'linear' | 'non-linear' | 'circular' | 'episodic';
}

export interface PacingInfo {
  avgSentenceLength: number;
  avgParagraphLength: number;
  pace: 'fast' | 'medium' | 'slow';
  variation: 'low' | 'medium' | 'high';
}

export interface EmotionalTone {
  tone: 'positive' | 'negative' | 'neutral';
  confidence: 'low' | 'medium' | 'high';
}

export interface SemanticBlock {
  id: string;
  type: 'dialogue' | 'narrative' | 'descriptive' | 'expository' | 'argumentative' | 'transitional';
  startPosition: number;
  endPosition: number;
  content: string;
  confidence: 'low' | 'medium' | 'high';
  properties: Record<string, any>; // Type-specific properties
}

export interface ContentDensityMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  avgSentencesPerParagraph: number;
  avgWordsPerParagraph: number;
  visualElementCount: number;
  imageCount: number;
  tableCount: number;
  listCount: number;
  codeBlockCount: number;
  quoteCount: number;
  complexity: 'low' | 'medium' | 'high';
  technicalContentRatio: number; // 0-1 ratio of technical content
  dialogueRatio: number; // 0-1 ratio of dialogue content
  narrativeFlowScore: number; // 1-10 narrative flow quality
  estimatedReadingVelocity: number; // Words per minute
  cognitiveLoadScore: number; // 1-10 cognitive load
  lastAnalyzed: number;
}

export interface AnalysisContext {
  chapterIndex: number;
  bookTitle?: string;
  genre?: string;
  readingLevel?: 'beginner' | 'intermediate' | 'advanced';
  userPreferences?: {
    preferredBreakLength?: number;
    avoidSplitting?: ('paragraphs' | 'sections' | 'quotes' | 'tables' | 'images' | 'code')[];
    prioritizeElements?: string[]; // CSS selectors for prioritized break points
  };
  deviceContext?: {
    screenSize: 'small' | 'medium' | 'large';
    isTouch: boolean;
    orientation: 'portrait' | 'landscape';
  };
}

export interface ContentAnalysisResult {
  structure: DocumentStructure;
  density: ContentDensityMetrics;
  context: AnalysisContext;
  recommendations: AnalysisRecommendation[];
  optimalBreakPoints: OptimalBreakPoint[];
  accessibilityScore: number; // 1-10 overall accessibility
  readabilityScore: number; // 1-10 overall readability
}

export interface AnalysisRecommendation {
  type: 'reading-speed' | 'page-breaks' | 'visual-layout' | 'accessibility' | 'navigation';
  message: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface OptimalBreakPoint {
  id: string;
  position: number;
  type: 'heading' | 'paragraph' | 'section' | 'semantic' | 'visual';
  quality: number; // 1-10 break quality score
  reasoning: string;
  impactAssessment: {
    readingFlow: 'positive' | 'neutral' | 'negative';
    comprehension: 'positive' | 'neutral' | 'negative';
    accessibility: 'positive' | 'neutral' | 'negative';
  };
}

export interface EPUBReaderProps {
  file: File;
  onHighlight?: (text: string) => void;
}