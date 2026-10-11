import { describe, expect, it } from 'vitest';
import { PermanentError, runQueue } from '@/lib/upload/queue';

const noSleep = () => Promise.resolve();
const files = (...names: string[]) => names.map((name) => ({ name }));

describe('runQueue', () => {
  it('conclui todos os ficheiros', async () => {
    const result = await runQueue(files('a', 'b', 'c'), { upload: async (f) => `u/${f.name}`, ingest: async () => {} }, { sleep: noSleep });
    expect(result.map((r) => r.status)).toEqual(['done', 'done', 'done']);
  });

  it('repete falhas temporárias e regista as tentativas', async () => {
    let calls = 0;
    const result = await runQueue(
      files('a'),
      { upload: async () => { if (++calls === 1) throw new Error('rede'); return 'u'; }, ingest: async () => {} },
      { sleep: noSleep },
    );
    expect(result[0]).toMatchObject({ status: 'done', attempts: 2 });
  });

  it('não repete erros permanentes e continua o lote', async () => {
    let ingests = 0;
    const result = await runQueue(
      files('mau.heic', 'bom.jpg'),
      {
        upload: async (f) => f.name,
        ingest: async (url) => { ingests++; if (url === 'mau.heic') throw new PermanentError('Formato HEIC não suportado.'); },
      },
      { sleep: noSleep },
    );
    expect(result[0]).toMatchObject({ status: 'failed', error: 'Formato HEIC não suportado.', attempts: 1 });
    expect(result[1].status).toBe('done');
    expect(ingests).toBe(2);
  });

  it('desiste após maxAttempts', async () => {
    const result = await runQueue(files('a'), { upload: async () => { throw new Error('offline'); }, ingest: async () => {} }, { sleep: noSleep, maxAttempts: 3 });
    expect(result[0]).toMatchObject({ status: 'failed', attempts: 3, error: 'offline' });
  });

  it('respeita a concorrência e emite progresso', async () => {
    let active = 0;
    let peak = 0;
    const snapshots: number[] = [];
    await runQueue(
      files('1', '2', '3', '4', '5'),
      {
        upload: async (_f, onProgress) => {
          active++; peak = Math.max(peak, active);
          onProgress(50);
          await new Promise((r) => setTimeout(r, 5));
          active--;
          return 'u';
        },
        ingest: async () => {},
      },
      { concurrency: 2, sleep: noSleep, onChange: (items) => snapshots.push(items.filter((i) => i.status === 'done').length) },
    );
    expect(peak).toBe(2);
    expect(snapshots.at(-1)).toBe(5);
  });
});
