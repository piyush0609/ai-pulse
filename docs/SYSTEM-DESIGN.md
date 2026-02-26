# AI Pulse — System Design: From Feed Reader to Living Companion

## Target Audience

**Primary**: People who are confused about AI — professionals, students, creatives, small business owners who keep hearing about AI but don't know what's real vs hype, what they should learn, or what tools to try first.

**Secondary**: Practitioners who build with AI and want a calmer way to stay current without doomscrolling.

**The key insight**: Both audiences need the same content, just framed differently. The synthesis layer is where audience targeting happens — not the data sources.

## The Core Problem

People open AI Pulse and see 60 cards. They feel behind. They close it feeling worse than when they opened it. The current app adds to the noise instead of cutting through it.

## The Insight

The colleague-podcast moment reveals the answer: **the problem is format, not content.**

Same information, different consumption mode:
- Reading 50 cards = overwhelming, takes 30 min, creates anxiety
- Listening to a 5-min podcast = calming, passive, fits into your life
- Glancing at a visual summary = instant understanding, 30 seconds
- Reading a 3-paragraph narrative = feels like a friend caught you up

The app already collects the right content from the right sources. What's missing is the **transformation layer** — converting raw feed items into human-friendly consumption formats.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI PULSE SYSTEM                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   COLLECT     │ →  │  SYNTHESIZE   │ →  │ TRANSFORM │  │
│  │              │    │              │    │           │  │
│  │ RSS feeds    │    │ LLM clusters │    │ Podcast   │  │
│  │ APIs         │    │ items into   │    │ Visuals   │  │
│  │ Twitter/X    │    │ themes       │    │ Narrative  │  │
│  │ Reddit       │    │              │    │ Cards     │  │
│  │ HN, arXiv    │    │ Writes       │    │           │  │
│  │              │    │ "whyMatters" │    │           │  │
│  └──────────────┘    │ for each     │    └───────────┘  │
│        ↑             └──────────────┘          ↓        │
│        │                    ↑                  │        │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   SCHEDULE    │    │   REMEMBER   │    │  DELIVER   │  │
│  │              │    │              │    │           │  │
│  │ Cron every   │    │ User prefs   │    │ App UI    │  │
│  │ 4-6 hours    │    │ What they    │    │ Audio     │  │
│  │              │    │ clicked,     │    │ player    │  │
│  │ "Editions"   │    │ skipped,     │    │ Visual    │  │
│  │ not live     │    │ bookmarked   │    │ story     │  │
│  │ feed         │    │              │    │ Text      │  │
│  └──────────────┘    └──────────────┘    └───────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Layer 1: COLLECT (already built)

The 11 sources in `feeds.ts` work. Extend with:

- **Twitter/X accounts** — follow 20-30 key AI voices (Karpathy, swyx, simonw, etc.)
  - Option A: Twitter API ($100/mo for basic, expensive)
  - Option B: RSS bridge services (nitter alternatives, rss.app)
  - Option C: Curated list on X → RSS via services like Apify
- **Product Hunt** — new AI tool launches
- **Newsletter digests** — Ben's Bites, The Rundown AI (via email-to-RSS)

No rush on these. The current 11 sources are enough content.

## Layer 2: SYNTHESIZE (the new brain)

This is where AI Pulse becomes a living thing.

**Input**: 50-80 raw feed items from the collect step
**Output**: A structured digest object

```typescript
interface Digest {
  id: string;
  generatedAt: Date;

  // The narrative — 3-5 sentences, conversational tone
  // "Three things stood out today. Anthropic released..."
  summary: string;

  // Themes detected across items
  themes: Array<{
    title: string;        // "Local models are getting serious"
    description: string;  // 2-3 sentences
    items: FeedItem[];    // The items that form this theme
    mood: 'exciting' | 'practical' | 'worth-watching' | 'just-fyi';
  }>;

  // Top 5 items, each with "why it matters" annotation
  highlights: Array<FeedItem & {
    whyMatters: string;   // "This matters because..."
    actionable: string;   // "Try this: ..." or "Worth reading if you..."
  }>;

  // For podcast script generation
  podcastScript: string;

  // For visual generation prompts
  visualPrompts: string[];
}
```

**How**: An API route `/api/digest` that:
1. Fetches all feeds (reuse existing `fetchAllFeeds`)
2. Passes them to Claude/GPT with a synthesis prompt
3. Returns the structured digest
4. Caches for 4-6 hours (this is an "edition", not a live feed)

The synthesis prompt instructs the LLM to:
- Group items into 2-4 themes (not categories — narrative themes)
- Write a calm, conversational summary (like a friend catching you up)
- Annotate each highlight with "why it matters" and "what you can do"
- Write a podcast script (two voices discussing the digest)
- Suggest 2-3 visual summary prompts

## Layer 3: TRANSFORM (multi-format output)

### 3a. Podcast Generation

Pipeline: `Digest → Podcast Script → TTS → Audio File`

**Option A: NotebookLM approach**
- Feed the digest as a "document" to NotebookLM
- It generates a conversational podcast
- Problem: No official API, manual step

**Option B: Build our own (recommended)**
- LLM writes a two-voice podcast script (already in Digest.podcastScript)
- TTS converts each speaker's lines to audio:
  - **OpenAI TTS** — `alloy` and `nova` voices, $15/1M chars, good quality
  - **ElevenLabs** — more natural, $5/mo for 30k chars (enough for daily digests)
  - **Google Cloud TTS** — free tier generous, good quality
- Stitch audio segments together
- Store as mp3, serve via the app

A 5-minute podcast ≈ 800 words ≈ ~4000 characters. Very cheap at any provider.

### 3b. Visual Summaries

Pipeline: `Digest themes → Image gen prompt → Generated visual`

**Approach**: Not per-item images. Instead:
- One "digest card" visual per edition — an infographic-style image
- Generated via Flux, SDXL, or Ideogram (text-heavy images work better)
- Or: Use a canvas/SVG template filled with data (more reliable than AI gen)

**Simpler alternative**: A well-designed HTML "visual summary" component:
- Timeline-style or newspaper-front-page layout
- Animated, reveals progressively
- Shareable as an image (html2canvas)
- This is more reliable than AI image gen for informational content

### 3c. Text Narrative

Already produced by the synthesis step. Displayed as the primary view:
- A calm, readable narrative (not cards)
- Progressive disclosure: summary → themes → individual items
- Expandable sections for depth

## Layer 4: REMEMBER (user preference memory)

Stored in localStorage initially, later a backend if needed.

```typescript
interface UserMemory {
  // Implicit signals
  clickedItems: string[];         // URLs they opened
  skippedItems: string[];         // Items visible but not clicked
  timeSpentOnThemes: Record<string, number>;
  podcastListenDuration: number;

  // Explicit signals
  bookmarkedItems: string[];
  preferredFormat: 'text' | 'audio' | 'visual';
  interests: string[];            // User-selected tags

  // Derived
  affinityScores: Record<string, number>;  // Per category/source
}
```

**How it's used**:
- Synthesis step weights content toward user's interests
- Highlight selection favors their preferred categories
- Over time, the digest becomes personalized without asking

## Layer 5: DELIVER (the new UI)

### Primary Experience: The Digest

When you open AI Pulse, you don't see a grid. You see:

```
┌──────────────────────────────────────┐
│                                      │
│  AI Pulse                            │
│  Wednesday, Feb 26                   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ▶  Listen to today's digest   │  │
│  │     5 min · 4 stories          │  │
│  └────────────────────────────────┘  │
│                                      │
│  Three things stood out today.       │
│  Anthropic published new research    │
│  on interpretability that's actually │
│  practical — they can now trace...   │
│                                      │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                      │
│  Theme: Local models are getting     │
│         serious                      │
│                                      │
│  > Llama 4 Scout fits in 16GB RAM   │
│    Why: You can now run a capable    │
│    model on your laptop without...   │
│    [Read →]                          │
│                                      │
│  > Ollama hit 1M daily users        │
│    Why: The ecosystem is maturing    │
│    enough for production use...      │
│    [Read →]                          │
│                                      │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                      │
│  Theme: Prompt engineering is dead,  │
│         long live prompt engineering │
│                                      │
│  > ...                               │
│                                      │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                      │
│  That's it for now.                  │
│  Next digest in ~4 hours.            │
│                                      │
│  [Explore all 47 items →]            │
│                                      │
└──────────────────────────────────────┘
```

### Secondary: The Explore Grid

The current card grid lives here, for people who want to browse everything. But it's not the default anymore.

## Implementation Priority

### Phase 1: Synthesis (the biggest impact, smallest effort)
- Add `/api/digest` route with LLM synthesis
- New `DigestView` component as the default page
- Populate `whyMatters` for highlighted items
- Cache digests for 4-6 hours

### Phase 2: Audio
- Add podcast script generation to the synthesis step
- Integrate OpenAI TTS (simplest, good enough)
- Audio player component in the digest view
- Store generated audio (Vercel Blob or similar)

### Phase 3: Memory
- Track clicks and time-on-page
- Feed preferences back into synthesis prompt
- Show "because you're interested in X" context

### Phase 4: Visuals
- Visual summary component (HTML/CSS, not AI-generated)
- Shareable digest card
- Optional: AI-generated thematic illustrations

## Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| LLM for synthesis | Claude API | Best at structured output + narrative writing |
| TTS | OpenAI TTS | Simple API, two good voices, cheap |
| Caching | File system + revalidation | Simple, no extra infra needed for Vercel |
| User memory | localStorage → later Supabase | Start simple, add backend when needed |
| Scheduling | ISR + on-demand revalidation | Next.js native, no cron needed |
| Audio storage | Vercel Blob or R2 | Cheap object storage |

## What This Is NOT

- Not a real-time feed (editions every 4-6 hours)
- Not AI-generated content (synthesis of real content from real sources)
- Not a replacement for reading the source articles (it's a guide TO them)
- Not personalized to the point of filter bubbles (shows themes, not just preferences)
