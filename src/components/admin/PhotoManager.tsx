'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { api } from './api';
import type { EditorChapter, EditorGallery, EditorPhoto } from './types';

export function PhotoManager({ gallery, photos, chapters }: { gallery: EditorGallery; photos: EditorPhoto[]; chapters: EditorChapter[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState('');

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const move = (index: number, delta: number) =>
    run(() => {
      const ids = photos.map((p) => p.id);
      const [id] = ids.splice(index, 1);
      ids.splice(index + delta, 0, id);
      return api(`/api/admin/galleries/${gallery.id}/photos/reorder`, 'POST', { ids });
    });

  return (
    <section className={styles.panel}>
      <h2>Organização</h2>
      <div className={styles.row} style={{ marginBottom: 12 }}>
        {chapters.map((c) => (
          <span key={c.id} className={styles.row}>
            <strong>{c.name}</strong>
            <button className={styles.ghost} onClick={() => { const name = prompt('Novo nome', c.name); if (name) run(() => api(`/api/admin/chapters/${c.id}`, 'PATCH', { name })); }}>Renomear</button>
            <button className={`${styles.ghost} ${styles.danger}`} onClick={() => run(() => api(`/api/admin/chapters/${c.id}`, 'DELETE'))}>Apagar</button>
          </span>
        ))}
        <form className={styles.row} onSubmit={(e) => { e.preventDefault(); if (newChapter.trim()) run(async () => { await api(`/api/admin/galleries/${gallery.id}/chapters`, 'POST', { name: newChapter }); setNewChapter(''); }); }}>
          <input aria-label="Novo capítulo" placeholder="Novo capítulo (ex.: Cerimónia)" value={newChapter} onChange={(e) => setNewChapter(e.target.value)} />
          <button className={styles.ghost} type="submit">Adicionar capítulo</button>
        </form>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {photos.length === 0 ? (
        <p className={styles.muted}>Ainda não há fotos.</p>
      ) : (
        <div className={styles.photoGrid}>
          {photos.map((p, i) => (
            <figure key={p.id} className={`${styles.photoCard} ${gallery.coverPhotoId === p.id ? styles.cover : ''}`} style={{ margin: 0 }}>
              <img src={p.thumbUrl} alt={p.filename} loading="lazy" />
              <div className={styles.row}>
                <button className={styles.ghost} aria-label="Mover para trás" disabled={i === 0} onClick={() => move(i, -1)}>←</button>
                <button className={styles.ghost} aria-label="Mover para a frente" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>→</button>
                <button className={styles.ghost} onClick={() => run(() => api(`/api/admin/galleries/${gallery.id}`, 'PATCH', { coverPhotoId: p.id }))}>
                  {gallery.coverPhotoId === p.id ? 'Capa ✓' : 'Capa'}
                </button>
              </div>
              <div className={styles.row}>
                {chapters.length > 0 && (
                  <select aria-label="Capítulo" value={p.chapterId ?? ''} onChange={(e) => run(() => api(`/api/admin/photos/${p.id}`, 'PATCH', { chapterId: e.target.value || null }))}>
                    <option value="">Sem capítulo</option>
                    {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <button className={`${styles.ghost} ${styles.danger}`} onClick={() => { if (confirm(`Apagar ${p.filename}?`)) run(() => api(`/api/admin/photos/${p.id}`, 'DELETE')); }}>Apagar</button>
              </div>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
