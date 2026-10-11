import { and, asc, count, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { photos } from '@/db/schema';
import { isUuid } from '@/lib/http';

export type Photo = typeof photos.$inferSelect;
export type NewPhoto = Omit<typeof photos.$inferInsert, 'order'>;

export async function addPhoto(db: Db, values: NewPhoto): Promise<Photo> {
  const [{ n }] = await db.select({ n: count() }).from(photos).where(eq(photos.galleryId, values.galleryId));
  const [row] = await db.insert(photos).values({ ...values, order: Number(n) }).returning();
  return row;
}

export async function listPhotos(db: Db, galleryId: string): Promise<Photo[]> {
  return db.select().from(photos).where(eq(photos.galleryId, galleryId)).orderBy(asc(photos.order), asc(photos.createdAt));
}

export async function getPhoto(db: Db, galleryId: string, photoId: string): Promise<Photo | null> {
  if (!isUuid(photoId) || !isUuid(galleryId)) return null;
  const [row] = await db.select().from(photos).where(and(eq(photos.id, photoId), eq(photos.galleryId, galleryId)));
  return row ?? null;
}

export async function getPhotoById(db: Db, photoId: string): Promise<Photo | null> {
  if (!isUuid(photoId)) return null;
  const [row] = await db.select().from(photos).where(eq(photos.id, photoId));
  return row ?? null;
}

export async function reorderPhotos(db: Db, galleryId: string, ids: string[]): Promise<void> {
  for (const [i, id] of ids.entries()) {
    if (!isUuid(id)) continue;
    await db.update(photos).set({ order: i }).where(and(eq(photos.id, id), eq(photos.galleryId, galleryId)));
  }
}

export async function setPhotoChapter(db: Db, photoId: string, chapterId: string | null): Promise<Photo | null> {
  if (!isUuid(photoId)) return null;
  const [row] = await db.update(photos).set({ chapterId }).where(eq(photos.id, photoId)).returning();
  return row ?? null;
}

export async function deletePhoto(db: Db, photoId: string): Promise<string[]> {
  if (!isUuid(photoId)) return [];
  const [row] = await db.delete(photos).where(eq(photos.id, photoId)).returning();
  return row ? [row.originalUrl, row.webUrl, row.thumbUrl] : [];
}
