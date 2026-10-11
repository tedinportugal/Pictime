import { getDb } from '@/db/client';
import { checkAdminPassword, createAdminSessionCookie } from '@/lib/auth/admin';
import { clientIp } from '@/lib/http';
import { isAdminLoginRateLimited, recordFailedAdminLogin } from '@/lib/access/rate-limit';

const back = (query: string) => new Response(null, { status: 303, headers: { Location: `/admin/login${query}` } });

export async function POST(req: Request): Promise<Response> {
  const db = await getDb();
  const ip = clientIp(req);
  if (await isAdminLoginRateLimited(db, ip)) return back('?error=limit');
  const form = await req.formData();
  const password = String(form.get('password') ?? '');
  if (!checkAdminPassword(password)) {
    await recordFailedAdminLogin(db, ip);
    return back('?error=1');
  }
  return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': createAdminSessionCookie() } });
}
