import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { parseJson } from '@/lib/http';
import { createGallery, listGalleries } from '@/lib/galleries/repo';
import { createGallerySchema, toAdminGallery } from '@/lib/galleries/validation';

export async function GET(req: Request): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const rows = await listGalleries(await getDb());
  return Response.json(rows.map((g) => ({ ...toAdminGallery(g), photoCount: g.photoCount })));
}

export async function POST(req: Request): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const parsed = await parseJson(req, createGallerySchema);
  if (!parsed.ok) return parsed.response;
  const gallery = await createGallery(await getDb(), parsed.data);
  return Response.json(toAdminGallery(gallery), { status: 201 });
}
