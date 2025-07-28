'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { EPUBChapter, PageBreakMap, ReadingProgress, ReadingSettings } from './types';

interface FallbackState {
  isUsingFallback: boolean;
  fallbackType: 'basic' | 'enhanced' | 'emergency' | null;
  lastError: string | null;
  errorCount: number;
  recoveryAttempts: number;
  hasRecovered: boolean;
}

interface ErrorContext {
  component: string;
  operation: string;
  chapterIndex?: number;
  pageNumber?: number;
  timestamp: number;
  userAgent: string;
  stackTrace?: string;
}

interface FallbackSystemsHook {
  fallbackState: FallbackState;
  createFallbackPageMap: (chapter: EPUBChapter, chapterIndex: number) => PageBreakMap;
  createBasicProgress: (chapterIndex: number, totalChapters: number) => ReadingProgress;
  handleNavigationError: (error: Error, context: ErrorContext) => boolean;
  handleRenderingError: (error: Error, context: ErrorContext) => string;
  attemptRecovery: () => Promise<boolean>;
  reportError: (error: Error, context: ErrorContext) => void;
  resetFallbackState: () => void;
  isSystemHealthy: () => boolean;
  getCompatibilityMode: () => 'modern' | 'legacy' | 'basic';
}

export const useFallbackSystems = (
  chapters: EPUBChapter[],
  settings: ReadingSettings
): FallbackSystemsHook => {
  
  const [fallbackState, setFallbackState] = useState<FallbackState>({
    isUsingFallback: false,
    fallbackType: null,
    lastError: null,
    errorCount: 0,
    recoveryAttempts: 0,
    hasRecovered: false
  });

  const errorLog = useRef<ErrorContext[]>([]);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect browser capabilities and compatibility
  const getBrowserCapabilities = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        supportsModernCSS: false,
        supportsIntersectionObserver: false,
        supportsResizeObserver: false,
        supportsWebWorkers: false,
        supportsRequestIdleCallback: false,
        supportsFlexbox: false,
        supportsGrid: false,
        isIE: false,
        isLegacyBrowser: false
      };
    }

    const supportsModernCSS = CSS.supports('display', 'flex') && CSS.supports('display', 'grid');
    const supportsIntersectionObserver = 'IntersectionObserver' in window;
    const supportsResizeObserver = 'ResizeObserver' in window;
    const supportsWebWorkers = 'Worker' in window;
    const supportsRequestIdleCallback = 'requestIdleCallback' in window;
    const supportsFlexbox = CSS.supports('display', 'flex');
    const supportsGrid = CSS.supports('display', 'grid');
    
    const isIE = /MSIE|Trident/.test(navigator.userAgent);
    const isLegacyBrowser = isIE || !supportsModernCSS;

    return {
      supportsModernCSS,
      supportsIntersectionObserver,
      supportsResizeObserver,
      supportsWebWorkers,
      supportsRequestIdleCallback,
      supportsFlexbox,
      supportsGrid,
      isIE,
      isLegacyBrowser
    };
  }, []);

  // Determine compatibility mode based on browser capabilities
  const getCompatibilityMode = useCallback((): 'modern' | 'legacy' | 'basic' => {
    const capabilities = getBrowserCapabilities();
    
    if (capabilities.isLegacyBrowser || fallbackState.errorCount > 5) {
      return 'basic';
    } else if (!capabilities.supportsModernCSS || fallbackState.errorCount > 2) {
      return 'legacy';
    } else {
      return 'modern';
    }
  }, [fallbackState.errorCount, getBrowserCapabilities]);

  // Create a fallback page map when normal calculation fails
  const createFallbackPageMap = useCallback((
    chapter: EPUBChapter, 
    chapterIndex: number
  ): PageBreakMap => {
    const wordCount = chapter.wordCount || 1000; // Default if not available
    const estimatedWordsPerPage = 300; // Conservative estimate
    const estimatedPages = Math.max(1, Math.ceil(wordCount / estimatedWordsPerPage));
    
    const pages = Array.from({ length: estimatedPages }, (_, index) => {
      const startOffset = Math.floor((index / estimatedPages) * chapter.content.length);
      const endOffset = Math.floor(((index + 1) / estimatedPages) * chapter.content.length);
      
      return {
        id: `fallback-page-${chapterIndex}-${index}`,
        pageNumber: index,
        globalPageNumber: index, // This would be calculated properly in real usage
        startOffset,
        endOffset,
        wordCount: Math.floor(wordCount / estimatedPages),
        estimatedReadTime: Math.ceil((wordCount / estimatedPages) / 250), // 250 WPM
        hasImages: chapter.content.includes('<img'),
        hasTables: chapter.content.includes('<table'),
        contentDensity: 'medium' as const,
        breakQuality: 3 // Poor quality, but functional
      };
    });

    return {
      chapterIndex,
      pages,
      breakPoints: [], // No semantic break points in fallback mode
      lastCalculated: Date.now(),
      settings: {
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        columnWidth: settings.columnWidth,
        marginSize: settings.marginSize,
        pageLayout: settings.pageLayout,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        preferredWordsPerPage: estimatedWordsPerPage,
        allowOrphanLines: true, // More lenient in fallback mode
        respectImageBoundaries: false,
        respectTableBoundaries: false
      }
    };
  }, [settings]);

  // Create basic reading progress when normal tracking fails
  const createBasicProgress = useCallback((
    chapterIndex: number, 
    totalChapters: number
  ): ReadingProgress => {
    return {
      currentChapter: Math.max(0, Math.min(chapterIndex, totalChapters - 1)),
      currentPage: 1,
      totalPages: 1,
      overallProgress: totalChapters > 0 ? (chapterIndex / totalChapters) * 100 : 0,
      timeSpent: 0,
      wordsRead: 0,
      sessionsToday: 1,
      streak: 1,
      globalPagePosition: chapterIndex,
      totalGlobalPages: totalChapters,
      chapterPagePosition: 0,
      chapterTotalPages: 1,
      sectionPosition: undefined
    };
  }, []);

  // Handle navigation errors with graceful degradation
  const handleNavigationError = useCallback((error: Error, context: ErrorContext): boolean => {
    console.error('Navigation error:', error, context);
    reportError(error, context);

    const compatibilityMode = getCompatibilityMode();
    
    try {
      switch (compatibilityMode) {
        case 'modern':
          // Try to recover with reduced functionality
          setFallbackState(prev => ({
            ...prev,
            isUsingFallback: true,
            fallbackType: 'enhanced',
            lastError: error.message,
            errorCount: prev.errorCount + 1
          }));
          return true; // Can recover

        case 'legacy':
          // Fall back to basic navigation
          setFallbackState(prev => ({
            ...prev,
            isUsingFallback: true,
            fallbackType: 'basic',
            lastError: error.message,
            errorCount: prev.errorCount + 1
          }));
          return true; // Can recover with basic functionality

        case 'basic':
          // Emergency mode - very basic functionality only
          setFallbackState(prev => ({
            ...prev,
            isUsingFallback: true,
            fallbackType: 'emergency',
            lastError: error.message,
            errorCount: prev.errorCount + 1
          }));
          return false; // Cannot fully recover, but won't crash

        default:
          return false;
      }
    } catch (fallbackError) {
      console.error('Fallback navigation also failed:', fallbackError);
      return false;
    }
  }, [getCompatibilityMode, reportError]);

  // Handle rendering errors with content fallbacks
  const handleRenderingError = useCallback((error: Error, context: ErrorContext): string => {
    console.error('Rendering error:', error, context);
    reportError(error, context);

    const compatibilityMode = getCompatibilityMode();

    setFallbackState(prev => ({
      ...prev,
      isUsingFallback: true,
      fallbackType: compatibilityMode === 'modern' ? 'enhanced' : 'basic',
      lastError: error.message,
      errorCount: prev.errorCount + 1
    }));

    // Return appropriate fallback content based on compatibility mode
    switch (compatibilityMode) {
      case 'modern':
        return `
          <div class="fallback-content">
            <div class="error-notice" style="padding: 20px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #374151;">Content Loading Error</h3>
              <p style="margin: 0; color: #6b7280;">Some content could not be displayed properly. Showing simplified version.</p>
            </div>
            <div class="simplified-content">
              ${context.chapterIndex !== undefined && chapters[context.chapterIndex] ? 
                chapters[context.chapterIndex].content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 
                'Content unavailable'}
            </div>
          </div>
        `;

      case 'legacy':
        return `
          <div style="padding: 20px; font-family: serif; line-height: 1.6;">
            <p style="background: #fffbeb; padding: 10px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
              <strong>Compatibility Mode:</strong> Displaying simplified content for better compatibility.
            </p>
            <div style="white-space: pre-wrap;">
              ${context.chapterIndex !== undefined && chapters[context.chapterIndex] ? 
                chapters[context.chapterIndex].content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 
                'Content unavailable'}
            </div>
          </div>
        `;

      case 'basic':
      default:
        return `
          <div style="padding: 20px; font-family: sans-serif;">
            <p style="color: #dc2626; margin-bottom: 20px;">
              <strong>Emergency Mode:</strong> Basic text display only.
            </p>
            <pre style="white-space: pre-wrap; font-family: inherit;">
              ${context.chapterIndex !== undefined && chapters[context.chapterIndex] ? 
                chapters[context.chapterIndex].content.replace(/<[^>]*>/g, '\n').replace(/\s+/g, ' ').trim() : 
                'Content unavailable. Please try refreshing the page.'}
            </pre>
          </div>
        `;
    }
  }, [chapters, getCompatibilityMode, reportError]);

  // Attempt automatic recovery from errors
  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    if (fallbackState.recoveryAttempts >= 3) {
      console.warn('Maximum recovery attempts reached');
      return false;
    }

    setFallbackState(prev => ({
      ...prev,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      // Clear any cached data that might be corrupted
      if (typeof window !== 'undefined') {
        // Clear localStorage entries that might be corrupted
        const keysToCheck = ['epub-settings', 'epub-bookmarks', 'epub-progress'];
        keysToCheck.forEach(key => {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              JSON.parse(stored); // Test if it's valid JSON
            }
          } catch (error) {
            console.warn(`Removing corrupted localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        });
      }

      // Wait a moment for any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test basic functionality
      const testChapter = chapters[0];
      if (testChapter) {
        const testPageMap = createFallbackPageMap(testChapter, 0);
        if (testPageMap.pages.length > 0) {
          setFallbackState(prev => ({
            ...prev,
            isUsingFallback: false,
            fallbackType: null,
            hasRecovered: true,
            lastError: null
          }));
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Recovery attempt failed:', error);
      return false;
    }
  }, [fallbackState.recoveryAttempts, chapters, createFallbackPageMap]);

  // Error reporting for analytics and debugging
  const reportError = useCallback((error: Error, context: ErrorContext) => {
    const errorEntry: ErrorContext = {
      ...context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      stackTrace: error.stack
    };

    errorLog.current.push(errorEntry);
    
    // Keep only the last 50 errors to prevent memory issues
    if (errorLog.current.length > 50) {
      errorLog.current = errorLog.current.slice(-50);
    }

    // In a real application, you might send this to an error tracking service
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Report');
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Fallback State:', fallbackState);
      console.log('Browser Capabilities:', getBrowserCapabilities());
      console.groupEnd();
    }
  }, [fallbackState, getBrowserCapabilities]);

  // Reset fallback state when system recovers
  const resetFallbackState = useCallback(() => {
    setFallbackState({
      isUsingFallback: false,
      fallbackType: null,
      lastError: null,
      errorCount: 0,
      recoveryAttempts: 0,
      hasRecovered: false
    });
    errorLog.current = [];
  }, []);

  // Check system health
  const isSystemHealthy = useCallback((): boolean => {
    const capabilities = getBrowserCapabilities();
    const recentErrors = errorLog.current.filter(
      error => Date.now() - error.timestamp < 60000 // Last minute
    );

    return (
      !fallbackState.isUsingFallback &&
      fallbackState.errorCount < 3 &&
      recentErrors.length < 5 &&
      !capabilities.isLegacyBrowser
    );
  }, [fallbackState, getBrowserCapabilities]);

  // Automatic recovery attempts
  useEffect(() => {
    if (fallbackState.isUsingFallback && !recoveryTimeoutRef.current) {
      recoveryTimeoutRef.current = setTimeout(async () => {
        console.log('Attempting automatic recovery...');
        const recovered = await attemptRecovery();
        if (recovered) {
          console.log('Automatic recovery successful');
        }
        recoveryTimeoutRef.current = null;
      }, 5000); // Wait 5 seconds before attempting recovery
    }

    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
    };
  }, [fallbackState.isUsingFallback, attemptRecovery]);

  // Periodic health checks
  useEffect(() => {
    healthCheckIntervalRef.current = setInterval(() => {
      const healthy = isSystemHealthy();
      if (!healthy && !fallbackState.isUsingFallback) {
        console.warn('System health check failed, enabling fallback mode');
        setFallbackState(prev => ({
          ...prev,
          isUsingFallback: true,
          fallbackType: 'enhanced'
        }));
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [isSystemHealthy, fallbackState.isUsingFallback]);

  // Handle uncaught errors
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      reportError(error, {
        component: 'global',
        operation: 'unhandled',
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      reportError(error, {
        component: 'global',
        operation: 'unhandled-promise',
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [reportError]);

  return {
    fallbackState,
    createFallbackPageMap,
    createBasicProgress,
    handleNavigationError,
    handleRenderingError,
    attemptRecovery,
    reportError,
    resetFallbackState,
    isSystemHealthy,
    getCompatibilityMode
  };
};

// Enhanced Error Boundary Component for fallback UI
export interface FallbackErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class FallbackErrorBoundary extends React.Component<
  FallbackErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: FallbackErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by fallback boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const resetError = () => this.setState({ hasError: false, error: null });
      
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return <FallbackComponent error={this.state.error!} resetError={resetError} />;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The reading experience encountered an error, but we're working to fix it.
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={resetError}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-8 w-full max-w-2xl">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs text-left overflow-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default FallbackErrorBoundary;