import { checkAdminPassword, createAdminSessionCookie } from '@/lib/auth/admin';

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData();
  const password = String(form.get('password') ?? '');
  if (!checkAdminPassword(password)) {
    return new Response(null, { status: 303, headers: { Location: '/admin/login?error=1' } });
  }
  return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': createAdminSessionCookie() } });
}
