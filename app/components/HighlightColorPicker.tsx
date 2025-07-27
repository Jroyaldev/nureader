'use client';

import React from 'react';
import { IoCheckmark } from 'react-icons/io5';
import classNames from 'classnames';
import { Highlight } from './types';

interface HighlightColorPickerProps {
  selectedColor?: Highlight['color'];
  onColorSelect: (color: Highlight['color']) => void;
  position?: { x: number; y: number };
  onClose?: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', label: 'Yellow', class: 'bg-yellow-300 hover:bg-yellow-400 dark:bg-yellow-600 dark:hover:bg-yellow-700' },
  { name: 'green', label: 'Green', class: 'bg-green-300 hover:bg-green-400 dark:bg-green-600 dark:hover:bg-green-700' },
  { name: 'blue', label: 'Blue', class: 'bg-blue-300 hover:bg-blue-400 dark:bg-blue-600 dark:hover:bg-blue-700' },
  { name: 'pink', label: 'Pink', class: 'bg-pink-300 hover:bg-pink-400 dark:bg-pink-600 dark:hover:bg-pink-700' },
  { name: 'orange', label: 'Orange', class: 'bg-orange-300 hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-700' }
] as const;

const HighlightColorPicker = React.memo(({ 
  selectedColor = 'yellow', 
  onColorSelect,
  position,
  onClose
}: HighlightColorPickerProps) => {
  const handleColorSelect = (color: Highlight['color']) => {
    onColorSelect(color);
    onClose?.();
  };

  const pickerStyle = position ? {
    position: 'absolute' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translate(-50%, -100%) translateY(-10px)'
  } : undefined;

  return (
    <>
      {position && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div 
        className={classNames(
          'bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2',
          'animate-fade-in z-50',
          { 'fixed': position }
        )}
        style={pickerStyle}
      >
        <div className="flex items-center gap-1">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorSelect(color.name as Highlight['color'])}
              className={classNames(
                'w-8 h-8 rounded-md transition-all duration-200 relative group',
                color.class,
                {
                  'ring-2 ring-offset-2 ring-gray-800 dark:ring-white': selectedColor === color.name,
                  'scale-110': selectedColor === color.name
                }
              )}
              aria-label={`${color.label} highlight`}
              title={color.label}
            >
              {selectedColor === color.name && (
                <IoCheckmark className="w-4 h-4 text-white absolute inset-0 m-auto" />
              )}
              <span className="sr-only">{color.label}</span>
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Select highlight color
        </div>
      </div>
    </>
  );
});

HighlightColorPicker.displayName = 'HighlightColorPicker';

export default HighlightColorPicker;