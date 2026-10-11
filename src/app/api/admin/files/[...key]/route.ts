import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound } from '@/lib/http';
import { getStorage, storageDriver } from '@/lib/storage';
import { LOGO_KEY_RE, ORIGINAL_KEY_RE } from '@/lib/upload/filename';

/** Upload direto para o storage local (só em desenvolvimento). */
export async function PUT(req: Request, { params }: { params: Promise<{ key: string[] }> }): Promise<Response> {
  if (storageDriver() !== 'local') return notFound();
  if (!isAdminRequest(req)) return unauthorized();
  const key = (await params).key.join('/');
  if (!ORIGINAL_KEY_RE.test(key) && !LOGO_KEY_RE.test(key)) {
    return Response.json({ error: 'Caminho inválido' }, { status: 400 });
  }
  const body = Buffer.from(await req.arrayBuffer());
  const url = await getStorage().put(key, body, req.headers.get('content-type') ?? 'application/octet-stream');
  return Response.json({ url }, { status: 201 });
}
