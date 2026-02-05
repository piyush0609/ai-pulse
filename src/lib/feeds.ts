import Parser from 'rss-parser';
import { FeedItem, FeedCategory } from './types';

const parser = new Parser();

function generateId(source: string, title: string): string {
  return Buffer.from(`${source}-${title}`).toString('base64').slice(0, 16);
}

// Smarter categorization focused on workflows
function categorizeContent(title: string, description: string): FeedCategory {
  const text = `${title} ${description}`.toLowerCase();
  
  // Workflows - prompting, chaining, agents, RAG, structured outputs
  const workflowKeywords = [
    'prompt', 'chain', 'workflow', 'agent', 'rag', 'retrieval',
    'structured output', 'function call', 'tool use', 'system prompt',
    'few-shot', 'zero-shot', 'cot', 'chain of thought', 'reasoning',
    'context window', 'token', 'embedding', 'vector', 'iteration',
    'hallucination', 'grounding', 'instruction', 'output format',
    'json mode', 'schema', 'validation', 'pipeline', 'orchestrat'
  ];
  
  // Tutorials - how I built, guide, walkthrough
  const tutorialKeywords = [
    'how i built', 'how to', 'tutorial', 'guide', 'walkthrough',
    'step by step', 'building', 'creating', 'implementing',
    'my setup', 'my workflow', 'i use', 'here\'s how', 'lesson',
    'learned', 'mistake', 'tip', 'trick', 'technique'
  ];
  
  // Tools that improve workflows
  const toolKeywords = [
    'cursor', 'continue', 'aider', 'copilot', 'cody', 'tabnine',
    'langchain', 'llamaindex', 'semantic kernel', 'autogen',
    'crewai', 'dspy', 'guidance', 'outlines', 'instructor',
    'tool', 'extension', 'plugin', 'integration', 'cli', 'app'
  ];
  
  // Open source
  const osKeywords = [
    'open source', 'github', 'repo', 'release', 'llama', 'mistral',
    'ollama', 'local', 'self-host', 'weights', 'gguf', 'quantiz',
    'fine-tun', 'lora', 'qlora', 'training'
  ];
  
  // Priority order: workflows > tutorials > tools > opensource
  if (workflowKeywords.some(kw => text.includes(kw))) return 'workflows';
  if (tutorialKeywords.some(kw => text.includes(kw))) return 'tutorials';
  if (toolKeywords.some(kw => text.includes(kw))) return 'tools';
  if (osKeywords.some(kw => text.includes(kw))) return 'opensource';
  
  return 'workflows'; // Default to workflows for this focused feed
}

// Calculate quality score
function getQuality(engagement: number, hoursAgo: number): 'hot' | 'top' | null {
  if (hoursAgo < 24 && engagement > 50) return 'hot';  // 🔥 Trending today
  if (engagement > 200) return 'top';  // ⭐ High engagement
  return null;
}

function hoursAgo(date: Date): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

// ============================================
// PRIORITY SOURCE: Simon Willison's Blog
// ============================================
export async function fetchSimonWillison(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://simonwillison.net/atom/everything/');
    
    return feed.items.slice(0, 15).map((item) => {
      const date = item.pubDate ? new Date(item.pubDate) : new Date();
      return {
        id: generateId('simon', item.title || item.guid || ''),
        title: item.title || 'Untitled',
        description: item.contentSnippet?.slice(0, 250) || 'Practical AI insights from Simon Willison',
        url: item.link || 'https://simonwillison.net',
        source: 'Simon Willison',
        sourceIcon: '🧠',
        date,
        category: categorizeContent(item.title || '', item.contentSnippet || ''),
        quality: 'top' as const, // Simon's content is consistently high quality
        engagement: 500,
      };
    });
  } catch (error) {
    console.error('Error fetching Simon Willison:', error);
    return [];
  }
}

// ============================================
// PRIORITY SOURCE: Latent Space
// ============================================
export async function fetchLatentSpace(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://www.latent.space/feed');
    
    return feed.items.slice(0, 10).map((item) => {
      const date = item.pubDate ? new Date(item.pubDate) : new Date();
      return {
        id: generateId('latent', item.title || item.guid || ''),
        title: item.title || 'Untitled',
        description: item.contentSnippet?.slice(0, 250) || 'AI engineering insights',
        url: item.link || 'https://latent.space',
        source: 'Latent Space',
        sourceIcon: '🎙️',
        date,
        category: categorizeContent(item.title || '', item.contentSnippet || ''),
        quality: 'top' as const,
        engagement: 400,
      };
    });
  } catch (error) {
    console.error('Error fetching Latent Space:', error);
    return [];
  }
}

// ============================================
// r/ChatGPTPro - Workflow tips from power users
// ============================================
export async function fetchChatGPTPro(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/ChatGPTPro/hot.json?limit=25',
      { 
        next: { revalidate: 1800 },
        headers: { 'User-Agent': 'AI-Pulse/1.0' }
      }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    return data.data.children
      .filter((post: any) => !post.data.stickied && post.data.score > 10)
      .slice(0, 12)
      .map((post: any) => {
        const date = new Date(post.data.created_utc * 1000);
        const hours = hoursAgo(date);
        return {
          id: generateId('gptpro', post.data.id),
          title: post.data.title,
          description: post.data.selftext?.slice(0, 200) || `⬆️ ${post.data.score} • 💬 ${post.data.num_comments}`,
          url: `https://reddit.com${post.data.permalink}`,
          source: 'r/ChatGPTPro',
          sourceIcon: '💬',
          date,
          category: categorizeContent(post.data.title, post.data.selftext || ''),
          quality: getQuality(post.data.score, hours),
          engagement: post.data.score,
        };
      });
  } catch (error) {
    console.error('Error fetching r/ChatGPTPro:', error);
    return [];
  }
}

// ============================================
// r/ClaudeAI - Claude workflow tips
// ============================================
export async function fetchClaudeAI(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/ClaudeAI/hot.json?limit=25',
      { 
        next: { revalidate: 1800 },
        headers: { 'User-Agent': 'AI-Pulse/1.0' }
      }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    return data.data.children
      .filter((post: any) => !post.data.stickied && post.data.score > 10)
      .slice(0, 12)
      .map((post: any) => {
        const date = new Date(post.data.created_utc * 1000);
        const hours = hoursAgo(date);
        return {
          id: generateId('claude', post.data.id),
          title: post.data.title,
          description: post.data.selftext?.slice(0, 200) || `⬆️ ${post.data.score} • 💬 ${post.data.num_comments}`,
          url: `https://reddit.com${post.data.permalink}`,
          source: 'r/ClaudeAI',
          sourceIcon: '🟤',
          date,
          category: categorizeContent(post.data.title, post.data.selftext || ''),
          quality: getQuality(post.data.score, hours),
          engagement: post.data.score,
        };
      });
  } catch (error) {
    console.error('Error fetching r/ClaudeAI:', error);
    return [];
  }
}

// ============================================
// r/LocalLLaMA - Local LLM workflows
// ============================================
export async function fetchLocalLLaMA(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/LocalLLaMA/hot.json?limit=20',
      { 
        next: { revalidate: 1800 },
        headers: { 'User-Agent': 'AI-Pulse/1.0' }
      }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    return data.data.children
      .filter((post: any) => !post.data.stickied && post.data.score > 20)
      .slice(0, 10)
      .map((post: any) => {
        const date = new Date(post.data.created_utc * 1000);
        const hours = hoursAgo(date);
        return {
          id: generateId('llama', post.data.id),
          title: post.data.title,
          description: post.data.selftext?.slice(0, 200) || `⬆️ ${post.data.score} • 💬 ${post.data.num_comments}`,
          url: `https://reddit.com${post.data.permalink}`,
          source: 'r/LocalLLaMA',
          sourceIcon: '🦙',
          date,
          category: categorizeContent(post.data.title, post.data.selftext || ''),
          quality: getQuality(post.data.score, hours),
          engagement: post.data.score,
        };
      });
  } catch (error) {
    console.error('Error fetching r/LocalLLaMA:', error);
    return [];
  }
}

// ============================================
// GitHub - AI dev tools with real utility
// ============================================
export async function fetchGitHubAITools(): Promise<FeedItem[]> {
  try {
    // Search for AI coding/workflow tools updated recently
    const queries = [
      'topic:llm+topic:tools',
      'topic:ai-agent',
      'topic:prompt-engineering',
    ];
    
    const allRepos: FeedItem[] = [];
    
    for (const q of queries) {
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${q}+pushed:>2024-01-01&sort=updated&order=desc&per_page=10`,
        { 
          next: { revalidate: 1800 },
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        }
      );
      
      if (!response.ok) continue;
      const data = await response.json();
      
      const items = (data.items || []).slice(0, 5).map((repo: any) => {
        const date = new Date(repo.pushed_at);
        const hours = hoursAgo(date);
        return {
          id: generateId('gh', repo.full_name),
          title: repo.name,
          description: `⭐ ${repo.stargazers_count.toLocaleString()} • ${repo.description?.slice(0, 150) || 'AI tool'}`,
          url: repo.html_url,
          source: 'GitHub',
          sourceIcon: '🐙',
          date,
          category: 'opensource' as FeedCategory,
          quality: getQuality(repo.stargazers_count / 10, hours),
          engagement: repo.stargazers_count,
        };
      });
      
      allRepos.push(...items);
    }
    
    // Dedupe by id
    const seen = new Set();
    return allRepos.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 12);
  } catch (error) {
    console.error('Error fetching GitHub:', error);
    return [];
  }
}

// ============================================
// Hacker News - Filtered for workflows/tools
// ============================================
export async function fetchHackerNews(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://hn.algolia.com/api/v1/search?query=LLM+prompt+workflow+cursor+aider+langchain&tags=story&hitsPerPage=30',
      { next: { revalidate: 1800 } }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    // Filter out corporate noise
    const noiseKeywords = ['raises', 'funding', 'valuation', 'ipo', 'layoff', 'hire'];
    
    return data.hits
      .filter((hit: any) => {
        const text = (hit.title || '').toLowerCase();
        return !noiseKeywords.some(kw => text.includes(kw)) && hit.points > 20;
      })
      .slice(0, 12)
      .map((hit: any) => {
        const date = new Date(hit.created_at);
        const hours = hoursAgo(date);
        return {
          id: generateId('hn', hit.objectID),
          title: hit.title || 'Untitled',
          description: `${hit.points} points • ${hit.num_comments} comments`,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          source: 'Hacker News',
          sourceIcon: '🟠',
          date,
          category: categorizeContent(hit.title || '', ''),
          quality: getQuality(hit.points, hours),
          engagement: hit.points,
        };
      });
  } catch (error) {
    console.error('Error fetching Hacker News:', error);
    return [];
  }
}

// ============================================
// Product Hunt - AI workflow tools only
// ============================================
export async function fetchProductHunt(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://www.producthunt.com/feed?category=artificial-intelligence');
    
    // Filter for workflow-related tools
    const workflowTools = ['cursor', 'copilot', 'ai assistant', 'workflow', 'automat', 'agent', 'prompt'];
    
    return feed.items
      .filter(item => {
        const text = `${item.title} ${item.contentSnippet}`.toLowerCase();
        return workflowTools.some(kw => text.includes(kw));
      })
      .slice(0, 8)
      .map((item) => {
        const date = item.pubDate ? new Date(item.pubDate) : new Date();
        return {
          id: generateId('ph', item.title || item.guid || ''),
          title: item.title || 'Untitled',
          description: item.contentSnippet?.slice(0, 200) || 'New AI workflow tool',
          url: item.link || 'https://producthunt.com',
          source: 'Product Hunt',
          sourceIcon: '🚀',
          date,
          category: 'tools' as FeedCategory,
          quality: hoursAgo(date) < 24 ? 'hot' as const : null,
          engagement: 100,
        };
      });
  } catch (error) {
    console.error('Error fetching Product Hunt:', error);
    return [];
  }
}

// ============================================
// Aggregate all feeds
// ============================================
export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled([
    fetchSimonWillison(),      // Priority: gold standard
    fetchLatentSpace(),        // Priority: AI engineering
    fetchChatGPTPro(),         // Workflows from power users
    fetchClaudeAI(),           // Claude-specific tips
    fetchLocalLLaMA(),         // Local LLM workflows
    fetchGitHubAITools(),      // Useful repos
    fetchHackerNews(),         // Filtered discussions
    fetchProductHunt(),        // Workflow tools
  ]);
  
  const allItems: FeedItem[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }
  
  // Sort: quality first (top > hot > null), then by date
  return allItems.sort((a, b) => {
    const qualityOrder = { top: 2, hot: 1, null: 0 };
    const aQuality = qualityOrder[a.quality || 'null'] || 0;
    const bQuality = qualityOrder[b.quality || 'null'] || 0;
    
    if (aQuality !== bQuality) return bQuality - aQuality;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
