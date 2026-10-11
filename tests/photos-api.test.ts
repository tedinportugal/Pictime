import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { createTempStorage } from './helpers/storage';
import { adminCookieHeader } from './helpers/auth';
import { makeJpeg } from './helpers/images';
import { setDbForTests, type Db } from '@/db/client';
import { setStorageForTests, type Storage } from '@/lib/storage';
import { createGallery } from '@/lib/galleries/repo';
import { POST as ingest } from '@/app/api/admin/galleries/[id]/photos/route';
import { PUT as putFile } from '@/app/api/admin/files/[...key]/route';
import { GET as getFile } from '@/app/api/files/[...key]/route';

let db: Db;
let storage: Storage;
beforeEach(async () => {
  db = await createTestDb();
  storage = (await createTempStorage()).storage;
  setDbForTests(db);
  setStorageForTests(storage);
});
afterEach(() => {
  setDbForTests(null);
  setStorageForTests(null);
});

const json = (body: unknown) =>
  new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: adminCookieHeader() },
    body: JSON.stringify(body),
  });

describe('upload local + ingestão', () => {
  it('fluxo completo: PUT do original e POST da ingestão', async () => {
    const g = await createGallery(db, { title: 'A' });
    const key = `galleries/${g.id}/originals/abc-foto.jpg`.split('/');
    const put = await putFile(
      new Request('http://localhost', { method: 'PUT', headers: { cookie: adminCookieHeader() }, body: new Uint8Array(await makeJpeg(800, 600)) }),
      { params: Promise.resolve({ key }) },
    );
    expect(put.status).toBe(201);
    const { url } = await put.json();
    const res = await ingest(json({ originalUrl: url, filename: 'foto.jpg' }), { params: Promise.resolve({ id: g.id }) });
    expect(res.status).toBe(201);
    const photo = await res.json();
    expect(photo.width).toBe(800);
  });

  it('PUT exige sessão e caminho de originais/logo da galeria', async () => {
    const g = await createGallery(db, { title: 'A' });
    const noAuth = await putFile(new Request('http://localhost', { method: 'PUT', body: 'x' }), { params: Promise.resolve({ key: ['galleries', g.id, 'originals', 'a.jpg'] }) });
    expect(noAuth.status).toBe(401);
    const badPath = await putFile(
      new Request('http://localhost', { method: 'PUT', headers: { cookie: adminCookieHeader() }, body: 'x' }),
      { params: Promise.resolve({ key: ['galleries', g.id, 'web', 'a.jpg'] }) },
    );
    expect(badPath.status).toBe(400);
  });

  it('ficheiro inválido devolve 422 com mensagem PT', async () => {
    const g = await createGallery(db, { title: 'A' });
    const url = await storage.put(`galleries/${g.id}/originals/x.jpg`, Buffer.from('lixo'), 'image/jpeg');
    const res = await ingest(json({ originalUrl: url, filename: 'x.jpg' }), { params: Promise.resolve({ id: g.id }) });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('imagem válida');
  });

  it('recusa URLs externos ou de outra galeria (SSRF)', async () => {
    const g = await createGallery(db, { title: 'A' });
    const other = await createGallery(db, { title: 'B' });
    const foreign = await storage.put(`galleries/${other.id}/originals/x.jpg`, await makeJpeg(10, 10), 'image/jpeg');
    for (const originalUrl of ['http://169.254.169.254/latest', foreign]) {
      const res = await ingest(json({ originalUrl, filename: 'x.jpg' }), { params: Promise.resolve({ id: g.id }) });
      expect(res.status).toBe(400);
    }
  });

  it('servidor de ficheiros locais nunca serve originais', async () => {
    const g = await createGallery(db, { title: 'A' });
    await storage.put(`galleries/${g.id}/originals/x.jpg`, Buffer.from('o'), 'image/jpeg');
    await storage.put(`galleries/${g.id}/web/x.jpg`, Buffer.from('w'), 'image/jpeg');
    const ctx = (sub: string) => ({ params: Promise.resolve({ key: ['galleries', g.id, sub, 'x.jpg'] }) });
    expect((await getFile(new Request('http://localhost'), ctx('originals'))).status).toBe(404);
    const ok = await getFile(new Request('http://localhost'), ctx('web'));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('w');
  });
});
