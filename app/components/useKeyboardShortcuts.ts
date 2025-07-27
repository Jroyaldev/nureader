'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onToggleTOC: () => void;
  onToggleBookmarks: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  onToggleHighlights?: () => void;
  onToggleFullscreen: () => void;
  onToggleBookmark: () => void;
  onCloseModals: () => void;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  const {
    onToggleTOC,
    onToggleBookmarks,
    onToggleSearch,
    onToggleSettings,
    onToggleHighlights,
    onToggleFullscreen,
    onToggleBookmark,
    onCloseModals
  } = config;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Modal close on Escape
    if (e.key === 'Escape') {
      onCloseModals();
      return;
    }

    // Global shortcuts with Ctrl/Cmd
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 't':
          e.preventDefault();
          onToggleTOC();
          break;
        case 'b':
          e.preventDefault();
          onToggleBookmark();
          break;
        case 'f':
          e.preventDefault();
          onToggleSearch();
          break;
        case 'h':
          e.preventDefault();
          onToggleHighlights?.();
          break;
        case ',':
          e.preventDefault();
          onToggleSettings();
          break;
        case 'Enter':
          e.preventDefault();
          onToggleFullscreen();
          break;
      }
    }
  }, [
    onToggleTOC,
    onToggleBookmarks,
    onToggleSearch,
    onToggleSettings,
    onToggleHighlights,
    onToggleFullscreen,
    onToggleBookmark,
    onCloseModals
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};