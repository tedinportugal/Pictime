import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { deleteGallery, getGalleryById, updateGallery } from '@/lib/galleries/repo';
import { patchGallerySchema, toAdminGallery } from '@/lib/galleries/validation';
import { getPhoto } from '@/lib/photos/repo';
import { getStorage } from '@/lib/storage';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const parsed = await parseJson(req, patchGallerySchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;

  if (patch.coverPhotoId && !(await getPhoto(db, id, patch.coverPhotoId))) {
    return Response.json({ error: 'A foto de capa não pertence a esta galeria' }, { status: 400 });
  }
  if (patch.theme?.logoUrl && !getStorage().isOwnUrl(patch.theme.logoUrl)) {
    return Response.json({ error: 'Logo inválido' }, { status: 400 });
  }
  const updated = await updateGallery(db, id, patch);
  return updated ? Response.json(toAdminGallery(updated)) : notFound();
}

export async function DELETE(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const urls = await deleteGallery(db, id);
  await getStorage().delete(urls);
  return new Response(null, { status: 204 });
}
