import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalStorage } from '@/lib/storage/local';

export async function createTempStorage() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'galeria-'));
  return { storage: createLocalStorage(root), root };
}
