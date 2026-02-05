'use client';

import { FeedCategory } from '@/lib/types';

interface FilterTabsProps {
  activeFilter: FeedCategory;
  onFilterChange: (filter: FeedCategory) => void;
  counts: Record<FeedCategory, number>;
}

const filters: { key: FeedCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tools', label: 'Tools' },
  { key: 'news', label: 'News' },
  { key: 'tutorials', label: 'Tutorials' },
];

export default function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            activeFilter === key
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {label}
          <span className={`ml-2 text-xs ${activeFilter === key ? 'text-blue-200' : 'text-gray-500'}`}>
            {counts[key]}
          </span>
        </button>
      ))}
    </div>
  );
}
