'use client';

import React from 'react';
import classNames from 'classnames';
import Modal from './Modal';
import { ReadingSettings } from './types';

interface SettingsModalProps {
  settings: ReadingSettings;
  onUpdateSettings: (settings: Partial<ReadingSettings>) => void;
  onClose: () => void;
}

const SettingsModal = React.memo(({
  settings,
  onUpdateSettings,
  onClose
}: SettingsModalProps) => (
  <Modal title="Reading Settings" onClose={onClose} size="large">
    <div className="space-y-8">
      {/* Typography Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Typography</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="32"
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Family
            </label>
            <select
              value={settings.fontFamily}
              onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="serif">Serif (Traditional)</option>
              <option value="sans-serif">Sans-serif (Modern)</option>
              <option value="monospace">Monospace (Code)</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
            </select>
            
            {/* Font Preview */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p 
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: settings.fontFamily === 'serif' ? 'Charter, serif' : 
                             settings.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
                             settings.fontFamily === 'monospace' ? 'JetBrains Mono, monospace' :
                             settings.fontFamily,
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  letterSpacing: `${settings.letterSpacing}px`
                }}
              >
                The quick brown fox jumps over the lazy dog. This preview shows your current typography settings.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Line Height: {settings.lineHeight}
            </label>
            <input
              type="range"
              min="1.2"
              max="2.5"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => onUpdateSettings({ lineHeight: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Letter Spacing: {settings.letterSpacing}px
            </label>
            <input
              type="range"
              min="-1"
              max="3"
              step="0.5"
              value={settings.letterSpacing}
              onChange={(e) => onUpdateSettings({ letterSpacing: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Layout Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Layout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page Layout
            </label>
            <div className="flex gap-2">
              {(['single', 'double', 'continuous'] as const).map(layout => (
                <button
                  key={layout}
                  onClick={() => onUpdateSettings({ pageLayout: layout })}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    {
                      'bg-blue-600 text-white': settings.pageLayout === layout,
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300': settings.pageLayout !== layout
                    }
                  )}
                >
                  {layout === 'single' ? 'Single Page' : layout === 'double' ? 'Double Page' : 'Continuous'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reading Mode
            </label>
            <div className="flex gap-2">
              {(['normal', 'focus', 'immersive'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => onUpdateSettings({ readingMode: mode })}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    {
                      'bg-blue-600 text-white': settings.readingMode === mode,
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300': settings.readingMode !== mode
                    }
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Margin Size: {settings.marginSize}px
            </label>
            <input
              type="range"
              min="20"
              max="120"
              step="10"
              value={settings.marginSize}
              onChange={(e) => onUpdateSettings({ marginSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Column Width: {settings.columnWidth}ch
            </label>
            <input
              type="range"
              min="45"
              max="85"
              step="5"
              value={settings.columnWidth}
              onChange={(e) => onUpdateSettings({ columnWidth: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Theme</h3>
        <div className="flex gap-4">
          {(['light', 'dark', 'sepia'] as const).map(theme => (
            <button
              key={theme}
              onClick={() => onUpdateSettings({ theme })}
              className={classNames(
                'flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                {
                  'border-blue-600': settings.theme === theme,
                  'border-gray-200 dark:border-gray-700': settings.theme !== theme
                }
              )}
            >
              <div className={classNames(
                'w-full h-16 rounded-lg mb-2',
                {
                  'bg-white border border-gray-200': theme === 'light',
                  'bg-gray-900': theme === 'dark',
                  'bg-amber-50': theme === 'sepia'
                }
              )} />
              <div className="text-sm font-medium capitalize">{theme}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Advanced Features</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoPageTurn}
              onChange={(e) => onUpdateSettings({ autoPageTurn: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto page turn (experimental)
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.backgroundMusic}
              onChange={(e) => onUpdateSettings({ backgroundMusic: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Background ambient sounds
            </span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Reading Goal: {settings.readingGoal} minutes
            </label>
            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={settings.readingGoal}
              onChange={(e) => onUpdateSettings({ readingGoal: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  </Modal>
));

SettingsModal.displayName = 'SettingsModal';

export default SettingsModal;