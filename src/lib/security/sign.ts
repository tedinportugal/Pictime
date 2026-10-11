import { createHmac, timingSafeEqual } from 'node:crypto';

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET tem de estar definido (>= 32 caracteres)');
  return s;
}

function mac(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function sign(value: string, ttlSeconds: number, now = Date.now()): string {
  const payload = `${Buffer.from(value).toString('base64url')}.${now + ttlSeconds * 1000}`;
  return `${payload}.${mac(payload)}`;
}

export function unsign(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [value, exp, sig] = parts;
  const expected = Buffer.from(mac(`${value}.${exp}`));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  if (!(Number(exp) > now)) return null;
  return Buffer.from(value, 'base64url').toString();
}
