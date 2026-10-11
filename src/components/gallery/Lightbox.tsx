'use client';
import { useEffect, useRef } from 'react';
import styles from './Gallery.module.css';
import type { ClientPhoto } from './types';

export function Lightbox({ slug, photos, index, favoriteIds, onToggleFavorite, onNavigate, onClose }: {
  slug: string;
  photos: ClientPhoto[];
  index: number;
  favoriteIds: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  onNavigate: (delta: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate(1);
      if (e.key === 'ArrowLeft') onNavigate(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onNavigate]);

  const fav = favoriteIds.has(photo.id);
  const neighbours = [photos[index - 1], photos[index + 1]].filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      className={styles.lightbox}
      onPointerDown={(e) => { startX.current = e.clientX; }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 50) onNavigate(dx < 0 ? 1 : -1);
      }}
    >
      <img key={photo.id} className={styles.lightboxImage} src={photo.webUrl} alt="" draggable={false} />
      {neighbours.map((p) => <link key={p.id} rel="prefetch" as="image" href={p.webUrl} />)}
      <button className={`${styles.nav} ${styles.prev}`} aria-label="Foto anterior" disabled={index === 0} onClick={() => onNavigate(-1)}>‹</button>
      <button className={`${styles.nav} ${styles.next}`} aria-label="Foto seguinte" disabled={index === photos.length - 1} onClick={() => onNavigate(1)}>›</button>
      <div className={styles.lightboxBar}>
        <span>{index + 1} / {photos.length}</span>
        <button aria-label={fav ? 'Remover das favoritas' : 'Adicionar às favoritas'} aria-pressed={fav} onClick={() => onToggleFavorite(photo.id)}>{fav ? '♥' : '♡'}</button>
        <a href={`/api/g/${slug}/photos/${photo.id}/download`} download>Descarregar foto</a>
        <button onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
