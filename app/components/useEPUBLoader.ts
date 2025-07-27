'use client';

import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from 'xmldom';
import DOMPurify from 'dompurify';
import { EPUBChapter, EPUBResource } from './types';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  stage: string;
  error: string | null;
}

export const useEPUBLoader = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    stage: '',
    error: null
  });

  const updateProgress = useCallback((progress: number, stage: string) => {
    setLoadingState(prev => ({ ...prev, progress, stage }));
  }, []);

  const processChapterContent = useCallback(async (
    chapterContent: string,
    resources: Map<string, EPUBResource>,
    chapterHref: string,
    chapterNumber: number
  ) => {
    const parser = new DOMParser();
    let contentElement: Element | null = null;
    let title = `Chapter ${chapterNumber}`;
    let subtitle = '';
    let level = 1;

    try {
      const chapterDoc = parser.parseFromString(chapterContent, 'application/xhtml+xml');
      
      // Check for parsing errors
      const parseErrors = chapterDoc.getElementsByTagName('parsererror');
      if (parseErrors.length > 0) {
        throw new Error('XML parsing failed');
      }
      
      contentElement = chapterDoc.getElementsByTagName('body')[0];

      const mainTitle = chapterDoc.getElementsByTagName('title')[0]?.textContent || '';
      const h1 = chapterDoc.getElementsByTagName('h1')[0]?.textContent || '';
      const h2 = chapterDoc.getElementsByTagName('h2')[0]?.textContent || '';

      title = mainTitle || h1 || title;
      if (h1 && h2) {
        title = h1;
        subtitle = h2;
      }
    } catch (err) {
      console.warn('Primary XHTML parsing failed, trying HTML parsing:', err);
      
      // Fallback to HTML parsing
      try {
        const htmlDoc = parser.parseFromString(chapterContent, 'text/html');
        contentElement = htmlDoc.body;
        
        if (contentElement) {
          const h1 = htmlDoc.getElementsByTagName('h1')[0]?.textContent || '';
          const h2 = htmlDoc.getElementsByTagName('h2')[0]?.textContent || '';
          title = h1 || title;
          if (h1 && h2) {
            title = h1;
            subtitle = h2;
          }
        }
      } catch (htmlErr) {
        console.warn('HTML parsing also failed, trying fragment:', htmlErr);
      }
    }

    if (!contentElement) {
      try {
        // Last resort: wrap in a simple div and try parsing
        const fragmentDoc = parser.parseFromString(
          `<div>${chapterContent}</div>`,
          'text/html'
        );
        contentElement = fragmentDoc.body?.firstElementChild;
      } catch (err) {
        console.error('All parsing methods failed:', err);
        // Return basic processed content without DOM parsing
        const textContent = chapterContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
        return { 
          title, 
          subtitle, 
          level, 
          content: DOMPurify.sanitize(chapterContent),
          wordCount,
          estimatedReadTime: Math.ceil(wordCount / 250)
        };
      }
    }

    let processedContent = chapterContent;
    if (contentElement instanceof Element) {
      try {
        const serializer = new XMLSerializer();
        processedContent = serializer
          .serializeToString(contentElement)
          .replace(/^<div[^>]*>/, '')
          .replace(/<\/div>$/, '')
          .replace(/<body[^>]*>/, '')
          .replace(/<\/body>/, '');
      } catch (err) {
        console.error('Content serialization failed:', err);
      }
    }

    // Enhanced image processing with better path resolution
    const baseDir = chapterHref.split('/').slice(0, -1).join('/') + '/';
    processedContent = processedContent.replace(/src="([^"]+)"/g, (match, originalSrc) => {
      if (originalSrc.startsWith('data:') || originalSrc.startsWith('http')) {
        return match;
      }

      let normalizedSrc = originalSrc.replace(/^\.\//, '');
      while (normalizedSrc.includes('../')) {
        const parts = baseDir.split('/');
        parts.pop();
        normalizedSrc = normalizedSrc.replace('../', '');
        const newBase = parts.join('/');
        normalizedSrc = newBase ? `${newBase}/${normalizedSrc}` : normalizedSrc;
      }

      if (!normalizedSrc.startsWith(baseDir) && baseDir !== '/') {
        normalizedSrc = baseDir + normalizedSrc;
      }

      const segments = normalizedSrc.split('/');
      const lastSegments = segments.slice(-2).join('/');

      let resource = resources.get(normalizedSrc) || resources.get(lastSegments);
      if (resource) {
        return `src="${resource.data}"`;
      } else {
        console.warn('Image resource not found for:', originalSrc, normalizedSrc);
        return match;
      }
    });

    // Clean up EPUB-specific attributes
    processedContent = processedContent
      .replace(/xmlns="[^"]*"/g, '')
      .replace(/xmlns:epub="[^"]*"/g, '')
      .replace(/epub:type="[^"]*"/g, '')
      .replace(/xml:lang="[^"]*"/g, '');

    // Calculate word count and reading time
    const textContent = processedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
    const estimatedReadTime = Math.ceil(wordCount / 250); // 250 words per minute average

    processedContent = DOMPurify.sanitize(processedContent);

    return { 
      title, 
      subtitle, 
      level, 
      content: processedContent,
      wordCount,
      estimatedReadTime
    };
  }, []);

  const loadEPUB = useCallback(async (file: File): Promise<{
    chapters: EPUBChapter[];
    resources: Map<string, EPUBResource>;
  }> => {
    try {
      setLoadingState({
        isLoading: true,
        progress: 0,
        stage: 'Extracting EPUB archive...',
        error: null
      });

      const zip = new JSZip();
      const content = await zip.loadAsync(file);

      updateProgress(10, 'Reading container structure...');

      // Read container.xml
      const containerXml = await content.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('Invalid EPUB: Missing container.xml');

      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'text/xml');
      const rootfile = containerDoc.getElementsByTagName('rootfile')[0];
      const opfPath = rootfile.getAttribute('full-path');
      if (!opfPath) throw new Error('Invalid EPUB: Missing OPF path');

      updateProgress(20, 'Reading package document...');

      // Read OPF file
      const opfContent = await content.file(opfPath)?.async('text');
      if (!opfContent) throw new Error('Invalid EPUB: Missing OPF file');

      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const manifest = opfDoc.getElementsByTagName('manifest')[0];
      const spine = opfDoc.getElementsByTagName('spine')[0];

      updateProgress(30, 'Processing manifest...');

      // Process manifest items
      const items = new Map<string, { id: string; href: string; mediaType: string }>();
      const resourcesMap = new Map<string, EPUBResource>();

      const manifestItems = Array.from(manifest.getElementsByTagName('item'));
      
      for (const [index, item] of manifestItems.entries()) {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        const mediaType = item.getAttribute('media-type');

        if (id && href && mediaType) {
          items.set(id, { id, href, mediaType });

          // Load binary resources with progress updates
          if (
            mediaType.startsWith('image/') ||
            mediaType.startsWith('application/') ||
            mediaType.startsWith('font/')
          ) {
            const baseDir = opfPath.split('/').slice(0, -1).join('/');
            const resourcePath = baseDir ? `${baseDir}/${href}` : href;
            const resourceFile = content.file(resourcePath);
            if (resourceFile) {
              const data = await resourceFile.async('base64');
              resourcesMap.set(href, {
                id,
                href,
                mediaType,
                data: `data:${mediaType};base64,${data}`
              });
            }
          }
        }

        // Update progress for resource loading
        updateProgress(30 + (index / manifestItems.length) * 20, 'Loading resources...');
      }

      updateProgress(50, 'Processing spine...');

      // Process spine
      const spineItems = Array.from(spine.getElementsByTagName('itemref'))
        .map((itemref) => itemref.getAttribute('idref'))
        .filter((idref): idref is string => idref !== null);

      updateProgress(60, 'Loading chapters...');

      // Load chapters with enhanced metadata
      const loadedChapters: EPUBChapter[] = [];
      for (const [index, idref] of spineItems.entries()) {
        const item = items.get(idref);
        if (!item) continue;

        updateProgress(60 + (index / spineItems.length) * 35, `Processing chapter ${index + 1}...`);

        const baseDir = opfPath.split('/').slice(0, -1).join('/');
        const chapterPath = baseDir ? `${baseDir}/${item.href}` : item.href;
        const chapterContent = await content.file(chapterPath)?.async('text');
        if (!chapterContent) continue;

        const chapterData = await processChapterContent(chapterContent, resourcesMap, item.href, index + 1);
        loadedChapters.push({
          id: item.id,
          href: item.href,
          ...chapterData
        });

        // Small delay to prevent blocking the UI
        if (index % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      updateProgress(100, 'Complete!');

      setLoadingState(prev => ({ ...prev, isLoading: false }));

      return {
        chapters: loadedChapters,
        resources: resourcesMap
      };
    } catch (err) {
      console.error('Error loading EPUB:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load the book';
      setLoadingState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      throw err;
    }
  }, [updateProgress, processChapterContent]);

  return {
    loadEPUB,
    loadingState
  };
};