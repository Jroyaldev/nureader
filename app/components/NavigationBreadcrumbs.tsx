'use client';

import React, { useMemo, useState } from 'react';
import {
  IoBookOutline,
  IoChevronForward,
  IoDocumentTextOutline,
  IoCopyOutline,
  IoLayersOutline,
  IoHomeOutline
} from 'react-icons/io5';
import classNames from 'classnames';
import { NavigationBreadcrumb, NavigationContext } from './types';
import { useMobileCapabilities } from './useMobileTouch';

interface NavigationBreadcrumbsProps {
  navigationContext: NavigationContext;
  className?: string;
  compact?: boolean;
  showQuickJump?: boolean;
}

const NavigationBreadcrumbs = React.memo(({
  navigationContext,
  className,
  compact = false,
  showQuickJump = true
}: NavigationBreadcrumbsProps) => {
  const capabilities = useMobileCapabilities();
  const [showQuickJumpMenu, setShowQuickJumpMenu] = useState(false);

  // Truncate long titles for mobile
  const truncateTitle = (title: string, maxLength: number = 25): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  };

  // Get icon for breadcrumb type
  const getBreadcrumbIcon = (type: NavigationBreadcrumb['type']) => {
    const iconClasses = "w-4 h-4 flex-shrink-0";
    switch (type) {
      case 'book':
        return <IoBookOutline className={iconClasses} />;
      case 'chapter':
        return <IoDocumentTextOutline className={iconClasses} />;
      case 'section':
        return <IoLayersOutline className={iconClasses} />;
      case 'page':
        return <IoCopyOutline className={iconClasses} />;
      default:
        return <IoHomeOutline className={iconClasses} />;
    }
  };

  // Generate breadcrumb items with smart truncation
  const breadcrumbItems = useMemo(() => {
    const items = navigationContext.navigationPath;
    
    if (capabilities.isSmallScreen) {
      // On mobile, show only the most relevant breadcrumbs
      if (compact) {
        // Super compact: only current chapter and page
        const chapter = items.find(item => item.type === 'chapter');
        const page = items.find(item => item.type === 'page');
        return [chapter, page].filter(Boolean) as NavigationBreadcrumb[];
      } else {
        // Mobile: show last 3 breadcrumbs
        return items.slice(-3);
      }
    }
    
    return items;
  }, [navigationContext.navigationPath, capabilities.isSmallScreen, compact]);

  // Quick jump targets filtered and sorted
  const quickJumpTargets = useMemo(() => {
    return navigationContext.quickJumpTargets
      .slice(0, 8) // Limit to 8 items for UI performance
      .sort((a, b) => {
        // Sort by type priority then by position
        const typePriority = {
          'chapter-start': 1,
          'bookmark': 2,
          'highlight': 3,
          'search-result': 4,
          'chapter-end': 5
        };
        
        const aPriority = typePriority[a.type] || 6;
        const bPriority = typePriority[b.type] || 6;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return a.globalPageNumber - b.globalPageNumber;
      });
  }, [navigationContext.quickJumpTargets]);

  return (
    <div className={classNames(
      'flex items-center text-sm',
      'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
      'border-b border-gray-200/50 dark:border-gray-700/50',
      'transition-all duration-300',
      {
        'px-6 py-3': !capabilities.isSmallScreen,
        'px-4 py-2': capabilities.isSmallScreen,
        'py-1': compact
      },
      className
    )}>
      {/* Breadcrumb Navigation */}
      <nav 
        className="flex items-center flex-1 min-w-0"
        aria-label="Breadcrumb navigation"
      >
        <ol className="flex items-center space-x-1 min-w-0">
          {breadcrumbItems.map((item, index) => (
            <li key={`${item.type}-${item.position}`} className="flex items-center min-w-0">
              {index > 0 && (
                <IoChevronForward className="w-3 h-3 mx-1 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              )}
              
              <button
                onClick={item.onClick}
                className={classNames(
                  'flex items-center space-x-1.5 rounded-md px-2 py-1 transition-all duration-200',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                  'min-w-0 max-w-full',
                  {
                    'text-gray-600 dark:text-gray-400': index < breadcrumbItems.length - 1,
                    'text-gray-900 dark:text-gray-100 font-medium': index === breadcrumbItems.length - 1,
                    'cursor-default': index === breadcrumbItems.length - 1 && item.type === 'page'
                  }
                )}
                disabled={index === breadcrumbItems.length - 1 && item.type === 'page'}
                aria-current={index === breadcrumbItems.length - 1 ? 'page' : undefined}
              >
                {getBreadcrumbIcon(item.type)}
                <span className="truncate">
                  {capabilities.isSmallScreen 
                    ? truncateTitle(item.title, compact ? 15 : 20)
                    : truncateTitle(item.title, compact ? 20 : 40)
                  }
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Context Information */}
      {!compact && navigationContext.nearbyElements.currentSection && (
        <div className="hidden sm:flex items-center ml-4 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
          <IoLayersOutline className="w-3 h-3 mr-1.5 text-gray-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400 max-w-32 truncate">
            {navigationContext.nearbyElements.currentSection}
          </span>
        </div>
      )}

      {/* Quick Jump Menu */}
      {showQuickJump && quickJumpTargets.length > 0 && !compact && (
        <div className="relative ml-4">
          <button
            onClick={() => setShowQuickJumpMenu(!showQuickJumpMenu)}
            className={classNames(
              'flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all duration-200',
              'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
              {
                'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100': showQuickJumpMenu
              }
            )}
            aria-label="Quick navigation menu"
          >
            <IoLayersOutline className="w-4 h-4" />
            {!capabilities.isSmallScreen && (
              <span className="text-xs font-medium">Jump</span>
            )}
          </button>

          {/* Quick Jump Dropdown */}
          {showQuickJumpMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowQuickJumpMenu(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 z-50 w-80 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 py-2">
                    Quick Navigation
                  </div>
                  
                  <div className="space-y-1">
                    {quickJumpTargets.map((target, index) => (
                      <button
                        key={`${target.type}-${target.globalPageNumber}-${index}`}
                        onClick={() => {
                          target.onClick();
                          setShowQuickJumpMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 group"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {target.type === 'chapter-start' && <IoDocumentTextOutline className="w-4 h-4 text-blue-500" />}
                            {target.type === 'chapter-end' && <IoDocumentTextOutline className="w-4 h-4 text-gray-400" />}
                            {target.type === 'bookmark' && <IoBookOutline className="w-4 h-4 text-yellow-500" />}
                            {target.type === 'highlight' && <IoLayersOutline className="w-4 h-4 text-green-500" />}
                            {target.type === 'search-result' && <IoCopyOutline className="w-4 h-4 text-purple-500" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {target.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {target.description}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Page {target.globalPageNumber + 1}
                              {target.chapterIndex >= 0 && (
                                <span className="ml-1">• Chapter {target.chapterIndex + 1}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mobile Quick Access */}
      {capabilities.isSmallScreen && showQuickJump && quickJumpTargets.length > 0 && (
        <button
          onClick={() => setShowQuickJumpMenu(!showQuickJumpMenu)}
          className="ml-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Quick navigation"
        >
          <IoLayersOutline className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
});

NavigationBreadcrumbs.displayName = 'NavigationBreadcrumbs';

export default NavigationBreadcrumbs;