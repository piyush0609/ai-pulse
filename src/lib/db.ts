import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

function getClient(): Client | null {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return null;

  client = createClient({ url, authToken });
  return client;
}

// Run once on first connection
let initialized = false;

async function ensureTables(db: Client) {
  if (initialized) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS digests (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  initialized = true;
}

// ─── Digest cache ────────────────────────────────────────────────

const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export async function getCachedDigest(): Promise<any | null> {
  const db = getClient();
  if (!db) return null;

  await ensureTables(db);

  const cutoff = Date.now() - CACHE_TTL;
  const result = await db.execute({
    sql: 'SELECT data FROM digests WHERE created_at > ? ORDER BY created_at DESC LIMIT 1',
    args: [cutoff],
  });

  if (result.rows.length === 0) return null;
  return JSON.parse(result.rows[0].data as string);
}

export async function cacheDigest(id: string, data: any): Promise<void> {
  const db = getClient();
  if (!db) return;

  await ensureTables(db);

  await db.execute({
    sql: 'INSERT OR REPLACE INTO digests (id, data, created_at) VALUES (?, ?, ?)',
    args: [id, JSON.stringify(data), Date.now()],
  });

  // Clean up old digests (keep last 30 days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await db.execute({
    sql: 'DELETE FROM digests WHERE created_at < ?',
    args: [thirtyDaysAgo],
  });
}

export async function clearDigestCache(): Promise<void> {
  const db = getClient();
  if (!db) return;
  await ensureTables(db);
  await db.execute('DELETE FROM digests');
}

// ─── Digest history ──────────────────────────────────────────────

export async function getDigestHistory(limit = 10): Promise<any[]> {
  const db = getClient();
  if (!db) return [];

  await ensureTables(db);

  const result = await db.execute({
    sql: 'SELECT id, data, created_at FROM digests ORDER BY created_at DESC LIMIT ?',
    args: [limit],
  });

  return result.rows.map(row => ({
    id: row.id,
    createdAt: row.created_at,
    digest: JSON.parse(row.data as string),
  }));
}

// ─── Preferences ─────────────────────────────────────────────────

export async function getPreference(key: string): Promise<string | null> {
  const db = getClient();
  if (!db) return null;

  await ensureTables(db);

  const result = await db.execute({
    sql: 'SELECT value FROM preferences WHERE key = ?',
    args: [key],
  });

  return result.rows.length > 0 ? (result.rows[0].value as string) : null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  const db = getClient();
  if (!db) return;

  await ensureTables(db);

  await db.execute({
    sql: 'INSERT OR REPLACE INTO preferences (key, value, updated_at) VALUES (?, ?, ?)',
    args: [key, value, Date.now()],
  });
}

export function isDbConfigured(): boolean {
  return !!process.env.TURSO_DATABASE_URL;
}
