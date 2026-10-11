import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import type { Db } from '@/db/client';
import { photos } from '@/db/schema';
import { createGallery } from '@/lib/galleries/repo';
import { addFavorite, listFavoritePhotos, listFavoritesByVisitor, listVisitorFavoriteIds, removeFavorite } from '@/lib/favorites/repo';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

async function seed() {
  const g = await createGallery(db, { title: 'A' });
  const rows = await db
    .insert(photos)
    .values(['a', 'b'].map((n, i) => ({ galleryId: g.id, filename: `${n}.jpg`, originalUrl: n, webUrl: n, thumbUrl: n, width: 1, height: 1, bytes: 1, order: i })))
    .returning();
  return { g, a: rows[0], b: rows[1] };
}

describe('favoritas', () => {
  it('é idempotente por visitante e separa visitantes', async () => {
    const { g, a, b } = await seed();
    await addFavorite(db, { galleryId: g.id, photoId: a.id, visitorId: 'v1', visitorName: 'Inês' });
    await addFavorite(db, { galleryId: g.id, photoId: a.id, visitorId: 'v1', visitorName: 'Inês' });
    await addFavorite(db, { galleryId: g.id, photoId: b.id, visitorId: 'v1', visitorName: 'Inês' });
    await addFavorite(db, { galleryId: g.id, photoId: a.id, visitorId: 'v2', visitorName: 'Mãe' });
    expect(await listVisitorFavoriteIds(db, g.id, 'v1')).toEqual([a.id, b.id]);
    expect((await listFavoritePhotos(db, g.id, 'v1')).map((p) => p.filename)).toEqual(['a.jpg', 'b.jpg']);
    const byVisitor = await listFavoritesByVisitor(db, g.id);
    expect(byVisitor.map((v) => [v.visitorName, v.photoIds.length])).toEqual([['Inês', 2], ['Mãe', 1]]);
    await removeFavorite(db, { photoId: a.id, visitorId: 'v1' });
    expect(await listVisitorFavoriteIds(db, g.id, 'v1')).toEqual([b.id]);
  });
});
