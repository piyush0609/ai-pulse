import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    groq: !!process.env.GROQ_API_KEY,
    groqPrefix: (process.env.GROQ_API_KEY || '').slice(0, 4),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    tursoUrl: !!process.env.TURSO_DATABASE_URL,
    tursoToken: !!process.env.TURSO_AUTH_TOKEN,
    llmModel: process.env.LLM_MODEL || 'not set',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
