'use client';

import React, { useState, useMemo } from 'react';
import { IoClose, IoTrash, IoPencil, IoDownload, IoCloudUpload, IoSearch, IoColorPalette } from 'react-icons/io5';
import classNames from 'classnames';
import { Highlight } from './types';
import { EPUBChapter } from './types';
import HighlightColorPicker from './HighlightColorPicker';

interface HighlightsModalProps {
  highlights: Highlight[];
  chapters: EPUBChapter[];
  onSelect: (chapterIndex: number, startOffset: number) => void;
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onUpdateColor: (id: string, color: Highlight['color']) => void;
  onExport: () => void;
  onImport: (content: string) => void;
  onClose: () => void;
}

const HighlightsModal = React.memo(({
  highlights,
  chapters,
  onSelect,
  onDelete,
  onUpdateNote,
  onUpdateColor,
  onExport,
  onImport,
  onClose
}: HighlightsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<Highlight['color'] | null>(null);
  const [noteText, setNoteText] = useState('');

  // Group highlights by chapter
  const highlightsByChapter = useMemo(() => {
    const filtered = highlights.filter(h => 
      h.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const grouped = filtered.reduce((acc, highlight) => {
      const chapterIndex = highlight.chapterIndex;
      if (!acc[chapterIndex]) {
        acc[chapterIndex] = [];
      }
      acc[chapterIndex].push(highlight);
      return acc;
    }, {} as Record<number, Highlight[]>);

    // Sort highlights within each chapter by position
    Object.keys(grouped).forEach(key => {
      grouped[parseInt(key)].sort((a, b) => a.startOffset - b.startOffset);
    });

    return grouped;
  }, [highlights, searchQuery]);

  const handleNoteEdit = (highlight: Highlight) => {
    setEditingNoteId(highlight.id);
    setNoteText(highlight.note || '');
  };

  const handleNoteSave = (id: string) => {
    onUpdateNote(id, noteText);
    setEditingNoteId(null);
    setNoteText('');
  };

  const handleColorEdit = (highlight: Highlight) => {
    setEditingColorId(highlight.id);
    setSelectedColor(highlight.color);
  };

  const handleColorSave = (id: string, color: Highlight['color']) => {
    onUpdateColor(id, color);
    setEditingColorId(null);
    setSelectedColor(null);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          onImport(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

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

  const totalHighlights = highlights.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Highlights ({totalHighlights})
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close highlights"
            >
              <IoClose className="w-5 h-5" />
            </button>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search highlights..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={totalHighlights === 0}
              >
                <IoDownload className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <IoCloudUpload className="w-4 h-4" />
                Import
              </button>
            </div>
          </div>
        </div>

        {/* Highlights List */}
        <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-6">
          {Object.keys(highlightsByChapter).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(highlightsByChapter).map(([chapterIndex, chapterHighlights]) => (
                <div key={chapterIndex} className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 sticky top-0 bg-white dark:bg-gray-900 py-2">
                    {chapters[parseInt(chapterIndex)]?.title || `Chapter ${parseInt(chapterIndex) + 1}`}
                  </h3>
                  
                  {chapterHighlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="group relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all"
                    >
                      {/* Highlight Text */}
                      <div
                        className={classNames(
                          'p-3 rounded-md mb-3 cursor-pointer',
                          getHighlightColorClass(highlight.color)
                        )}
                        onClick={() => onSelect(highlight.chapterIndex, highlight.startOffset)}
                      >
                        <p className="text-gray-900 dark:text-gray-100">
                          "{highlight.text}"
                        </p>
                      </div>

                      {/* Note Section */}
                      {editingNoteId === highlight.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a note..."
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleNoteSave(highlight.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-3 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        highlight.note && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                            {highlight.note}
                          </p>
                        )
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(highlight.createdAt).toLocaleDateString()}
                        </span>
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleColorEdit(highlight)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            aria-label="Change color"
                          >
                            <IoColorPalette className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleNoteEdit(highlight)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            aria-label="Edit note"
                          >
                            <IoPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(highlight.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md transition-colors"
                            aria-label="Delete highlight"
                          >
                            <IoTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Color Picker Popover */}
                      {editingColorId === highlight.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2">
                          <HighlightColorPicker
                            selectedColor={selectedColor || highlight.color}
                            onColorSelect={(color) => handleColorSave(highlight.id, color)}
                            onClose={() => setEditingColorId(null)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                {searchQuery ? 'No highlights found matching your search.' : 'No highlights yet.'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Select text while reading to create highlights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

HighlightsModal.displayName = 'HighlightsModal';

export default HighlightsModal;