import type { Db } from '@/db/client';
import { getGalleryBySlug, type Gallery } from '@/lib/galleries/repo';
import { sign, unsign } from '@/lib/security/sign';
import { getCookie, serializeCookie } from '@/lib/security/cookies';

const TTL = 60 * 60 * 24 * 30;

export type AccessResult =
  | { status: 'ok'; gallery: Gallery }
  | { status: 'not_found' }
  | { status: 'expired'; gallery: Gallery }
  | { status: 'locked'; gallery: Gallery };

export function unlockCookieName(galleryId: string): string {
  return `g_${galleryId.replace(/-/g, '')}`;
}

/** Inclui um fragmento do hash: mudar a palavra-passe invalida desbloqueios antigos. */
function unlockValue(g: Gallery): string {
  return `${g.id}:${(g.passwordHash ?? '').slice(-16)}`;
}

export function createUnlockCookie(g: Gallery): string {
  return serializeCookie(unlockCookieName(g.id), sign(unlockValue(g), TTL), { maxAge: TTL });
}

export function evaluateAccess(gallery: Gallery | null, unlockToken: string | undefined, now = new Date()): AccessResult {
  if (!gallery) return { status: 'not_found' };
  if (gallery.expiresAt && gallery.expiresAt <= now) return { status: 'expired', gallery };
  if (gallery.passwordHash && unsign(unlockToken, now.getTime()) !== unlockValue(gallery)) return { status: 'locked', gallery };
  return { status: 'ok', gallery };
}

export async function accessFromRequest(db: Db, req: Request, slug: string): Promise<AccessResult> {
  const gallery = await getGalleryBySlug(db, slug);
  return evaluateAccess(gallery, gallery ? getCookie(req, unlockCookieName(gallery.id)) : undefined);
}

export function accessErrorResponse(a: Exclude<AccessResult, { status: 'ok' }>): Response {
  switch (a.status) {
    case 'not_found':
      return Response.json({ error: 'Galeria não encontrada' }, { status: 404 });
    case 'expired':
      return Response.json({ error: 'Esta galeria expirou' }, { status: 410 });
    case 'locked':
      return Response.json({ error: 'Galeria protegida por palavra-passe', code: 'locked' }, { status: 401 });
  }
}
