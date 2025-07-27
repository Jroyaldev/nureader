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
}

export interface BookmarkWithNote {
  chapterIndex: number;
  position: number;
  note: string;
  category: string;
  createdAt: number;
  id: string;
}

export interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  columnWidth: number;
  marginSize: number;
  pageLayout: 'single' | 'double' | 'continuous';
  readingMode: 'normal' | 'focus' | 'immersive';
  theme: 'light' | 'dark' | 'sepia';
  backgroundMusic: boolean;
  autoPageTurn: boolean;
  readingGoal: number;
  pageAnimation?: 'flip' | 'slide' | 'fade';
}

export interface ReadingProgress {
  currentChapter: number;
  currentPage: number;
  totalPages: number;
  overallProgress: number;
  timeSpent: number;
  wordsRead: number;
  sessionsToday: number;
  streak: number;
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