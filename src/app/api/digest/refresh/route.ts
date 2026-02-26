import { NextResponse } from 'next/server';
import { clearDigestCache, isDbConfigured } from '@/lib/db';

export async function POST() {
  try {
    if (isDbConfigured()) {
      await clearDigestCache();
    }
    return NextResponse.json({ cleared: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}
