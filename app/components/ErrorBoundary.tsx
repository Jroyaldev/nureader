'use client';

import React from 'react';
import { IoWarningOutline, IoRefreshOutline } from 'react-icons/io5';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

const DefaultErrorFallback = ({ error, retry }: { error?: Error; retry: () => void }) => (
  <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
    <div className="text-center p-6">
      <IoWarningOutline className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
        Something went wrong
      </h3>
      <p className="text-red-600 dark:text-red-300 mb-4 max-w-md">
        {error?.message || 'An unexpected error occurred while rendering this component.'}
      </p>
      <button
        onClick={retry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        <IoRefreshOutline className="w-4 h-4" />
        Try again
      </button>
    </div>
  </div>
);

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;