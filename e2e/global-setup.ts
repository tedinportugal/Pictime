import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export default async function globalSetup() {
  const dir = path.join(process.cwd(), 'e2e', 'fixtures');
  await mkdir(dir, { recursive: true });
  const specs: [string, number, number, string][] = [
    ['a.jpg', 3000, 2000, '#b7a58c'],
    ['b.jpg', 2000, 3000, '#6b6a4f'],
    ['c.jpg', 2400, 1600, '#d9cfc0'],
  ];
  for (const [name, width, height, background] of specs) {
    await sharp({ create: { width, height, channels: 3, background } }).jpeg().toFile(path.join(dir, name));
  }
}
