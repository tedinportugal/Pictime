import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { setDbForTests, type Db } from '@/db/client';
import { photos } from '@/db/schema';
import { createGallery, updateGallery, type Gallery } from '@/lib/galleries/repo';
import { createUnlockCookie } from '@/lib/access/access';
import { listVisitorFavoriteIds } from '@/lib/favorites/repo';
import { createVisitorCookie, readVisitor } from '@/lib/favorites/visitor';
import { POST as identify } from '@/app/api/g/[slug]/visitor/route';
import { DELETE as unfav, PUT as fav } from '@/app/api/g/[slug]/favorites/[photoId]/route';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  setDbForTests(db);
});
afterEach(() => setDbForTests(null));

const pair = (setCookie: string) => setCookie.split(';')[0];

async function seed(opts: { password?: string } = {}) {
  const g = await createGallery(db, { title: 'A', password: opts.password });
  const [p] = await db.insert(photos).values({ galleryId: g.id, filename: 'a.jpg', originalUrl: 'o', webUrl: 'w', thumbUrl: 't', width: 1, height: 1, bytes: 1 }).returning();
  return { g, p };
}

const call = (handler: typeof fav, g: Gallery, photoId: string, cookies: string[]) =>
  handler(new Request('http://localhost', { method: 'PUT', headers: { cookie: cookies.join('; ') } }), {
    params: Promise.resolve({ slug: g.slug, photoId }),
  });

describe('visitante', () => {
  it('o cookie guarda id e nome e não aceita adulteração', () => {
    const { cookie, visitor } = createVisitorCookie('Inês');
    const token = decodeURIComponent(pair(cookie).split('=').slice(1).join('='));
    expect(readVisitor(token)).toEqual(visitor);
    expect(readVisitor(token.slice(0, -2) + 'xx')).toBeNull();
  });

  it('POST /visitor valida o nome', async () => {
    const { g } = await seed();
    const post = (name: unknown) =>
      identify(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }), {
        params: Promise.resolve({ slug: g.slug }),
      });
    expect((await post('')).status).toBe(400);
    const ok = await post('  Inês ');
    expect(ok.status).toBe(200);
    expect((await ok.json()).name).toBe('Inês');
    expect(ok.headers.get('set-cookie')).toMatch(/^visitor=/);
  });
});

describe('favoritas', () => {
  it('adiciona (idempotente) e remove', async () => {
    const { g, p } = await seed();
    const { cookie, visitor } = createVisitorCookie('Inês');
    expect((await (await call(fav, g, p.id, [pair(cookie)])).json()).favorited).toBe(true);
    expect((await call(fav, g, p.id, [pair(cookie)])).status).toBe(200);
    expect(await listVisitorFavoriteIds(db, g.id, visitor.id)).toEqual([p.id]);
    expect((await (await call(unfav, g, p.id, [pair(cookie)])).json()).favorited).toBe(false);
    expect(await listVisitorFavoriteIds(db, g.id, visitor.id)).toEqual([]);
  });

  it('sem nome pede identificação', async () => {
    const { g, p } = await seed();
    const res = await call(fav, g, p.id, []);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('visitor_required');
  });

  it('galeria protegida sem desbloqueio: 401 locked, mesmo com visitante', async () => {
    const { g, p } = await seed({ password: 'amor2026' });
    const visitor = pair(createVisitorCookie('X').cookie);
    const res = await call(fav, g, p.id, [visitor]);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('locked');
    expect((await call(fav, g, p.id, [visitor, pair(createUnlockCookie(g))])).status).toBe(200);
  });

  it('galeria expirada: 410', async () => {
    const { g, p } = await seed();
    const expired = (await updateGallery(db, g.id, { expiresAt: new Date(Date.now() - 1000) }))!;
    expect((await call(fav, expired, p.id, [pair(createVisitorCookie('X').cookie)])).status).toBe(410);
  });

  it('id malformado ou de outra galeria: 404', async () => {
    const { g } = await seed();
    const other = await seed();
    const visitor = pair(createVisitorCookie('X').cookie);
    expect((await call(fav, g, 'abc', [visitor])).status).toBe(404);
    expect((await call(fav, g, other.p.id, [visitor])).status).toBe(404);
  });
});
