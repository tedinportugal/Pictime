'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { PermanentError, runQueue, type QueueItem } from '@/lib/upload/queue';
import { uploadToStorage } from '@/lib/upload/client';

const LABELS: Record<QueueItem['status'], string> = {
  pending: 'Em espera',
  uploading: 'A enviar',
  processing: 'A processar',
  done: 'Concluída',
  failed: 'Falhou',
};

export function UploadPanel({ galleryId }: { galleryId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [failed, setFailed] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function start(files: File[]) {
    if (files.length === 0 || busy) return;
    setBusy(true);
    const result = await runQueue(
      files,
      {
        upload: (file, onProgress) => uploadToStorage(galleryId, 'originals', file, onProgress),
        ingest: async (originalUrl, file) => {
          const res = await fetch(`/api/admin/galleries/${galleryId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalUrl, filename: file.name }),
          });
          if (res.status === 422 || res.status === 400) throw new PermanentError((await res.json()).error);
          if (!res.ok) throw new Error(`Erro ${res.status}`);
        },
      },
      { onChange: setItems },
    );
    setFailed(files.filter((_, i) => result[i].status === 'failed'));
    setBusy(false);
    router.refresh();
  }

  const done = items.filter((i) => i.status === 'done').length;

  return (
    <section className={styles.panel}>
      <h2>Fotos</h2>
      <div
        className={`${styles.dropzone} ${over ? styles.dropzoneActive : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); start([...e.dataTransfer.files]); }}
      >
        <p>Arrasta as fotos para aqui ou</p>
        <label className={styles.button}>
          Escolher ficheiros
          <input
            aria-label="Adicionar fotos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/tiff"
            hidden
            onChange={(e) => { start([...(e.target.files ?? [])]); e.target.value = ''; }}
          />
        </label>
      </div>
      {items.length > 0 && (
        <>
          <p className={styles.muted}>{done} de {items.length} concluídas</p>
          <ul className={styles.queue}>
            {items.filter((i) => i.status !== 'done').map((i) => (
              <li key={i.id}>
                <span>{i.name}{i.error && <span className={styles.error}> — {i.error}</span>}</span>
                <span>{i.status === 'uploading' ? `${i.progress}%` : LABELS[i.status]}</span>
              </li>
            ))}
          </ul>
          {!busy && failed.length > 0 && (
            <button className={styles.ghost} onClick={() => start(failed)}>Tentar novamente ({failed.length})</button>
          )}
        </>
      )}
    </section>
  );
}
