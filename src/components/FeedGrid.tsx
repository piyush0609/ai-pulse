'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FeedItem, FeedCategory } from '@/lib/types';
import { SOURCE_NAME_TO_ID, DEFAULT_SOURCE_ORDER } from '@/lib/sources';
import { useSourcePriority } from '@/hooks/useSourcePriority';
import { useBookmarks } from '@/hooks/useBookmarks';
import FeedCard from './FeedCard';
import SourcePriority from './SourcePriority';

interface FeedGridProps {
  initialItems: FeedItem[];
  initialFetchedAt?: string;
}

const filters: { key: FeedCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📊' },
  { key: 'workflows', label: 'Workflows', icon: '⚡' },
  { key: 'safety', label: 'Safety', icon: '🛡️' },
  { key: 'tools', label: 'Tools', icon: '🛠️' },
  { key: 'tutorials', label: 'Tutorials', icon: '📚' },
  { key: 'opensource', label: 'Open Source', icon: '🐙' },
];

const AUTO_REFRESH_KEY = 'ai-pulse-auto-refresh';
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000;

export default function FeedGrid({ initialItems, initialFetchedAt }: FeedGridProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [fetchedAt, setFetchedAt] = useState<string | null>(initialFetchedAt || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FeedCategory>('all');
  const [showReadingList, setShowReadingList] = useState(false);
  const { sourceOrder, isLoaded, updateOrder, resetOrder } = useSourcePriority();
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load auto-refresh preference
  useEffect(() => {
    const saved = localStorage.getItem(AUTO_REFRESH_KEY);
    if (saved === 'true') setAutoRefresh(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/feeds');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      
      const parsedItems = data.items.map((item: any) => ({
        ...item,
        date: new Date(item.date)
      }));
      
      setItems(parsedItems);
      setFetchedAt(data.fetchedAt);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      handleRefresh();
      intervalRef.current = setInterval(handleRefresh, AUTO_REFRESH_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, handleRefresh]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => {
      const newValue = !prev;
      localStorage.setItem(AUTO_REFRESH_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleRefresh();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  const lastUpdated = useMemo(() => {
    if (!fetchedAt) return null;
    const date = new Date(fetchedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }, [fetchedAt]);

  // Stats
  const newCount = useMemo(() => items.filter(i => i.isNew).length, [items]);

  // Calculate counts
  const counts: Record<FeedCategory, number> = {
    all: items.length,
    workflows: items.filter(i => i.category === 'workflows').length,
    safety: items.filter(i => i.category === 'safety').length,
    tools: items.filter(i => i.category === 'tools').length,
    tutorials: items.filter(i => i.category === 'tutorials').length,
    opensource: items.filter(i => i.category === 'opensource').length,
  };
  
  // Build source priority map
  const sourcePriorityMap = useMemo(() => {
    const map = new Map<string, number>();
    const order = isLoaded ? sourceOrder : DEFAULT_SOURCE_ORDER;
    order.forEach((id, index) => map.set(id, index));
    return map;
  }, [sourceOrder, isLoaded]);
  
  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = activeFilter === 'all' 
      ? [...items]
      : items.filter(item => item.category === activeFilter);
    
    return result.sort((a, b) => {
      const aSourceId = SOURCE_NAME_TO_ID[a.source] || 'unknown';
      const bSourceId = SOURCE_NAME_TO_ID[b.source] || 'unknown';
      
      const aPriority = sourcePriorityMap.get(aSourceId) ?? 999;
      const bPriority = sourcePriorityMap.get(bSourceId) ?? 999;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // New items first within same source
      if (a.isNew && !b.isNew) return -1;
      if (b.isNew && !a.isNew) return 1;
      
      const aScore = a.relevanceScore || 0;
      const bScore = b.relevanceScore || 0;
      if (aScore !== bScore) return bScore - aScore;
      
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [items, activeFilter, sourcePriorityMap]);

  return (
    <div>
      {/* Source Priority Customization */}
      <SourcePriority
        sourceOrder={sourceOrder}
        onReorder={updateOrder}
        onReset={resetOrder}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between mb-4 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Status */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-green-400'}`}></span>
            <span>Updated {lastUpdated}</span>
          </div>
          
          {/* New count badge */}
          {newCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-medium">
              {newCount} new
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Reading List toggle */}
          <button
            onClick={() => setShowReadingList(!showReadingList)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${showReadingList || bookmarks.length > 0
                ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            <svg className="w-4 h-4" fill={bookmarks.length > 0 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {bookmarks.length > 0 && <span>{bookmarks.length}</span>}
          </button>

          {/* Auto-refresh toggle */}
          <button
            onClick={toggleAutoRefresh}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${autoRefresh 
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            title={autoRefresh ? 'Auto-refresh every 10 min' : 'Enable auto-refresh'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
          </button>

          {/* Manual refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${isRefreshing 
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }
            `}
            title="Press R to refresh"
          >
            <svg 
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 rounded">R</kbd>
          </button>
        </div>
      </div>

      {/* Reading List Panel */}
      {showReadingList && bookmarks.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Reading List
            </h3>
            <span className="text-xs text-yellow-600 dark:text-yellow-400">{bookmarks.length} saved</span>
          </div>
          <div className="space-y-2">
            {bookmarks.slice(0, 5).map(bookmark => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
              >
                <span>{bookmark.sourceIcon}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{bookmark.title}</span>
                <span className="text-xs text-gray-400">{bookmark.source}</span>
              </a>
            ))}
            {bookmarks.length > 5 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center pt-2">
                +{bookmarks.length - 5} more saved
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              activeFilter === key
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
            <span className={`text-xs ${activeFilter === key ? 'text-blue-200' : 'text-gray-500'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>
      
      {/* Results */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p>No items found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item, index) => (
            <FeedCard 
              key={`${activeFilter}-${item.id}-${index}`} 
              item={item}
              isBookmarked={isBookmarked(item.url)}
              onBookmarkToggle={toggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
