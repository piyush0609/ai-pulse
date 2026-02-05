import Parser from 'rss-parser';
import { FeedItem, FeedCategory } from './types';

const parser = new Parser({
  customFields: {
    item: ['media:thumbnail', 'media:content'],
  },
});

// Helper to generate unique IDs
function generateId(source: string, title: string): string {
  return Buffer.from(`${source}-${title}`).toString('base64').slice(0, 16);
}

// Helper to categorize content based on keywords
function categorizeContent(title: string, description: string): FeedCategory {
  const text = `${title} ${description}`.toLowerCase();
  
  // Tips & Techniques
  if (
    text.includes('prompt') ||
    text.includes('technique') ||
    text.includes('how to') ||
    text.includes('guide') ||
    text.includes('tutorial') ||
    text.includes('workflow') ||
    text.includes('hallucination') ||
    text.includes('tips') ||
    text.includes('best practice') ||
    text.includes('fine-tun')
  ) {
    return 'tips';
  }
  
  // Open Source
  if (
    text.includes('open source') ||
    text.includes('opensource') ||
    text.includes('github') ||
    text.includes('hugging face') ||
    text.includes('huggingface') ||
    text.includes('llama') ||
    text.includes('mistral') ||
    text.includes('ollama') ||
    text.includes('local') ||
    text.includes('self-host') ||
    text.includes('weights') ||
    text.includes('gguf') ||
    text.includes('quantiz')
  ) {
    return 'opensource';
  }
  
  // Tools
  if (
    text.includes('tool') ||
    text.includes('app') ||
    text.includes('launch') ||
    text.includes('release') ||
    text.includes('product') ||
    text.includes('startup') ||
    text.includes('built') ||
    text.includes('introducing')
  ) {
    return 'tools';
  }
  
  return 'tools'; // Default to tools for practitioner focus
}

// Check if content is corporate fluff (to de-prioritize)
function isCorporateAnnouncement(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const corporateKeywords = [
    'openai announces',
    'google announces',
    'microsoft announces',
    'meta announces',
    'amazon announces',
    'partnership with',
    'raises $',
    'funding round',
    'valuation',
    'ipo',
    'quarterly earnings',
    'press release',
  ];
  return corporateKeywords.some(kw => text.includes(kw));
}

// Fetch GitHub Trending AI/ML repos
export async function fetchGitHubTrending(): Promise<FeedItem[]> {
  try {
    // Using GitHub's search API for recently updated AI/ML repos with good stars
    const response = await fetch(
      'https://api.github.com/search/repositories?q=topic:machine-learning+topic:artificial-intelligence+pushed:>2024-01-01&sort=stars&order=desc&per_page=20',
      { 
        next: { revalidate: 1800 },
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return data.items?.slice(0, 15).map((repo: any) => ({
      id: generateId('gh', repo.full_name),
      title: `${repo.name} - ${repo.description?.slice(0, 60) || 'AI/ML Project'}`,
      description: `⭐ ${repo.stargazers_count.toLocaleString()} stars • ${repo.language || 'Multi'} • ${repo.description?.slice(0, 150) || 'Open source AI project'}`,
      url: repo.html_url,
      source: 'GitHub',
      sourceIcon: '🐙',
      date: new Date(repo.pushed_at),
      category: 'opensource' as FeedCategory,
    })) || [];
  } catch (error) {
    console.error('Error fetching GitHub:', error);
    return [];
  }
}

// Fetch Hugging Face new models
export async function fetchHuggingFace(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=20&filter=text-generation',
      { next: { revalidate: 1800 } }
    );
    
    if (!response.ok) return [];
    
    const models = await response.json();
    
    return models.slice(0, 15).map((model: any) => ({
      id: generateId('hf', model.modelId || model.id),
      title: model.modelId || model.id,
      description: `🤗 ${model.downloads?.toLocaleString() || 0} downloads • ${model.likes || 0} likes • ${model.pipeline_tag || 'AI Model'}`,
      url: `https://huggingface.co/${model.modelId || model.id}`,
      source: 'Hugging Face',
      sourceIcon: '🤗',
      date: new Date(model.lastModified || Date.now()),
      category: 'opensource' as FeedCategory,
    }));
  } catch (error) {
    console.error('Error fetching Hugging Face:', error);
    return [];
  }
}

// Fetch Reddit r/LocalLLaMA
export async function fetchLocalLLaMA(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/LocalLLaMA/hot.json?limit=20',
      { 
        next: { revalidate: 1800 },
        headers: {
          'User-Agent': 'AI-Pulse/1.0',
        }
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return data.data.children
      .filter((post: any) => !post.data.stickied)
      .slice(0, 15)
      .map((post: any) => ({
        id: generateId('reddit', post.data.id),
        title: post.data.title,
        description: `⬆️ ${post.data.score} points • 💬 ${post.data.num_comments} comments`,
        url: `https://reddit.com${post.data.permalink}`,
        source: 'r/LocalLLaMA',
        sourceIcon: '🦙',
        date: new Date(post.data.created_utc * 1000),
        category: categorizeContent(post.data.title, post.data.selftext || ''),
      }));
  } catch (error) {
    console.error('Error fetching r/LocalLLaMA:', error);
    return [];
  }
}

// Fetch Reddit r/MachineLearning
export async function fetchMachineLearning(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/MachineLearning/hot.json?limit=20',
      { 
        next: { revalidate: 1800 },
        headers: {
          'User-Agent': 'AI-Pulse/1.0',
        }
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return data.data.children
      .filter((post: any) => !post.data.stickied)
      .slice(0, 12)
      .map((post: any) => ({
        id: generateId('rml', post.data.id),
        title: post.data.title,
        description: `⬆️ ${post.data.score} points • 💬 ${post.data.num_comments} comments • ${post.data.link_flair_text || 'Discussion'}`,
        url: `https://reddit.com${post.data.permalink}`,
        source: 'r/MachineLearning',
        sourceIcon: '🔬',
        date: new Date(post.data.created_utc * 1000),
        category: categorizeContent(post.data.title, post.data.selftext || ''),
      }));
  } catch (error) {
    console.error('Error fetching r/MachineLearning:', error);
    return [];
  }
}

// Fetch Hacker News AI posts (filtered for practitioner content)
export async function fetchHackerNews(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://hn.algolia.com/api/v1/search?query=LLM+prompt+local+ollama+huggingface&tags=story&hitsPerPage=25',
      { next: { revalidate: 1800 } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return data.hits
      .filter((hit: any) => !isCorporateAnnouncement(hit.title || '', hit.story_text || ''))
      .slice(0, 15)
      .map((hit: any) => ({
        id: generateId('hn', hit.title || hit.objectID),
        title: hit.title || 'Untitled',
        description: `${hit.points} points • ${hit.num_comments} comments`,
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

// Fetch Product Hunt AI tools (new launches only)
export async function fetchProductHunt(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://www.producthunt.com/feed?category=artificial-intelligence');
    
    return feed.items
      .filter(item => !isCorporateAnnouncement(item.title || '', item.contentSnippet || ''))
      .slice(0, 12)
      .map((item) => ({
        id: generateId('ph', item.title || item.guid || ''),
        title: item.title || 'Untitled',
        description: item.contentSnippet?.slice(0, 200) || 'New AI tool launch',
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

// Fetch AI papers (arXiv via RSS - practitioner focused)
export async function fetchArxivAI(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://rss.arxiv.org/rss/cs.AI');
    
    // Filter for practical/applicable papers
    const practicalKeywords = ['prompt', 'fine-tun', 'efficient', 'lightweight', 'practical', 'benchmark', 'evaluation', 'technique'];
    
    return feed.items
      .filter(item => {
        const text = `${item.title} ${item.contentSnippet}`.toLowerCase();
        return practicalKeywords.some(kw => text.includes(kw));
      })
      .slice(0, 10)
      .map((item) => ({
        id: generateId('arxiv', item.title || item.guid || ''),
        title: item.title?.replace(/\n/g, ' ') || 'AI Research Paper',
        description: item.contentSnippet?.slice(0, 200).replace(/\n/g, ' ') || 'New AI research',
        url: item.link || 'https://arxiv.org',
        source: 'arXiv AI',
        sourceIcon: '📄',
        date: item.pubDate ? new Date(item.pubDate) : new Date(),
        category: 'tips' as FeedCategory,
      }));
  } catch (error) {
    console.error('Error fetching arXiv:', error);
    return [];
  }
}

// Aggregate all feeds
export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled([
    fetchGitHubTrending(),
    fetchHuggingFace(),
    fetchLocalLLaMA(),
    fetchMachineLearning(),
    fetchHackerNews(),
    fetchProductHunt(),
    fetchArxivAI(),
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
