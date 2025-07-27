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

export const renderHighlights = (container: HTMLElement, highlights: Highlight[]) => {
  if (!container || highlights.length === 0) return;
  
  try {
    // First, remove any existing highlights to start fresh
    removeExistingHighlights(container);
    
    // Sort highlights by start position to avoid overlap issues
    const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
    
    // Build ranges from text offsets and apply highlights
    const ranges: Array<{ range: Range; highlight: Highlight }> = [];
    
    // Create ranges for each highlight
    sortedHighlights.forEach(highlight => {
      try {
        const startInfo = findNodeAtOffset(container, highlight.startOffset);
        const endInfo = findNodeAtOffset(container, highlight.endOffset);
        
        if (startInfo && endInfo) {
          const range = document.createRange();
          range.setStart(startInfo.node, startInfo.offset);
          range.setEnd(endInfo.node, endInfo.offset);
          
          // Only add valid, non-collapsed ranges
          if (!range.collapsed && range.toString().trim().length > 0) {
            ranges.push({ range, highlight });
          }
        }
      } catch (err) {
        console.warn('Failed to create range for highlight:', highlight.id, err);
      }
    });
    
    // Apply highlights in reverse order to maintain proper DOM structure
    ranges.reverse().forEach(({ range, highlight }) => {
      try {
        const wrapper = document.createElement('mark');
        wrapper.setAttribute('data-highlight-id', highlight.id);
        wrapper.className = getHighlightClassName(highlight.color);
        wrapper.style.cursor = 'pointer';
        
        // Add click handler for highlight interaction
        wrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          // Could emit event or call callback here
        });
        
        range.surroundContents(wrapper);
      } catch (err) {
        // Fallback: extract contents and wrap manually
        try {
          const contents = range.extractContents();
          const wrapper = document.createElement('mark');
          wrapper.setAttribute('data-highlight-id', highlight.id);
          wrapper.className = getHighlightClassName(highlight.color);
          wrapper.style.cursor = 'pointer';
          wrapper.appendChild(contents);
          range.insertNode(wrapper);
        } catch (fallbackErr) {
          console.warn('Failed to apply highlight (fallback):', highlight.id, fallbackErr);
        }
      }
    });
    
  } catch (err) {
    console.warn('Failed to render highlights:', err);
  }
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

export const scrollToHighlight = (container: HTMLElement, highlightId: string) => {
  const element = container.querySelector(`[data-highlight-id="${highlightId}"]`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Add a temporary pulse effect
    element.classList.add('animate-pulse');
    setTimeout(() => {
      element.classList.remove('animate-pulse');
    }, 2000);
  }
};