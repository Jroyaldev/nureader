import { useCallback, useEffect } from 'react';
import { EPUBReaderState } from './useEPUBReaderState';
import { useToast } from './useToast';

export interface FullscreenHandlers {
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
  enterFullscreen: () => void;
  toggleImmersiveMode: () => void;
}

export const useEPUBFullscreen = (
  state: EPUBReaderState,
  updateUIState: (uiState: Partial<typeof state.uiState>) => void
): FullscreenHandlers => {
  const { toast } = useToast();

  // Enhanced fullscreen toggle with cross-browser compatibility
  const enterFullscreen = useCallback(() => {
    const element = document.documentElement;
    
    try {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      } else {
        throw new Error('Fullscreen not supported');
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      toast('Fullscreen not supported on this device', 'error');
    }
  }, [toast]);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      updateUIState({ isFullscreen: false });
    }
  }, [updateUIState]);

  const toggleFullscreen = useCallback(() => {
    if (state.uiState.isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [state.uiState.isFullscreen, enterFullscreen, exitFullscreen]);

  const toggleImmersiveMode = useCallback(() => {
    const newImmersiveMode = !state.uiState.isImmersiveMode;
    updateUIState({ isImmersiveMode: newImmersiveMode });
    
    if (newImmersiveMode) {
      toast('Immersive mode enabled', 'success');
    } else {
      toast('Immersive mode disabled', 'success');
    }
  }, [state.uiState.isImmersiveMode, updateUIState, toast]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || 
                             (document as any).webkitFullscreenElement || 
                             (document as any).mozFullScreenElement || 
                             (document as any).msFullscreenElement);
      
      updateUIState({ isFullscreen });
    };

    // Add event listeners for different browsers
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [updateUIState]);

  // Handle escape key to exit immersive mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state.uiState.isImmersiveMode) {
        updateUIState({ isImmersiveMode: false });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.uiState.isImmersiveMode, updateUIState]);

  return {
    toggleFullscreen,
    exitFullscreen,
    enterFullscreen,
    toggleImmersiveMode
  };
};