import type { z } from 'zod';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

export function notFound(message = 'Não encontrado'): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';
}

export async function parseJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: Response.json({ error: 'JSON inválido' }, { status: 400 }) };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, response: Response.json({ error: 'Dados inválidos', issues: result.error.issues }, { status: 400 }) };
  }
  return { ok: true, data: result.data };
}
