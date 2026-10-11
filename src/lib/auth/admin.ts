import { createHash, timingSafeEqual } from 'node:crypto';
import { sign, unsign } from '@/lib/security/sign';
import { getCookie, serializeCookie } from '@/lib/security/cookies';

export const ADMIN_COOKIE = 'admin_session';
const TTL = 60 * 60 * 24 * 30;

const digest = (s: string) => createHash('sha256').update(s).digest();

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) throw new Error('ADMIN_PASSWORD tem de estar definido (>= 12 caracteres)');
  return timingSafeEqual(digest(input), digest(expected));
}

export function createAdminSessionCookie(): string {
  return serializeCookie(ADMIN_COOKIE, sign('admin', TTL), { maxAge: TTL });
}

export function clearAdminSessionCookie(): string {
  return serializeCookie(ADMIN_COOKIE, '', { maxAge: 0 });
}

export function isAdminToken(token: string | undefined): boolean {
  return unsign(token) === 'admin';
}

export function isAdminRequest(req: Request): boolean {
  return isAdminToken(getCookie(req, ADMIN_COOKIE));
}

export function unauthorized(): Response {
  return Response.json({ error: 'Sessão inválida' }, { status: 401 });
}
