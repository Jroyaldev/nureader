'use client';

import { useState, useEffect } from 'react';
import EPUBReader from '../components/EPUBReader';
import { generateTestChapters } from '../components/TestEPUBContent';

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    // Create a mock EPUB file with test content
    const createMockEPUB = async () => {
      const chapters = generateTestChapters();
      const content = chapters.map(ch => ch.content).join('\n');
      const blob = new Blob([content], { type: 'application/epub+zip' });
      const mockFile = new File([blob], 'test.epub', { type: 'application/epub+zip' });
      setFile(mockFile);
    };

    createMockEPUB();
  }, []);

  if (!file) {
    return <div className="p-8">Loading test content...</div>;
  }

  return (
    <div className="h-screen">
      <EPUBReader file={file} />
    </div>
  );
}