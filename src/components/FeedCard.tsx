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

const categoryStyles: Record<string, { bg: string; label: string }> = {
  workflows: { 
    bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    label: '⚡ Workflow'
  },
  tools: { 
    bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    label: '🛠️ Tool'
  },
  tutorials: { 
    bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    label: '📚 Tutorial'
  },
  opensource: { 
    bg: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    label: '🐙 Open Source'
  },
};

const qualityBadges: Record<string, { icon: string; tooltip: string; style: string }> = {
  hot: { 
    icon: '🔥', 
    tooltip: 'Trending today',
    style: 'bg-orange-100 dark:bg-orange-900/50'
  },
  top: { 
    icon: '⭐', 
    tooltip: 'High quality',
    style: 'bg-yellow-100 dark:bg-yellow-900/50'
  },
};

export default function FeedCard({ item }: FeedCardProps) {
  const category = categoryStyles[item.category] || categoryStyles.workflows;
  const quality = item.quality ? qualityBadges[item.quality] : null;
  
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 h-full flex flex-col relative">
        {/* Quality badge */}
        {quality && (
          <div 
            className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${quality.style} flex items-center justify-center text-lg shadow-sm`}
            title={quality.tooltip}
          >
            {quality.icon}
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{item.sourceIcon}</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {item.source}
          </span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(item.date)}
          </span>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
          {item.title}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 flex-grow leading-relaxed">
          {item.description}
        </p>
        
        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${category.bg}`}>
            {category.label}
          </span>
          <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            Read →
          </span>
        </div>
      </div>
    </a>
  );
}
