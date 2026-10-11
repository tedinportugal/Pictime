import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import type { Db } from '@/db/client';
import { photos } from '@/db/schema';
import { createGallery, deleteGallery, getGalleryById, getGalleryBySlug, listGalleries, updateGallery } from '@/lib/galleries/repo';
import { createChapter, deleteChapter, listChapters, renameChapter } from '@/lib/galleries/chapters';
import { verifyPassword } from '@/lib/security/password';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('galerias', () => {
  it('cria com slug legível, tema por omissão e palavra-passe cifrada', async () => {
    const g = await createGallery(db, { title: '  João & Inês ', subtitle: 'Sintra', password: 'amor2026' });
    expect(g.title).toBe('João & Inês');
    expect(g.slug).toMatch(/^joao-ines-[a-z2-9]{12}$/);
    expect(g.theme.preset).toBe('marfim');
    expect(await verifyPassword('amor2026', g.passwordHash!)).toBe(true);
    expect((await getGalleryBySlug(db, g.slug))?.id).toBe(g.id);
  });

  it('lista com número de fotos, mais recente primeiro', async () => {
    const a = await createGallery(db, { title: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    await createGallery(db, { title: 'B' });
    await db.insert(photos).values({ galleryId: a.id, filename: 'x.jpg', originalUrl: 'o', webUrl: 'w', thumbUrl: 't', width: 1, height: 1, bytes: 1 });
    const list = await listGalleries(db);
    expect(list.map((g) => [g.title, g.photoCount])).toEqual([['B', 0], ['A', 1]]);
  });

  it('atualiza campos e remove a palavra-passe com null', async () => {
    const g = await createGallery(db, { title: 'A', password: 'x1234' });
    const u = await updateGallery(db, g.id, { title: 'B', password: null, expiresAt: new Date('2030-01-01T00:00:00Z') });
    expect(u?.title).toBe('B');
    expect(u?.passwordHash).toBeNull();
    expect(u?.expiresAt?.toISOString()).toBe('2030-01-01T00:00:00.000Z');
  });

  it('devolve null para ids que não são UUID (sem erro do Postgres)', async () => {
    expect(await getGalleryById(db, 'abc')).toBeNull();
    expect(await updateGallery(db, 'abc', { title: 'x' })).toBeNull();
  });

  it('ao apagar devolve os URLs dos ficheiros', async () => {
    const g = await createGallery(db, { title: 'A' });
    await db.insert(photos).values({ galleryId: g.id, filename: 'x.jpg', originalUrl: 'o1', webUrl: 'w1', thumbUrl: 't1', width: 1, height: 1, bytes: 1 });
    await updateGallery(db, g.id, { theme: { ...g.theme, logoUrl: 'logo1' } });
    expect((await deleteGallery(db, g.id)).sort()).toEqual(['logo1', 'o1', 't1', 'w1']);
    expect(await getGalleryById(db, g.id)).toBeNull();
  });
});

describe('capítulos', () => {
  it('cria por ordem, renomeia e apaga', async () => {
    const g = await createGallery(db, { title: 'A' });
    const c1 = await createChapter(db, g.id, 'Preparação');
    await createChapter(db, g.id, 'Cerimónia');
    await renameChapter(db, c1.id, 'Manhã');
    expect((await listChapters(db, g.id)).map((c) => c.name)).toEqual(['Manhã', 'Cerimónia']);
    expect(await deleteChapter(db, c1.id)).toBe(true);
    expect(await deleteChapter(db, 'abc')).toBe(false);
    expect(await listChapters(db, g.id)).toHaveLength(1);
  });
});
