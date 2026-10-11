import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { favorites, photos } from '@/db/schema';
import type { Photo } from '@/lib/photos/repo';

export interface VisitorFavorites {
  visitorId: string;
  visitorName: string;
  photoIds: string[];
}

export async function addFavorite(db: Db, v: { galleryId: string; photoId: string; visitorId: string; visitorName: string }): Promise<void> {
  await db.insert(favorites).values(v).onConflictDoNothing({ target: [favorites.photoId, favorites.visitorId] });
}

export async function removeFavorite(db: Db, v: { photoId: string; visitorId: string }): Promise<void> {
  await db.delete(favorites).where(and(eq(favorites.photoId, v.photoId), eq(favorites.visitorId, v.visitorId)));
}

export async function listFavoritePhotos(db: Db, galleryId: string, visitorId: string): Promise<Photo[]> {
  const rows = await db
    .select({ photo: photos })
    .from(favorites)
    .innerJoin(photos, eq(photos.id, favorites.photoId))
    .where(and(eq(favorites.galleryId, galleryId), eq(favorites.visitorId, visitorId)))
    .orderBy(asc(photos.order), asc(photos.createdAt));
  return rows.map((r) => r.photo);
}

export async function listVisitorFavoriteIds(db: Db, galleryId: string, visitorId: string): Promise<string[]> {
  return (await listFavoritePhotos(db, galleryId, visitorId)).map((p) => p.id);
}

export async function listFavoritesByVisitor(db: Db, galleryId: string): Promise<VisitorFavorites[]> {
  const rows = await db
    .select({ visitorId: favorites.visitorId, visitorName: favorites.visitorName, photoId: favorites.photoId })
    .from(favorites)
    .innerJoin(photos, eq(photos.id, favorites.photoId))
    .where(eq(favorites.galleryId, galleryId))
    .orderBy(asc(favorites.createdAt), asc(photos.order));
  const map = new Map<string, VisitorFavorites>();
  for (const r of rows) {
    const entry = map.get(r.visitorId) ?? { visitorId: r.visitorId, visitorName: r.visitorName, photoIds: [] };
    entry.photoIds.push(r.photoId);
    map.set(r.visitorId, entry);
  }
  return [...map.values()];
}
