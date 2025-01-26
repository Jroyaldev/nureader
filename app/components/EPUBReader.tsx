'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import JSZip from 'jszip';
import {
  IoChevronBack,
  IoChevronForward,
  IoMenuOutline,
  IoBookmark,
  IoSearch,
  IoSunny,
  IoMoon,
  IoClose
} from 'react-icons/io5';
import { DOMParser, XMLSerializer } from 'xmldom';
import debounce from 'lodash.debounce';
import DOMPurify from 'dompurify';
import classNames from 'classnames';

interface EPUBReaderProps {
  file: File;
  onHighlight?: (text: string) => void;
}

interface EPUBChapter {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  level: number;
  content: string;
}

interface EPUBResource {
  id: string;
  href: string;
  mediaType: string;
  data: string;
}

/**
 * ControlsBar: Displays the top controls (TOC, bookmarks, search, etc.).
 */
const ControlsBar = ({
  onToggleTOC,
  onToggleBookmarks,
  onToggleSearch,
  onToggleTheme,
  theme,
  onIncreaseFont,
  onDecreaseFont,
  isLoading,
  currentChapter,
  chapters
}: {
  onToggleTOC: () => void;
  onToggleBookmarks: () => void;
  onToggleSearch: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
  isLoading: boolean;
  currentChapter: number;
  chapters: EPUBChapter[];
}) => (
  <div className="flex items-center justify-between mb-4 px-4">
    {/* Left Controls: TOC, Bookmarks */}
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleTOC}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Table of Contents"
      >
        <IoMenuOutline className="w-6 h-6 text-gray-800 dark:text-gray-200" />
      </button>
      <button
        onClick={onToggleBookmarks}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Bookmarks"
      >
        <IoBookmark className="w-6 h-6 text-gray-800 dark:text-gray-200" />
      </button>
    </div>

    {/* Middle: Chapter Title */}
    <div className="text-center flex-1 mx-4">
      <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {isLoading ? 'Loading...' : chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`}
      </div>
    </div>

    {/* Right Controls: Search, Theme Toggle, Font Size */}
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleSearch}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Search"
      >
        <IoSearch className="w-6 h-6 text-gray-800 dark:text-gray-200" />
      </button>
      <button
        onClick={onToggleTheme}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Toggle Theme"
      >
        {theme === 'light' ? (
          <IoMoon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        ) : (
          <IoSunny className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        )}
      </button>
      <button
        onClick={onIncreaseFont}
        className="px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Increase Font Size"
      >
        A+
      </button>
      <button
        onClick={onDecreaseFont}
        className="px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Decrease Font Size"
      >
        A-
      </button>
    </div>
  </div>
);

/**
 * Modal: Generic modal wrapper for content, used by TOC, Bookmarks, and Search.
 */
const Modal = ({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      {/* Modal Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          aria-label="Close"
        >
          <IoClose className="w-6 h-6" />
        </button>
      </div>

      {/* Modal Content */}
      <div className="overflow-auto flex-1 p-6">{children}</div>
    </div>
  </div>
);

/**
 * TOCModal: Displays the Table of Contents for the chapters, 
 * allowing the user to select which chapter to jump to.
 */
const TOCModal = ({
  chapters,
  currentChapter,
  onSelect,
  onClose
}: {
  chapters: EPUBChapter[];
  currentChapter: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) => (
  <Modal title="Contents" onClose={onClose}>
    <ul className="space-y-2">
      {chapters.map((chapter, index) => (
        <li key={chapter.id} className={`ml-${chapter.level * 4}`}>
          <button
            onClick={() => onSelect(index)}
            className={classNames(
              'w-full text-left p-2 rounded-md',
              {
                'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300':
                  index === currentChapter
              },
              'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            )}
          >
            <div className="font-medium">{chapter.title}</div>
            {chapter.subtitle && (
              <div className="text-sm text-gray-600 dark:text-gray-400">{chapter.subtitle}</div>
            )}
          </button>
        </li>
      ))}
    </ul>
  </Modal>
);

/**
 * BookmarksModal: Displays the user's bookmarked chapters.
 */
const BookmarksModal = ({
  bookmarks,
  chapters,
  onSelect,
  onClose
}: {
  bookmarks: number[];
  chapters: EPUBChapter[];
  onSelect: (index: number) => void;
  onClose: () => void;
}) => (
  <Modal title="Bookmarks" onClose={onClose}>
    {bookmarks.length === 0 ? (
      <div className="text-center text-gray-600 dark:text-gray-400">No bookmarks added.</div>
    ) : (
      <ul className="space-y-2">
        {bookmarks.map((chapterIndex) => (
          <li key={chapterIndex}>
            <button
              onClick={() => onSelect(chapterIndex)}
              className="w-full text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {chapters[chapterIndex]?.title || `Chapter ${chapterIndex + 1}`}
            </button>
          </li>
        ))}
      </ul>
    )}
  </Modal>
);

/**
 * SearchModal: Allows users to search across all chapters for a query,
 * displays a snippet, and lets them jump to the result.
 */
const SearchModal = ({
  query,
  onChange,
  results,
  currentIndex,
  onNavigate,
  onSelect,
  onClose
}: {
  query: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  results: { chapterIndex: number; snippet: string }[];
  currentIndex: number;
  onNavigate: (direction: 'next' | 'prev') => void;
  onSelect: (index: number) => void;
  onClose: () => void;
}) => (
  <Modal title="Search" onClose={onClose}>
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={onChange}
          placeholder="Enter search query..."
          className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      {/* Search Results */}
      {results.length > 0 ? (
        <>
          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => onNavigate('prev')}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Previous Result"
            >
              &#8592;
            </button>
            <span className="text-gray-800 dark:text-gray-200">
              {currentIndex + 1} / {results.length}
            </span>
            <button
              onClick={() => onNavigate('next')}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Next Result"
            >
              &#8594;
            </button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-auto">
            <ul className="space-y-4">
              {results.map((result, index) => (
                <li
                  key={index}
                  className={classNames(
                    'p-2 rounded-md',
                    {
                      'bg-blue-100 dark:bg-blue-900': index === currentIndex
                    },
                    'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  )}
                >
                  <button
                    onClick={() => onSelect(result.chapterIndex)}
                    className="w-full text-left"
                  >
                    <div
                      className="font-medium text-gray-800 dark:text-gray-200"
                      // Render the snippet with <mark> tags
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Chapter {result.chapterIndex + 1}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-600 dark:text-gray-400">No results found.</div>
      )}
    </div>
  </Modal>
);

/**
 * ProgressBar: Shows reading progress based on the current chapter index.
 */
const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="mt-4 px-4">
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
      <div
        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

/**
 * ReaderView: Displays the actual chapter content within a paginated view.
 */
const ReaderView = ({
  content,
  fontSize,
  theme,
  onNextChapter,
  onPrevChapter,
  isFirstChapter,
  isLastChapter
}: {
  content: string;
  fontSize: number;
  theme: 'light' | 'dark';
  onNextChapter: () => void;
  onPrevChapter: () => void;
  isFirstChapter: boolean;
  isLastChapter: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Calculate pages when content or fontSize changes
  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const calculatePages = () => {
      const container = containerRef.current!;
      const content = contentRef.current!;
      
      // Get the available height for content
      const pageHeight = container.clientHeight;
      const totalHeight = content.scrollHeight;
      const pages = Math.max(1, Math.ceil(totalHeight / pageHeight));
      
      setTotalPages(pages);
      setCurrentPage(1);
    };

    // Clean and set the content
    const cleanContent = DOMPurify.sanitize(content, {
      ADD_TAGS: ['image', 'svg'],
      ADD_ATTR: ['srcset', 'alt']
    });
    
    if (contentRef.current) {
      contentRef.current.innerHTML = cleanContent;
      // Wait for content to be rendered before calculating pages
      requestAnimationFrame(calculatePages);
    }

    const handleResize = debounce(calculatePages, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [content, fontSize]);

  // Handle page navigation
  const goToPage = (page: number) => {
    if (!containerRef.current || !contentRef.current) return;

    if (page < 1) {
      if (!isFirstChapter) {
        onPrevChapter();
      }
      return;
    }
    if (page > totalPages) {
      if (!isLastChapter) {
        onNextChapter();
      }
      return;
    }

    setCurrentPage(page);
    
    // Scroll content to the correct page
    const pageHeight = containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: (page - 1) * pageHeight,
      behavior: 'smooth'
    });
  };

  // Handle keyboard navigation in ReaderView
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if Ctrl key is pressed (reserved for chapter navigation)
      if (e.ctrlKey) return;

      // Handle page navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToPage(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)]">
      <div
        ref={containerRef}
        className={classNames(
          'flex-1 bg-white dark:bg-gray-900 rounded-xl overflow-hidden snap-y snap-mandatory',
          { 'text-gray-900 dark:text-gray-100': theme === 'dark' }
        )}
      >
        <div
          ref={contentRef}
          className="prose dark:prose-invert max-w-none p-8"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: '1.8'
          }}
        />
      </div>
      
      {/* Page Navigation */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1 && isFirstChapter}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          aria-label="Previous page"
        >
          <IoChevronBack className="w-5 h-5" />
          <span className="text-sm">Previous</span>
        </button>
        
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages && isLastChapter}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          aria-label="Next page"
        >
          <span className="text-sm">Next</span>
          <IoChevronForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default function EPUBReader({ file, onHighlight }: EPUBReaderProps) {
  // -------------------------------------------------
  // State variables
  // -------------------------------------------------
  const [chapters, setChapters] = useState<EPUBChapter[]>([]);
  const [resources, setResources] = useState<Map<string, EPUBResource>>(new Map());
  const [currentChapter, setCurrentChapter] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTOC, setShowTOC] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Bookmarks stored in localStorage for persistence
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    const stored = localStorage.getItem('epub-bookmarks');
    return stored ? JSON.parse(stored) : [];
  });

  // Theme preference stored in localStorage (light/dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('epub-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Font size stored in localStorage
  const [fontSize, setFontSize] = useState<number>(() => {
    const stored = localStorage.getItem('epub-fontSize');
    return stored ? parseInt(stored, 10) : 16;
  });

  // Search-related states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{ chapterIndex: number; snippet: string }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const [showSearch, setShowSearch] = useState<boolean>(false);

  // References
  const contentRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------
  // Effects and event handlers
  // -------------------------------------------------

  /**
   * Effect: Apply the theme (light/dark) to the document root.
   */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('epub-theme', theme);
  }, [theme]);

  /**
   * Effect: Save bookmarks whenever they change.
   */
  useEffect(() => {
    localStorage.setItem('epub-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  /**
   * Effect: Save font size whenever it changes.
   */
  useEffect(() => {
    localStorage.setItem('epub-fontSize', fontSize.toString());
  }, [fontSize]);

  /**
   * Effect: Load and parse the EPUB file whenever it changes.
   */
  useEffect(() => {
    const loadEpub = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setResources(new Map());

        // Initialize JSZip with the selected file
        const zip = new JSZip();
        const content = await zip.loadAsync(file);

        // Read container.xml
        const containerXml = await content.file('META-INF/container.xml')?.async('text');
        if (!containerXml) throw new Error('Invalid EPUB: Missing container.xml');

        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerXml, 'text/xml');
        const rootfile = containerDoc.getElementsByTagName('rootfile')[0];
        const opfPath = rootfile.getAttribute('full-path');
        if (!opfPath) throw new Error('Invalid EPUB: Missing OPF path');

        // Read OPF file
        const opfContent = await content.file(opfPath)?.async('text');
        if (!opfContent) throw new Error('Invalid EPUB: Missing OPF file');

        const opfDoc = parser.parseFromString(opfContent, 'application/xml');
        const manifest = opfDoc.getElementsByTagName('manifest')[0];
        const spine = opfDoc.getElementsByTagName('spine')[0];

        // Process manifest items
        const items = new Map<string, { id: string; href: string; mediaType: string }>();
        const resourcesMap = new Map<string, EPUBResource>();

        const manifestItems = Array.from(manifest.getElementsByTagName('item'));
        for (const item of manifestItems) {
          const id = item.getAttribute('id');
          const href = item.getAttribute('href');
          const mediaType = item.getAttribute('media-type');

          if (id && href && mediaType) {
            items.set(id, { id, href, mediaType });

            // Load binary resources (images, fonts, etc.) as base64
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
        }

        setResources(resourcesMap);

        // Process spine (the reading order of chapters)
        const spineItems = Array.from(spine.getElementsByTagName('itemref'))
          .map((itemref) => itemref.getAttribute('idref'))
          .filter((idref): idref is string => idref !== null);

        // Load chapters in order
        const loadedChapters: EPUBChapter[] = [];
        for (const [index, idref] of spineItems.entries()) {
          const item = items.get(idref);
          if (!item) continue;

          const baseDir = opfPath.split('/').slice(0, -1).join('/');
          const chapterPath = baseDir ? `${baseDir}/${item.href}` : item.href;
          const chapterContent = await content.file(chapterPath)?.async('text');
          if (!chapterContent) continue;

          // Process the XHTML content of this chapter
          const chapterData = await processChapterContent(chapterContent, resourcesMap, item.href, index + 1);
          loadedChapters.push({
            id: item.id,
            href: item.href,
            ...chapterData
          });
        }

        setChapters(loadedChapters);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading EPUB:', err);
        setError(err instanceof Error ? err.message : 'Failed to load the book');
        setIsLoading(false);
      }
    };

    loadEpub();
  }, [file]);

  /**
   * Function to process a single chapter's XHTML content:
   * - Parse the body
   * - Extract a title/subtitle if any
   * - Convert local image paths to base64 data URLs
   * - Sanitize the final HTML
   */
  const processChapterContent = async (
    chapterContent: string,
    resources: Map<string, EPUBResource>,
    chapterHref: string,
    chapterNumber: number
  ) => {
    const parser = new DOMParser();
    let contentElement: Element | null = null;
    let title = `Chapter ${chapterNumber}`;
    let subtitle = '';
    let level = 1; // Adjust if you want to track deeper structure

    try {
      // Attempt to parse as an XHTML/XML document
      const chapterDoc = parser.parseFromString(chapterContent, 'application/xhtml+xml');
      contentElement = chapterDoc.getElementsByTagName('body')[0];

      // Extract possible title from <title>, <h1>, <h2>...
      const mainTitle = chapterDoc.getElementsByTagName('title')[0]?.textContent || '';
      const h1 = chapterDoc.getElementsByTagName('h1')[0]?.textContent || '';
      const h2 = chapterDoc.getElementsByTagName('h2')[0]?.textContent || '';

      // Use the discovered titles
      title = mainTitle || h1 || title;
      if (h1 && h2) {
        title = h1;
        subtitle = h2;
      } else if (title.match(/^\s*[\w\s]+\s+\d+:\d+(?:-\d+)?\s*$/)) {
        // Example logic for certain title patterns (like bible verses)
        subtitle = title;
        title = h2 || `Chapter ${chapterNumber}`;
      }

      // Check if parser error
      if (chapterDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Failed to parse chapter content');
      }
    } catch (err) {
      console.warn('Primary parsing failed, trying fragment:', err);
    }

    // Fallback: try parsing as a fragment if <body> not found
    if (!contentElement) {
      try {
        const fragmentDoc = parser.parseFromString(
          `<div xmlns="http://www.w3.org/1999/xhtml">${chapterContent}</div>`,
          'application/xhtml+xml'
        );
        contentElement = fragmentDoc.documentElement;
      } catch (err) {
        console.error('Fragment parsing failed:', err);
        return { title, subtitle, level, content: chapterContent };
      }
    }

    // Serialize and process content
    let processedContent = chapterContent;
    if (contentElement instanceof Element) {
      try {
        const serializer = new XMLSerializer();
        processedContent = serializer
          .serializeToString(contentElement)
          .replace(/^<div[^>]*>/, '')
          .replace(/<\/div>$/, '')
          .replace(/<body[^>]*>/, '')
          .replace(/<\/body>/, '')
          .replace(/<hr/g, '<hr class="my-8 border-t border-gray-300 dark:border-gray-600"');
      } catch (err) {
        console.error('Content serialization failed:', err);
      }
    }

    // Normalize path for images. Attempt to resolve relative paths with the chapter's directory.
    const baseDir = chapterHref.split('/').slice(0, -1).join('/') + '/';

    processedContent = processedContent
      // Replace all src="..." occurrences
      .replace(/src="([^"]+)"/g, (match, originalSrc) => {
        // If it's already a data URL or an absolute http(s) link, leave it be
        if (originalSrc.startsWith('data:') || originalSrc.startsWith('http')) {
          return match;
        }

        // Attempt to normalize the path to match the resources map keys
        // E.g., if the originalSrc is "images/pic.jpg" and baseDir is "OEBPS/"
        // then the normalized path might be "OEBPS/images/pic.jpg" 
        let normalizedSrc = originalSrc;

        // Remove any leading "./"
        normalizedSrc = normalizedSrc.replace(/^\.\//, '');
        // Resolve ../ if it appears (simple approach, can be made more robust if needed)
        while (normalizedSrc.includes('../')) {
          const parts = baseDir.split('/');
          parts.pop(); // remove the last segment
          normalizedSrc = normalizedSrc.replace('../', '');
          // Rebuild the base directory after removing one level
          const newBase = parts.join('/');
          normalizedSrc = newBase ? `${newBase}/${normalizedSrc}` : normalizedSrc;
        }

        // If no ../ pattern, just join
        if (!normalizedSrc.startsWith(baseDir) && baseDir !== '/') {
          normalizedSrc = baseDir + normalizedSrc;
        }

        // Finally, get the resource if it exists
        // The key in `resources` is typically the relative path from the OPF base
        // So we strip the part before the actual filename to see if it matches
        const segments = normalizedSrc.split('/');
        const lastSegments = segments.slice(-2).join('/'); // e.g. "images/pic.jpg"

        // We'll try direct full normalized path or last-segments path
        let resource = resources.get(normalizedSrc);
        if (!resource) {
          resource = resources.get(lastSegments);
        }

        if (resource) {
          return `src="${resource.data}"`;
        } else {
          console.warn('Image resource not found for:', originalSrc, normalizedSrc);
          return match; // fallback, keep original src
        }
      })
      // Remove unwanted epub/xml attributes
      .replace(/xmlns="[^"]*"/g, '')
      .replace(/xmlns:epub="[^"]*"/g, '')
      .replace(/epub:type="[^"]*"/g, '')
      .replace(/xml:lang="[^"]*"/g, '');

    // Sanitize the processed content to prevent XSS attacks
    processedContent = DOMPurify.sanitize(processedContent);

    return { title, subtitle, level, content: processedContent };
  };

  /**
   * Effect: When the current chapter changes or resources are set,
   * ensure <img> tags get updated to base64 if we didn't catch them in the string replacement.
   */
  useEffect(() => {
    if (!contentRef.current || !resources.size) return;

    const images = contentRef.current.getElementsByTagName('img');
    Array.from(images).forEach((img) => {
      const src = img.getAttribute('src');
      if (src && resources.has(src)) {
        img.src = resources.get(src)!.data;
        img.loading = 'lazy'; // Enable native lazy loading
      }
    });
  }, [currentChapter, resources]);

  /**
   * Keyboard navigation: Left/Right arrows for pages, Ctrl+Left/Right for chapters
   */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle chapter navigation with Ctrl key
      if (e.ctrlKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevChapter();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextChapter();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTOC, showBookmarks, showSearch, currentChapter]);

  // -------------------------------------------------
  // Chapter navigation
  // -------------------------------------------------
  const handlePrevChapter = () => {
    if (currentChapter > 0) {
      setCurrentChapter((prev) => prev - 1);
      contentRef.current?.scrollTo(0, 0);
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < chapters.length - 1) {
      setCurrentChapter((prev) => prev + 1);
      contentRef.current?.scrollTo(0, 0);
    }
  };

  const handleChapterSelect = (index: number) => {
    setCurrentChapter(index);
    setShowTOC(false);
    contentRef.current?.scrollTo(0, 0);
  };

  // -------------------------------------------------
  // Bookmarks handling
  // -------------------------------------------------
  const toggleBookmark = () => {
    setBookmarks((prev) => {
      if (prev.includes(currentChapter)) {
        return prev.filter((chap) => chap !== currentChapter);
      } else {
        return [...prev, currentChapter];
      }
    });
  };

  const handleBookmarkSelect = (index: number) => {
    setCurrentChapter(index);
    setShowBookmarks(false);
    contentRef.current?.scrollTo(0, 0);
  };

  // -------------------------------------------------
  // Theme toggle
  // -------------------------------------------------
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // -------------------------------------------------
  // Font size
  // -------------------------------------------------
  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 2, 12));

  // -------------------------------------------------
  // Search functionality
  // -------------------------------------------------
  // Debounced search to avoid heavy processing on every keystroke
  const handleSearch = useMemo(
    () =>
      debounce((query: string) => {
        if (!query) {
          setSearchResults([]);
          return;
        }

        const results: { chapterIndex: number; snippet: string }[] = [];

        chapters.forEach((chapter, index) => {
          const regex = new RegExp(query, 'gi');
          let match;
          let foundCount = 0;
          while ((match = regex.exec(chapter.content)) !== null) {
            // Create a small snippet around the match
            const snippetStart = Math.max(match.index - 30, 0);
            const snippetEnd = Math.min(match.index + query.length + 30, chapter.content.length);
            let snippet = chapter.content.substring(snippetStart, snippetEnd);

            // Replace the matched term with <mark>
            snippet = snippet.replace(regex, (m) => `<mark>${m}</mark>`);

            results.push({ chapterIndex: index, snippet });
            foundCount++;
            // Limit to first 3 matches per chapter for brevity
            if (foundCount >= 3) break;
          }
        });

        setSearchResults(results);
        setCurrentSearchIndex(0);
      }, 500),
    [chapters]
  );

  // Update search query
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  // Navigate between search results (just highlight them in the modal UI)
  const navigateSearchResult = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prev) => {
      if (direction === 'next') {
        return prev < searchResults.length - 1 ? prev + 1 : 0;
      } else {
        return prev > 0 ? prev - 1 : searchResults.length - 1;
      }
    });
  };

  // -------------------------------------------------
  // Progress calculation
  // -------------------------------------------------
  const progress =
    chapters.length > 0
      ? Math.round((currentChapter / (chapters.length - 1)) * 100)
      : 0;

  // -------------------------------------------------
  // Render
  // -------------------------------------------------
  return (
    <div className={`flex flex-col h-full transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Reader controls */}
      <ControlsBar
        onToggleTOC={() => setShowTOC(true)}
        onToggleBookmarks={() => setShowBookmarks(true)}
        onToggleSearch={() => setShowSearch(true)}
        onToggleTheme={toggleTheme}
        theme={theme}
        onIncreaseFont={increaseFontSize}
        onDecreaseFont={decreaseFontSize}
        isLoading={isLoading}
        currentChapter={currentChapter}
        chapters={chapters}
      />

      {/* Table of Contents Modal */}
      {showTOC && (
        <TOCModal
          chapters={chapters}
          currentChapter={currentChapter}
          onSelect={handleChapterSelect}
          onClose={() => setShowTOC(false)}
        />
      )}

      {/* Bookmarks Modal */}
      {showBookmarks && (
        <BookmarksModal
          bookmarks={bookmarks}
          chapters={chapters}
          onSelect={handleBookmarkSelect}
          onClose={() => setShowBookmarks(false)}
        />
      )}

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          query={searchQuery}
          onChange={handleSearchChange}
          results={searchResults}
          currentIndex={currentSearchIndex}
          onNavigate={navigateSearchResult}
          onSelect={handleChapterSelect}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Reader Viewport */}
      <div ref={contentRef} className="flex-1 overflow-auto">
        <ReaderView
          content={
            isLoading || error || chapters.length === 0
              ? (error ? error : '') // If error, show error message
              : chapters[currentChapter]?.content || ''
          }
          fontSize={fontSize}
          theme={theme}
          onNextChapter={handleNextChapter}
          onPrevChapter={handlePrevChapter}
          isFirstChapter={currentChapter === 0}
          isLastChapter={currentChapter === chapters.length - 1}
        />
      </div>

      {/* Progress Bar */}
      <ProgressBar progress={progress} />

      {/* Floating Bookmark Button */}
      <button
        onClick={toggleBookmark}
        className="fixed bottom-8 right-8 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Toggle Bookmark"
      >
        {bookmarks.includes(currentChapter) ? <IoBookmark className="w-6 h-6" /> : <IoBookmark className="w-6 h-6" />}
      </button>
    </div>
  );
}
