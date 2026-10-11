import { getDb } from '@/db/client';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { parseSet, photosForSet } from '@/lib/downloads/sets';
import { planZipParts } from '@/lib/downloads/zip';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const set = parseSet(new URL(req.url).searchParams.get('set'));
  if (!set) return Response.json({ error: 'Conjunto inválido' }, { status: 400 });
  const db = await getDb();
  const access = await accessFromRequest(db, req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const photos = await photosForSet(db, access.gallery.id, set, req);
  if (photos instanceof Response) return photos;
  const parts = planZipParts(photos).map((p, i) => ({
    part: i + 1,
    count: p.length,
    bytes: p.reduce((s, x) => s + x.bytes, 0),
    url: `/api/g/${access.gallery.slug}/zip?set=${set}&part=${i + 1}`,
  }));
  return Response.json({ parts });
}
