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
        
        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500">
          <p>
            Aggregating from GitHub Trending • Hugging Face • r/LocalLLaMA • r/MachineLearning • Hacker News • Product Hunt • arXiv
          </p>
          <p className="mt-2">
            Updated every 30 minutes • Focus: Tools, Open Source, Tips & Techniques
          </p>
        </footer>
      </div>
    </main>
  );
}
