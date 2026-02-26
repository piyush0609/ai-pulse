'use client';

import { useMemo } from 'react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Burning the midnight oil?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Winding down?';
}

function getTagline(): string {
  const taglines = [
    'AI, explained simply.',
    'One thing at a time.',
    'The calm way to stay informed.',
    'What matters, minus the noise.',
    'Your AI field guide.',
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return taglines[dayOfYear % taglines.length];
}

export default function Header() {
  const greeting = useMemo(() => getGreeting(), []);
  const tagline = useMemo(() => getTagline(), []);

  return (
    <header className="mb-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">~</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            AI Pulse
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {tagline}
          </p>
        </div>
      </div>

      <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
        {greeting}. Here&apos;s what&apos;s going on in AI — just the parts worth knowing about.
      </p>
    </header>
  );
}
