export type FeedCategory = 'all' | 'workflows' | 'tools' | 'tutorials' | 'opensource';

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
  engagement?: number; // For sorting/scoring
}
