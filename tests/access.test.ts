import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { setDbForTests, type Db } from '@/db/client';
import { createGallery, updateGallery } from '@/lib/galleries/repo';
import { createUnlockCookie, evaluateAccess, unlockCookieName } from '@/lib/access/access';
import { MAX_ATTEMPTS, isRateLimited, recordFailedAttempt } from '@/lib/access/rate-limit';
import { POST as unlock } from '@/app/api/g/[slug]/unlock/route';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  setDbForTests(db);
});
afterEach(() => setDbForTests(null));

const tokenFrom = (setCookie: string) => decodeURIComponent(setCookie.split(';')[0].split('=').slice(1).join('='));

describe('evaluateAccess', () => {
  it('cobre todos os estados', async () => {
    const open = await createGallery(db, { title: 'A' });
    const locked = await createGallery(db, { title: 'B', password: 'amor2026' });
    const expired = await createGallery(db, { title: 'C', expiresAt: new Date('2020-01-01') });
    expect(evaluateAccess(null, undefined).status).toBe('not_found');
    expect(evaluateAccess(open, undefined).status).toBe('ok');
    expect(evaluateAccess(locked, undefined).status).toBe('locked');
    expect(evaluateAccess(locked, tokenFrom(createUnlockCookie(locked))).status).toBe('ok');
    expect(evaluateAccess(expired, undefined).status).toBe('expired');
  });

  it('o cookie de uma galeria não abre outra', async () => {
    const a = await createGallery(db, { title: 'A', password: 'x1234' });
    const b = await createGallery(db, { title: 'B', password: 'x1234' });
    expect(evaluateAccess(b, tokenFrom(createUnlockCookie(a))).status).toBe('locked');
  });

  it('mudar a palavra-passe invalida desbloqueios antigos', async () => {
    const g = await createGallery(db, { title: 'A', password: 'antiga1' });
    const token = tokenFrom(createUnlockCookie(g));
    const updated = (await updateGallery(db, g.id, { password: 'nova1234' }))!;
    expect(evaluateAccess(updated, token).status).toBe('locked');
  });

  it('expiração tem prioridade sobre o desbloqueio', async () => {
    const g = await createGallery(db, { title: 'A', password: 'x1234' });
    const token = tokenFrom(createUnlockCookie(g));
    const expired = (await updateGallery(db, g.id, { expiresAt: new Date(Date.now() - 1000) }))!;
    expect(evaluateAccess(expired, token).status).toBe('expired');
  });
});

describe('POST /api/g/[slug]/unlock', () => {
  const post = (slug: string, password: string, ip = '1.1.1.1') => {
    const body = new FormData();
    body.set('password', password);
    return unlock(new Request(`http://localhost/api/g/${slug}/unlock`, { method: 'POST', body, headers: { 'x-forwarded-for': ip } }), {
      params: Promise.resolve({ slug }),
    });
  };

  it('desbloqueia com a palavra-passe certa', async () => {
    const g = await createGallery(db, { title: 'A', password: 'amor2026' });
    const res = await post(g.slug, 'amor2026');
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`/g/${g.slug}`);
    expect(res.headers.get('set-cookie')).toContain(unlockCookieName(g.id));
  });

  it('erra, e ao fim de 5 tentativas bloqueia esse IP durante 15 minutos', async () => {
    const g = await createGallery(db, { title: 'A', password: 'amor2026' });
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect((await post(g.slug, 'errada')).headers.get('location')).toBe(`/g/${g.slug}?error=1`);
    }
    const blocked = await post(g.slug, 'amor2026');
    expect(blocked.headers.get('location')).toBe(`/g/${g.slug}?error=limit`);
    expect(blocked.headers.get('set-cookie')).toBeNull();
    expect((await post(g.slug, 'amor2026', '2.2.2.2')).headers.get('set-cookie')).not.toBeNull();
  });

  it('a janela de tempo expira', async () => {
    const g = await createGallery(db, { title: 'A', password: 'x1234' });
    const old = new Date(Date.now() - 16 * 60 * 1000);
    for (let i = 0; i < MAX_ATTEMPTS; i++) await recordFailedAttempt(db, g.id, '9.9.9.9', old);
    expect(await isRateLimited(db, g.id, '9.9.9.9')).toBe(false);
  });

  it('galeria inexistente devolve 404', async () => {
    expect((await post('nao-existe', 'x')).status).toBe(404);
  });
});
