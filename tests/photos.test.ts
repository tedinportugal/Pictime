import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from './helpers/db';
import { createTempStorage } from './helpers/storage';
import { makeJpeg } from './helpers/images';
import type { Db } from '@/db/client';
import type { Storage } from '@/lib/storage';
import { createGallery } from '@/lib/galleries/repo';
import { createChapter } from '@/lib/galleries/chapters';
import { deletePhoto, getPhoto, listPhotos, reorderPhotos, setPhotoChapter } from '@/lib/photos/repo';
import { ingestPhoto } from '@/lib/photos/ingest';
import { InvalidImageError } from '@/lib/images/process';
import { safeFilename } from '@/lib/upload/filename';

let db: Db;
let storage: Storage;
beforeEach(async () => {
  db = await createTestDb();
  storage = (await createTempStorage()).storage;
});

async function upload(galleryId: string, name: string, body: Buffer) {
  const originalUrl = await storage.put(`galleries/${galleryId}/originals/${safeFilename(name)}`, body, 'image/jpeg');
  return ingestPhoto({ db, storage }, { galleryId, originalUrl, filename: name });
}

describe('ingestão', () => {
  it('gera web e miniatura e guarda dimensões e tamanho do original', async () => {
    const g = await createGallery(db, { title: 'A' });
    const original = await makeJpeg(3000, 2000);
    const p = await upload(g.id, 'DSC_0001.jpg', original);
    expect([p.width, p.height, p.bytes, p.filename]).toEqual([2400, 1600, original.length, 'DSC_0001.jpg']);
    expect((await storage.get(p.webUrl)).length).toBeGreaterThan(0);
    expect((await storage.get(p.thumbUrl)).length).toBeGreaterThan(0);
  });

  it('ficheiro inválido: lança InvalidImageError e apaga o original', async () => {
    const g = await createGallery(db, { title: 'A' });
    const url = await storage.put(`galleries/${g.id}/originals/x.jpg`, Buffer.from('lixo'), 'image/jpeg');
    await expect(ingestPhoto({ db, storage }, { galleryId: g.id, originalUrl: url, filename: 'x.jpg' })).rejects.toThrow(InvalidImageError);
    await expect(storage.get(url)).rejects.toThrow();
    expect(await listPhotos(db, g.id)).toHaveLength(0);
  });
});

describe('repositório de fotos', () => {
  it('ordena, muda capítulo e apaga', async () => {
    const g = await createGallery(db, { title: 'A' });
    const img = await makeJpeg(400, 300);
    const a = await upload(g.id, 'a.jpg', img);
    const b = await upload(g.id, 'b.jpg', img);
    expect((await listPhotos(db, g.id)).map((p) => p.filename)).toEqual(['a.jpg', 'b.jpg']);
    await reorderPhotos(db, g.id, [b.id, a.id]);
    expect((await listPhotos(db, g.id)).map((p) => p.filename)).toEqual(['b.jpg', 'a.jpg']);

    const c = await createChapter(db, g.id, 'Festa');
    expect((await setPhotoChapter(db, a.id, c.id))?.chapterId).toBe(c.id);

    const urls = await deletePhoto(db, a.id);
    expect(urls).toEqual([a.originalUrl, a.webUrl, a.thumbUrl]);
    expect(await getPhoto(db, g.id, a.id)).toBeNull();
    expect(await getPhoto(db, g.id, 'abc')).toBeNull();
  });
});

describe('reorderPhotos', () => {
  it('reordena com uma única instrução UPDATE (rápido em galerias grandes)', async () => {
    const g = await createGallery(db, { title: 'A' });
    const img = await makeJpeg(100, 100);
    const ps = [];
    for (const n of ['a', 'b', 'c', 'd']) ps.push(await upload(g.id, `${n}.jpg`, img));
    const spy = vi.spyOn(db, 'update');
    await reorderPhotos(db, g.id, [ps[3].id, ps[1].id, ps[0].id, ps[2].id]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    expect((await listPhotos(db, g.id)).map((p) => p.filename)).toEqual(['d.jpg', 'b.jpg', 'a.jpg', 'c.jpg']);
  });

  it('ignora ids de outra galeria e ids malformados', async () => {
    const g = await createGallery(db, { title: 'A' });
    const other = await createGallery(db, { title: 'B' });
    const img = await makeJpeg(100, 100);
    const a = await upload(g.id, 'a.jpg', img);
    const x = await upload(other.id, 'x.jpg', img);
    await reorderPhotos(db, g.id, ['abc', x.id, a.id]);
    expect((await listPhotos(db, other.id))[0].order).toBe(0);
    expect((await listPhotos(db, g.id))[0].order).toBe(2);
    await reorderPhotos(db, g.id, []);
  });
});

describe('safeFilename', () => {
  it('tira acentos e caracteres perigosos', () => {
    expect(safeFilename('Noivos Ínês (1).JPG')).toBe('Noivos-Ines-1-.JPG');
    expect(safeFilename('../../etc/passwd')).toBe('etc-passwd');
    expect(safeFilename('')).toBe('ficheiro');
  });
});
