'use client';
import styles from '@/app/admin/admin.module.css';
import type { EditorFavorites, EditorPhoto } from './types';

export function FavoritesPanel({ favorites, photos }: { favorites: EditorFavorites[]; photos: EditorPhoto[] }) {
  const byId = new Map(photos.map((p) => [p.id, p]));
  return (
    <section className={styles.panel}>
      <h2>Favoritas dos clientes</h2>
      {favorites.length === 0 ? (
        <p className={styles.muted}>Ainda ninguém escolheu favoritas.</p>
      ) : (
        favorites.map((v) => {
          const names = v.photoIds.map((id) => byId.get(id)?.filename).filter(Boolean) as string[];
          return (
            <div key={v.visitorId} style={{ marginBottom: 12 }}>
              <div className={styles.row}>
                <strong>{v.visitorName}</strong>
                <span className={styles.muted}>{names.length} fotos</span>
                <button className={styles.ghost} onClick={() => navigator.clipboard.writeText(names.join('\n'))}>Copiar nomes dos ficheiros</button>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
