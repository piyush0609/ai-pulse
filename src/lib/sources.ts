// Source definitions and priority management

export interface Source {
  id: string;
  name: string;
  icon: string;
}

export const ALL_SOURCES: Source[] = [
  { id: 'anthropic', name: 'Anthropic', icon: '🅰️' },
  { id: 'openai', name: 'OpenAI', icon: '🟢' },
  { id: 'simon', name: 'Simon Willison', icon: '🧠' },
  { id: 'latent', name: 'Latent Space', icon: '🎙️' },
  { id: 'arxiv', name: 'arXiv', icon: '📄' },
  { id: 'hf', name: 'Hugging Face', icon: '🤗' },
  { id: 'gh', name: 'GitHub', icon: '🐙' },
  { id: 'hn', name: 'Hacker News', icon: '🟠' },
  { id: 'lobsters', name: 'Lobsters', icon: '🦞' },
  { id: 'llama', name: 'r/LocalLLaMA', icon: '🦙' },
  { id: 'claude', name: 'r/ClaudeAI', icon: '🟤' },
];

// Map source display names to source IDs
export const SOURCE_NAME_TO_ID: Record<string, string> = {
  'Anthropic': 'anthropic',
  'Anthropic Research': 'anthropic',
  'OpenAI': 'openai',
  'Simon Willison': 'simon',
  'Latent Space': 'latent',
  'arXiv': 'arxiv',
  'Hugging Face': 'hf',
  'GitHub': 'gh',
  'Hacker News': 'hn',
  'Lobsters': 'lobsters',
  'r/LocalLLaMA': 'llama',
  'r/ClaudeAI': 'claude',
  'r/ChatGPT': 'chatgpt',
};

export const DEFAULT_SOURCE_ORDER = ALL_SOURCES.map(s => s.id);

const STORAGE_KEY = 'ai-pulse-source-order';

export function loadSourceOrder(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SOURCE_ORDER;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const storedSet = new Set(parsed);
      
      if (DEFAULT_SOURCE_ORDER.every(id => storedSet.has(id))) {
        const newSources = DEFAULT_SOURCE_ORDER.filter(id => !storedSet.has(id));
        return [...parsed, ...newSources];
      }
    }
  } catch {
    // Ignore parse errors
  }
  
  return DEFAULT_SOURCE_ORDER;
}

export function saveSourceOrder(order: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function getSourceById(id: string): Source | undefined {
  return ALL_SOURCES.find(s => s.id === id);
}
