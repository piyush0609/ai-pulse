import Parser from 'rss-parser';
import { FeedItem, FeedCategory } from './types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; AI-Pulse/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
});

function generateId(source: string, title: string): string {
  return Buffer.from(`${source}-${title}`).toString('base64').slice(0, 16);
}

// ============================================
// RELEVANCE SCORING
// ============================================
const RELEVANCE_KEYWORDS: Record<string, number> = {
  // High value (20 points)
  'prompt': 20, 'workflow': 20, 'chain': 20, 'agent': 20, 'rag': 20,
  'hallucination': 20, 'guardrail': 20, 'local': 15, 'ollama': 20,
  'safety': 20, 'privacy': 20, 'injection': 20, 'jailbreak': 20,
  'mcp': 20, 'model context protocol': 20, 'computer use': 20,
  
  // Medium value (10 points)
  'tool use': 10, 'function call': 10, 'structured output': 10,
  'embedding': 10, 'vector': 10, 'retrieval': 10, 'context': 10,
  'fine-tun': 10, 'lora': 10, 'quantiz': 10, 'gguf': 10,
  'cursor': 10, 'aider': 10, 'continue': 10, 'copilot': 10,
  'langchain': 10, 'llamaindex': 10, 'dspy': 10, 'autogen': 10,
  'benchmark': 10, 'eval': 10, 'leaderboard': 10,
  
  // Standard value (5 points)
  'llm': 5, 'gpt': 5, 'claude': 5, 'gemini': 5, 'llama': 5,
  'mistral': 5, 'tutorial': 5, 'guide': 5, 'how to': 5,
  'open source': 5, 'github': 5, 'self-host': 5,
  'openai': 5, 'anthropic': 5, 'google': 5, 'meta': 5,
};

function calculateRelevanceScore(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;
  
  for (const [keyword, points] of Object.entries(RELEVANCE_KEYWORDS)) {
    if (text.includes(keyword)) {
      score += points;
    }
  }
  
  return Math.min(score, 100);
}

// ============================================
// CATEGORIZATION
// ============================================
function categorizeContent(title: string, description: string): FeedCategory {
  const text = `${title} ${description}`.toLowerCase();
  
  const safetyKeywords = [
    'safety', 'safe', 'privacy', 'private', 'guardrail', 'guard',
    'hallucination', 'hallucinat', 'injection', 'jailbreak', 'attack',
    'security', 'secure', 'leak', 'sensitive', 'pii', 'gdpr',
    'alignment', 'interpretability', 'red team', 'adversarial',
  ];
  
  const workflowKeywords = [
    'prompt', 'chain', 'workflow', 'agent', 'rag', 'retrieval',
    'structured output', 'function call', 'tool use', 'system prompt',
    'few-shot', 'zero-shot', 'cot', 'chain of thought', 'reasoning',
    'mcp', 'model context', 'computer use', 'agentic',
  ];
  
  const tutorialKeywords = [
    'how i built', 'how to', 'tutorial', 'guide', 'walkthrough',
    'step by step', 'building', 'my setup', 'lesson', 'learned',
  ];
  
  const toolKeywords = [
    'cursor', 'continue', 'aider', 'copilot', 'cody', 'tabnine',
    'langchain', 'llamaindex', 'semantic kernel', 'autogen',
    'tool', 'extension', 'plugin', 'cli', 'app', 'launch', 'release',
  ];
  
  const osKeywords = [
    'open source', 'opensource', 'github', 'repo', 'llama', 'mistral',
    'ollama', 'local', 'self-host', 'weights', 'gguf', 'quantiz',
    'fine-tun', 'lora', 'training', 'hugging face', 'model release',
  ];
  
  const scores: Record<FeedCategory, number> = {
    all: 0,
    safety: safetyKeywords.filter(kw => text.includes(kw)).length,
    workflows: workflowKeywords.filter(kw => text.includes(kw)).length,
    tutorials: tutorialKeywords.filter(kw => text.includes(kw)).length,
    tools: toolKeywords.filter(kw => text.includes(kw)).length,
    opensource: osKeywords.filter(kw => text.includes(kw)).length,
  };
  
  let bestCategory: FeedCategory = 'tools';
  let bestScore = 0;
  
  for (const [cat, score] of Object.entries(scores)) {
    if (cat !== 'all' && score > bestScore) {
      bestScore = score;
      bestCategory = cat as FeedCategory;
    }
  }
  
  return bestCategory;
}

function getQuality(engagement: number, hoursAgo: number): 'hot' | 'top' | null {
  if (hoursAgo < 24 && engagement > 50) return 'hot';
  if (engagement > 200) return 'top';
  return null;
}

function hoursAgo(date: Date): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

function isNew(date: Date): boolean {
  return hoursAgo(date) < 24;
}

// ============================================
// SOURCE: Simon Willison's Blog
// ============================================
export async function fetchSimonWillison(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://simonwillison.net/atom/everything/');
    
    return feed.items.slice(0, 12).map((item) => {
      const date = item.pubDate ? new Date(item.pubDate) : new Date();
      const title = item.title || 'Untitled';
      const desc = item.contentSnippet?.slice(0, 250) || 'Practical AI insights';
      const category = categorizeContent(title, desc);
      
      return {
        id: generateId('simon', title),
        title,
        description: desc,
        url: item.link || 'https://simonwillison.net',
        source: 'Simon Willison',
        sourceIcon: '🧠',
        date,
        category,
        quality: 'top' as const,
        relevanceScore: calculateRelevanceScore(title, desc),
        isNew: isNew(date),
      };
    });
  } catch (error) {
    console.error('Error fetching Simon Willison:', error);
    return [];
  }
}

// ============================================
// SOURCE: Latent Space
// ============================================
export async function fetchLatentSpace(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://www.latent.space/feed');
    
    return feed.items.slice(0, 8).map((item) => {
      const date = item.pubDate ? new Date(item.pubDate) : new Date();
      const title = item.title || 'Untitled';
      const desc = item.contentSnippet?.slice(0, 250) || 'AI engineering insights';
      const category = categorizeContent(title, desc);
      
      return {
        id: generateId('latent', title),
        title,
        description: desc,
        url: item.link || 'https://latent.space',
        source: 'Latent Space',
        sourceIcon: '🎙️',
        date,
        category,
        quality: 'top' as const,
        relevanceScore: calculateRelevanceScore(title, desc),
        isNew: isNew(date),
      };
    });
  } catch (error) {
    console.error('Error fetching Latent Space:', error);
    return [];
  }
}

// ============================================
// SOURCE: OpenAI Blog
// ============================================
export async function fetchOpenAI(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://openai.com/blog/rss.xml');
    
    return feed.items.slice(0, 8).map((item) => {
      const date = item.pubDate ? new Date(item.pubDate) : new Date();
      const title = item.title || 'OpenAI Update';
      const desc = item.contentSnippet?.slice(0, 250) || 'Official OpenAI announcement';
      const category = categorizeContent(title, desc);
      
      return {
        id: generateId('openai', title),
        title,
        description: desc,
        url: item.link || 'https://openai.com/blog',
        source: 'OpenAI',
        sourceIcon: '🟢',
        date,
        category: category === 'tools' ? 'workflows' : category,
        quality: 'top' as const,
        relevanceScore: calculateRelevanceScore(title, desc + ' openai gpt'),
        isNew: isNew(date),
      };
    });
  } catch (error) {
    console.error('Error fetching OpenAI:', error);
    return [];
  }
}

// ============================================
// SOURCE: Anthropic (HTML scraping)
// ============================================
export async function fetchAnthropic(): Promise<FeedItem[]> {
  try {
    const response = await fetch('https://www.anthropic.com/news', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 1800 },
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const items: FeedItem[] = [];
    
    // Extract /news/ links
    const newsLinks = html.match(/href="(\/news\/[^"#]+)"/g) || [];
    const uniqueLinks = [...new Set(newsLinks.map(l => l.replace('href="', '').replace('"', '')))];
    
    // Extract dates
    const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi;
    const dates = html.match(datePattern) || [];
    
    for (let i = 0; i < Math.min(uniqueLinks.length, 6); i++) {
      const link = uniqueLinks[i];
      if (!link || link === '/news') continue;
      
      const slug = link.split('/').pop() || '';
      const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const dateStr = dates[i];
      const date = dateStr ? new Date(dateStr) : new Date();
      
      items.push({
        id: generateId('anthropic', link),
        title,
        description: 'Official Anthropic announcement',
        url: `https://www.anthropic.com${link}`,
        source: 'Anthropic',
        sourceIcon: '🅰️',
        date,
        category: 'safety',
        quality: 'top' as const,
        relevanceScore: calculateRelevanceScore(title, 'claude anthropic ai safety'),
        isNew: isNew(date),
      });
    }
    
    return items;
  } catch (error) {
    console.error('Error fetching Anthropic:', error);
    return [];
  }
}

// ============================================
// SOURCE: Hugging Face Trending
// ============================================
export async function fetchHuggingFace(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://huggingface.co/api/models?sort=likes7d&direction=-1&limit=12',
      { 
        next: { revalidate: 1800 },
        headers: { 'Accept': 'application/json' }
      }
    );
    
    if (!response.ok) return [];
    const models = await response.json();
    
    return models.slice(0, 10).map((model: any) => {
      const date = model.lastModified ? new Date(model.lastModified) : new Date();
      const title = model.id || 'Unknown Model';
      const desc = `🤗 ${model.downloads?.toLocaleString() || '?'} downloads • ${model.likes?.toLocaleString() || '?'} likes • ${model.pipeline_tag || 'model'}`;
      
      return {
        id: generateId('hf', model.id),
        title,
        description: desc,
        url: `https://huggingface.co/${model.id}`,
        source: 'Hugging Face',
        sourceIcon: '🤗',
        date,
        category: 'opensource' as FeedCategory,
        quality: model.likes > 100 ? 'hot' as const : null,
        engagement: model.likes || 0,
        relevanceScore: calculateRelevanceScore(title, model.pipeline_tag || ''),
        isNew: isNew(date),
      };
    });
  } catch (error) {
    console.error('Error fetching Hugging Face:', error);
    return [];
  }
}

// ============================================
// SOURCE: GitHub Trending
// ============================================
export async function fetchGitHubTrending(): Promise<FeedItem[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];
    
    const query = encodeURIComponent(
      `(topic:llm OR topic:ai-agent OR topic:prompt-engineering OR topic:local-llm OR topic:rag) pushed:>${dateFilter}`
    );
    
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=15`,
      { 
        next: { revalidate: 1800 },
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    return (data.items || []).slice(0, 12).map((repo: any) => {
      const date = new Date(repo.pushed_at);
      const hours = hoursAgo(date);
      const title = repo.name;
      const desc = `⭐ ${repo.stargazers_count.toLocaleString()} • ${repo.description?.slice(0, 150) || 'AI tool'}`;
      const category = categorizeContent(title, repo.description || '');
      
      return {
        id: generateId('gh', repo.full_name),
        title,
        description: desc,
        url: repo.html_url,
        source: 'GitHub',
        sourceIcon: '🐙',
        date,
        category: category === 'workflows' ? 'opensource' : category,
        quality: getQuality(repo.stargazers_count / 10, hours),
        engagement: repo.stargazers_count,
        relevanceScore: calculateRelevanceScore(title, repo.description || ''),
        isNew: isNew(date),
      };
    });
  } catch (error) {
    console.error('Error fetching GitHub:', error);
    return [];
  }
}

// ============================================
// SOURCE: Hacker News
// ============================================
export async function fetchHackerNews(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://hn.algolia.com/api/v1/search?query=LLM+OR+GPT+OR+Claude+OR+AI+agent+OR+RAG&tags=story&hitsPerPage=30',
      { next: { revalidate: 1800 } }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    const noiseKeywords = ['raises', 'funding', 'valuation', 'ipo', 'layoff', 'hire', 'stock', 'billion', 'series'];
    
    return data.hits
      .filter((hit: any) => {
        const text = (hit.title || '').toLowerCase();
        return !noiseKeywords.some(kw => text.includes(kw)) && hit.points > 30;
      })
      .slice(0, 10)
      .map((hit: any) => {
        const date = new Date(hit.created_at);
        const hours = hoursAgo(date);
        const title = hit.title || 'Untitled';
        const desc = `${hit.points} points • ${hit.num_comments} comments`;
        const category = categorizeContent(title, '');
        
        return {
          id: generateId('hn', hit.objectID),
          title,
          description: desc,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          source: 'Hacker News',
          sourceIcon: '🟠',
          date,
          category,
          quality: getQuality(hit.points, hours),
          engagement: hit.points,
          relevanceScore: calculateRelevanceScore(title, ''),
          isNew: isNew(date),
        };
      });
  } catch (error) {
    console.error('Error fetching Hacker News:', error);
    return [];
  }
}

// ============================================
// SOURCE: arXiv AI Papers
// ============================================
export async function fetchArxiv(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://rss.arxiv.org/rss/cs.AI');
    
    return feed.items.slice(0, 8).map((item) => {
      const date = item.pubDate ? new Date(item.pubDate) : new Date();
      const title = (item.title || 'Untitled').replace(/\s+/g, ' ').trim();
      const desc = item.contentSnippet?.slice(0, 250) || 'AI research paper';
      const category = categorizeContent(title, desc);
      
      return {
        id: generateId('arxiv', title),
        title,
        description: desc,
        url: item.link || 'https://arxiv.org/list/cs.AI/recent',
        source: 'arXiv',
        sourceIcon: '📄',
        date,
        category: category === 'tools' ? 'workflows' : category,
        quality: null,
        relevanceScore: calculateRelevanceScore(title, desc),
        isNew: isNew(date),
      };
    });
  } catch (error) {
    console.error('Error fetching arXiv:', error);
    return [];
  }
}

// ============================================
// SOURCE: Lobsters (HN alternative)
// ============================================
export async function fetchLobsters(): Promise<FeedItem[]> {
  try {
    const response = await fetch('https://lobste.rs/t/ai,ml.json', {
      next: { revalidate: 1800 },
    });
    
    if (!response.ok) return [];
    const posts = await response.json();
    
    return posts.slice(0, 8).map((post: any) => {
      const date = new Date(post.created_at);
      const hours = hoursAgo(date);
      const title = post.title || 'Untitled';
      const desc = `${post.score} points • ${post.comment_count} comments`;
      const category = categorizeContent(title, post.description || '');
      
      return {
        id: generateId('lobsters', post.short_id),
        title,
        description: desc,
        url: post.url || post.short_id_url,
        source: 'Lobsters',
        sourceIcon: '🦞',
        date,
        category,
        quality: getQuality(post.score, hours),
        engagement: post.score,
        relevanceScore: calculateRelevanceScore(title, ''),
        isNew: isNew(date),
      };
    });
  } catch (error) {
    console.error('Error fetching Lobsters:', error);
    return [];
  }
}

// ============================================
// SOURCE: Reddit (with fallback)
// ============================================
async function fetchReddit(subreddit: string, sourceId: string, sourceName: string, sourceIcon: string): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=20&raw_json=1`,
      { 
        next: { revalidate: 1800 },
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        }
      }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    if (!data?.data?.children) return [];
    
    return data.data.children
      .filter((post: any) => !post.data.stickied && post.data.score > 15)
      .slice(0, 8)
      .map((post: any) => {
        const date = new Date(post.data.created_utc * 1000);
        const hours = hoursAgo(date);
        const title = post.data.title;
        const desc = post.data.selftext?.slice(0, 200) || `⬆️ ${post.data.score} • 💬 ${post.data.num_comments}`;
        const category = categorizeContent(title, post.data.selftext || '');
        
        return {
          id: generateId(sourceId, post.data.id),
          title,
          description: desc,
          url: `https://reddit.com${post.data.permalink}`,
          source: sourceName,
          sourceIcon,
          date,
          category,
          quality: getQuality(post.data.score, hours),
          engagement: post.data.score,
          relevanceScore: calculateRelevanceScore(title, post.data.selftext || ''),
          isNew: isNew(date),
        };
      });
  } catch (error) {
    console.error(`Error fetching r/${subreddit}:`, error);
    return [];
  }
}

export const fetchLocalLLaMA = () => fetchReddit('LocalLLaMA', 'llama', 'r/LocalLLaMA', '🦙');
export const fetchClaudeAI = () => fetchReddit('ClaudeAI', 'claude', 'r/ClaudeAI', '🟤');
export const fetchChatGPT = () => fetchReddit('ChatGPT', 'chatgpt', 'r/ChatGPT', '💬');

// ============================================
// AGGREGATE ALL FEEDS
// ============================================
export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled([
    fetchAnthropic(),
    fetchOpenAI(),
    fetchSimonWillison(),
    fetchLatentSpace(),
    fetchArxiv(),
    fetchHuggingFace(),
    fetchGitHubTrending(),
    fetchHackerNews(),
    fetchLobsters(),
    fetchLocalLLaMA(),
    fetchClaudeAI(),
  ]);
  
  const allItems: FeedItem[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }
  
  // Dedupe by URL
  const seen = new Set<string>();
  const deduped = allItems.filter(item => {
    const key = item.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Sort: New first, then by source priority + relevance
  const officialSources = ['Anthropic', 'OpenAI', 'Anthropic Research'];
  
  return deduped.sort((a, b) => {
    // Official sources first
    const aOfficial = officialSources.includes(a.source);
    const bOfficial = officialSources.includes(b.source);
    if (aOfficial && !bOfficial) return -1;
    if (bOfficial && !aOfficial) return 1;
    
    // Then new items
    if (a.isNew && !b.isNew) return -1;
    if (b.isNew && !a.isNew) return 1;
    
    // Then by relevance
    const aScore = a.relevanceScore || 0;
    const bScore = b.relevanceScore || 0;
    if (Math.abs(aScore - bScore) > 20) return bScore - aScore;
    
    // Finally by date
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
