import { NextResponse } from 'next/server';
import { fetchAllFeeds } from '@/lib/feeds';
import { synthesizeAlgorithmic, synthesizeLLM } from '@/lib/digest';
import { getCachedDigest, cacheDigest, isDbConfigured } from '@/lib/db';

// In-memory fallback when Turso isn't configured
let memCache: any = null;
let memCacheAt = 0;
const CACHE_TTL = 4 * 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();

  // Try Turso first, fall back to in-memory
  try {
    if (isDbConfigured()) {
      const cached = await getCachedDigest();
      if (cached) return NextResponse.json(cached);
    } else if (memCache && now - memCacheAt < CACHE_TTL) {
      return NextResponse.json(memCache);
    }
  } catch (e) {
    // DB read failed — continue to generate fresh
    console.error('Cache read failed:', e);
  }

  try {
    const items = await fetchAllFeeds();
    const apiKey = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

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
