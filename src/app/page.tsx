import { fetchAllFeeds } from '@/lib/feeds';
import Header from '@/components/Header';
import FeedGrid from '@/components/FeedGrid';

// Revalidate every 30 minutes
export const revalidate = 1800;

export default async function Home() {
  const items = await fetchAllFeeds();
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header />
        <FeedGrid items={items} />
        
        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <span>🔥</span> Highly relevant
            </span>
            <span className="flex items-center gap-1">
              <span>⭐</span> High quality
            </span>
          </div>
          <p className="text-center text-sm text-gray-500">
            Sources: Simon Willison • Latent Space • Hugging Face • GitHub • Hacker News • r/LocalLLaMA • r/ClaudeAI
          </p>
          <p className="text-center text-xs text-gray-400 mt-2">
            Updated every 30 minutes • Curated for practitioners
          </p>
        </footer>
      </div>
    </main>
  );
}
