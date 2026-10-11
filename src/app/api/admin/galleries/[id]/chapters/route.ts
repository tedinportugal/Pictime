import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { getGalleryById } from '@/lib/galleries/repo';
import { createChapter } from '@/lib/galleries/chapters';
import { chapterSchema } from '@/lib/galleries/validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const parsed = await parseJson(req, chapterSchema);
  if (!parsed.ok) return parsed.response;
  return Response.json(await createChapter(db, id, parsed.data.name), { status: 201 });
}
