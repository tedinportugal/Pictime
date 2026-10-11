import { z } from 'zod';
import { getDb } from '@/db/client';
import { parseJson } from '@/lib/http';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { createVisitorCookie } from '@/lib/favorites/visitor';

const bodySchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const access = await accessFromRequest(await getDb(), req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const parsed = await parseJson(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { cookie, visitor } = createVisitorCookie(parsed.data.name);
  return Response.json({ name: visitor.name }, { headers: { 'Set-Cookie': cookie } });
}
