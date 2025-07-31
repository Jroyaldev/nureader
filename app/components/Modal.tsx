'use client';

import React, { useEffect, useCallback } from 'react';
import { IoClose } from 'react-icons/io5';
import classNames from 'classnames';
import { useMobileCapabilities } from '../hooks/useMobileTouch';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  isOpen?: boolean;
}

const Modal = React.memo(({
  title,
  onClose,
  children,
  size = 'medium',
  isOpen = true
}: ModalProps) => {
  const capabilities = useMobileCapabilities();
  
  const sizeClasses = {
    small: capabilities.isSmallScreen ? 'max-w-[95vw]' : 'max-w-md',
    medium: capabilities.isSmallScreen ? 'max-w-[95vw]' : 'max-w-2xl',
    large: capabilities.isSmallScreen ? 'max-w-[95vw]' : 'max-w-4xl',
    full: capabilities.isSmallScreen ? 'max-w-[100vw]' : 'max-w-7xl'
  };

  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, handleEscapeKey]);

  if (!isOpen) return null;

  return (
    <div 
      className={classNames(
        'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex animate-in fade-in duration-200',
        {
          'items-center justify-center p-4': !capabilities.isSmallScreen,
          'items-end justify-center': capabilities.isSmallScreen
        }
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={classNames(
        'bg-white dark:bg-gray-800 shadow-2xl w-full overflow-hidden flex flex-col animate-in duration-300',
        {
          'rounded-2xl max-h-[90vh] slide-in-from-bottom-4': !capabilities.isSmallScreen,
          'rounded-t-3xl max-h-[85vh] slide-in-from-bottom-8': capabilities.isSmallScreen
        },
        sizeClasses[size]
      )}>
        {/* Modal Header */}
        <div className={classNames(
          'flex items-center justify-between border-b border-gray-200 dark:border-gray-700',
          {
            'p-6': !capabilities.isSmallScreen,
            'p-4': capabilities.isSmallScreen
          }
        )}>
          {/* Mobile drag handle */}
          {capabilities.isSmallScreen && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          )}
          
          <h2 id="modal-title" className={classNames(
            'font-semibold text-gray-900 dark:text-gray-100',
            {
              'text-xl': !capabilities.isSmallScreen,
              'text-lg mt-3': capabilities.isSmallScreen
            }
          )}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={classNames(
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700',
              {
                'p-1': !capabilities.isSmallScreen,
                'p-2 mt-3 min-h-[44px] min-w-[44px] flex items-center justify-center': capabilities.isSmallScreen
              }
            )}
            aria-label="Close modal"
          >
            <IoClose className={classNames({
              'w-6 h-6': !capabilities.isSmallScreen,
              'w-5 h-5': capabilities.isSmallScreen
            })} />
          </button>
        </div>

        {/* Modal Content */}
        <div className={classNames(
          'overflow-auto flex-1',
          {
            'p-6': !capabilities.isSmallScreen,
            'p-4 pb-6': capabilities.isSmallScreen
          }
        )}>
          {children}
        </div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

export default Modal;