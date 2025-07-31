import { Highlight, HighlightRange } from './types';

export const getTextSelection = (): HighlightRange | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  return {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset
  };
};

export const getSelectedText = (): string => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return '';
  }
  return selection.toString().trim();
};

export const clearSelection = () => {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
};

export const getSelectionCoordinates = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  return {
    x: rect.left + rect.width / 2,
    y: rect.top
  };
};

export const calculateTextOffset = (container: HTMLElement, node: Node, offset: number): number => {
  let totalOffset = 0;
  let currentNode: Node | null = container.firstChild;
  
  while (currentNode) {
    if (currentNode === node) {
      return totalOffset + offset;
    }
    
    if (currentNode.nodeType === Node.TEXT_NODE) {
      totalOffset += currentNode.textContent?.length || 0;
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const innerOffset = calculateTextOffset(currentNode as HTMLElement, node, offset);
      if (innerOffset !== -1) {
        return totalOffset + innerOffset;
      }
      totalOffset += (currentNode.textContent?.length || 0);
    }
    
    currentNode = currentNode.nextSibling;
  }
  
  return -1;
};

export const findNodeAtOffset = (container: HTMLElement, targetOffset: number): { node: Node; offset: number } | null => {
  let currentOffset = 0;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node: Node | null = walker.nextNode();
  
  while (node) {
    const nodeLength = node.textContent?.length || 0;
    if (currentOffset + nodeLength >= targetOffset) {
      return {
        node,
        offset: targetOffset - currentOffset
      };
    }
    currentOffset += nodeLength;
    node = walker.nextNode();
  }
  
  return null;
};

export const renderHighlights = (container: HTMLElement, highlights: Highlight[], onHighlightClick?: (highlight: Highlight) => void) => {
  if (!container || highlights.length === 0) {
    removeExistingHighlights(container);
    return;
  }
  
  try {
    // First, remove any existing highlights to start fresh
    removeExistingHighlights(container);
    
    // Filter out invalid highlights and sort by start position
    const validHighlights = highlights.filter(h => 
      h.startOffset >= 0 && 
      h.endOffset > h.startOffset && 
      h.text && 
      h.text.trim().length > 0
    ).sort((a, b) => a.startOffset - b.startOffset);
    
    if (validHighlights.length === 0) return;
    
    // Build ranges from text offsets and apply highlights
    const ranges: Array<{ range: Range; highlight: Highlight }> = [];
    
    // Create ranges for each highlight with better error handling
    validHighlights.forEach(highlight => {
      try {
        const startInfo = findNodeAtOffset(container, highlight.startOffset);
        const endInfo = findNodeAtOffset(container, highlight.endOffset);
        
        if (startInfo && endInfo && startInfo.node && endInfo.node) {
          const range = document.createRange();
          
          // Validate offsets before setting range
          const startOffset = Math.max(0, Math.min(startInfo.offset, startInfo.node.textContent?.length || 0));
          const endOffset = Math.max(0, Math.min(endInfo.offset, endInfo.node.textContent?.length || 0));
          
          range.setStart(startInfo.node, startOffset);
          range.setEnd(endInfo.node, endOffset);
          
          // Validate range content matches expected text
          const rangeText = range.toString().trim();
          if (!range.collapsed && rangeText.length > 0) {
            // Check if the range text roughly matches the highlight text
            const similarity = calculateTextSimilarity(rangeText, highlight.text.trim());
            if (similarity > 0.7) { // 70% similarity threshold
              ranges.push({ range, highlight });
            } else {
              console.warn(`Text mismatch for highlight ${highlight.id}: expected '${highlight.text}', found '${rangeText}'`);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to create range for highlight:', highlight.id, err);
      }
    });
    
    // Apply highlights in reverse order to maintain proper DOM structure
    ranges.reverse().forEach(({ range, highlight }) => {
      try {
        // Check if range is still valid (DOM might have changed)
        if (range.collapsed || !range.commonAncestorContainer) {
          return;
        }
        
        const wrapper = document.createElement('mark');
        wrapper.setAttribute('data-highlight-id', highlight.id);
        wrapper.setAttribute('data-highlight-color', highlight.color);
        wrapper.className = getHighlightClassName(highlight.color);
        wrapper.style.cursor = 'pointer';
        wrapper.title = highlight.note || `Highlight: ${highlight.text.substring(0, 50)}...`;
        
        // Add click handler for highlight interaction
        wrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          onHighlightClick?.(highlight);
        });
        
        // Try to surround contents, with improved fallback
        try {
          range.surroundContents(wrapper);
        } catch (surroundErr) {
          // Advanced fallback: handle complex DOM structures
          const contents = range.extractContents();
          wrapper.appendChild(contents);
          range.insertNode(wrapper);
        }
      } catch (err) {
        console.warn('Failed to apply highlight:', highlight.id, err);
      }
    });
    
    // Normalize the container to merge adjacent text nodes
    container.normalize();
    
  } catch (err) {
    console.error('Critical error in renderHighlights:', err);
  }
};

// Helper function to calculate text similarity
const calculateTextSimilarity = (text1: string, text2: string): number => {
  const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();
  const norm1 = normalize(text1);
  const norm2 = normalize(text2);
  
  if (norm1 === norm2) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;
  
  // Simple similarity based on common characters
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  if (longer.includes(shorter)) return shorter.length / longer.length;
  
  // Levenshtein distance approximation
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
};

const removeExistingHighlights = (container: HTMLElement) => {
  const highlights = container.querySelectorAll('[data-highlight-id]');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    if (parent) {
      // Move children out of the highlight wrapper
      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight);
      }
      // Remove the empty wrapper
      parent.removeChild(highlight);
    }
  });
  
  // Normalize text nodes to merge adjacent text nodes
  container.normalize();
};

export const getHighlightClassName = (color: Highlight['color']) => {
  const classes = {
    yellow: 'bg-yellow-200 dark:bg-yellow-700/50',
    green: 'bg-green-200 dark:bg-green-700/50',
    blue: 'bg-blue-200 dark:bg-blue-700/50',
    pink: 'bg-pink-200 dark:bg-pink-700/50',
    orange: 'bg-orange-200 dark:bg-orange-700/50'
  };
  return classes[color];
};

export const scrollToHighlight = (container: HTMLElement, highlightId: string, options?: { behavior?: 'smooth' | 'instant'; block?: 'start' | 'center' | 'end' }) => {
  try {
    const highlightElement = container.querySelector(`[data-highlight-id="${highlightId}"]`) as HTMLElement;
    
    if (!highlightElement) {
      console.warn(`Highlight element with ID ${highlightId} not found`);
      return false;
    }
    
    // Default scroll options
    const scrollOptions = {
      behavior: options?.behavior || 'smooth' as ScrollBehavior,
      block: options?.block || 'center' as ScrollLogicalPosition,
      inline: 'nearest' as ScrollLogicalPosition
    };
    
    // Check if element is already visible
    const rect = highlightElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const isVisible = (
      rect.top >= containerRect.top &&
      rect.bottom <= containerRect.bottom &&
      rect.left >= containerRect.left &&
      rect.right <= containerRect.right
    );
    
    if (isVisible && options?.behavior !== 'instant') {
      // Element is already visible, just add a visual indicator
      highlightElement.style.transition = 'box-shadow 0.3s ease';
      highlightElement.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
      
      setTimeout(() => {
        highlightElement.style.boxShadow = '';
        highlightElement.style.transition = '';
      }, 1000);
      
      return true;
    }
    
    // Scroll to the element
    try {
      highlightElement.scrollIntoView(scrollOptions);
    } catch (scrollErr) {
      // Fallback for older browsers
      highlightElement.scrollIntoView(true);
    }
    
    // Add visual feedback after scrolling
    setTimeout(() => {
      if (highlightElement.isConnected) {
        highlightElement.style.transition = 'box-shadow 0.3s ease';
        highlightElement.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
        
        setTimeout(() => {
          highlightElement.style.boxShadow = '';
          highlightElement.style.transition = '';
        }, 1000);
      }
    }, 100);
    
    return true;
    
  } catch (err) {
    console.error('Error scrolling to highlight:', err);
    return false;
  }
};