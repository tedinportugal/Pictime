import { z } from 'zod';
import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { getGalleryById } from '@/lib/galleries/repo';
import { reorderPhotos } from '@/lib/photos/repo';

const bodySchema = z.object({ ids: z.array(z.string().uuid()).max(5000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const parsed = await parseJson(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  await reorderPhotos(db, id, parsed.data.ids);
  return new Response(null, { status: 204 });
}
