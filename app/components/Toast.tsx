'use client';

import React, { useEffect, useState } from 'react';
import { IoCheckmarkCircle, IoCloseCircle, IoInformationCircle, IoWarning } from 'react-icons/io5';
import classNames from 'classnames';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast = React.memo(({ toast, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto-dismiss timer
    const duration = toast.duration || 4000;
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, toast.duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <IoCheckmarkCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <IoCloseCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <IoWarning className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <IoInformationCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-200 dark:border-green-800';
      case 'error':
        return 'border-red-200 dark:border-red-800';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-800';
      case 'info':
      default:
        return 'border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div
      className={classNames(
        'mb-4 p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 cursor-pointer',
        'bg-white/90 dark:bg-gray-800/90 shadow-lg',
        getBorderColor(),
        {
          'translate-x-0 opacity-100': isVisible && !isLeaving,
          'translate-x-full opacity-0': !isVisible || isLeaving
        }
      )}
      onClick={handleClose}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            {toast.title}
          </div>
          {toast.message && (
            <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              {toast.message}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          <IoCloseCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer = React.memo(({ toasts, onClose }: ToastContainerProps) => (
  <div className="fixed top-4 right-4 z-50 w-80 max-w-[90vw]">
    {toasts.map((toast) => (
      <Toast key={toast.id} toast={toast} onClose={onClose} />
    ))}
  </div>
));

ToastContainer.displayName = 'ToastContainer';

export default Toast;