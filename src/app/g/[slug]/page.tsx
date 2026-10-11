import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { accessForPage } from '@/lib/access/server';
import { listPhotos } from '@/lib/photos/repo';
import { listChapters } from '@/lib/galleries/chapters';
import { themeToCssVars } from '@/lib/theme/css';
import { BRAND_NAME } from '@/lib/brand';
import { VISITOR_COOKIE, readVisitor } from '@/lib/favorites/visitor';
import { listVisitorFavoriteIds } from '@/lib/favorites/repo';
import { ThemedShell } from '@/components/gallery/ThemedShell';
import { Cover } from '@/components/gallery/Cover';
import { GalleryMessage } from '@/components/gallery/GalleryMessage';
import { UnlockForm } from '@/components/gallery/UnlockForm';
import { GalleryView } from '@/components/gallery/GalleryView';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const access = await accessForPage((await params).slug);
  return {
    title: access.status === 'not_found' ? BRAND_NAME : `${access.gallery.title} · ${BRAND_NAME}`,
    robots: { index: false, follow: false },
  };
}

export default async function GalleryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const access = await accessForPage(slug);
  if (access.status === 'not_found') notFound();
  const { gallery } = access;
  const vars = themeToCssVars(gallery.theme);
  const logoUrl = gallery.theme.logoUrl;

  if (access.status === 'expired') {
    return (
      <ThemedShell vars={vars}>
        <GalleryMessage logoUrl={logoUrl} brand={BRAND_NAME} title={gallery.title} message="Esta galeria expirou. Contacta-nos para voltar a ter acesso." />
      </ThemedShell>
    );
  }
  if (access.status === 'locked') {
    return (
      <ThemedShell vars={vars}>
        <UnlockForm slug={gallery.slug} title={gallery.title} logoUrl={logoUrl} brand={BRAND_NAME} error={error} />
      </ThemedShell>
    );
  }

  const db = await getDb();
  const [photoRows, chapterRows] = await Promise.all([listPhotos(db, gallery.id), listChapters(db, gallery.id)]);
  const visitor = readVisitor((await cookies()).get(VISITOR_COOKIE)?.value);
  const favoriteIds = visitor ? await listVisitorFavoriteIds(db, gallery.id, visitor.id) : [];
  const cover = photoRows.find((p) => p.id === gallery.coverPhotoId) ?? photoRows[0] ?? null;

  return (
    <ThemedShell vars={vars}>
      <Cover title={gallery.title} subtitle={gallery.subtitle} imageUrl={cover?.webUrl ?? null} logoUrl={logoUrl} brand={BRAND_NAME} />
      <GalleryView
        slug={gallery.slug}
        title={gallery.title}
        photos={photoRows.map((p) => ({ id: p.id, thumbUrl: p.thumbUrl, webUrl: p.webUrl, width: p.width, height: p.height, chapterId: p.chapterId }))}
        chapters={chapterRows.map((c) => ({ id: c.id, name: c.name }))}
        initialFavoriteIds={favoriteIds}
        initialVisitorName={visitor?.name ?? null}
      />
    </ThemedShell>
  );
}
