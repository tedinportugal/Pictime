'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';

export function NewGalleryForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/galleries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.get('title'), subtitle: form.get('subtitle'), preset: form.get('preset') }),
    });
    if (!res.ok) {
      setBusy(false);
      setError('Não foi possível criar a galeria.');
      return;
    }
    const g = await res.json();
    router.push(`/admin/galleries/${g.id}`);
  }

  return (
    <form className={styles.panel} onSubmit={onSubmit}>
      <label className={styles.field}>Nomes do casal<input name="title" required maxLength={120} placeholder="Nando + Hannah" /></label>
      <label className={styles.field}>Data e local<input name="subtitle" maxLength={200} placeholder="12.06.2026 · Sintra" /></label>
      <label className={styles.field}>
        Estilo
        <select name="preset" defaultValue="marfim">
          <option value="marfim">Marfim</option>
          <option value="oliva">Oliva</option>
          <option value="noite">Noite</option>
        </select>
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.button} disabled={busy} type="submit">Criar galeria</button>
    </form>
  );
}
