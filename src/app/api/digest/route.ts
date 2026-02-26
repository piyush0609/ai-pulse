import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { fetchAllFeeds } from '@/lib/feeds';
import { synthesizeAlgorithmic, synthesizeLLM } from '@/lib/digest';
import { getCachedDigest, cacheDigest, isDbConfigured } from '@/lib/db';
import { FeedItem } from '@/lib/types';
import { Digest } from '@/lib/digest';

// Allow up to 60 seconds for feed fetching + LLM synthesis
export const maxDuration = 60;

// In-memory fallback when Turso isn't configured
let memCache: any = null;
let memCacheAt = 0;
const CACHE_TTL = 4 * 60 * 60 * 1000;

function serializeDigest(digest: Digest, items: FeedItem[]) {
  return {
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
}

function persistCache(id: string, serialized: any, now: number) {
  memCache = serialized;
  memCacheAt = now;
  if (isDbConfigured()) {
    cacheDigest(id, serialized).catch(e => console.error('Cache write failed:', e));
  }
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  const stream = request.nextUrl.searchParams.get('stream') === '1';
  const debug = request.nextUrl.searchParams.get('debug') === '1';

  // ─── Non-streaming path (cached or debug) ───────────────────
  try {
    if (isDbConfigured()) {
      const cached = await getCachedDigest();
      if (cached && !debug) {
        if (stream) return streamCached(cached);
        return NextResponse.json(cached);
      }
    } else if (memCache && now - memCacheAt < CACHE_TTL && !debug) {
      if (stream) return streamCached(memCache);
      return NextResponse.json(memCache);
    }
  } catch (e: any) {
    if (debug) return NextResponse.json({ step: 'cache_read', error: e.message });
  }

  // ─── Streaming path ─────────────────────────────────────────
  if (stream) {
    return streamDigest(now, debug);
  }

  // ─── Classic JSON path ──────────────────────────────────────
  try {
    const items = await fetchAllFeeds();
    const apiKey = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

    if (debug) {
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

    const serialized = serializeDigest(digest, items);
    persistCache(digest.id, serialized, now);

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Digest generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate digest' },
      { status: 500 }
    );
  }
}

// ─── SSE Streaming Helpers ──────────────────────────────────────

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function streamCached(cached: any): Response {
  const body = sseEvent('progress', { step: 'cached', message: 'Loading cached digest...' })
    + sseEvent('digest', cached)
    + sseEvent('done', {});
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function streamDigest(now: number, debug: boolean): Response {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        // Phase 1: Fetch feeds
        send('progress', { step: 'feeds', message: 'Scanning sources...' });
        const items = await fetchAllFeeds();
        send('progress', {
          step: 'feeds_done',
          message: `Found ${items.length} items across sources`,
          itemCount: items.length,
        });

        // Phase 2: Synthesize
        const apiKey = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
        if (apiKey) {
          send('progress', { step: 'llm', message: 'AI is reading and curating...' });
        } else {
          send('progress', { step: 'algorithmic', message: 'Organizing items...' });
        }

        const digest = apiKey
          ? await synthesizeLLM(items, apiKey)
          : synthesizeAlgorithmic(items);

        send('progress', {
          step: 'synthesized',
          message: `Curated ${digest.themes.length} themes with ${digest.highlights.length} highlights`,
        });

        // Phase 3: Serialize and cache
        const serialized = serializeDigest(digest, items);
        persistCache(digest.id, serialized, now);

        // Phase 4: Send the digest
        send('digest', serialized);
        send('done', {});
      } catch (error: any) {
        send('error', { message: error.message || 'Failed to generate digest' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
