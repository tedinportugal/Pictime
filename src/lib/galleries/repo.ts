import { count, desc, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { galleries, photos } from '@/db/schema';
import { generateSlug } from '@/lib/security/slug';
import { hashPassword } from '@/lib/security/password';
import { themeFromPreset } from '@/lib/theme/presets';
import type { ThemePresetId, ThemeSettings } from '@/lib/theme/types';
import { isUuid } from '@/lib/http';

export type Gallery = typeof galleries.$inferSelect;

export interface NewGalleryInput {
  title: string;
  subtitle?: string;
  preset?: ThemePresetId;
  password?: string | null;
  expiresAt?: Date | null;
}

export interface GalleryPatch {
  title?: string;
  subtitle?: string;
  theme?: ThemeSettings;
  coverPhotoId?: string | null;
  password?: string | null;
  expiresAt?: Date | null;
}

export async function createGallery(db: Db, input: NewGalleryInput): Promise<Gallery> {
  const [row] = await db
    .insert(galleries)
    .values({
      slug: generateSlug(input.title),
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() ?? '',
      theme: themeFromPreset(input.preset ?? 'marfim'),
      passwordHash: input.password ? await hashPassword(input.password) : null,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
  return row;
}

export async function listGalleries(db: Db): Promise<(Gallery & { photoCount: number })[]> {
  const rows = await db
    .select({ gallery: galleries, photoCount: count(photos.id) })
    .from(galleries)
    .leftJoin(photos, eq(photos.galleryId, galleries.id))
    .groupBy(galleries.id)
    .orderBy(desc(galleries.createdAt));
  return rows.map((r) => ({ ...r.gallery, photoCount: Number(r.photoCount) }));
}

export async function getGalleryById(db: Db, id: string): Promise<Gallery | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(galleries).where(eq(galleries.id, id));
  return row ?? null;
}

export async function getGalleryBySlug(db: Db, slug: string): Promise<Gallery | null> {
  const [row] = await db.select().from(galleries).where(eq(galleries.slug, slug));
  return row ?? null;
}

export async function updateGallery(db: Db, id: string, patch: GalleryPatch): Promise<Gallery | null> {
  if (!isUuid(id)) return null;
  const values: Partial<typeof galleries.$inferInsert> = {};
  if (patch.title !== undefined) values.title = patch.title.trim();
  if (patch.subtitle !== undefined) values.subtitle = patch.subtitle.trim();
  if (patch.theme !== undefined) values.theme = patch.theme;
  if (patch.coverPhotoId !== undefined) values.coverPhotoId = patch.coverPhotoId;
  if (patch.expiresAt !== undefined) values.expiresAt = patch.expiresAt;
  if (patch.password !== undefined) values.passwordHash = patch.password ? await hashPassword(patch.password) : null;
  if (Object.keys(values).length === 0) return getGalleryById(db, id);
  const [row] = await db.update(galleries).set(values).where(eq(galleries.id, id)).returning();
  return row ?? null;
}

export async function deleteGallery(db: Db, id: string): Promise<string[]> {
  const gallery = await getGalleryById(db, id);
  if (!gallery) return [];
  const files = await db
    .select({ o: photos.originalUrl, w: photos.webUrl, t: photos.thumbUrl })
    .from(photos)
    .where(eq(photos.galleryId, id));
  await db.delete(galleries).where(eq(galleries.id, id));
  const urls = files.flatMap((f) => [f.o, f.w, f.t]);
  if (gallery.theme.logoUrl) urls.push(gallery.theme.logoUrl);
  return urls;
}
