import { del, put } from '@vercel/blob';
import type { Storage } from './types';

export function createBlobStorage(): Storage {
  const fetchOk = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`Falha ao ler ficheiro (${res.status})`);
    return res;
  };
  return {
    async put(key, body, contentType) {
      const r = await put(key, body, { access: 'public', contentType, addRandomSuffix: true });
      return r.url;
    },
    get: async (url) => Buffer.from(await (await fetchOk(url)).arrayBuffer()),
    open: async (url) => (await fetchOk(url)).body!,
    async delete(urls) {
      if (urls.length) await del(urls);
    },
    isOwnUrl(url) {
      try {
        const u = new URL(url);
        return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com');
      } catch {
        return false;
      }
    },
  };
}
