# EPUB Migration Plan: From Custom Parser to epubjs

## Overview
Replace the custom EPUB parsing implementation with the battle-tested epubjs library to fix parsing issues and simplify the codebase. This will provide robust EPUB support while maintaining existing features like highlights, bookmarks, and search.

## Current State Analysis

### Files to Modify
1. **app/components/EPUBReader.tsx** - Main reader component (975 lines)
2. **app/hooks/useEPUBLoader.ts** - Custom EPUB loader to be replaced
3. **app/components/ReaderView.tsx** - Content display component
4. **app/components/ControlsBar.tsx** - Navigation controls
5. **app/components/ProgressBar.tsx** - Progress tracking

### Files to Remove/Disable
- app/components/pagination/* (8 files) - Complex pagination system
- app/components/epub-reader/EPUBReader.tsx - Duplicate reader implementation

### Features to Preserve
- Highlights with color selection
- Bookmarks with notes
- Search functionality
- Reading settings (font, theme, etc.)
- Progress tracking
- Keyboard shortcuts
- Mobile touch gestures

## Implementation Steps

### Step 1: Create useEpubJsBook Hook
```typescript
// app/hooks/useEpubJsBook.ts
import { useState, useEffect, useCallback } from 'react';
import ePub from 'epubjs';

export const useEpubJsBook = (file: File) => {
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize book
  // Extract spine/chapters
  // Provide navigation methods
  // Handle resource loading
};
```

### Step 2: Create Simplified Chapter Renderer
```typescript
// app/components/ChapterView.tsx
export const ChapterView = ({ 
  chapterHtml, 
  settings, 
  highlights,
  onHighlight,
  onScroll 
}) => {
  // Render chapter HTML
  // Apply settings (font, theme)
  // Handle text selection for highlights
  // Track reading progress
};
```

### Step 3: Refactor EPUBReader.tsx
- Remove pagination logic
- Replace useEPUBLoader with useEpubJsBook
- Simplify navigation to chapter-based
- Keep all modal functionality
- Preserve highlight/bookmark features

### Step 4: Update Progress Tracking
- Change from page-based to chapter-based progress
- Update ProgressBar to show chapter completion %
- Modify ReadingProgress type to remove page references

### Step 5: Adapt Search Functionality
- Use epubjs search capabilities if available
- Otherwise, search through loaded chapter content
- Maintain existing search UI

## Migration Strategy

### Phase 1: Core Implementation (Day 1)
1. Create useEpubJsBook hook
2. Build ChapterView component
3. Create minimal working reader

### Phase 2: Feature Restoration (Day 2)
1. Restore highlights functionality
2. Fix bookmarks to work with chapters
3. Update search to work with new structure

### Phase 3: Polish & Testing (Day 3)
1. Update UI components (ControlsBar, ProgressBar)
2. Test with various EPUB files
3. Fix edge cases

## Technical Considerations

### epubjs Integration
```javascript
// Basic usage pattern
const book = ePub(arrayBuffer);
await book.ready;
const spine = book.spine;
const chapter = await book.section(spine.get(index)).load();
```

### Chapter Navigation
- Use book.spine for chapter list
- Navigate with spine index
- Render one chapter at a time
- Preload adjacent chapters for performance

### Resource Handling
- epubjs handles images/fonts automatically
- No need for manual resource extraction
- Simplified content rendering

### Progress Calculation
```typescript
progress = (currentChapter / totalChapters) * 100;
// Optional: Add within-chapter progress based on scroll
```

## Benefits
1. **Robust Parsing**: Handles all EPUB edge cases
2. **Simplified Code**: Remove 1000+ lines of custom parsing
3. **Better Performance**: Optimized resource loading
4. **Future-Proof**: Maintained library with EPUB3 support
5. **Reduced Bugs**: Battle-tested with thousands of books

## Risks & Mitigation
- **Risk**: Breaking existing features
  - **Mitigation**: Careful testing of each feature
- **Risk**: Different rendering behavior
  - **Mitigation**: CSS normalization
- **Risk**: Performance regression
  - **Mitigation**: Implement chapter preloading

## Success Criteria
- [ ] All test EPUBs load without errors
- [ ] Images display correctly
- [ ] Highlights/bookmarks work
- [ ] Search functions properly
- [ ] Mobile gestures work
- [ ] No performance degradation