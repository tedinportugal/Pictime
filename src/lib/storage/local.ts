import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { Storage } from './types';

export const LOCAL_PREFIX = '/api/files/';

export function isSafeKey(key: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(key) && !key.split('/').some((p) => p === '..' || p === '.' || p === '');
}

export function localPathForKey(rootDir: string, key: string): string {
  if (!isSafeKey(key)) throw new Error(`Chave inválida: ${key}`);
  return path.join(rootDir, ...key.split('/'));
}

export function createLocalStorage(rootDir: string): Storage {
  const pathForUrl = (url: string) => {
    if (!url.startsWith(LOCAL_PREFIX)) throw new Error(`URL não pertence ao storage local: ${url}`);
    return localPathForKey(rootDir, url.slice(LOCAL_PREFIX.length));
  };
  return {
    async put(key, body) {
      const p = localPathForKey(rootDir, key);
      await mkdir(path.dirname(p), { recursive: true });
      await writeFile(p, body);
      return LOCAL_PREFIX + key;
    },
    get: (url) => readFile(pathForUrl(url)),
    async open(url) {
      const p = pathForUrl(url);
      await stat(p); // falha cedo se não existir
      return Readable.toWeb(createReadStream(p)) as ReadableStream<Uint8Array>;
    },
    async delete(urls) {
      await Promise.all(urls.filter((u) => u.startsWith(LOCAL_PREFIX)).map((u) => rm(pathForUrl(u), { force: true })));
    },
    isOwnUrl(url) {
      return url.startsWith(LOCAL_PREFIX) && isSafeKey(url.slice(LOCAL_PREFIX.length));
    },
  };
}
