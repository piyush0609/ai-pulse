import { fetchAllFeeds } from '@/lib/feeds';
import Header from '@/components/Header';
import DigestView from '@/components/DigestView';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const items = await fetchAllFeeds();
  const fetchedAt = new Date().toISOString();

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Header />
        <DigestView initialItems={items} initialFetchedAt={fetchedAt} />

        <footer className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col items-center gap-3 max-w-2xl mx-auto">
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              {['🅰️ Anthropic', '🟢 OpenAI', '🧠 Willison', '🎙️ Latent Space', '📄 arXiv', '🤗 HuggingFace', '🐙 GitHub', '🟠 HN', '🦞 Lobsters', '🦙 Reddit'].map(s => (
                <span key={s} className="text-xs text-gray-400 dark:text-gray-600">{s}</span>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
              AI Pulse reads {10}+ sources so you don&apos;t have to.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
