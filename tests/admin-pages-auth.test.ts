import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from './helpers/db';
import { setDbForTests } from '@/db/client';
import { createGallery } from '@/lib/galleries/repo';

// Sem cookie de sessão; redirect() lança, como no Next.js.
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
  notFound: () => { throw new Error('NOT_FOUND'); },
}));

beforeEach(async () => setDbForTests(await createTestDb()));
afterEach(() => setDbForTests(null));

// O layout (protected) pode não correr num pedido RSC parcial: cada página tem de verificar a sessão.
describe('páginas do painel sem sessão', () => {
  it('a lista de galerias redireciona para o login', async () => {
    const { default: AdminHome } = await import('@/app/admin/(protected)/page');
    await expect(AdminHome()).rejects.toThrow('REDIRECT:/admin/login');
  });

  it('o editor redireciona para o login', async () => {
    const { getDb } = await import('@/db/client');
    const g = await createGallery(await getDb(), { title: 'A' });
    const { default: EditorPage } = await import('@/app/admin/(protected)/galleries/[id]/page');
    await expect(EditorPage({ params: Promise.resolve({ id: g.id }) })).rejects.toThrow('REDIRECT:/admin/login');
  });

  it('nova galeria redireciona para o login', async () => {
    const { default: NewGalleryPage } = await import('@/app/admin/(protected)/new/page');
    await expect((async () => NewGalleryPage())()).rejects.toThrow('REDIRECT:/admin/login');
  });
});
