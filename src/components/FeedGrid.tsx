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
      workflows: 0,
      safety: 0,
      tools: 0,
      tutorials: 0,
      opensource: 0,
    };
    
    for (const item of items) {
      if (item.category !== 'all') {
        result[item.category]++;
      }
    }
    
    return result;
  }, [items]);
  
  const filteredItems = useMemo(() => {
    let filtered = activeFilter === 'all' 
      ? items 
      : items.filter(item => item.category === activeFilter);
    
    // Sort by relevance score within each category view
    return filtered.sort((a, b) => {
      const aScore = a.relevanceScore || 0;
      const bScore = b.relevanceScore || 0;
      if (aScore !== bScore) return bScore - aScore;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
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
          <p className="text-4xl mb-3">🔍</p>
          <p>No items found for this filter.</p>
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
