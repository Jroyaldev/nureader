'use client';

import React from 'react';
import { IoSearch, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import classNames from 'classnames';
import Modal from './Modal';
import { SearchResult, Highlight } from './types';

interface SearchModalProps {
  query: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  results: SearchResult[];
  highlights?: Highlight[];
  currentIndex: number;
  onNavigate: (direction: 'next' | 'prev') => void;
  onSelect: (chapterIndex: number, position: number) => void;
  onSelectHighlight?: (highlight: Highlight) => void;
  onClose: () => void;
  isSearching: boolean;
}

const SearchModal = React.memo(({
  query,
  onChange,
  results,
  highlights = [],
  currentIndex,
  onNavigate,
  onSelect,
  onSelectHighlight,
  onClose,
  isSearching
}: SearchModalProps) => {
  // Filter highlights that match the search query
  const filteredHighlights = highlights.filter(h => 
    h.text.toLowerCase().includes(query.toLowerCase()) ||
    (h.note && h.note.toLowerCase().includes(query.toLowerCase()))
  );

  const getHighlightColorClass = (color: Highlight['color']) => {
    const colorClasses = {
      yellow: 'bg-yellow-200 dark:bg-yellow-800',
      green: 'bg-green-200 dark:bg-green-800',
      blue: 'bg-blue-200 dark:bg-blue-800',
      pink: 'bg-pink-200 dark:bg-pink-800',
      orange: 'bg-orange-200 dark:bg-orange-800'
    };
    return colorClasses[color];
  };

  return (
  <Modal title="Search" onClose={onClose} size="large">
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={onChange}
          placeholder="Search for text, quotes, or concepts..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 pr-10"
          autoFocus
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results */}
      {query && !isSearching && (
        <>
          {results.length > 0 ? (
            <>
              {/* Results Summary */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{results.length} results found</span>
                {results.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('prev')}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Previous Result"
                    >
                      <IoChevronBack className="w-4 h-4" />
                    </button>
                    <span>{currentIndex + 1} of {results.length}</span>
                    <button
                      onClick={() => onNavigate('next')}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Next Result"
                    >
                      <IoChevronForward className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Results List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={classNames(
                      'p-4 rounded-xl cursor-pointer transition-all duration-200',
                      {
                        'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800': index === currentIndex,
                        'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800': index !== currentIndex
                      }
                    )}
                    onClick={() => onSelect(result.chapterIndex, result.position)}
                  >
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Chapter {result.chapterIndex + 1} • Position {result.position}%
                    </div>
                    <div 
                      className="text-gray-900 dark:text-gray-100 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <IoSearch className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <div className="text-gray-500 dark:text-gray-400">No results found for "{query}"</div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Try different keywords or check your spelling.
              </div>
            </div>
          )}
        </>
      )}

      {/* Highlights Section */}
      {query && filteredHighlights.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Matching Highlights ({filteredHighlights.length})
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredHighlights.map((highlight) => (
              <div
                key={highlight.id}
                className="p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => onSelectHighlight?.(highlight)}
              >
                <div
                  className={classNames(
                    'p-2 rounded-md mb-2',
                    getHighlightColorClass(highlight.color)
                  )}
                >
                  <p className="text-gray-900 dark:text-gray-100 text-sm">
                    "{highlight.text}"
                  </p>
                </div>
                {highlight.note && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                    {highlight.note}
                  </p>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Chapter {highlight.chapterIndex + 1} • {new Date(highlight.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </Modal>
  );
});

SearchModal.displayName = 'SearchModal';

export default SearchModal;