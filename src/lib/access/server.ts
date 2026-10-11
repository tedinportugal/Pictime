import { cookies } from 'next/headers';
import { getDb } from '@/db/client';
import { getGalleryBySlug } from '@/lib/galleries/repo';
import { evaluateAccess, unlockCookieName, type AccessResult } from './access';

export async function accessForPage(slug: string): Promise<AccessResult> {
  const gallery = await getGalleryBySlug(await getDb(), slug);
  const jar = await cookies();
  return evaluateAccess(gallery, gallery ? jar.get(unlockCookieName(gallery.id))?.value : undefined);
}
