import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { setDbForTests } from '@/db/client';
import { POST as login } from '@/app/api/admin/login/route';
import { isAdminRequest } from '@/lib/auth/admin';
import { MAX_ATTEMPTS } from '@/lib/access/rate-limit';
import { adminCookieHeader } from './helpers/auth';

beforeEach(async () => setDbForTests(await createTestDb()));
afterEach(() => setDbForTests(null));

function form(password: string, ip = '1.1.1.1'): Request {
  const body = new FormData();
  body.set('password', password);
  return new Request('http://localhost/api/admin/login', { method: 'POST', body, headers: { 'x-forwarded-for': ip } });
}

describe('login do fotógrafo', () => {
  it('cria sessão com a palavra-passe certa', async () => {
    const res = await login(form('correct-horse-battery'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin');
    expect(res.headers.get('set-cookie')).toMatch(/^admin_session=/);
  });
  it('volta ao login com erro se a palavra-passe estiver errada', async () => {
    const res = await login(form('errada'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/login?error=1');
    expect(res.headers.get('set-cookie')).toBeNull();
  });
  it('não bloqueia o fotógrafo depois de várias tentativas erradas', async () => {
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) await login(form('errada'));
    const res = await login(form('correct-horse-battery'));
    expect(res.headers.get('location')).toBe('/admin');
    expect(res.headers.get('set-cookie')).toMatch(/^admin_session=/);
  });
  it('reconhece pedidos autenticados', () => {
    expect(isAdminRequest(new Request('http://x', { headers: { cookie: adminCookieHeader() } }))).toBe(true);
    expect(isAdminRequest(new Request('http://x'))).toBe(false);
  });
});
