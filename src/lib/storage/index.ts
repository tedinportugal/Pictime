import path from 'node:path';
import { dataDir } from '@/lib/env';
import { createBlobStorage } from './blob';
import { createLocalStorage } from './local';
import type { Storage } from './types';

export type { Storage } from './types';

let override: Storage | null = null;
let cached: Storage | null = null;

export function setStorageForTests(s: Storage | null): void {
  override = s;
}

export function storageDriver(): 'local' | 'blob' {
  return process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'local';
}

export function getStorage(): Storage {
  if (override) return override;
  cached ??= storageDriver() === 'blob' ? createBlobStorage() : createLocalStorage(path.join(dataDir(), 'files'));
  return cached;
}
