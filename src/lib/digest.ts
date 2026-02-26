import { FeedItem, FeedCategory } from './types';

// ─── Digest Types ────────────────────────────────────────────────

export type DigestMood = 'exciting' | 'practical' | 'worth-watching' | 'just-fyi';

export interface DigestTheme {
  title: string;
  description: string;
  mood: DigestMood;
  items: DigestHighlight[];
}

export interface DigestHighlight {
  item: FeedItem;
  whyMatters: string;
  forYou: string;
}

export interface Digest {
  id: string;
  generatedAt: string;
  summary: string;
  themes: DigestTheme[];
  highlights: DigestHighlight[];
  itemCount: number;
  closingNote: string;
  source: 'algorithmic' | 'llm';
}

// ─── LLM Synthesis (the actual intelligence) ────────────────────
// The LLM does all the thinking: quality filtering, theme discovery,
// annotation writing. No regex rules — actual understanding.

const SYNTHESIS_PROMPT = `You are the editorial brain of AI Pulse. Your readers are regular people — not developers — who feel overwhelmed by AI news. Your job: pick 8-12 items that actually matter, skip everything else, group them into narrative themes, and explain each one clearly.

SKIP these (do NOT include):
- Bare model names like "Qwen/Qwen3.5-35B" or "zai-org/GLM-5" — nobody knows what these are
- Version bumps, changelogs, patch notes
- Items where the title is just a repo name or username
- Anything you can't explain to someone who doesn't code
- Items with descriptions that are just download counts or technical specs

KEEP these:
- New tools regular people can try (ChatGPT updates, Cursor, Perplexity, etc.)
- Big company moves that affect the products people use
- AI safety/policy news that affects everyone
- Community discussions that reveal real trends
- Practical tutorials someone could actually follow

THEME TITLES must tell a story, not name a category:
- GOOD: "The AI you already use is about to change", "Running AI without the internet"
- BAD: "New AI Tools and Models", "Safety and Security", "AI in Workflows"

For each item you include:
- "whyMatters": One or two SHORT sentences. Be specific to THIS item. Not "this is interesting because AI is advancing" — say what THIS specific thing means.
- "forYou": One concrete suggestion or honest "Just good to know." Not "If you're interested in X, check out Y."

CLOSING: One warm sentence. Not corporate ("stay informed", "keep up-to-date"). More like "That's the picture. Nothing you need to rush to do."

EXAMPLE of good output (for reference, don't copy):
{
  "summary": "Two big things today. Google is putting Gemini directly into Gmail and Docs — so if you use those, you'll notice changes soon. Separately, there's a free AI tool that can now write and run code on your laptop without internet.",
  "themes": [
    {
      "title": "The apps you use every day are getting AI baked in",
      "description": "Google and Microsoft both announced AI features shipping inside their main products this week. This isn't experimental anymore — it's showing up in the tools millions of people already use.",
      "mood": "exciting",
      "items": [
        { "index": 2, "whyMatters": "Google is adding Gemini to Gmail and Docs. If you use Google Workspace, you'll see AI suggestions for writing emails and summarizing documents within weeks.", "forYou": "No action needed — it'll just show up. Worth trying when it does." }
      ]
    }
  ],
  "closingNote": "That's what happened. Nothing urgent — just good to know where things are heading."
}

Respond with ONLY valid JSON (no markdown fences, no explanation before or after).
Output structure:
{
  "summary": "3-4 sentences referencing specific items",
  "themes": [{ "title": "...", "description": "...", "mood": "exciting|practical|worth-watching|just-fyi", "items": [{ "index": N, "whyMatters": "...", "forYou": "..." }] }],
  "closingNote": "..."
}
"index" = position in the input list.`;

// Provider config — supports Groq (OpenAI-compatible) and Anthropic
interface LLMProvider {
  url: string;
  headers: Record<string, string>;
  body: (prompt: string, userMessage: string) => object;
  extractText: (data: any) => string;
}

function getProvider(apiKey: string): LLMProvider {
  // Groq keys start with "gsk_"
  if (apiKey.startsWith('gsk_')) {
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: (system, user) => ({
        model: (process.env.LLM_MODEL || 'llama-3.3-70b-versatile').trim(),
        max_tokens: 3000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      extractText: (data) => data.choices?.[0]?.message?.content || '',
    };
  }

  // OpenAI-compatible keys (sk-)
  if (apiKey.startsWith('sk-')) {
    return {
      url: process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: (system, user) => ({
        model: (process.env.LLM_MODEL || 'gpt-4o-mini').trim(),
        max_tokens: 3000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      extractText: (data) => data.choices?.[0]?.message?.content || '',
    };
  }

  // Default: Anthropic
  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: (system, user) => ({
      model: (process.env.LLM_MODEL || 'claude-haiku-4-5-20251001').trim(),
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    extractText: (data) => data.content?.[0]?.text || '',
  };
}

// Fix control characters inside JSON string values that LLMs often emit
function escapeControlCharsInJson(raw: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = raw.charCodeAt(i);
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && code <= 0x1f) {
      // Escape control characters that are invalid unescaped in JSON strings
      if (code === 0x0a) result += '\\n';
      else if (code === 0x0d) result += '\\r';
      else if (code === 0x09) result += '\\t';
      else result += '\\u' + code.toString(16).padStart(4, '0');
    } else {
      result += ch;
    }
  }
  return result;
}

export async function synthesizeLLM(items: FeedItem[], apiKey: string): Promise<Digest> {
  const provider = getProvider(apiKey);

  // Give the LLM rich context — it decides what's worth showing
  const inputItems = items.slice(0, 60).map((item, i) => ({
    index: i,
    title: item.title,
    description: (item.description || '').slice(0, 300),
    source: item.source,
    category: item.category,
    date: new Date(item.date).toLocaleDateString(),
    engagement: item.engagement || null,
    isNew: item.isNew || false,
  }));

  const userMessage = `Here are ${inputItems.length} recent AI news items. Curate a digest for people who are curious about AI but not deeply technical:\n\n${JSON.stringify(inputItems, null, 2)}`;

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: provider.headers,
    body: JSON.stringify(provider.body(SYNTHESIS_PROMPT, userMessage)),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    console.error(`LLM synthesis failed (${response.status}): ${err}`);
    const fallback = synthesizeAlgorithmic(items);
    (fallback as any)._llmError = `${response.status}: ${err.slice(0, 200)}`;
    return fallback;
  }

  const data = await response.json();
  const text = provider.extractText(data);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in LLM response');

    // Robust JSON cleaning: escape control chars inside string values
    const cleaned = escapeControlCharsInJson(jsonMatch[0])
      .replace(/,\s*([}\]])/g, '$1');           // trailing commas
    const parsed = JSON.parse(cleaned);

    // Map themes — annotations are inline with each item reference
    const allHighlights: DigestHighlight[] = [];
    const themes: DigestTheme[] = (parsed.themes || [])
      .map((t: any) => {
        const themeItems: DigestHighlight[] = (t.items || [])
          .filter((ti: any) => typeof ti.index === 'number' && ti.index < items.length)
          .slice(0, 4)
          .map((ti: any) => {
            const highlight: DigestHighlight = {
              item: items[ti.index],
              whyMatters: ti.whyMatters || '',
              forYou: ti.forYou || '',
            };
            allHighlights.push(highlight);
            return highlight;
          });

        const mood = ['exciting', 'practical', 'worth-watching', 'just-fyi'].includes(t.mood)
          ? t.mood as DigestMood
          : 'just-fyi' as DigestMood;

        return { title: t.title || '', description: t.description || '', mood, items: themeItems };
      })
      .filter((t: DigestTheme) => t.items.length > 0);

    return {
      id: `digest-llm-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      summary: parsed.summary || `Here's what stood out from ${items.length} items today.`,
      themes,
      highlights: allHighlights.slice(0, 5),
      itemCount: items.length,
      closingNote: parsed.closingNote || "That's the picture. You're caught up.",
      source: 'llm',
    };
  } catch (err: any) {
    console.error('Failed to parse LLM response:', err, '\nRaw:', text.slice(0, 500));
    const fallback = synthesizeAlgorithmic(items);
    (fallback as any)._llmError = `parse: ${err.message}. Raw: ${text.slice(0, 200)}`;
    return fallback;
  }
}

// ─── Algorithmic Fallback (no API key / offline) ─────────────────
// Honest, basic grouping. No fake intelligence.
// This exists for when the LLM isn't available. It doesn't pretend
// to understand content — it groups by category and shows the items.

const CATEGORY_META: Record<string, { title: string; description: string; mood: DigestMood }> = {
  tools: { title: 'AI tools & products', description: 'New tools and updates to ones people use.', mood: 'practical' },
  tutorials: { title: 'Guides & how-tos', description: 'People sharing how to do things with AI.', mood: 'practical' },
  workflows: { title: 'Workflows & techniques', description: 'Ways people are using AI in their work.', mood: 'worth-watching' },
  opensource: { title: 'Open source', description: 'New models and projects anyone can use.', mood: 'worth-watching' },
  safety: { title: 'Safety & policy', description: 'Safety research, regulation, and ethics.', mood: 'just-fyi' },
  all: { title: 'Other notable items', description: 'Announcements, discussions, and news.', mood: 'exciting' },
};

export function synthesizeAlgorithmic(items: FeedItem[]): Digest {
  // Basic quality gate — just length and relevance, no keyword magic
  const viable = items.filter(i =>
    (i.title || '').trim().length > 15 &&
    (i.relevanceScore || 0) > 0
  );

  const scored = viable
    .map(item => ({
      item,
      score: (item.relevanceScore || 0)
        + (item.isNew ? 20 : 0)
        + (item.engagement ? Math.min(item.engagement / 10, 30) : 0),
    }))
    .sort((a, b) => b.score - a.score);

  // Group by category — honest about what we're doing
  const groups: Record<string, typeof scored> = {};
  for (const s of scored.slice(0, 30)) {
    const cat = s.item.category || 'all';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  }

  const usedIds = new Set<string>();
  const themes: DigestTheme[] = [];

  for (const [cat, catItems] of Object.entries(groups)) {
    const meta = CATEGORY_META[cat] || CATEGORY_META.all;
    const sourceSeen = new Set<string>();
    const diverse = catItems.filter(s => {
      if (usedIds.has(s.item.id) || sourceSeen.has(s.item.source)) return false;
      usedIds.add(s.item.id);
      sourceSeen.add(s.item.source);
      return true;
    }).slice(0, 3);

    if (diverse.length === 0) continue;

    themes.push({
      ...meta,
      items: diverse.map(s => ({
        item: s.item,
        whyMatters: `From ${s.item.source}.`,
        forYou: '',
      })),
    });
  }

  const allHighlights = themes.flatMap(t => t.items);
  const highlightCount = allHighlights.length;

  return {
    id: `digest-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    summary: `Here are ${highlightCount} items from ${items.length} collected across our sources. This is a basic view — add an LLM API key in .env.local for an intelligently curated digest.`,
    themes: themes.slice(0, 4),
    highlights: allHighlights.slice(0, 5),
    itemCount: items.length,
    closingNote: "That's what we found. Set GROQ_API_KEY or ANTHROPIC_API_KEY in .env.local for smarter curation.",
    source: 'algorithmic',
  };
}
