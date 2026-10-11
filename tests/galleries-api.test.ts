import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { createTempStorage } from './helpers/storage';
import { adminCookieHeader } from './helpers/auth';
import { setDbForTests, type Db } from '@/db/client';
import { setStorageForTests } from '@/lib/storage';
import { GET as list, POST as create } from '@/app/api/admin/galleries/route';
import { DELETE as remove, PATCH as patch } from '@/app/api/admin/galleries/[id]/route';
import { POST as addChapter } from '@/app/api/admin/galleries/[id]/chapters/route';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  setDbForTests(db);
  setStorageForTests((await createTempStorage()).storage);
});
afterEach(() => {
  setDbForTests(null);
  setStorageForTests(null);
});

const req = (method: string, body?: unknown, admin = true) =>
  new Request('http://localhost/api', {
    method,
    headers: { 'content-type': 'application/json', ...(admin ? { cookie: adminCookieHeader() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('API admin de galerias', () => {
  it('exige sessão', async () => {
    expect((await create(req('POST', { title: 'A' }, false))).status).toBe(401);
    expect((await list(req('GET', undefined, false))).status).toBe(401);
  });

  it('cria, edita e apaga', async () => {
    const created = await create(req('POST', { title: 'Ana + Rui', subtitle: 'Porto', preset: 'noite' }));
    expect(created.status).toBe(201);
    const g = await created.json();
    expect(g.theme.preset).toBe('noite');
    expect(g).not.toHaveProperty('passwordHash');
    expect(g.hasPassword).toBe(false);

    const edited = await patch(req('PATCH', { title: 'Ana & Rui', password: 'segredo1' }), ctx(g.id));
    expect(edited.status).toBe(200);
    expect((await edited.json()).hasPassword).toBe(true);

    expect((await addChapter(req('POST', { name: 'Festa' }), ctx(g.id))).status).toBe(201);
    expect((await remove(req('DELETE'), ctx(g.id))).status).toBe(204);
    expect((await patch(req('PATCH', { title: 'x' }), ctx(g.id))).status).toBe(404);
  });

  it('valida os dados', async () => {
    expect((await create(req('POST', { title: '' }))).status).toBe(400);
    const g = await (await create(req('POST', { title: 'A' }))).json();
    const badTheme = { ...g.theme, colors: { ...g.theme.colors, text: 'red' } };
    expect((await patch(req('PATCH', { theme: badTheme }), ctx(g.id))).status).toBe(400);
    expect((await patch(req('PATCH', { theme: { ...g.theme, logoUrl: 'https://evil.example/x.png' } }), ctx(g.id))).status).toBe(400);
    expect((await patch(req('PATCH', { coverPhotoId: crypto.randomUUID() }), ctx(g.id))).status).toBe(400);
  });

  it('id malformado devolve 404', async () => {
    expect((await patch(req('PATCH', { title: 'x' }), ctx('abc'))).status).toBe(404);
  });
});
