'use client';
import { useEffect, useRef, useState } from 'react';
import { justifiedRows } from '@/lib/gallery/layout';
import styles from './Gallery.module.css';
import type { ClientPhoto } from './types';

const GAP = 8;

export function PhotoGrid({ photos, startIndex, favoriteIds, onOpen, onToggleFavorite }: {
  photos: ClientPhoto[];
  startIndex: number;
  favoriteIds: Set<string>;
  onOpen: (index: number) => void;
  onToggleFavorite: (photoId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const target = width < 600 ? 180 : 300;
  const rows = width ? justifiedRows(photos, width, target, GAP) : [];
  const indexOf = new Map(photos.map((p, i) => [p.id, i]));
  const byId = new Map(photos.map((p) => [p.id, p]));

  return (
    <div ref={ref}>
      {rows.map((row, r) => (
        <div key={r} className={styles.row} style={{ gap: GAP, height: Math.floor(row.height) }}>
          {row.items.map((placed) => {
            const photo = byId.get(placed.id)!;
            const i = startIndex + indexOf.get(placed.id)!;
            const fav = favoriteIds.has(photo.id);
            return (
              <div key={photo.id} className={styles.tile} style={{ width: Math.floor(placed.width), flexShrink: 0 }}>
                <button aria-label={`Abrir foto ${i + 1}`} onClick={() => onOpen(i)} style={{ all: 'unset', display: 'block', width: '100%', height: '100%', cursor: 'zoom-in' }}>
                  <img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" />
                </button>
                <button className={styles.heart} aria-label={fav ? 'Remover das favoritas' : 'Adicionar às favoritas'} aria-pressed={fav} onClick={() => onToggleFavorite(photo.id)}>
                  {fav ? '♥' : '♡'}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
