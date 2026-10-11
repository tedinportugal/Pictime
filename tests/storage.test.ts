import { describe, expect, it } from 'vitest';
import { createTempStorage } from './helpers/storage';
import { isSafeKey } from '@/lib/storage/local';

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

describe('storage local', () => {
  it('guarda, lê, abre como stream e apaga', async () => {
    const { storage } = await createTempStorage();
    const url = await storage.put('galleries/g1/web/a.jpg', Buffer.from('olá'), 'image/jpeg');
    expect(url).toBe('/api/files/galleries/g1/web/a.jpg');
    expect(storage.isOwnUrl(url)).toBe(true);
    expect((await storage.get(url)).toString()).toBe('olá');
    expect(await readAll(await storage.open(url))).toBe('olá');
    await storage.delete([url]);
    await expect(storage.get(url)).rejects.toThrow();
  });
  it('recusa chaves perigosas', async () => {
    expect(isSafeKey('galleries/../../etc/passwd')).toBe(false);
    expect(isSafeKey('/abs')).toBe(false);
    expect(isSafeKey('galleries/a b.jpg')).toBe(false);
    const { storage } = await createTempStorage();
    await expect(storage.put('../x', Buffer.from(''), 'text/plain')).rejects.toThrow();
    expect(storage.isOwnUrl('https://evil.example/x')).toBe(false);
  });
});
