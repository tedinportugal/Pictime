import { asc, count, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { chapters } from '@/db/schema';
import { isUuid } from '@/lib/http';

export type Chapter = typeof chapters.$inferSelect;

export async function listChapters(db: Db, galleryId: string): Promise<Chapter[]> {
  return db.select().from(chapters).where(eq(chapters.galleryId, galleryId)).orderBy(asc(chapters.order));
}

export async function createChapter(db: Db, galleryId: string, name: string): Promise<Chapter> {
  const [{ n }] = await db.select({ n: count() }).from(chapters).where(eq(chapters.galleryId, galleryId));
  const [row] = await db.insert(chapters).values({ galleryId, name: name.trim(), order: Number(n) }).returning();
  return row;
}

export async function renameChapter(db: Db, id: string, name: string): Promise<Chapter | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.update(chapters).set({ name: name.trim() }).where(eq(chapters.id, id)).returning();
  return row ?? null;
}

export async function deleteChapter(db: Db, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await db.delete(chapters).where(eq(chapters.id, id)).returning({ id: chapters.id });
  return rows.length > 0;
}
