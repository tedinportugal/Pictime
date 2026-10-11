import { clearAdminSessionCookie } from '@/lib/auth/admin';

export async function POST(): Promise<Response> {
  return new Response(null, { status: 303, headers: { Location: '/admin/login', 'Set-Cookie': clearAdminSessionCookie() } });
}
