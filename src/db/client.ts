import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { dataDir } from '@/lib/env';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let override: Db | null = null;
let cached: Promise<Db> | null = null;

export function setDbForTests(db: Db | null): void {
  override = db;
}

export async function getDb(): Promise<Db> {
  if (override) return override;
  cached ??= createDb();
  return cached;
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    return drizzle({ client: neon(url), schema }) as unknown as Db;
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const dir = path.join(dataDir(), 'pglite');
  await mkdir(dir, { recursive: true });
  const db = drizzle({ client: new PGlite(dir), schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return db as unknown as Db;
}
