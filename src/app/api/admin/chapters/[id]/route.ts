import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { deleteChapter, renameChapter } from '@/lib/galleries/chapters';
import { chapterSchema } from '@/lib/galleries/validation';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const parsed = await parseJson(req, chapterSchema);
  if (!parsed.ok) return parsed.response;
  const row = await renameChapter(await getDb(), id, parsed.data.name);
  return row ? Response.json(row) : notFound();
}

export async function DELETE(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  return (await deleteChapter(await getDb(), id)) ? new Response(null, { status: 204 }) : notFound();
}
