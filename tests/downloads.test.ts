import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { createTempStorage } from './helpers/storage';
import { makeJpeg } from './helpers/images';
import { setDbForTests, type Db } from '@/db/client';
import { setStorageForTests, type Storage } from '@/lib/storage';
import { createGallery, updateGallery, type Gallery } from '@/lib/galleries/repo';
import { ingestPhoto } from '@/lib/photos/ingest';
import { createUnlockCookie } from '@/lib/access/access';
import { addFavorite } from '@/lib/favorites/repo';
import { createVisitorCookie } from '@/lib/favorites/visitor';
import { contentDisposition, dedupeNames } from '@/lib/downloads/filename';
import { planZipParts } from '@/lib/downloads/zip';
import { GET as downloadOne } from '@/app/api/g/[slug]/photos/[photoId]/download/route';
import { GET as zip } from '@/app/api/g/[slug]/zip/route';
import { GET as manifest } from '@/app/api/g/[slug]/zip/manifest/route';

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

const pair = (c: string) => c.split(';')[0];

async function seed(title = 'João & Inês', password?: string) {
  const g = await createGallery(db, { title, password });
  const add = async (name: string) => {
    const url = await storage.put(`galleries/${g.id}/originals/${crypto.randomUUID().slice(0, 8)}.jpg`, await makeJpeg(300, 200), 'image/jpeg');
    return ingestPhoto({ db, storage }, { galleryId: g.id, originalUrl: url, filename: name });
  };
  return { g, a: await add('IMG_1.jpg'), b: await add('IMG_1.jpg') };
}

const get = (url: string, cookies: string[] = []) => new Request(url, { headers: { cookie: cookies.join('; ') } });

describe('nomes de ficheiros', () => {
  it('Content-Disposition seguro com acentos', () => {
    expect(contentDisposition('João & Inês.zip')).toBe(`attachment; filename="Joao & Ines.zip"; filename*=UTF-8''Jo%C3%A3o%20%26%20In%C3%AAs.zip`);
    expect(contentDisposition('a"\r\nb.jpg')).toBe(`attachment; filename="a___b.jpg"; filename*=UTF-8''a%22%0D%0Ab.jpg`);
  });
  it('desduplica nomes repetidos', () => {
    expect(dedupeNames(['a.jpg', 'A.jpg', 'a.jpg', 'b'])).toEqual(['a.jpg', 'A (2).jpg', 'a (3).jpg', 'b']);
  });
});

describe('planZipParts', () => {
  it('divide por tamanho e por número', () => {
    const items = [5, 5, 5, 20, 1].map((bytes) => ({ bytes }));
    expect(planZipParts(items, 10, 100).map((p) => p.map((i) => i.bytes))).toEqual([[5, 5], [5], [20], [1]]);
    expect(planZipParts(items, 1000, 2).map((p) => p.length)).toEqual([2, 2, 1]);
    expect(planZipParts([], 10, 10)).toEqual([]);
  });
  it('por omissão, cada parte cabe nos 300 s da função mesmo numa ligação de ~15 Mbit/s', () => {
    const MB = 1024 ** 2;
    const parts = planZipParts(Array.from({ length: 10 }, () => ({ bytes: 100 * MB })));
    expect(parts.map((p) => p.length)).toEqual([5, 5]);
    for (const p of parts) expect(p.reduce((s, x) => s + x.bytes, 0)).toBeLessThanOrEqual(500 * MB);
  });
});

describe('download individual', () => {
  it('devolve o original com o nome do ficheiro', async () => {
    const { g, a } = await seed();
    const res = await downloadOne(get('http://localhost'), { params: Promise.resolve({ slug: g.slug, photoId: a.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain('IMG_1.jpg');
    expect(Buffer.from(await res.arrayBuffer()).length).toBe(a.bytes);
  });

  it('galeria protegida: 401 sem desbloqueio, 200 com', async () => {
    const { g, a } = await seed('A', 'amor2026');
    expect((await downloadOne(get('http://localhost'), { params: Promise.resolve({ slug: g.slug, photoId: a.id }) })).status).toBe(401);
    expect((await downloadOne(get('http://localhost', [pair(createUnlockCookie(g))]), { params: Promise.resolve({ slug: g.slug, photoId: a.id }) })).status).toBe(200);
  });

  it('galeria expirada: 410; id malformado: 404', async () => {
    const { g, a } = await seed();
    expect((await downloadOne(get('http://localhost'), { params: Promise.resolve({ slug: g.slug, photoId: 'abc' }) })).status).toBe(404);
    await updateGallery(db, g.id, { expiresAt: new Date(Date.now() - 1000) });
    expect((await downloadOne(get('http://localhost'), { params: Promise.resolve({ slug: g.slug, photoId: a.id }) })).status).toBe(410);
  });
});

describe('ZIP', () => {
  async function fetchZip(g: Gallery, query: string, cookies: string[] = []) {
    return zip(get(`http://localhost/api/g/${g.slug}/zip?${query}`, cookies), { params: Promise.resolve({ slug: g.slug }) });
  }

  it('manifesto e ZIP com tamanho exato, nomes únicos e nome do casal', async () => {
    const { g } = await seed();
    const m = await manifest(get(`http://localhost/api/g/${g.slug}/zip/manifest?set=all`), { params: Promise.resolve({ slug: g.slug }) });
    const { parts } = await m.json();
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ part: 1, count: 2 });

    const res = await fetchZip(g, 'set=all&part=1');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain(`filename*=UTF-8''Jo%C3%A3o%20%26%20In%C3%AAs.zip`);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.subarray(0, 2).toString()).toBe('PK');
    expect(body.length).toBe(Number(res.headers.get('content-length')));
    expect(body.includes(Buffer.from('IMG_1.jpg'))).toBe(true);
    expect(body.includes(Buffer.from('IMG_1 (2).jpg'))).toBe(true);
  });

  it('favoritas exigem visitante e só incluem as dele', async () => {
    const { g, a } = await seed();
    expect((await fetchZip(g, 'set=favorites&part=1')).status).toBe(401);
    const { cookie, visitor } = createVisitorCookie('Inês');
    await addFavorite(db, { galleryId: g.id, photoId: a.id, visitorId: visitor.id, visitorName: 'Inês' });
    const res = await fetchZip(g, 'set=favorites&part=1', [pair(cookie)]);
    expect(res.status).toBe(200);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.includes(Buffer.from('IMG_1 (2).jpg'))).toBe(false);
  });

  it('parte inexistente ou set inválido: 400/404; galeria protegida: 401', async () => {
    const { g } = await seed();
    expect((await fetchZip(g, 'set=all&part=9')).status).toBe(404);
    expect((await fetchZip(g, 'set=tudo&part=1')).status).toBe(400);
    const locked = await seed('B', 'x1234');
    expect((await fetchZip(locked.g, 'set=all&part=1')).status).toBe(401);
  });
});
