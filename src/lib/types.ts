export type FeedCategory = 'all' | 'tools' | 'news' | 'tutorials';

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceIcon: string;
  date: Date;
  category: FeedCategory;
}
