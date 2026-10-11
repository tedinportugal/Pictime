import { downloadZip, predictLength } from 'client-zip';
import type { Storage } from '@/lib/storage';
import type { Photo } from '@/lib/photos/repo';
import { contentDisposition, dedupeNames } from './filename';

// Cada parte tem de terminar dentro do maxDuration (300 s) da rota:
// 500 MB em 300 s ≈ 14 Mbit/s, ao alcance de Wi-Fi doméstico ou 4G.
export const ZIP_PART_MAX_BYTES = 500 * 1024 ** 2;
export const ZIP_PART_MAX_COUNT = 200;

export function planZipParts<T extends { bytes: number }>(items: T[], maxBytes = ZIP_PART_MAX_BYTES, maxCount = ZIP_PART_MAX_COUNT): T[][] {
  const parts: T[][] = [];
  let current: T[] = [];
  let size = 0;
  for (const item of items) {
    if (current.length && (size + item.bytes > maxBytes || current.length >= maxCount)) {
      parts.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.bytes;
  }
  if (current.length) parts.push(current);
  return parts;
}

/** ZIP em streaming (sem compressão: JPEG já está comprimido), com Content-Length exato para o browser mostrar progresso. */
export function zipResponse(storage: Storage, photos: Photo[], zipName: string): Response {
  const names = dedupeNames(photos.map((p) => p.filename));
  const length = predictLength(photos.map((p, i) => ({ name: names[i], size: p.bytes })));
  async function* entries() {
    for (const [i, photo] of photos.entries()) {
      yield { name: names[i], lastModified: photo.createdAt, size: photo.bytes, input: new Response(await storage.open(photo.originalUrl)) };
    }
  }
  const zip = downloadZip(entries(), { length });
  return new Response(zip.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Length': String(length),
      'Content-Disposition': contentDisposition(zipName),
    },
  });
}
