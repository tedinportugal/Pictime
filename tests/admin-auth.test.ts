import { describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/admin/login/route';
import { isAdminRequest } from '@/lib/auth/admin';
import { adminCookieHeader } from './helpers/auth';

function form(password: string): Request {
  const body = new FormData();
  body.set('password', password);
  return new Request('http://localhost/api/admin/login', { method: 'POST', body });
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
  it('reconhece pedidos autenticados', () => {
    expect(isAdminRequest(new Request('http://x', { headers: { cookie: adminCookieHeader() } }))).toBe(true);
    expect(isAdminRequest(new Request('http://x'))).toBe(false);
  });
});
