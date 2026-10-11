'use client';
import { useState } from 'react';
import styles from './Gallery.module.css';

interface Part { part: number; count: number; bytes: number; url: string }

const formatBytes = (n: number) =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} GB` : `${Math.max(1, Math.round(n / 1024 ** 2))} MB`;

export function DownloadPanel({ slug, hasFavorites, onNeedName }: { slug: string; hasFavorites: boolean; onNeedName: () => void }) {
  const [parts, setParts] = useState<Part[] | null>(null);
  const [clicked, setClicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function load(set: 'all' | 'favorites') {
    setError(null);
    const res = await fetch(`/api/g/${slug}/zip/manifest?set=${set}`);
    const data = await res.json().catch(() => ({}));
    if (data.code === 'visitor_required') return onNeedName();
    if (!res.ok) return setError(data.error ?? 'Não foi possível preparar o download.');
    if (data.parts.length === 0) return setError('Não há fotos para descarregar.');
    if (data.parts.length === 1) {
      window.location.href = data.parts[0].url;
      return;
    }
    setClicked(new Set());
    setParts(data.parts);
  }

  return (
    <div className={styles.downloads}>
      <div className={styles.toolbarActions} style={{ justifyContent: 'center' }}>
        <button className={styles.primary} onClick={() => load('all')}>Descarregar tudo</button>
        {hasFavorites && <button className={styles.chip} onClick={() => load('favorites')}>Descarregar favoritas</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {parts && (
        <>
          <p style={{ color: 'var(--muted)' }}>A galeria é grande, por isso está dividida em {parts.length} partes.</p>
          <ul>
            {parts.map((p) => (
              <li key={p.part}>
                <a className={styles.chip} href={p.url} onClick={() => setClicked((s) => new Set(s).add(p.part))}>
                  {clicked.has(p.part) ? '✓ ' : ''}Parte {p.part} de {parts.length} · {p.count} fotos · {formatBytes(p.bytes)}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
