import { randomUUID } from 'node:crypto';
import { sign, unsign } from '@/lib/security/sign';
import { serializeCookie } from '@/lib/security/cookies';

export const VISITOR_COOKIE = 'visitor';
const TTL = 60 * 60 * 24 * 365;

export interface Visitor {
  id: string;
  name: string;
}

export function createVisitorCookie(name: string): { cookie: string; visitor: Visitor } {
  const visitor = { id: randomUUID(), name };
  return { cookie: serializeCookie(VISITOR_COOKIE, sign(JSON.stringify(visitor), TTL), { maxAge: TTL }), visitor };
}

export function readVisitor(token: string | undefined): Visitor | null {
  const raw = unsign(token);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return typeof v?.id === 'string' && typeof v?.name === 'string' ? { id: v.id, name: v.name } : null;
  } catch {
    return null;
  }
}
