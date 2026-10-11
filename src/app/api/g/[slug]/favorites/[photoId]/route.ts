import { getDb } from '@/db/client';
import { notFound } from '@/lib/http';
import { getCookie } from '@/lib/security/cookies';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { VISITOR_COOKIE, readVisitor } from '@/lib/favorites/visitor';
import { addFavorite, removeFavorite } from '@/lib/favorites/repo';
import { getPhoto } from '@/lib/photos/repo';

type Ctx = { params: Promise<{ slug: string; photoId: string }> };

async function handle(req: Request, { params }: Ctx, favorited: boolean): Promise<Response> {
  const { slug, photoId } = await params;
  const db = await getDb();
  const access = await accessFromRequest(db, req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const visitor = readVisitor(getCookie(req, VISITOR_COOKIE));
  if (!visitor) return Response.json({ error: 'Indica o teu nome primeiro', code: 'visitor_required' }, { status: 401 });
  const photo = await getPhoto(db, access.gallery.id, photoId);
  if (!photo) return notFound();
  if (favorited) await addFavorite(db, { galleryId: access.gallery.id, photoId, visitorId: visitor.id, visitorName: visitor.name });
  else await removeFavorite(db, { photoId, visitorId: visitor.id });
  return Response.json({ favorited });
}

export async function PUT(req: Request, ctx: Ctx): Promise<Response> {
  return handle(req, ctx, true);
}

export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
  return handle(req, ctx, false);
}
