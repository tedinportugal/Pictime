import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { getGalleryById } from '@/lib/galleries/repo';
import { listChapters } from '@/lib/galleries/chapters';
import { listPhotos } from '@/lib/photos/repo';
import { listFavoritesByVisitor } from '@/lib/favorites/repo';
import { GalleryEditor } from '@/components/admin/GalleryEditor';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const gallery = await getGalleryById(db, id);
  if (!gallery) notFound();
  const [photoRows, chapterRows, favorites] = await Promise.all([listPhotos(db, id), listChapters(db, id), listFavoritesByVisitor(db, id)]);
  return (
    <GalleryEditor
      gallery={{
        id: gallery.id,
        slug: gallery.slug,
        title: gallery.title,
        subtitle: gallery.subtitle,
        coverPhotoId: gallery.coverPhotoId,
        theme: gallery.theme,
        hasPassword: gallery.passwordHash !== null,
        expiresAt: gallery.expiresAt?.toISOString() ?? null,
      }}
      photos={photoRows.map((p) => ({ id: p.id, filename: p.filename, thumbUrl: p.thumbUrl, chapterId: p.chapterId }))}
      chapters={chapterRows.map((c) => ({ id: c.id, name: c.name }))}
      favorites={favorites}
    />
  );
}
