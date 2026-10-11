import { getDb } from '@/db/client';
import { notFound } from '@/lib/http';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { parseSet, photosForSet } from '@/lib/downloads/sets';
import { planZipParts, zipResponse } from '@/lib/downloads/zip';
import { getStorage } from '@/lib/storage';

export const maxDuration = 300;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const search = new URL(req.url).searchParams;
  const set = parseSet(search.get('set'));
  const part = Number(search.get('part') ?? '1');
  if (!set || !Number.isInteger(part) || part < 1) return Response.json({ error: 'Pedido inválido' }, { status: 400 });
  const db = await getDb();
  const access = await accessFromRequest(db, req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const photos = await photosForSet(db, access.gallery.id, set, req);
  if (photos instanceof Response) return photos;
  const parts = planZipParts(photos);
  const chosen = parts[part - 1];
  if (!chosen) return notFound();
  const base = set === 'favorites' ? `${access.gallery.title} - favoritas` : access.gallery.title;
  const name = parts.length > 1 ? `${base} - parte ${part} de ${parts.length}.zip` : `${base}.zip`;
  return zipResponse(getStorage(), chosen, name);
}
