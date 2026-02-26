import { NextResponse } from 'next/server';
import { fetchAllFeeds } from '@/lib/feeds';

export const dynamic = 'force-dynamic'; // Never cache this route

export async function GET() {
  try {
    const items = await fetchAllFeeds();
    return NextResponse.json({ 
      items,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeds' },
      { status: 500 }
    );
  }
}
