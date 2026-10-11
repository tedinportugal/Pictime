import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { InvalidImageError, processImage } from '@/lib/images/process';
import { makeJpeg } from './helpers/images';

describe('processImage', () => {
  it('reduz para 2400px (web) e 800px (miniatura)', async () => {
    const out = await processImage(await makeJpeg(4000, 3000));
    expect(out.width).toBe(2400);
    expect(out.height).toBe(1800);
    const thumb = await sharp(out.thumb).metadata();
    expect(Math.max(thumb.width!, thumb.height!)).toBe(800);
  });
  it('não aumenta imagens pequenas', async () => {
    const out = await processImage(await makeJpeg(600, 400));
    expect([out.width, out.height]).toEqual([600, 400]);
  });
  it('aplica a orientação EXIF (foto de telemóvel na vertical)', async () => {
    const out = await processImage(await makeJpeg(3000, 2000, 6));
    expect([out.width, out.height]).toEqual([1600, 2400]);
    const meta = await sharp(out.web).metadata();
    expect([meta.width, meta.height]).toEqual([1600, 2400]);
  });
  it('rejeita ficheiros que não são imagem com mensagem clara', async () => {
    await expect(processImage(Buffer.from('isto não é uma foto'))).rejects.toThrow(InvalidImageError);
    await expect(processImage(Buffer.from('isto não é uma foto'))).rejects.toThrow('não é uma imagem válida');
  });
  it('rejeita imagens truncadas', async () => {
    const full = await makeJpeg(1200, 800);
    await expect(processImage(full.subarray(0, 300))).rejects.toThrow(InvalidImageError);
  });
});
