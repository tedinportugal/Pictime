import { z } from 'zod';
import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { getGalleryById } from '@/lib/galleries/repo';
import { ingestPhoto } from '@/lib/photos/ingest';
import { InvalidImageError } from '@/lib/images/process';
import { getStorage } from '@/lib/storage';

const bodySchema = z.object({ originalUrl: z.string().min(1).max(2000), filename: z.string().trim().min(1).max(200) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const parsed = await parseJson(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  const storage = getStorage();
  const { originalUrl, filename } = parsed.data;
  const path = decodeURIComponent(new URL(originalUrl, 'http://local').pathname);
  if (!storage.isOwnUrl(originalUrl) || !path.includes(`/galleries/${id}/originals/`)) {
    return Response.json({ error: 'Origem do ficheiro inválida' }, { status: 400 });
  }
  try {
    const photo = await ingestPhoto({ db, storage }, { galleryId: id, originalUrl, filename });
    return Response.json(photo, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidImageError) return Response.json({ error: err.message }, { status: 422 });
    throw err;
  }
}
