# EPUBjs Implementation Technical Specification

## 1. useEpubJsBook Hook Specification

### Location: `app/hooks/useEpubJsBook.ts`

```typescript
interface UseEpubJsBookReturn {
  book: any; // epubjs Book instance
  chapters: Array<{
    id: string;
    href: string;
    title: string;
    index: number;
  }>;
  currentChapter: number;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  loadChapter: (index: number) => Promise<string>;
  goToChapter: (index: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  searchBook: (query: string) => Promise<SearchResult[]>;
}
```

### Implementation Details:
1. Convert File to ArrayBuffer using FileReader
2. Initialize epubjs with: `ePub(arrayBuffer)`
3. Wait for book.ready promise
4. Extract spine items and create chapters array
5. Implement chapter loading with book.section().load()
6. Handle errors and loading states

## 2. ChapterView Component Specification

### Location: `app/components/ChapterView.tsx`

```typescript
interface ChapterViewProps {
  content: string; // HTML content from epubjs
  settings: ReadingSettings;
  highlights: Highlight[];
  onHighlight: (text: string, color: string, start: number, end: number) => void;
  onProgressChange: (progress: number) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}
```

### Key Features:
1. Render HTML content safely with DOMPurify
2. Apply CSS based on settings (font, theme, etc.)
3. Handle text selection for highlights
4. Track scroll position for progress
5. Support keyboard navigation
6. Mobile touch gestures

## 3. Updated Types

### Modify `app/components/types.ts`:

```typescript
// Update ReadingProgress - remove page-based fields
export interface ReadingProgress {
  currentChapter: number;
  totalChapters: number;
  chapterProgress: number; // 0-100% within chapter
  overallProgress: number; // 0-100% of book
  timeSpent: number;
  wordsRead: number;
  sessionsToday: number;
  streak: number;
}

// Update Bookmark - use chapter + percentage
export interface Bookmark {
  id: string;
  chapterIndex: number;
  chapterProgress: number; // 0-100% within chapter
  note?: string;
  createdAt: Date;
}
```

## 4. EPUBReader.tsx Refactoring Guide

### Remove:
- Import of TruePaginatedReaderView
- Import of pagination components
- paginationProgress state
- Pagination-specific logic

### Replace:
- useEPUBLoader with useEpubJsBook
- ReaderView with ChapterView
- Page-based navigation with chapter navigation

### Keep:
- All modal components and logic
- Highlight/bookmark functionality
- Settings management
- Keyboard shortcuts
- Toast notifications

## 5. Integration Points

### Progress Calculation:
```typescript
const calculateOverallProgress = (currentChapter: number, totalChapters: number, chapterProgress: number) => {
  const chapterWeight = 100 / totalChapters;
  const completedChapters = currentChapter * chapterWeight;
  const currentChapterProgress = (chapterProgress / 100) * chapterWeight;
  return completedChapters + currentChapterProgress;
};
```

### Highlight Adaptation:
- Store highlights with chapterIndex + text offset
- When rendering, find text positions in chapter HTML
- Apply highlight spans dynamically

### Search Implementation:
```typescript
const searchChapter = async (chapterIndex: number, query: string) => {
  const content = await loadChapter(chapterIndex);
  const textContent = stripHtml(content);
  const results = findMatches(textContent, query);
  return results.map(match => ({
    chapterIndex,
    snippet: extractSnippet(textContent, match.index),
    position: (match.index / textContent.length) * 100
  }));
};
```

## 6. Error Handling

### Common Issues to Handle:
1. Invalid EPUB format
2. Missing resources (images, fonts)
3. Corrupted chapters
4. Memory constraints with large files

### Error Recovery:
```typescript
try {
  const book = ePub(arrayBuffer);
  await book.ready;
} catch (error) {
  // Fallback: Try to extract basic content
  // Show user-friendly error message
  // Log detailed error for debugging
}
```

## 7. Performance Optimizations

1. **Chapter Preloading**: Load current + adjacent chapters
2. **Lazy Image Loading**: Use Intersection Observer
3. **Content Caching**: Store rendered chapters in memory
4. **Debounced Progress Updates**: Avoid excessive state updates

## 8. Migration Checklist

- [ ] Create useEpubJsBook hook
- [ ] Create ChapterView component
- [ ] Update types.ts
- [ ] Refactor EPUBReader.tsx
- [ ] Update ControlsBar for chapters
- [ ] Update ProgressBar for chapters
- [ ] Test highlight functionality
- [ ] Test bookmark functionality
- [ ] Test search functionality
- [ ] Verify mobile gestures
- [ ] Performance testing

## 9. Testing Strategy

### Test Files:
1. Simple text-only EPUB
2. EPUB with images and complex formatting
3. Large EPUB (500+ pages)
4. EPUB with nested directories
5. EPUB with special characters/languages

### Test Cases:
- [ ] Book loads without errors
- [ ] All chapters accessible
- [ ] Images display correctly
- [ ] Navigation works (keyboard, touch, buttons)
- [ ] Highlights persist across sessions
- [ ] Bookmarks work with new structure
- [ ] Search finds results across chapters
- [ ] Settings apply correctly
- [ ] Progress tracks accurately