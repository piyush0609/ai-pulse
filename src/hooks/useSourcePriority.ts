'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadSourceOrder, saveSourceOrder, DEFAULT_SOURCE_ORDER } from '@/lib/sources';

export function useSourcePriority() {
  const [sourceOrder, setSourceOrder] = useState<string[]>(DEFAULT_SOURCE_ORDER);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setSourceOrder(loadSourceOrder());
    setIsLoaded(true);
  }, []);

  // Save to localStorage when order changes
  const updateOrder = useCallback((newOrder: string[]) => {
    setSourceOrder(newOrder);
    saveSourceOrder(newOrder);
  }, []);

  // Move a source to a new position
  const moveSource = useCallback((fromIndex: number, toIndex: number) => {
    setSourceOrder(prev => {
      const newOrder = [...prev];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      saveSourceOrder(newOrder);
      return newOrder;
    });
  }, []);

  // Reset to default order
  const resetOrder = useCallback(() => {
    setSourceOrder(DEFAULT_SOURCE_ORDER);
    saveSourceOrder(DEFAULT_SOURCE_ORDER);
  }, []);

  return {
    sourceOrder,
    isLoaded,
    updateOrder,
    moveSource,
    resetOrder,
  };
}
