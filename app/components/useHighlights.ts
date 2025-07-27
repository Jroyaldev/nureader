'use client';

import { useState, useCallback, useEffect } from 'react';
import { Highlight } from './types';
import { useToast } from './useToast';

export const useHighlights = (bookId?: string) => {
  const { success, error: showError, info } = useToast();
  
  // Load highlights from localStorage with book-specific key
  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const key = bookId ? `epub-highlights-${bookId}` : 'epub-highlights';
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn('Failed to load highlights from localStorage:', err);
      return [];
    }
  });

  // Save highlights to localStorage whenever they change
  useEffect(() => {
    try {
      const key = bookId ? `epub-highlights-${bookId}` : 'epub-highlights';
      localStorage.setItem(key, JSON.stringify(highlights));
    } catch (err) {
      console.warn('Failed to save highlights to localStorage:', err);
    }
  }, [highlights, bookId]);

  const addHighlight = useCallback((highlight: Omit<Highlight, 'id' | 'createdAt'>) => {
    const newHighlight: Highlight = {
      ...highlight,
      id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };
    
    setHighlights(prev => [...prev, newHighlight]);
    success('Text highlighted', `Added ${highlight.color} highlight`);
    return newHighlight;
  }, [success]);

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