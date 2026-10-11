'use client';
import { useCallback, useMemo, useState } from 'react';
import { groupByChapter } from '@/lib/gallery/layout';
import styles from './Gallery.module.css';
import { PhotoGrid } from './PhotoGrid';
import { Lightbox } from './Lightbox';
import { NameDialog } from './NameDialog';
import { DownloadPanel } from './DownloadPanel';
import type { ClientPhoto } from './types';

export interface GalleryViewProps {
  slug: string;
  title: string;
  photos: ClientPhoto[];
  chapters: { id: string; name: string }[];
  initialFavoriteIds: string[];
  initialVisitorName: string | null;
}

export function GalleryView({ slug, title, photos, chapters, initialFavoriteIds, initialVisitorName }: GalleryViewProps) {
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(initialFavoriteIds));
  const [visitorName, setVisitorName] = useState(initialVisitorName);
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = onlyFavorites ? photos.filter((p) => favoriteIds.has(p.id)) : photos;
  const sections = useMemo(() => groupByChapter(visible, chapters), [visible, chapters]);
  const ordered = useMemo(() => sections.flatMap((s) => s.photos), [sections]);

  const flip = (photoId: string) =>
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });

  const sendToggle = useCallback(
    async (photoId: string, makeFavorite: boolean) => {
      flip(photoId); // otimista
      const res = await fetch(`/api/g/${slug}/favorites/${photoId}`, { method: makeFavorite ? 'PUT' : 'DELETE' });
      if (res.ok) return;
      flip(photoId); // reverter
      const data = await res.json().catch(() => ({}));
      if (data.code === 'visitor_required') {
        setVisitorName(null);
        setPendingFavorite(photoId);
      } else if (data.code === 'locked' || res.status === 410) {
        window.location.reload();
      }
    },
    [slug],
  );

  const toggleFavorite = useCallback(
    (photoId: string) => {
      if (!visitorName) {
        setPendingFavorite(photoId);
        return;
      }
      void sendToggle(photoId, !favoriteIds.has(photoId));
    },
    [visitorName, favoriteIds, sendToggle],
  );

  async function submitName(name: string) {
    const res = await fetch(`/api/g/${slug}/visitor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!res.ok) return;
    setVisitorName(name);
    const photoId = pendingFavorite;
    setPendingFavorite(null);
    if (photoId) await sendToggle(photoId, !favoriteIds.has(photoId));
  }

  const navigate = useCallback(
    (delta: number) => setOpenIndex((i) => (i === null ? i : Math.min(Math.max(i + delta, 0), ordered.length - 1))),
    [ordered.length],
  );
  const close = useCallback(() => setOpenIndex(null), []);

  let offset = 0;
  return (
    <>
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>{title}</span>
        <div className={styles.toolbarActions}>
          <button className={styles.chip} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites((v) => !v)}>
            Favoritas ({favoriteIds.size})
          </button>
        </div>
      </div>
      <section id="galeria" className={styles.content}>
        {ordered.length === 0 && <p className={styles.empty}>{onlyFavorites ? 'Ainda não escolheste favoritas.' : 'As fotos estão a caminho.'}</p>}
        {sections.map((section) => {
          const start = offset;
          offset += section.photos.length;
          return (
            <div key={section.id ?? 'sem-capitulo'}>
              {section.name && <h2 className={styles.chapterTitle}>{section.name}</h2>}
              <PhotoGrid photos={section.photos} startIndex={start} favoriteIds={favoriteIds} onOpen={setOpenIndex} onToggleFavorite={toggleFavorite} />
            </div>
          );
        })}
        {photos.length > 0 && (
          <DownloadPanel slug={slug} hasFavorites={favoriteIds.size > 0} onNeedName={() => setPendingFavorite('')} />
        )}
      </section>
      {openIndex !== null && ordered[openIndex] && (
        <Lightbox slug={slug} photos={ordered} index={openIndex} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} onNavigate={navigate} onClose={close} />
      )}
      {pendingFavorite !== null && <NameDialog onSubmit={submitName} onCancel={() => setPendingFavorite(null)} />}
    </>
  );
}
