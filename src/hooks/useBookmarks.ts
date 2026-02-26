'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bookmark, FeedItem } from '@/lib/types';

const STORAGE_KEY = 'ai-pulse-bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
    setIsLoaded(true);
  }, []);

  const isBookmarked = useCallback((url: string) => {
    return bookmarks.some(b => b.url === url);
  }, [bookmarks]);

  const addBookmark = useCallback((item: FeedItem) => {
    setBookmarks(prev => {
      if (prev.some(b => b.url === item.url)) return prev;
      
      const newBookmark: Bookmark = {
        id: item.id,
        url: item.url,
        title: item.title,
        source: item.source,
        sourceIcon: item.sourceIcon,
        savedAt: Date.now(),
      };
      
      const updated = [newBookmark, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeBookmark = useCallback((url: string) => {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.url !== url);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleBookmark = useCallback((item: FeedItem) => {
    if (isBookmarked(item.url)) {
      removeBookmark(item.url);
    } else {
      addBookmark(item);
    }
  }, [isBookmarked, addBookmark, removeBookmark]);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    bookmarks,
    isLoaded,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    clearBookmarks,
  };
}
