'use client';

import { FeedCategory } from '@/lib/types';

interface FilterTabsProps {
  activeFilter: FeedCategory;
  onFilterChange: (filter: FeedCategory) => void;
  counts: Record<FeedCategory, number>;
}

const filters: { key: FeedCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📊' },
  { key: 'workflows', label: 'Workflows', icon: '⚡' },
  { key: 'safety', label: 'Safety', icon: '🛡️' },
  { key: 'tools', label: 'Tools', icon: '🛠️' },
  { key: 'tutorials', label: 'Tutorials', icon: '📚' },
  { key: 'opensource', label: 'Open Source', icon: '🐙' },
];

export default function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
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
  );
}
