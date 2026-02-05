'use client';

import { useState, useMemo } from 'react';
import { FeedItem, FeedCategory } from '@/lib/types';
import FeedCard from './FeedCard';
import FilterTabs from './FilterTabs';

interface FeedGridProps {
  items: FeedItem[];
}

export default function FeedGrid({ items }: FeedGridProps) {
  const [activeFilter, setActiveFilter] = useState<FeedCategory>('all');
  
  const counts = useMemo(() => {
    const result: Record<FeedCategory, number> = {
      all: items.length,
      tools: 0,
      news: 0,
      tutorials: 0,
    };
    
    for (const item of items) {
      if (item.category !== 'all') {
        result[item.category]++;
      }
    }
    
    return result;
  }, [items]);
  
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter(item => item.category === activeFilter);
  }, [items, activeFilter]);
  
  return (
    <div>
      <FilterTabs
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />
      
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No items found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
