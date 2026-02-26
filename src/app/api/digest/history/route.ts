import { NextResponse } from 'next/server';
import { getDigestHistory, isDbConfigured } from '@/lib/db';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured. Set TURSO_DATABASE_URL in .env.local.' },
      { status: 501 }
    );
  }

  try {
    const history = await getDigestHistory(10);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to fetch digest history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
