import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { chapters } from '@/db/schema';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { getGalleryById, updateGallery } from '@/lib/galleries/repo';
import { deletePhoto, getPhotoById, setPhotoChapter } from '@/lib/photos/repo';
import { getStorage } from '@/lib/storage';

type Ctx = { params: Promise<{ id: string }> };
const patchSchema = z.object({ chapterId: z.string().uuid().nullable() });

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  const photo = await getPhotoById(db, id);
  if (!photo) return notFound();
  const parsed = await parseJson(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { chapterId } = parsed.data;
  if (chapterId) {
    const [c] = await db.select().from(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.galleryId, photo.galleryId)));
    if (!c) return Response.json({ error: 'Capítulo inválido' }, { status: 400 });
  }
  return Response.json(await setPhotoChapter(db, id, chapterId));
}

export async function DELETE(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  const photo = await getPhotoById(db, id);
  if (!photo) return notFound();
  const gallery = await getGalleryById(db, photo.galleryId);
  if (gallery?.coverPhotoId === id) await updateGallery(db, gallery.id, { coverPhotoId: null });
  await getStorage().delete(await deletePhoto(db, id));
  return new Response(null, { status: 204 });
}
