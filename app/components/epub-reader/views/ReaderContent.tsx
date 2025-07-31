import React from 'react';
import { useEPUBState, useEPUBNavigation, useEPUBReaderContext } from '../../../contexts/EPUBReaderContext';
import ReaderView from '../../ReaderView';

export const ReaderContent: React.FC = () => {
  const state = useEPUBState();
  const navigation = useEPUBNavigation();
  const context = useEPUBReaderContext();

  const currentChapter = state.chapters[state.progress.currentChapter];

  if (!currentChapter) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📖</div>
          <p className="text-gray-600 dark:text-gray-400">
            No chapter available
          </p>
        </div>
      </div>
    );
  }

  // Always render continuous ReaderView. Pagination is removed.
  return (
    <ReaderView
      // ReaderView props are continuous-content oriented
      content={currentChapter.content}
      settings={state.settings}
      onNextChapter={() => {
        const next = Math.min(state.progress.currentChapter + 1, state.chapters.length - 1);
        if (next !== state.progress.currentChapter) {
          navigation.goToChapter(next);
        }
      }}
      onPrevChapter={() => {
        const prev = Math.max(state.progress.currentChapter - 1, 0);
        if (prev !== state.progress.currentChapter) {
          navigation.goToChapter(prev);
        }
      }}
      onProgressChange={(chapterProgress) => {
        // Update only chapterProgress; overallProgress handled elsewhere if needed
        navigation.updateChapterProgress(chapterProgress);
      }}
      isFirstChapter={state.progress.currentChapter === 0}
      isLastChapter={state.progress.currentChapter === state.chapters.length - 1}
      chapterProgress={state.progress.chapterProgress}
      highlights={state.highlights.filter(h => h.chapterIndex === state.progress.currentChapter)}
      onHighlight={(text, color, startOffset, endOffset) => {
        // Conform to addHighlight signature: Omit<Highlight, 'id' | 'createdAt'>
        context.addHighlight({
          chapterIndex: state.progress.currentChapter,
          text,
          color,
          startOffset,
          endOffset
        });
      }}
      onHighlightClick={(highlight) => {
        // no-op for now; keep parity with previous behavior
        console.debug('Highlight clicked:', highlight.id);
      }}
    />
  );
};