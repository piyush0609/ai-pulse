import Parser from 'rss-parser';
import { FeedItem, FeedCategory } from './types';

const parser = new Parser();

// Helper to generate unique IDs
function generateId(source: string, title: string): string {
  return Buffer.from(`${source}-${title}`).toString('base64').slice(0, 16);
}

// Helper to categorize content based on keywords
function categorizeContent(title: string, description: string): FeedCategory {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('tutorial') || text.includes('guide') || text.includes('how to') || text.includes('learn') || text.includes('course')) {
    return 'tutorials';
  }
  if (text.includes('tool') || text.includes('app') || text.includes('launch') || text.includes('release') || text.includes('product') || text.includes('startup')) {
    return 'tools';
  }
  return 'news';
}

// Fetch Hacker News AI posts via Algolia API
export async function fetchHackerNews(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://hn.algolia.com/api/v1/search?query=AI+artificial+intelligence+LLM+GPT+machine+learning&tags=story&hitsPerPage=20',
      { next: { revalidate: 1800 } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return data.hits.map((hit: any) => ({
      id: generateId('hn', hit.title || hit.objectID),
      title: hit.title || 'Untitled',
      description: hit.story_text?.slice(0, 200) || `${hit.points} points • ${hit.num_comments} comments`,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source: 'Hacker News',
      sourceIcon: '🟠',
      date: new Date(hit.created_at),
      category: categorizeContent(hit.title || '', hit.story_text || ''),
    }));
  } catch (error) {
    console.error('Error fetching Hacker News:', error);
    return [];
  }
}

// Fetch Product Hunt AI launches via RSS
export async function fetchProductHunt(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://www.producthunt.com/feed?category=artificial-intelligence');
    
    return feed.items.slice(0, 15).map((item) => ({
      id: generateId('ph', item.title || item.guid || ''),
      title: item.title || 'Untitled',
      description: item.contentSnippet?.slice(0, 200) || item.content?.slice(0, 200) || 'New AI product launch',
      url: item.link || 'https://producthunt.com',
      source: 'Product Hunt',
      sourceIcon: '🚀',
      date: item.pubDate ? new Date(item.pubDate) : new Date(),
      category: 'tools' as FeedCategory,
    }));
  } catch (error) {
    console.error('Error fetching Product Hunt:', error);
    return [];
  }
}

// Fetch TechCrunch AI news
export async function fetchTechCrunch(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://techcrunch.com/category/artificial-intelligence/feed/');
    
    return feed.items.slice(0, 15).map((item) => ({
      id: generateId('tc', item.title || item.guid || ''),
      title: item.title || 'Untitled',
      description: item.contentSnippet?.slice(0, 200) || 'TechCrunch AI news',
      url: item.link || 'https://techcrunch.com',
      source: 'TechCrunch',
      sourceIcon: '💚',
      date: item.pubDate ? new Date(item.pubDate) : new Date(),
      category: categorizeContent(item.title || '', item.contentSnippet || ''),
    }));
  } catch (error) {
    console.error('Error fetching TechCrunch:', error);
    return [];
  }
}

// Fetch AI News
export async function fetchAINews(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://www.artificialintelligence-news.com/feed/');
    
    return feed.items.slice(0, 15).map((item) => ({
      id: generateId('ainews', item.title || item.guid || ''),
      title: item.title || 'Untitled',
      description: item.contentSnippet?.slice(0, 200) || 'AI News update',
      url: item.link || 'https://www.artificialintelligence-news.com',
      source: 'AI News',
      sourceIcon: '🤖',
      date: item.pubDate ? new Date(item.pubDate) : new Date(),
      category: categorizeContent(item.title || '', item.contentSnippet || ''),
    }));
  } catch (error) {
    console.error('Error fetching AI News:', error);
    return [];
  }
}

// Fetch MIT Technology Review
export async function fetchMITReview(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://www.technologyreview.com/feed/');
    
    // Filter for AI-related content
    const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'gpt', 'llm', 'chatbot', 'openai', 'google', 'anthropic'];
    
    const aiItems = feed.items.filter(item => {
      const text = `${item.title} ${item.contentSnippet}`.toLowerCase();
      return aiKeywords.some(keyword => text.includes(keyword));
    });
    
    return aiItems.slice(0, 10).map((item) => ({
      id: generateId('mit', item.title || item.guid || ''),
      title: item.title || 'Untitled',
      description: item.contentSnippet?.slice(0, 200) || 'MIT Technology Review',
      url: item.link || 'https://www.technologyreview.com',
      source: 'MIT Tech Review',
      sourceIcon: '🎓',
      date: item.pubDate ? new Date(item.pubDate) : new Date(),
      category: categorizeContent(item.title || '', item.contentSnippet || ''),
    }));
  } catch (error) {
    console.error('Error fetching MIT Review:', error);
    return [];
  }
}

// Aggregate all feeds
export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled([
    fetchHackerNews(),
    fetchProductHunt(),
    fetchTechCrunch(),
    fetchAINews(),
    fetchMITReview(),
  ]);
  
  const allItems: FeedItem[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }
  
  // Sort by date, newest first
  return allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
