import { z } from 'zod';
import { PRESET_IDS } from '@/lib/theme/types';
import { themeSchema } from '@/lib/theme/schema';
import type { Gallery } from './repo';

const password = z.string().min(4).max(200).nullable().optional();
const expiresAt = z.coerce.date().nullable().optional();

export const createGallerySchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).optional(),
  preset: z.enum(PRESET_IDS).optional(),
  password,
  expiresAt,
});

export const patchGallerySchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  subtitle: z.string().trim().max(200).optional(),
  theme: themeSchema.optional(),
  coverPhotoId: z.string().uuid().nullable().optional(),
  password,
  expiresAt,
});

export const chapterSchema = z.object({ name: z.string().trim().min(1).max(80) });

/** Forma pública da galeria para o painel (nunca expõe o hash). */
export function toAdminGallery(g: Gallery) {
  const { passwordHash, ...rest } = g;
  return { ...rest, hasPassword: passwordHash !== null };
}
