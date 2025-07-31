'use client';

import { useState, useCallback, useEffect } from 'react';
import { Highlight } from './types';
import { useToast } from './useToast';

// Helper function to check localStorage availability and quota
const checkStorageAvailability = () => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

// Helper function to estimate storage usage
const getStorageUsage = () => {
  try {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  } catch {
    return 0;
  }
};

// Helper function to validate highlight data
const validateHighlight = (highlight: any): highlight is Highlight => {
  return (
    highlight &&
    typeof highlight.id === 'string' &&
    typeof highlight.text === 'string' &&
    typeof highlight.startOffset === 'number' &&
    typeof highlight.endOffset === 'number' &&
    typeof highlight.chapterIndex === 'number' &&
    typeof highlight.color === 'string' &&
    typeof highlight.createdAt === 'number' &&
    highlight.startOffset >= 0 &&
    highlight.endOffset > highlight.startOffset &&
    highlight.text.trim().length > 0
  );
};

export const useHighlights = (bookId?: string) => {
  const { success, error: showError, info } = useToast();
  
  // Load highlights from localStorage with enhanced error handling
  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    if (typeof window === 'undefined' || !checkStorageAvailability()) return [];
    
    try {
      const key = bookId ? `epub-highlights-${bookId}` : 'epub-highlights';
      const stored = localStorage.getItem(key);
      
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        console.warn('Invalid highlights data format, resetting');
        localStorage.removeItem(key);
        return [];
      }
      
      // Validate and filter highlights
      const validHighlights = parsed.filter(validateHighlight);
      
      if (validHighlights.length !== parsed.length) {
        console.warn(`Filtered out ${parsed.length - validHighlights.length} invalid highlights`);
        // Save the cleaned data back
        localStorage.setItem(key, JSON.stringify(validHighlights));
      }
      
      return validHighlights;
    } catch (err) {
      console.error('Failed to load highlights from localStorage:', err);
      // Try to clear corrupted data
      try {
        const key = bookId ? `epub-highlights-${bookId}` : 'epub-highlights';
        localStorage.removeItem(key);
      } catch {}
      return [];
    }
  });

  // Save highlights to localStorage with enhanced error handling
  useEffect(() => {
    if (!checkStorageAvailability()) {
      showError('Storage unavailable', 'Cannot save highlights - localStorage is not available');
      return;
    }
    
    try {
      const key = bookId ? `epub-highlights-${bookId}` : 'epub-highlights';
      const data = JSON.stringify(highlights);
      
      // Check if we're approaching storage limits (5MB typical limit)
      const currentUsage = getStorageUsage();
      const dataSize = data.length;
      const estimatedTotal = currentUsage + dataSize;
      
      if (estimatedTotal > 4 * 1024 * 1024) { // 4MB warning threshold
        console.warn('Approaching localStorage limit, current usage:', Math.round(estimatedTotal / 1024), 'KB');
        info('Storage warning', 'Highlights storage is getting full');
      }
      
      localStorage.setItem(key, data);
    } catch (err) {
      console.error('Failed to save highlights to localStorage:', err);
      
      if (err instanceof DOMException && err.code === 22) {
        // QuotaExceededError
        showError('Storage full', 'Cannot save highlights - storage quota exceeded');
      } else {
        showError('Save failed', 'Could not save highlights to local storage');
      }
    }
  }, [highlights, bookId, showError, info]);

  const addHighlight = useCallback((highlight: Omit<Highlight, 'id' | 'createdAt'>) => {
    // Validate input
    if (!highlight.text || highlight.text.trim().length === 0) {
      showError('Invalid highlight', 'Cannot highlight empty text');
      return null;
    }
    
    if (highlight.startOffset < 0 || highlight.endOffset <= highlight.startOffset) {
      showError('Invalid highlight', 'Invalid text selection range');
      return null;
    }
    
    // Check for duplicates (same text and position)
    const isDuplicate = highlights.some(h => 
      h.chapterIndex === highlight.chapterIndex &&
      h.startOffset === highlight.startOffset &&
      h.endOffset === highlight.endOffset &&
      h.text.trim() === highlight.text.trim()
    );
    
    if (isDuplicate) {
      info('Duplicate highlight', 'This text is already highlighted');
      return null;
    }
    
    // Check for overlapping highlights
    const hasOverlap = highlights.some(h => 
      h.chapterIndex === highlight.chapterIndex &&
      ((highlight.startOffset >= h.startOffset && highlight.startOffset < h.endOffset) ||
       (highlight.endOffset > h.startOffset && highlight.endOffset <= h.endOffset) ||
       (highlight.startOffset <= h.startOffset && highlight.endOffset >= h.endOffset))
    );
    
    if (hasOverlap) {
      info('Overlapping highlight', 'This text overlaps with an existing highlight');
      // Allow overlapping highlights but warn the user
    }
    
    const newHighlight: Highlight = {
      ...highlight,
      id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      text: highlight.text.trim() // Ensure text is trimmed
    };
    
    setHighlights(prev => [...prev, newHighlight]);
    success('Text highlighted', `Added ${highlight.color} highlight`);
    return newHighlight;
  }, [highlights, success, showError, info]);

  const updateHighlight = useCallback((id: string, updates: Partial<Highlight>) => {
    setHighlights(prev => prev.map(h => 
      h.id === id ? { ...h, ...updates } : h
    ));
    info('Highlight updated', 'Your changes have been saved');
  }, [info]);

  const deleteHighlight = useCallback((id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    success('Highlight removed', 'The highlight has been deleted');
  }, [success]);

  const getHighlightsForChapter = useCallback((chapterIndex: number) => {
    return highlights.filter(h => h.chapterIndex === chapterIndex);
  }, [highlights]);

  const exportHighlights = useCallback(() => {
    const exportData = {
      bookId,
      exportDate: new Date().toISOString(),
      highlights: highlights.map(h => ({
        ...h,
        createdAt: new Date(h.createdAt).toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `highlights-${bookId || 'book'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    success('Highlights exported', `Exported ${highlights.length} highlights`);
  }, [highlights, bookId, success]);

  const importHighlights = useCallback((fileContent: string) => {
    try {
      const data = JSON.parse(fileContent);
      if (data.highlights && Array.isArray(data.highlights)) {
        const importedHighlights = data.highlights.map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt).getTime()
        }));
        setHighlights(prev => [...prev, ...importedHighlights]);
        success('Highlights imported', `Imported ${importedHighlights.length} highlights`);
      } else {
        showError('Invalid file format', 'Please select a valid highlights export file');
      }
    } catch (err) {
      showError('Import failed', 'Could not parse the highlights file');
    }
  }, [success, showError]);

  const clearHighlights = useCallback(() => {
    setHighlights([]);
    success('Highlights cleared', 'All highlights have been removed');
  }, [success]);

  return {
    highlights,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    getHighlightsForChapter,
    exportHighlights,
    importHighlights,
    clearHighlights
  };
};