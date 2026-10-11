import sharp from 'sharp';

export interface ProcessedImage {
  web: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

export class InvalidImageError extends Error {}

const SUPPORTED = new Set(['jpeg', 'png', 'webp', 'tiff']);

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw new InvalidImageError('O ficheiro não é uma imagem válida.');
  }
  if (format === 'heif') throw new InvalidImageError('Formato HEIC não suportado. Exporta a foto em JPEG.');
  if (!format || !SUPPORTED.has(format)) throw new InvalidImageError(`Formato não suportado (${format ?? 'desconhecido'}).`);

  try {
    const base = sharp(input, { failOn: 'truncated' }).rotate();
    const web = await base
      .clone()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const thumb = await base
      .clone()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
    return { web: web.data, thumb, width: web.info.width, height: web.info.height };
  } catch {
    throw new InvalidImageError('O ficheiro não é uma imagem válida (pode estar corrompido).');
  }
}
