import { safeFilename } from './filename';

/** Envia um ficheiro do browser diretamente para o storage e devolve o URL. */
export async function uploadToStorage(
  galleryId: string,
  kind: 'originals' | 'logo',
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const key = `galleries/${galleryId}/${kind}/${crypto.randomUUID().slice(0, 8)}-${safeFilename(file.name)}`;
  if (process.env.NEXT_PUBLIC_STORAGE === 'blob') {
    const { upload } = await import('@vercel/blob/client');
    const result = await upload(key, file, {
      access: 'public',
      handleUploadUrl: '/api/admin/blob-upload',
      multipart: file.size > 20 * 1024 * 1024,
      onUploadProgress: (e) => onProgress?.(e.percentage),
    });
    return result.url;
  }
  const res = await fetch(`/api/admin/files/${key}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
  if (!res.ok) throw new Error(`O envio falhou (${res.status})`);
  onProgress?.(100);
  return (await res.json()).url as string;
}
