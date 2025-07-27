'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

interface TouchGesture {
  type: 'swipe' | 'pinch' | 'tap' | 'longpress';
  direction?: 'left' | 'right' | 'up' | 'down';
  scale?: number;
  clientX?: number;
  clientY?: number;
  deltaX?: number;
  deltaY?: number;
}

interface MobileTouchConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number, isEnd: boolean) => void;
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  swipeThreshold?: number;
  pinchThreshold?: number;
  longPressDelay?: number;
  preventScrollOnSwipe?: boolean;
}

interface TouchState {
  initialDistance: number;
  initialScale: number;
  lastScale: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  isMoving: boolean;
  isSwiping: boolean;
  isPinching: boolean;
  touches: (Touch | React.Touch)[];
}

export const useMobileTouch = (config: MobileTouchConfig) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchZoom,
    onTap,
    onLongPress,
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    longPressDelay = 500,
    preventScrollOnSwipe = true
  } = config;

  const touchState = useRef<TouchState>({
    initialDistance: 0,
    initialScale: 1,
    lastScale: 1,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    isMoving: false,
    isSwiping: false,
    isPinching: false,
    touches: []
  });

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Calculate distance between two touch points for pinch gestures
  const getTouchDistance = useCallback((touches: TouchList | React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point of pinch gesture
  const getPinchCenter = useCallback((touches: TouchList | React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touches = e.touches;
    const state = touchState.current;

    // Clear any existing long press timer
    clearLongPressTimer();

    if (touches.length === 1) {
      // Single touch - potential swipe or tap
      const touch = touches[0];
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.currentX = touch.clientX;
      state.currentY = touch.clientY;
      state.startTime = Date.now();
      state.isMoving = false;
      state.isSwiping = false;
      state.isPinching = false;

      // Start long press timer
      if (onLongPress) {
        longPressTimer.current = setTimeout(() => {
          if (!state.isMoving) {
            setIsLongPressing(true);
            onLongPress(touch.clientX, touch.clientY);
          }
        }, longPressDelay);
      }
    } else if (touches.length === 2) {
      // Two touches - pinch gesture
      clearLongPressTimer();
      state.isPinching = true;
      state.isSwiping = false;
      state.initialDistance = getTouchDistance(touches);
      state.lastScale = 1;
    }

    state.touches = Array.from(touches);
  }, [getTouchDistance, onLongPress, longPressDelay, clearLongPressTimer]);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touches = e.touches;
    const state = touchState.current;

    if (touches.length === 1 && !state.isPinching) {
      // Single touch move - potential swipe
      const touch = touches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      state.currentX = touch.clientX;
      state.currentY = touch.clientY;

      // If movement detected, clear long press
      if (distance > 10) {
        state.isMoving = true;
        clearLongPressTimer();
      }

      // Determine if this is a swipe gesture
      if (distance > swipeThreshold / 2) {
        state.isSwiping = true;
        
        // Prevent scroll if configured and this looks like a horizontal swipe
        if (preventScrollOnSwipe && Math.abs(deltaX) > Math.abs(deltaY)) {
          e.preventDefault();
        }
      }
    } else if (touches.length === 2 && state.isPinching) {
      // Two touch move - pinch gesture
      e.preventDefault(); // Prevent default zoom behavior
      
      const currentDistance = getTouchDistance(touches);
      if (state.initialDistance > 0) {
        const scale = currentDistance / state.initialDistance;
        const scaleDelta = scale - state.lastScale;
        
        if (Math.abs(scaleDelta) > pinchThreshold) {
          state.lastScale = scale;
          onPinchZoom?.(scale, false);
        }
      }
    }
  }, [swipeThreshold, pinchThreshold, getTouchDistance, onPinchZoom, preventScrollOnSwipe, clearLongPressTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    const state = touchState.current;
    const timeElapsed = Date.now() - state.startTime;

    clearLongPressTimer();

    if (state.isPinching && e.touches.length === 0) {
      // End of pinch gesture
      onPinchZoom?.(state.lastScale, true);
      state.isPinching = false;
    } else if (state.isSwiping && e.touches.length === 0) {
      // End of swipe gesture
      const deltaX = state.currentX - state.startX;
      const deltaY = state.currentY - state.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine swipe direction based on primary axis
      if (absX > swipeThreshold || absY > swipeThreshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }
      
      state.isSwiping = false;
    } else if (!state.isMoving && !isLongPressing && timeElapsed < 300 && e.touches.length === 0) {
      // Simple tap
      onTap?.(state.startX, state.startY);
    }

    // Reset state
    if (e.touches.length === 0) {
      state.isMoving = false;
      state.isSwiping = false;
      state.isPinching = false;
      state.touches = [];
    }
  }, [swipeThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onPinchZoom, isLongPressing, clearLongPressTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isLongPressing,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
};

// Hook for detecting mobile device capabilities
export const useMobileCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    isTouchDevice: false,
    hasHover: false,
    isSmallScreen: false,
    supportsPinchZoom: false,
    supportsOrientationChange: false,
    devicePixelRatio: 1,
    maxTouchPoints: 0
  });

  useEffect(() => {
    const updateCapabilities = () => {
      setCapabilities({
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        hasHover: window.matchMedia('(hover: hover)').matches,
        isSmallScreen: window.matchMedia('(max-width: 768px)').matches,
        supportsPinchZoom: 'ontouchstart' in window && navigator.maxTouchPoints > 1,
        supportsOrientationChange: 'orientation' in screen,
        devicePixelRatio: window.devicePixelRatio || 1,
        maxTouchPoints: navigator.maxTouchPoints || 0
      });
    };

    updateCapabilities();

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateCapabilities);
    window.addEventListener('orientationchange', updateCapabilities);

    return () => {
      window.removeEventListener('resize', updateCapabilities);
      window.removeEventListener('orientationchange', updateCapabilities);
    };
  }, []);

  return capabilities;
};

// Hook for optimizing touch performance
export const useTouchPerformance = () => {
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    // Enable passive event listeners for better performance
    const addPassiveListener = (element: Element, event: string, handler: EventListener) => {
      element.addEventListener(event, handler, { passive: true });
      return () => element.removeEventListener(event, handler);
    };

    // Optimize touch-action for better scrolling performance
    document.body.style.touchAction = 'pan-x pan-y';
    
    // Enable hardware acceleration for smoother animations
    document.documentElement.style.transform = 'translateZ(0)';
    
    setIsOptimized(true);

    return () => {
      document.body.style.touchAction = '';
      document.documentElement.style.transform = '';
    };
  }, []);

  return { isOptimized };
};