import { afterAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('getDb', () => {
  afterAll(() => {
    delete process.env.DATA_DIR;
  });

  // O Next.js carrega rotas de API e páginas em grafos de módulos separados:
  // ambos têm de partilhar a mesma instância PGlite (duas instâncias no mesmo diretório corrompem/divergem).
  it('partilha a mesma instância entre cópias do módulo', async () => {
    process.env.DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'galeria-db-'));
    const a = await (await import('@/db/client')).getDb();
    vi.resetModules();
    const b = await (await import('@/db/client')).getDb();
    expect(b).toBe(a);
  });
});
