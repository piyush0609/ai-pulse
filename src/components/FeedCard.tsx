'use client';

import { FeedItem } from '@/lib/types';

interface FeedCardProps {
  item: FeedItem;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const categoryColors: Record<string, string> = {
  tools: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  opensource: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  tips: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

const categoryLabels: Record<string, string> = {
  tools: '🛠️ Tool',
  opensource: '🐙 Open Source',
  tips: '💡 Tips',
};

export default function FeedCard({ item }: FeedCardProps) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{item.sourceIcon}</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {item.source}
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {formatDate(item.date)}
          </span>
        </div>
        
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {item.title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 flex-grow">
          {item.description}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-600'}`}>
            {categoryLabels[item.category] || item.category}
          </span>
          <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
            Read more →
          </span>
        </div>
      </div>
    </a>
  );
}
