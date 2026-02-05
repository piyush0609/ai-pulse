export default function Header() {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-xl">⚡</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          AI Pulse
        </h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400">
        Your daily dose of AI news, tools, and tutorials from across the web
      </p>
    </header>
  );
}
