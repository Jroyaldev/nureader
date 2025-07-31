import React from 'react';
import { useEPUBState, useEPUBUI } from '../../../contexts/EPUBReaderContext';
import LoadingState from '../../LoadingState';
import ErrorBoundary from '../../ErrorBoundary';

export interface EPUBReaderLayoutProps {
  children: React.ReactNode;
}

export const EPUBReaderLayout: React.FC<EPUBReaderLayoutProps> = ({ children }) => {
  const state = useEPUBState();
  const { uiState } = useEPUBUI();

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingState 
          progress={state.loadingProgress}
          stage={state.loadingStage}
        />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading EPUB
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {state.error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (state.chapters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="text-gray-400 text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No EPUB Loaded
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please select an EPUB file to start reading.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div 
        className={`
          min-h-screen transition-all duration-300
          ${state.settings.theme === 'dark' ? 'dark' : ''}
          ${uiState.isFullscreen ? 'fixed inset-0 z-50' : ''}
          ${uiState.isImmersiveMode ? 'cursor-none' : ''}
        `}
        style={{
          backgroundColor: state.settings.theme === 'dark' ? '#1a1a1a' : '#ffffff',
          fontFamily: state.settings.fontFamily,
          fontSize: `${state.settings.fontSize}px`,
          lineHeight: state.settings.lineHeight
        }}
      >
        {children}
      </div>
    </ErrorBoundary>
  );
};