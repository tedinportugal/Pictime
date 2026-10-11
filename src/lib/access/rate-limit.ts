import { and, count, eq, gt } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { unlockAttempts } from '@/db/schema';

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export async function isRateLimited(db: Db, galleryId: string, ip: string, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const [row] = await db
    .select({ n: count() })
    .from(unlockAttempts)
    .where(and(eq(unlockAttempts.galleryId, galleryId), eq(unlockAttempts.ip, ip), gt(unlockAttempts.createdAt, since)));
  return Number(row?.n ?? 0) >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(db: Db, galleryId: string, ip: string, now = new Date()): Promise<void> {
  await db.insert(unlockAttempts).values({ galleryId, ip, createdAt: now });
}
