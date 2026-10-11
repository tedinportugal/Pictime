import { randomBytes } from 'node:crypto';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // 32 símbolos, sem ambíguos

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

function randomPart(length: number): string {
  let out = '';
  for (const b of randomBytes(length)) out += ALPHABET[b & 31];
  return out;
}

export function generateSlug(title: string): string {
  return `${slugify(title) || 'galeria'}-${randomPart(12)}`;
}
