export type FeedCategory = 'all' | 'workflows' | 'safety' | 'tools' | 'tutorials' | 'opensource';

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceIcon: string;
  date: Date;
  category: FeedCategory;
  quality?: 'hot' | 'top' | null;
  engagement?: number;
  relevanceScore?: number;
  whyMatters?: string;
  isNew?: boolean;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  source: string;
  sourceIcon: string;
  savedAt: number;
}
