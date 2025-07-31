'use client';

import { useState, useEffect } from 'react';

export const useMotionPreferences = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return {
    prefersReducedMotion,
    // Utility function to conditionally apply animation
    getAnimation: (animation: string) => prefersReducedMotion ? 'none' : animation,
    // Utility to get appropriate CSS classes
    getAnimationClass: (className: string) => prefersReducedMotion ? '' : className
  };
};