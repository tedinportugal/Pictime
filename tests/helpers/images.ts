import sharp from 'sharp';

export async function makeJpeg(width: number, height: number, orientation?: number): Promise<Buffer> {
  let img = sharp({ create: { width, height, channels: 3, background: '#8a8070' } }).jpeg();
  if (orientation) img = img.withMetadata({ orientation });
  return img.toBuffer();
}
