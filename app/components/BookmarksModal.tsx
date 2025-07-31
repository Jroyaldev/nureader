'use client';

import React, { useState } from 'react';
import { IoBookmarkOutline, IoClose } from 'react-icons/io5';
import classNames from 'classnames';
import Modal from './Modal';
import { BookmarksSkeleton } from './skeletons';
import { BookmarkWithNote, EPUBChapter } from './types';

interface BookmarksModalProps {
  bookmarks: BookmarkWithNote[];
  chapters: EPUBChapter[];
  onSelect: (chapterIndex: number, position: number) => void;
  onDelete: (bookmarkId: string) => void;
  onUpdateNote: (bookmarkId: string, note: string) => void;
  onUpdateCategory: (bookmarkId: string, category: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const BookmarksModal = React.memo(({
  bookmarks,
  chapters,
  onSelect,
  onDelete,
  onUpdateNote,
  onUpdateCategory,
  onClose,
  isLoading = false
}: BookmarksModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = ['all', ...Array.from(new Set(bookmarks.map(b => b.category).filter(Boolean)))];
  const filteredBookmarks = selectedCategory === 'all' 
    ? bookmarks 
    : bookmarks.filter(b => b.category === selectedCategory);

  return (
    <Modal title="Bookmarks" onClose={onClose} size="large">
      {isLoading ? (
        <BookmarksSkeleton />
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <IoBookmarkOutline className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <div className="text-gray-500 dark:text-gray-400">No bookmarks added yet.</div>
          <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Click the bookmark button while reading to save your place.
          </div>
        </div>
      ) : (
        <>
          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={classNames(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  {
                    'bg-blue-600 text-white': selectedCategory === category,
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600': selectedCategory !== category
                  }
                )}
              >
                {category === 'all' ? 'All' : category || 'Uncategorized'} 
                ({category === 'all' ? bookmarks.length : bookmarks.filter(b => b.category === category).length})
              </button>
            ))}
          </div>

          {/* Bookmarks List */}
          <div className="space-y-4">
            {filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <button
                    onClick={() => onSelect(bookmark.chapterIndex, bookmark.chapterProgress)}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {chapters[bookmark.chapterIndex]?.title || `Chapter ${bookmark.chapterIndex + 1}`}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(bookmark.createdAt).toLocaleDateString()} •
                      Position {bookmark.chapterProgress}%
                    </div>
                  </button>
                  <button
                    onClick={() => onDelete(bookmark.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    aria-label="Delete bookmark"
                  >
                    <IoClose className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Category and Note */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bookmark.category || ''}
                      onChange={(e) => onUpdateCategory(bookmark.id, e.target.value)}
                      placeholder="Category..."
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <textarea
                    value={bookmark.note || ''}
                    onChange={(e) => onUpdateNote(bookmark.id, e.target.value)}
                    placeholder="Add a note about this bookmark..."
                    className="w-full text-sm p-2 rounded bg-gray-100 dark:bg-gray-700 border-none resize-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
});

BookmarksModal.displayName = 'BookmarksModal';

export default BookmarksModal;