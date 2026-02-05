import Parser from 'rss-parser';
import { FeedItem, FeedCategory } from './types';

const parser = new Parser();

function generateId(source: string, title: string): string {
  return Buffer.from(`${source}-${title}`).toString('base64').slice(0, 16);
}

// ============================================
// RELEVANCE SCORING - Based on PRINCIPLES.md
// ============================================
const RELEVANCE_KEYWORDS: Record<string, number> = {
  // High value (20 points each)
  'prompt': 20, 'workflow': 20, 'chain': 20, 'agent': 20, 'rag': 20,
  'hallucination': 20, 'guardrail': 20, 'local': 15, 'ollama': 20,
  'safety': 20, 'privacy': 20, 'injection': 20, 'jailbreak': 20,
  
  // Medium value (10 points each)
  'tool use': 10, 'function call': 10, 'structured output': 10,
  'embedding': 10, 'vector': 10, 'retrieval': 10, 'context': 10,
  'fine-tun': 10, 'lora': 10, 'quantiz': 10, 'gguf': 10,
  'cursor': 10, 'aider': 10, 'continue': 10, 'copilot': 10,
  'langchain': 10, 'llamaindex': 10, 'dspy': 10, 'autogen': 10,
  
  // Standard value (5 points each)
  'llm': 5, 'gpt': 5, 'claude': 5, 'gemini': 5, 'llama': 5,
  'mistral': 5, 'tutorial': 5, 'guide': 5, 'how to': 5,
  'open source': 5, 'github': 5, 'self-host': 5,
};

function calculateRelevanceScore(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;
  
  for (const [keyword, points] of Object.entries(RELEVANCE_KEYWORDS)) {
    if (text.includes(keyword)) {
      score += points;
    }
  }
  
  // Cap at 100
  return Math.min(score, 100);
}

// ============================================
// WHY THIS MATTERS - Category-based insights
// ============================================
const WHY_MATTERS: Record<FeedCategory, string[]> = {
  all: [],
  workflows: [
    'Better prompts = fewer iterations',
    'Chain patterns reduce hallucinations',
    'Agents unlock complex tasks',
    'Structured outputs save parsing time',
  ],
  safety: [
    'Protect sensitive data from leaks',
    'Catch hallucinations before they spread',
    'Defense against prompt injection',
    'Cost control prevents runaway bills',
  ],
  tools: [
    'Right tool = 10x productivity',
    'Integrations compound your output',
    'AI-assisted coding is the new normal',
  ],
  tutorials: [
    'Learn from real implementations',
    'Avoid common pitfalls',
    'Battle-tested patterns',
  ],
  opensource: [
    'Run locally, keep data private',
    'Community-driven innovation',
    'No API costs, full control',
  ],
};

function getWhyMatters(category: FeedCategory): string {
  const options = WHY_MATTERS[category];
  if (!options || options.length === 0) return '';
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================
// CATEGORIZATION - With Safety category
// ============================================
function categorizeContent(title: string, description: string): FeedCategory {
  const text = `${title} ${description}`.toLowerCase();
  
  // Safety - privacy, guardrails, injection, hallucination detection
  const safetyKeywords = [
    'safety', 'safe', 'privacy', 'private', 'guardrail', 'guard',
    'hallucination', 'hallucinat', 'injection', 'jailbreak', 'attack',
    'security', 'secure', 'leak', 'sensitive', 'pii', 'gdpr',
    'validation', 'verify', 'fact-check', 'grounding', 'citation',
    'cost control', 'rate limit', 'token limit', 'owasp'
  ];
  
  // Workflows - prompting, chaining, agents, RAG
  const workflowKeywords = [
    'prompt', 'chain', 'workflow', 'agent', 'rag', 'retrieval',
    'structured output', 'function call', 'tool use', 'system prompt',
    'few-shot', 'zero-shot', 'cot', 'chain of thought', 'reasoning',
    'context window', 'token', 'embedding', 'vector', 'iteration',
    'instruction', 'output format', 'json mode', 'schema',
    'pipeline', 'orchestrat', 'multi-agent'
  ];
  
  // Tutorials - practical guides
  const tutorialKeywords = [
    'how i built', 'how to', 'tutorial', 'guide', 'walkthrough',
    'step by step', 'building', 'creating', 'implementing',
    'my setup', 'my workflow', 'i use', 'here\'s how', 'lesson',
    'learned', 'mistake', 'tip', 'trick', 'technique', 'beginner'
  ];
  
  // Tools - dev tools and integrations
  const toolKeywords = [
    'cursor', 'continue', 'aider', 'copilot', 'cody', 'tabnine',
    'langchain', 'llamaindex', 'semantic kernel', 'autogen',
    'crewai', 'dspy', 'guidance', 'outlines', 'instructor',
    'tool', 'extension', 'plugin', 'integration', 'cli', 'app',
    'launch', 'release', 'v1', 'v2', 'beta', 'announce'
  ];
  
  // Open source
  const osKeywords = [
    'open source', 'opensource', 'github', 'repo', 'llama', 'mistral',
    'ollama', 'local', 'self-host', 'weights', 'gguf', 'quantiz',
    'fine-tun', 'lora', 'qlora', 'training', 'hugging face', 'hf'
  ];
  
  // Priority: safety > workflows > tutorials > tools > opensource
  if (safetyKeywords.some(kw => text.includes(kw))) return 'safety';
  if (workflowKeywords.some(kw => text.includes(kw))) return 'workflows';
  if (tutorialKeywords.some(kw => text.includes(kw))) return 'tutorials';
  if (toolKeywords.some(kw => text.includes(kw))) return 'tools';
  if (osKeywords.some(kw => text.includes(kw))) return 'opensource';
  
  return 'workflows'; // Default
}

// Calculate quality score
function getQuality(engagement: number, hoursAgo: number): 'hot' | 'top' | null {
  if (hoursAgo < 24 && engagement > 50) return 'hot';
  if (engagement > 200) return 'top';
  return null;
}

function hoursAgo(date: Date): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

// ============================================
// SOURCE: Simon Willison's Blog (Priority)
// ============================================
export async function fetchSimonWillison(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://simonwillison.net/atom/everything/');
    
    return feed.items.slice(0, 15).map((item) => {
      const date = item.pubDate ? new Date(item.pubDate) : new Date();
      const title = item.title || 'Untitled';
      const desc = item.contentSnippet?.slice(0, 250) || 'Practical AI insights from Simon Willison';
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
        engagement: 500,
        relevanceScore: calculateRelevanceScore(title, desc),
        whyMatters: getWhyMatters(category),
      };
    });
  } catch (error) {
    console.error('Error fetching Simon Willison:', error);
    return [];
  }
}

// ============================================
// SOURCE: Latent Space (Priority)
// ============================================
export async function fetchLatentSpace(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL('https://www.latent.space/feed');
    
    return feed.items.slice(0, 10).map((item) => {
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
        engagement: 400,
        relevanceScore: calculateRelevanceScore(title, desc),
        whyMatters: getWhyMatters(category),
      };
    });
  } catch (error) {
    console.error('Error fetching Latent Space:', error);
    return [];
  }
}

// ============================================
// SOURCE: Hugging Face Trending Models
// ============================================
export async function fetchHuggingFace(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://huggingface.co/api/models?sort=trending&limit=15',
      { 
        next: { revalidate: 1800 },
        headers: { 'Accept': 'application/json' }
      }
    );
    
    if (!response.ok) return [];
    const models = await response.json();
    
    return models.slice(0, 12).map((model: any) => {
      const date = model.lastModified ? new Date(model.lastModified) : new Date();
      const title = model.id || 'Unknown Model';
      const desc = `🤗 ${model.downloads?.toLocaleString() || '?'} downloads • ${model.likes?.toLocaleString() || '?'} likes • ${model.pipeline_tag || 'model'}`;
      const category = categorizeContent(title, model.pipeline_tag || '');
      
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
        whyMatters: 'New models to try locally or via API',
      };
    });
  } catch (error) {
    console.error('Error fetching Hugging Face:', error);
    return [];
  }
}

// ============================================
// SOURCE: GitHub Trending AI Repos
// ============================================
export async function fetchGitHubTrending(): Promise<FeedItem[]> {
  try {
    const queries = [
      'topic:llm+topic:tools',
      'topic:ai-agent',
      'topic:prompt-engineering',
      'topic:local-llm',
    ];
    
    const allRepos: FeedItem[] = [];
    
    for (const q of queries) {
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${q}+pushed:>2024-01-01&sort=stars&order=desc&per_page=8`,
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
          whyMatters: getWhyMatters('opensource'),
        };
      });
      
      allRepos.push(...items);
    }
    
    // Dedupe
    const seen = new Set();
    return allRepos.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 15);
  } catch (error) {
    console.error('Error fetching GitHub:', error);
    return [];
  }
}

// ============================================
// SOURCE: Hacker News (Filtered for AI/LLM)
// ============================================
export async function fetchHackerNews(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://hn.algolia.com/api/v1/search?query=LLM+OR+GPT+OR+Claude+OR+prompt+OR+RAG+OR+agent&tags=story&hitsPerPage=40',
      { next: { revalidate: 1800 } }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    // Filter out noise
    const noiseKeywords = ['raises', 'funding', 'valuation', 'ipo', 'layoff', 'hire', 'stock', 'billion'];
    
    return data.hits
      .filter((hit: any) => {
        const text = (hit.title || '').toLowerCase();
        return !noiseKeywords.some(kw => text.includes(kw)) && hit.points > 30;
      })
      .slice(0, 12)
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
          whyMatters: getWhyMatters(category),
        };
      });
  } catch (error) {
    console.error('Error fetching Hacker News:', error);
    return [];
  }
}

// ============================================
// SOURCE: r/LocalLLaMA
// ============================================
export async function fetchLocalLLaMA(): Promise<FeedItem[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/LocalLLaMA/hot.json?limit=25',
      { 
        next: { revalidate: 1800 },
        headers: { 'User-Agent': 'AI-Pulse/1.0' }
      }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    return data.data.children
      .filter((post: any) => !post.data.stickied && post.data.score > 20)
      .slice(0, 12)
      .map((post: any) => {
        const date = new Date(post.data.created_utc * 1000);
        const hours = hoursAgo(date);
        const title = post.data.title;
        const desc = post.data.selftext?.slice(0, 200) || `⬆️ ${post.data.score} • 💬 ${post.data.num_comments}`;
        const category = categorizeContent(title, post.data.selftext || '');
        
        return {
          id: generateId('llama', post.data.id),
          title,
          description: desc,
          url: `https://reddit.com${post.data.permalink}`,
          source: 'r/LocalLLaMA',
          sourceIcon: '🦙',
          date,
          category,
          quality: getQuality(post.data.score, hours),
          engagement: post.data.score,
          relevanceScore: calculateRelevanceScore(title, post.data.selftext || ''),
          whyMatters: getWhyMatters(category),
        };
      });
  } catch (error) {
    console.error('Error fetching r/LocalLLaMA:', error);
    return [];
  }
}

// ============================================
// SOURCE: r/ClaudeAI
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
      .filter((post: any) => !post.data.stickied && post.data.score > 15)
      .slice(0, 10)
      .map((post: any) => {
        const date = new Date(post.data.created_utc * 1000);
        const hours = hoursAgo(date);
        const title = post.data.title;
        const desc = post.data.selftext?.slice(0, 200) || `⬆️ ${post.data.score} • 💬 ${post.data.num_comments}`;
        const category = categorizeContent(title, post.data.selftext || '');
        
        return {
          id: generateId('claude', post.data.id),
          title,
          description: desc,
          url: `https://reddit.com${post.data.permalink}`,
          source: 'r/ClaudeAI',
          sourceIcon: '🟤',
          date,
          category,
          quality: getQuality(post.data.score, hours),
          engagement: post.data.score,
          relevanceScore: calculateRelevanceScore(title, post.data.selftext || ''),
          whyMatters: getWhyMatters(category),
        };
      });
  } catch (error) {
    console.error('Error fetching r/ClaudeAI:', error);
    return [];
  }
}

// ============================================
// Aggregate all feeds with scoring
// ============================================
export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled([
    fetchSimonWillison(),
    fetchLatentSpace(),
    fetchHuggingFace(),
    fetchGitHubTrending(),
    fetchHackerNews(),
    fetchLocalLLaMA(),
    fetchClaudeAI(),
  ]);
  
  const allItems: FeedItem[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }
  
  // Sort: relevance score first, then quality, then date
  return allItems.sort((a, b) => {
    // High relevance (🔥) items first
    const aRelevance = a.relevanceScore || 0;
    const bRelevance = b.relevanceScore || 0;
    
    if (aRelevance >= 50 && bRelevance < 50) return -1;
    if (bRelevance >= 50 && aRelevance < 50) return 1;
    
    // Then by quality
    const qualityOrder = { top: 2, hot: 1, null: 0 };
    const aQuality = qualityOrder[a.quality || 'null'] || 0;
    const bQuality = qualityOrder[b.quality || 'null'] || 0;
    
    if (aQuality !== bQuality) return bQuality - aQuality;
    
    // Then by relevance within same quality tier
    if (aRelevance !== bRelevance) return bRelevance - aRelevance;
    
    // Finally by date
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
