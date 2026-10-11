import path from 'node:path';
import { notFound } from '@/lib/http';
import { isSafeKey } from '@/lib/storage/local';
import { getStorage, storageDriver } from '@/lib/storage';

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

/** Serve versões web, miniaturas e logos do storage local. Nunca originais. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }): Promise<Response> {
  if (storageDriver() !== 'local') return notFound();
  const parts = (await params).key;
  const key = parts.join('/');
  if (!isSafeKey(key) || parts[2] === 'originals') return notFound();
  try {
    const stream = await getStorage().open(`/api/files/${key}`);
    return new Response(stream, {
      headers: {
        'Content-Type': TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return notFound();
  }
}
