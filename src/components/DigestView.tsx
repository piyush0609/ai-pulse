'use client';

import { useState, useEffect, useCallback } from 'react';
import { FeedItem } from '@/lib/types';
import { Digest, DigestTheme, DigestHighlight } from '@/lib/digest';
import FeedGrid from './FeedGrid';

interface DigestViewProps {
  initialItems: FeedItem[];
  initialFetchedAt: string;
}

const MOOD_STYLES: Record<string, { accent: string; bg: string; label: string }> = {
  exciting: { accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Notable' },
  practical: { accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'Practical' },
  'worth-watching': { accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', label: 'Developing' },
  'just-fyi': { accent: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/50', label: 'FYI' },
};

function formatDigestDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatItemDate(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function HighlightCard({ highlight }: { highlight: DigestHighlight }) {
  const item = highlight.item;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="py-5 border-b border-gray-100 dark:border-gray-800 last:border-0">
        {/* Source + time */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{item.sourceIcon}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{item.source}</span>
          <span className="text-gray-300 dark:text-gray-700">&middot;</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatItemDate(typeof item.date === 'string' ? item.date : new Date(item.date).toISOString())}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
          {item.title}
        </h3>

        {/* Why it matters */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
          {highlight.whyMatters}
        </p>

        {/* For you */}
        {highlight.forYou && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            {highlight.forYou}
          </p>
        )}
      </div>
    </a>
  );
}

function ThemeSection({ theme }: { theme: DigestTheme }) {
  const style = MOOD_STYLES[theme.mood] || MOOD_STYLES['just-fyi'];

  if (theme.items.length === 0) return null;

  return (
    <section className="mb-10">
      {/* Theme header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs font-medium uppercase tracking-wider ${style.accent}`}>
            {style.label}
          </span>
          <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
          {theme.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          {theme.description}
        </p>
      </div>

      {/* Items */}
      <div className={`rounded-xl border border-gray-100 dark:border-gray-800 ${style.bg} px-6`}>
        {theme.items.map((highlight, i) => (
          <HighlightCard key={`${highlight.item.id}-${i}`} highlight={highlight} />
        ))}
      </div>
    </section>
  );
}

export default function DigestView({ initialItems, initialFetchedAt }: DigestViewProps) {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [allItems, setAllItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string>('');
  const [showExplore, setShowExplore] = useState(false);

  const fetchDigest = useCallback(async () => {
    setLoading(true);
    setProgress('Connecting...');
    try {
      const res = await fetch('/api/digest?stream=1');
      if (!res.ok) throw new Error('Failed to fetch digest');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by \n\n — process complete events only
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || ''; // keep incomplete block in buffer

        for (const block of blocks) {
          if (!block.trim()) continue;
          const lines = block.split('\n');
          let event = '';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7);
            else if (line.startsWith('data: ')) dataStr = line.slice(6);
          }
          if (!event || !dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (event === 'progress') {
              setProgress(data.message);
            } else if (event === 'digest') {
              setDigest(data);
              if (data.allItems) {
                setAllItems(data.allItems.map((item: any) => ({
                  ...item,
                  date: new Date(item.date),
                })));
              }
            } else if (event === 'error') {
              console.error('Digest stream error:', data.message);
            }
          } catch (parseErr) {
            console.warn('SSE parse error, skipping block:', parseErr);
          }
        }
      }
    } catch (err) {
      console.error('Digest fetch failed:', err);
      // Fallback to non-streaming fetch
      try {
        const res = await fetch('/api/digest');
        if (res.ok) {
          const data = await res.json();
          setDigest(data);
          if (data.allItems) {
            setAllItems(data.allItems.map((item: any) => ({
              ...item,
              date: new Date(item.date),
            })));
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback fetch also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, []);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  // ─── Explore Grid View ───────────────────────────────────────
  if (showExplore) {
    return (
      <div>
        <button
          onClick={() => setShowExplore(false)}
          className="mb-6 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span>&larr;</span> Back to digest
        </button>
        <FeedGrid initialItems={allItems} initialFetchedAt={initialFetchedAt} />
      </div>
    );
  }

  // ─── Loading State ───────────────────────────────────────────
  if (loading && !digest) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400 dark:text-gray-500 transition-all duration-300">
          {progress || 'Putting today\u2019s digest together...'}
        </p>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-gray-500">
        <p>Couldn&apos;t load the digest. Try refreshing.</p>
      </div>
    );
  }

  // ─── Digest View ─────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Date + meta */}
      <div className="mb-8">
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">
          {formatDigestDate(digest.generatedAt)}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span>{digest.itemCount} items collected</span>
          <span>&middot;</span>
          <span>{digest.themes.reduce((s, t) => s + t.items.length, 0)} highlights</span>
          {digest.source === 'llm' && (
            <>
              <span>&middot;</span>
              <span className="text-blue-400">AI-synthesized</span>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-12">
        <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed">
          {digest.summary}
        </p>
      </div>

      {/* Themes */}
      {digest.themes.map((theme, i) => (
        <ThemeSection key={`theme-${i}`} theme={theme} />
      ))}

      {/* Closing */}
      <div className="mt-12 mb-8 py-8 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
          {digest.closingNote}
        </p>
        <button
          onClick={() => setShowExplore(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium
            bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300
            hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Explore all {digest.itemCount} items
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
}
