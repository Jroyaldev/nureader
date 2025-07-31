'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ePub from 'epubjs';
import type { Book } from 'epubjs';

interface Chapter {
  id: string;
  href: string;
  title: string;
  index: number;
}

interface UseEpubJsBookReturn {
  book: Book | null;
  chapters: Chapter[];
  currentChapter: number;
  isLoading: boolean;
  error: string | null;
  loadingProgress: number;
  
  // Methods
  loadChapter: (index: number) => Promise<string>;
  goToChapter: (index: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  searchBook: (query: string) => Promise<Array<{
    chapterIndex: number;
    snippet: string;
    position: number;
  }>>;
}

export const useEpubJsBook = (file: File | null): UseEpubJsBookReturn => {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Cache for loaded chapters
  const chapterCache = useRef<Map<number, string>>(new Map());

  // Initialize book from file
  useEffect(() => {
    if (!file) return;

    const loadBook = async () => {
      setIsLoading(true);
      setError(null);
      setLoadingProgress(0);

      try {
        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        setLoadingProgress(20);

        // Create book instance
        const newBook = ePub(arrayBuffer);
        setLoadingProgress(40);

        // Wait for book to be ready
        await newBook.ready;
        setLoadingProgress(60);

        // Extract spine items as chapters
        const spine = newBook.spine;
        const chapterList: Chapter[] = [];

        // Get navigation data for chapter titles
        const navigation = newBook.navigation;
        const tocItems = navigation?.toc || [];

        // Access spine items using the spine object
        const spineItems = (spine as any).items || [];
        spineItems.forEach((item: any, index: number) => {
          // Try to find matching TOC entry for title
          const tocEntry = tocItems.find((toc: any) =>
            toc.href?.includes(item.href) || toc.href === item.href
          );

          chapterList.push({
            id: item.idref || `chapter-${index}`,
            href: item.href,
            title: tocEntry?.label || `Chapter ${index + 1}`,
            index
          });
        });

        setChapters(chapterList);
        setBook(newBook);
        setLoadingProgress(100);
        
        // Clean up cache when book changes
        chapterCache.current.clear();
      } catch (err) {
        console.error('Failed to load EPUB:', err);
        setError(err instanceof Error ? err.message : 'Failed to load EPUB file');
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();

    // Cleanup
    return () => {
      if (book) {
        book.destroy();
      }
    };
  }, [file]); // book is intentionally not included as it would cause infinite loops

  // Load chapter content
  const loadChapter = useCallback(async (index: number): Promise<string> => {
    if (!book || index < 0 || index >= chapters.length) {
      throw new Error('Invalid chapter index');
    }

    // Check cache first
    if (chapterCache.current.has(index)) {
      return chapterCache.current.get(index)!;
    }

    // Helper: safely parse an HTML string/element into a Document and extract body.innerHTML only
    const extractBodyHtml = (input: any): string => {
      try {
        // Prefer text from inner/outer first
        let raw = '';
        if (typeof input === 'string') {
          raw = input;
        } else if (input && typeof (input as any).outerHTML === 'string') {
          raw = (input as any).outerHTML;
        } else if (input && typeof (input as any).innerHTML === 'string') {
          // If it's the full <html> element, this is head+body; we still parse via DOMParser next
          raw = (input as any).innerHTML;
        } else if (input instanceof Document) {
          const serializer = new XMLSerializer();
          raw = serializer.serializeToString(input);
        } else if (input && (input as any).documentElement) {
          const serializer = new XMLSerializer();
          raw = serializer.serializeToString((input as any).documentElement);
        } else {
          raw = String(input ?? '');
        }

        // Parse with DOMParser and extract strictly the body contents (drop head/base)
        const parser = new DOMParser();
        // Handle xhtml from many EPUBs
        const asXhtml = raw.includes('xmlns="http://www.w3.org/1999/xhtml"');
        const doc = parser.parseFromString(raw, asXhtml ? 'application/xhtml+xml' : 'text/html');
        let bodyHtml = '';
        if (doc && (doc as any).body) {
          bodyHtml = (doc as any).body.innerHTML || '';
        } else {
          const bodyEl = doc.querySelector?.('body');
          bodyHtml = bodyEl?.innerHTML ?? '';
        }

        if (!bodyHtml || bodyHtml.trim().length === 0) {
          // Fallback: try to remove head manually if parser failed
          bodyHtml = raw.replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, '');
          // Also strip base tags if any slipped in
          bodyHtml = bodyHtml.replace(/<base[^>]*>/gi, '');
        }
        return bodyHtml;
      } catch (e) {
        console.warn('extractBodyHtml failed, returning string(input):', e);
        return typeof input === 'string' ? input : String(input ?? '');
      }
    };
  
    // Helper: normalize a path to EPUB item href (no leading slash, resolve against section href directory)
    const normalizeItemHref = (sectionHref: string, relUrl: string): string => {
      try {
        const base = new URL(sectionHref, 'https://epub.local/');
        const resolved = new URL(relUrl, base);
        const pathname = resolved.pathname.replace(/^\/+/, '');
        return decodeURIComponent(pathname);
      } catch {
        return relUrl.replace(/^(\.\/|\/)+/, '');
      }
    };
  
    // Helper: resolve a relative href against a section base and return a blob/data URL using epubjs archive/resources
    const resolveToBlobUrl = async (book: any, section: any, relUrl: string): Promise<string | null> => {
      const PLACEHOLDER_1x1 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      try {
        if (!relUrl || /^https?:/i.test(relUrl) || relUrl.startsWith('data:') || relUrl.startsWith('blob:') || relUrl.startsWith('#')) {
          return relUrl;
        }

        const sectionHref: string = section?.href || '';
        const baseItem = normalizeItemHref(sectionHref, relUrl);

        // Build candidate keys using possible roots
        const packaging = (book as any).packaging || (book as any).package || {};
        const opfPath: string | undefined = packaging.opfPath || packaging.path;
        const basePath: string | undefined = packaging.basePath || (opfPath ? opfPath.replace(/[^/]+$/, '') : undefined);
        const archiveRoot: string | undefined = (book as any).archive?.root;

        const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
        const joinPath = (...parts: (string | undefined)[]) =>
          parts.filter(Boolean).join('/').replace(/\/{2,}/g, '/').replace(/^\/+/, '');

        const lowerVariants = (p: string) => unique([p, p.toLowerCase()]);

        let candidates: string[] = unique([
          ...lowerVariants(baseItem),
          ...lowerVariants(joinPath('OEBPS', baseItem)),
          ...lowerVariants(basePath ? joinPath(basePath, baseItem) : ''),
          ...lowerVariants(archiveRoot ? joinPath(archiveRoot, baseItem) : ''),
        ]);

        // Also try removing accidental OEBPS duplication
        candidates = unique([
          ...candidates,
          ...candidates.map(k => k.replace(/^OEBPS\/+/i, '')),
          ...candidates.map(k => (k.startsWith('/') ? k.slice(1) : k)),
        ]);

        // Debug candidates once per call
        console.debug('EPUB ASSET RESOLVE', { relUrl, sectionHref, baseItem, opfPath, basePath, archiveRoot, candidates });

        // 1) Try resources.get()
        if (book?.resources?.get) {
          for (const key of candidates) {
            try {
              const res = book.resources.get(key);
              if (!res) continue;
              if (typeof res.createUrl === 'function') {
                const url = res.createUrl();
                if (url) return url;
              }
              if (typeof res.createBlobUrl === 'function') {
                const url = res.createBlobUrl();
                if (url) return url;
              }
              if (res.blob) {
                const blob = await res.blob();
                if (blob) return URL.createObjectURL(blob);
              }
              if (res.text) {
                const text = await res.text();
                const blob = new Blob([text], { type: res?.type || 'text/plain' });
                return URL.createObjectURL(blob);
              }
            } catch (e) {
              // continue
            }
          }
        }

        // 2) Try archive.getUrl()
        if (book?.archive?.getUrl) {
          for (const key of candidates) {
            try {
              const url = await book.archive.getUrl(key);
              if (typeof url === 'string' && url) return url;
            } catch (e) {
              // continue
            }
          }
        }

        // 3) Try archive.request(key, 'blob')
        if (book?.archive?.request) {
          for (const key of candidates) {
            try {
              const blob = await book.archive.request(key, 'blob');
              if (blob) return URL.createObjectURL(blob);
            } catch (e) {
              // continue
            }
          }
        }

        // As a very last resort, do not leave a path that the host will try to fetch
        console.warn('EPUB asset not resolved, using placeholder data URL:', { relUrl, baseItem, sectionHref, candidates });
        return PLACEHOLDER_1x1;
      } catch (e) {
        console.warn('resolveToBlobUrl failed for', relUrl, e);
        return PLACEHOLDER_1x1;
      }
    };
  
    // Helper: rewrite resource URLs inside chapter HTML to blob/object/data URLs via epubjs archive
    const rewriteResourceUrls = async (html: string, book: any, section: any): Promise<string> => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
  
        // Process elements with src/href that refer to local epub resources
        const tasks: Array<Promise<void>> = [];
  
        const processAttr = (el: Element, attr: 'src' | 'href') => {
          const current = el.getAttribute(attr);
          if (!current) return;
          // Skip anchors, http(s), data:, blob:
          if (current.startsWith('#') || /^https?:/i.test(current) || current.startsWith('data:') || current.startsWith('blob:')) {
            return;
          }
          tasks.push(
            (async () => {
              const resolved = await resolveToBlobUrl(book, section, current);
              if (resolved) {
                el.setAttribute(attr, resolved);
              }
            })()
          );
        };
  
        // Standard assets
        doc.querySelectorAll('img[src]').forEach(el => processAttr(el, 'src'));
        doc.querySelectorAll('source[src]').forEach(el => processAttr(el, 'src'));
        doc.querySelectorAll('video[src]').forEach(el => processAttr(el, 'src'));
        doc.querySelectorAll('audio[src]').forEach(el => processAttr(el, 'src'));
        doc.querySelectorAll('image[href], image[xlink\\:href]').forEach((el: any) => {
          if (el.hasAttribute('href')) processAttr(el, 'href');
          if (el.hasAttribute('xlink:href')) {
            const val = el.getAttribute('xlink:href');
            if (val && !/^https?:/i.test(val) && !val.startsWith('data:') && !val.startsWith('blob:') && !val.startsWith('#')) {
              tasks.push((async () => {
                const resolved = await resolveToBlobUrl(book, section, val);
                if (resolved) el.setAttribute('xlink:href', resolved);
              })());
            }
          }
        });
        doc.querySelectorAll('link[rel="stylesheet"][href]').forEach(el => processAttr(el, 'href'));
        doc.querySelectorAll('script[src]').forEach(el => processAttr(el, 'src'));
  
        // Handle srcset
        const processSrcset = (el: Element) => {
          const srcset = el.getAttribute('srcset');
          if (!srcset) return;
          const parts = srcset.split(',').map(s => s.trim());
          const rewrittenParts = parts.map(async part => {
            const m = part.match(/^(.+?)(\s+\d+[wx])?$/);
            if (!m) return part;
            const url = m[1].trim();
            const descriptor = m[2] || '';
            const resolved = await resolveToBlobUrl(book, section, url);
            return `${resolved}${descriptor}`;
          });
          tasks.push((async () => {
            const values = await Promise.all(rewrittenParts);
            el.setAttribute('srcset', values.join(', '));
          })());
        };
        doc.querySelectorAll('img[srcset], source[srcset]').forEach(el => processSrcset(el));
  
        // Inline style url()
        doc.querySelectorAll('[style]').forEach(el => {
          const style = el.getAttribute('style') || '';
          if (!/url\(/i.test(style)) return;
          const urls: string[] = [];
          style.replace(/url\(([^)]+)\)/gi, (_m, p1) => {
            let u = p1.trim().replace(/^['"]|['"]$/g, '');
            urls.push(u);
            return '';
          });
          urls.forEach(u => {
            tasks.push((async () => {
              const resolved = await resolveToBlobUrl(book, section, u);
              const newStyle = (el.getAttribute('style') || '').replace(new RegExp(`url\\((['"]?)${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\)`, 'g'), `url(${resolved})`);
              el.setAttribute('style', newStyle);
            })());
          });
        });
  
        await Promise.all(tasks);
  
        // Return only the body innerHTML to keep ChapterView simple
        const bodyEl = doc.body || doc.querySelector('body');
        return bodyEl ? bodyEl.innerHTML : doc.documentElement.innerHTML;
      } catch (e) {
        console.warn('rewriteResourceUrls failed, returning original html:', e);
        return html;
      }
    };

    try {
      const spine = book.spine;
      const section = spine.get(index);
      
      if (!section) {
        throw new Error('Chapter not found');
      }

      // Load the section
      const contents = await section.load(book.load.bind(book));

      // Debug logging to understand what epubjs returns
      console.log('=== EPUBJS CONTENT DEBUG ===');
      console.log('Type of contents:', typeof contents);
      console.log('Contents constructor:', contents?.constructor?.name);
      console.log('Is Document?', contents instanceof Document);
      console.log('Contents object:', contents);
      console.log('Contents keys:', contents ? Object.keys(contents) : 'null');

      if (contents) {
        console.log('Has documentElement?', 'documentElement' in contents);
        console.log('Has body?', 'body' in contents);
        console.log('Has innerHTML?', 'innerHTML' in contents);
        console.log('Has outerHTML?', 'outerHTML' in contents);
        console.log('Has querySelector?', 'querySelector' in contents);
        try { console.log('Contents.toString():', contents.toString()); } catch {}
      }

      // Always parse and extract BODY HTML to avoid injecting <head>/<base> influencing URL resolution
      const bodyOnlyHtml = extractBodyHtml(contents);

      // Rewrite resource URLs (images, stylesheets, svg images, scripts) to blob/object URLs via epubjs archive
      const rewritten = await rewriteResourceUrls(bodyOnlyHtml, book, section);

      console.log('Final BODY HTML (first 200 chars):', rewritten.substring(0, 200));
      console.log('=== END DEBUG ===');

      // Cache the result
      chapterCache.current.set(index, rewritten);

      // Preload adjacent chapters
      if (index > 0 && !chapterCache.current.has(index - 1)) {
        loadChapter(index - 1).catch(() => {});
      }
      if (index < chapters.length - 1 && !chapterCache.current.has(index + 1)) {
        loadChapter(index + 1).catch(() => {});
      }

      return rewritten;
    } catch (err) {
      console.error('Failed to load chapter:', err);
      throw new Error('Failed to load chapter content');
    }
  }, [book, chapters]);

  // Navigation methods
  const goToChapter = useCallback((index: number) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentChapter(index);
    }
  }, [chapters.length]);

  const nextChapter = useCallback(() => {
    if (currentChapter < chapters.length - 1) {
      setCurrentChapter(prev => prev + 1);
    }
  }, [currentChapter, chapters.length]);

  const prevChapter = useCallback(() => {
    if (currentChapter > 0) {
      setCurrentChapter(prev => prev - 1);
    }
  }, [currentChapter]);

  // Search functionality
  const searchBook = useCallback(async (query: string) => {
    if (!book || !query.trim()) {
      return [];
    }

    const results: Array<{
      chapterIndex: number;
      snippet: string;
      position: number;
    }> = [];

    try {
      // Search through each chapter
      for (let i = 0; i < chapters.length; i++) {
        const content = await loadChapter(i);
        
        // Strip HTML tags for searching
        const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Find matches
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        
        while ((match = regex.exec(textContent)) !== null) {
          const start = Math.max(0, match.index - 100);
          const end = Math.min(textContent.length, match.index + query.length + 100);
          const snippet = textContent.substring(start, end);
          
          results.push({
            chapterIndex: i,
            snippet: start > 0 ? '...' + snippet : snippet,
            position: (match.index / textContent.length) * 100
          });
          
          // Limit results per chapter
          if (results.filter(r => r.chapterIndex === i).length >= 5) {
            break;
          }
        }
        
        // Global limit
        if (results.length >= 50) {
          break;
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
    }

    return results;
  }, [book, chapters, loadChapter]);

  return {
    book,
    chapters,
    currentChapter,
    isLoading,
    error,
    loadingProgress,
    loadChapter,
    goToChapter,
    nextChapter,
    prevChapter,
    searchBook
  };
};