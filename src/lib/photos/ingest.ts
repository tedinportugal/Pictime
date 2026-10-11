import { randomUUID } from 'node:crypto';
import type { Db } from '@/db/client';
import type { Storage } from '@/lib/storage';
import { InvalidImageError, processImage } from '@/lib/images/process';
import { addPhoto, type Photo } from './repo';

export async function ingestPhoto(
  deps: { db: Db; storage: Storage },
  input: { galleryId: string; originalUrl: string; filename: string },
): Promise<Photo> {
  const { db, storage } = deps;
  const original = await storage.get(input.originalUrl);
  let processed;
  try {
    processed = await processImage(original);
  } catch (err) {
    if (err instanceof InvalidImageError) await storage.delete([input.originalUrl]);
    throw err;
  }
  const id = randomUUID();
  const [webUrl, thumbUrl] = await Promise.all([
    storage.put(`galleries/${input.galleryId}/web/${id}.jpg`, processed.web, 'image/jpeg'),
    storage.put(`galleries/${input.galleryId}/thumb/${id}.jpg`, processed.thumb, 'image/jpeg'),
  ]);
  return addPhoto(db, {
    id,
    galleryId: input.galleryId,
    filename: input.filename.slice(0, 200),
    originalUrl: input.originalUrl,
    webUrl,
    thumbUrl,
    width: processed.width,
    height: processed.height,
    bytes: original.length,
  });
}
