import { getDb } from '@/db/client';
import { notFound } from '@/lib/http';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { getPhoto } from '@/lib/photos/repo';
import { getStorage } from '@/lib/storage';
import { contentDisposition, mimeFromFilename } from '@/lib/downloads/filename';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; photoId: string }> }): Promise<Response> {
  const { slug, photoId } = await params;
  const db = await getDb();
  const access = await accessFromRequest(db, req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const photo = await getPhoto(db, access.gallery.id, photoId);
  if (!photo) return notFound();
  return new Response(await getStorage().open(photo.originalUrl), {
    headers: {
      'Content-Type': mimeFromFilename(photo.filename),
      'Content-Length': String(photo.bytes),
      'Content-Disposition': contentDisposition(photo.filename),
      'Cache-Control': 'private, no-store',
    },
  });
}
