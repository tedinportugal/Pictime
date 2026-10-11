import type { Db } from '@/db/client';
import { getCookie } from '@/lib/security/cookies';
import { listPhotos, type Photo } from '@/lib/photos/repo';
import { listFavoritePhotos } from '@/lib/favorites/repo';
import { VISITOR_COOKIE, readVisitor } from '@/lib/favorites/visitor';

export type DownloadSet = 'all' | 'favorites';

export function parseSet(value: string | null): DownloadSet | null {
  return value === 'all' || value === 'favorites' ? value : null;
}

export async function photosForSet(db: Db, galleryId: string, set: DownloadSet, req: Request): Promise<Photo[] | Response> {
  if (set === 'all') return listPhotos(db, galleryId);
  const visitor = readVisitor(getCookie(req, VISITOR_COOKIE));
  if (!visitor) return Response.json({ error: 'Indica o teu nome primeiro', code: 'visitor_required' }, { status: 401 });
  return listFavoritePhotos(db, galleryId, visitor.id);
}
