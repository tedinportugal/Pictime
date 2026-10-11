import { describe, expect, it } from 'vitest';
import { generateSlug, slugify } from '@/lib/security/slug';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { sign, unsign } from '@/lib/security/sign';
import { getCookie, serializeCookie } from '@/lib/security/cookies';

describe('slug', () => {
  it('remove acentos e símbolos', () => {
    expect(slugify('João & Inês')).toBe('joao-ines');
  });
  it('gera nome + 12 caracteres aleatórios', () => {
    const s = generateSlug('João & Inês');
    expect(s).toMatch(/^joao-ines-[a-z2-9]{12}$/);
    expect(generateSlug('João & Inês')).not.toBe(s);
  });
  it('funciona sem título utilizável', () => {
    expect(generateSlug('&&&')).toMatch(/^galeria-[a-z2-9]{12}$/);
  });
});

describe('password', () => {
  it('verifica a palavra-passe correta e rejeita a errada', async () => {
    const h = await hashPassword('amor2026');
    expect(await verifyPassword('amor2026', h)).toBe(true);
    expect(await verifyPassword('amor2027', h)).toBe(false);
    expect(await verifyPassword('amor2026', 'lixo')).toBe(false);
  });
});

describe('sign', () => {
  it('recupera o valor dentro do prazo', () => {
    const t = sign('olá', 60, 1_000);
    expect(unsign(t, 2_000)).toBe('olá');
  });
  it('rejeita tokens expirados ou adulterados', () => {
    const t = sign('admin', 60, 0);
    expect(unsign(t, 61_000)).toBeNull();
    expect(unsign(t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), 1)).toBeNull();
    expect(unsign(undefined)).toBeNull();
    expect(unsign('a.b')).toBeNull();
  });
});

describe('cookies', () => {
  it('lê cookies do pedido', () => {
    const req = new Request('http://x', { headers: { cookie: 'a=1; visitor=x%20y' } });
    expect(getCookie(req, 'visitor')).toBe('x y');
    expect(getCookie(req, 'nope')).toBeUndefined();
  });
  it('serializa com HttpOnly e SameSite', () => {
    expect(serializeCookie('a', 'b c', { maxAge: 10 })).toBe('a=b%20c; Path=/; Max-Age=10; HttpOnly; SameSite=Lax');
  });
});
