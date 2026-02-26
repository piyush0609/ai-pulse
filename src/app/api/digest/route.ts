import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { fetchAllFeeds } from '@/lib/feeds';
import { synthesizeAlgorithmic, synthesizeLLM } from '@/lib/digest';
import { getCachedDigest, cacheDigest, isDbConfigured } from '@/lib/db';

// Allow up to 60 seconds for feed fetching + LLM synthesis
export const maxDuration = 60;

// In-memory fallback when Turso isn't configured
let memCache: any = null;
let memCacheAt = 0;
const CACHE_TTL = 4 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const now = Date.now();
  const debug = request.nextUrl.searchParams.get('debug') === '1';

  // Try Turso first, fall back to in-memory
  try {
    if (isDbConfigured()) {
      const cached = await getCachedDigest();
      if (cached && !debug) return NextResponse.json(cached);
    } else if (memCache && now - memCacheAt < CACHE_TTL && !debug) {
      return NextResponse.json(memCache);
    }
  } catch (e: any) {
    if (debug) return NextResponse.json({ step: 'cache_read', error: e.message });
  }

  try {
    const items = await fetchAllFeeds();
    const apiKey = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

    if (debug) {
      // In debug mode, don't catch LLM errors — let them surface
      try {
        const digest = apiKey
          ? await synthesizeLLM(items, apiKey)
          : synthesizeAlgorithmic(items);
        return NextResponse.json({
          debug: true,
          source: digest.source,
          themeCount: digest.themes.length,
          itemCount: digest.itemCount,
          summary: digest.summary.slice(0, 200),
          apiKeyPresent: !!apiKey,
          apiKeyPrefix: (apiKey || '').slice(0, 4),
          _llmError: (digest as any)._llmError || null,
        });
      } catch (e: any) {
        return NextResponse.json({
          step: 'synthesize',
          error: e.message,
          stack: e.stack?.split('\n').slice(0, 5),
          apiKeyPresent: !!apiKey,
        });
      }
    }

    const digest = apiKey
      ? await synthesizeLLM(items, apiKey)
      : synthesizeAlgorithmic(items);

    const serialized = {
      ...digest,
      themes: digest.themes.map(t => ({
        ...t,
        items: t.items.map(h => ({
          ...h,
          item: { ...h.item, date: new Date(h.item.date).toISOString() },
        })),
      })),
      highlights: digest.highlights.map(h => ({
        ...h,
        item: { ...h.item, date: new Date(h.item.date).toISOString() },
      })),
      allItems: items.slice(0, 60).map(i => ({
        ...i,
        date: new Date(i.date).toISOString(),
      })),
    };

    // Persist to Turso if configured, otherwise in-memory
    try {
      if (isDbConfigured()) {
        await cacheDigest(digest.id, serialized);
      }
    } catch (e) {
      console.error('Cache write failed:', e);
    }
    memCache = serialized;
    memCacheAt = now;

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Digest generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate digest' },
      { status: 500 }
    );
  }
}
