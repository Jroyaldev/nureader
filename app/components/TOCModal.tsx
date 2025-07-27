'use client';

import React from 'react';
import classNames from 'classnames';
import Modal from './Modal';
import { TOCSkeleton } from './skeletons';
import { EPUBChapter, ReadingProgress } from './types';

interface TOCModalProps {
  chapters: EPUBChapter[];
  currentChapter: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  progress: ReadingProgress;
  isLoading?: boolean;
}

const TOCModal = React.memo(({
  chapters,
  currentChapter,
  onSelect,
  onClose,
  progress,
  isLoading = false
}: TOCModalProps) => (
  <Modal title="Table of Contents" onClose={onClose} size="large">
    {isLoading ? (
      <TOCSkeleton />
    ) : (
      <div className="grid gap-4">
      {chapters.map((chapter, index) => (
        <div
          key={chapter.id}
          className={classNames(
            'group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
            {
              'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20': index === currentChapter,
              'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600': index !== currentChapter
            }
          )}
          onClick={() => onSelect(index)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={classNames(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  {
                    'bg-blue-600 text-white': index === currentChapter,
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300': index !== currentChapter
                  }
                )}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {chapter.title}
                  </div>
                  {chapter.subtitle && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {chapter.subtitle}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4">
                <span>{chapter.wordCount.toLocaleString()} words</span>
                <span>{chapter.estimatedReadTime} min read</span>
                {index < currentChapter && (
                  <span className="text-green-600 dark:text-green-400 font-medium">✓ Complete</span>
                )}
                {index === currentChapter && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Currently reading</span>
                )}
              </div>
            </div>
            <div className="ml-4">
              {index <= currentChapter && (
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700 relative">
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-blue-600 transition-all duration-300"
                    style={{
                      clipPath: index === currentChapter 
                        ? `polygon(0 0, ${Math.min(100, Math.max(0, progress.overallProgress))}% 0, ${Math.min(100, Math.max(0, progress.overallProgress))}% 100%, 0 100%)` 
                        : 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      </div>
    )}
  </Modal>
));

TOCModal.displayName = 'TOCModal';

export default TOCModal;