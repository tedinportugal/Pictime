'use client';
import { useEffect, useState } from 'react';
import styles from '@/app/admin/admin.module.css';

export function SharePanel({ slug }: { slug: string }) {
  const [link, setLink] = useState(`/g/${slug}`);
  const [copied, setCopied] = useState(false);
  useEffect(() => setLink(`${window.location.origin}/g/${slug}`), [slug]);

  return (
    <section className={styles.panel}>
      <h2>Link para o cliente</h2>
      <div className={styles.row}>
        <input data-testid="share-link" readOnly value={link} style={{ flex: 1, minWidth: 0, padding: 9 }} onFocus={(e) => e.target.select()} />
        <button className={styles.button} onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? 'Copiado' : 'Copiar link'}
        </button>
        <a className={styles.ghost} href={link} target="_blank" rel="noreferrer">Abrir</a>
      </div>
    </section>
  );
}
