export default function Header() {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl">⚡</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Pulse
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Better LLM workflows
          </p>
        </div>
      </div>
      <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
        Curated content to make you better at using AI — prompting techniques, workflow tips, practical tutorials, and tools that actually help.
      </p>
    </header>
  );
}
