'use client';

import { useEffect } from 'react';
import { ReadingSettings } from './types';

export const useTheme = (theme: ReadingSettings['theme']) => {
  useEffect(() => {
    // Apply theme classes to document root
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Apply sepia theme custom properties
    if (theme === 'sepia') {
      document.documentElement.style.setProperty('--background', '252 248 227');
      document.documentElement.style.setProperty('--foreground', '120 53 15');
    } else {
      document.documentElement.style.removeProperty('--background');
      document.documentElement.style.removeProperty('--foreground');
    }

    // Cleanup function to ensure consistent state
    return () => {
      if (theme === 'sepia') {
        document.documentElement.style.removeProperty('--background');
        document.documentElement.style.removeProperty('--foreground');
      }
    };
  }, [theme]);
};