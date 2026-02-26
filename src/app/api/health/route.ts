import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET() {
  const results: Record<string, any> = {
    envVars: {
      groq: !!process.env.GROQ_API_KEY,
      groqPrefix: (process.env.GROQ_API_KEY || '').slice(0, 4),
      tursoUrl: process.env.TURSO_DATABASE_URL || 'not set',
      tursoToken: !!process.env.TURSO_AUTH_TOKEN,
      llmModel: process.env.LLM_MODEL || 'not set',
      vercelEnv: process.env.VERCEL_ENV,
    },
  };

  // Test Turso connection
  try {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (url && authToken) {
      const db = createClient({ url, authToken });
      await db.execute('SELECT 1');
      results.turso = 'connected';
    } else {
      results.turso = 'missing credentials';
    }
  } catch (e: any) {
    results.turso = `error: ${e.message}`;
  }

  // Test Groq API
  try {
    const key = process.env.GROQ_API_KEY;
    if (key) {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        results.groq = `connected, ${data.data?.length || 0} models`;
      } else {
        results.groq = `error: ${res.status} ${await res.text().catch(() => '')}`;
      }
    }
  } catch (e: any) {
    results.groq = `error: ${e.message}`;
  }

  return NextResponse.json(results);
}
