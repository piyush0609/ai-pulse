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
  quality?: 'hot' | 'top' | null; // 🔥 trending today, ⭐ high engagement
  engagement?: number;
  relevanceScore?: number; // 0-100 based on keyword matches
  whyMatters?: string; // One-liner on why this is useful
}
