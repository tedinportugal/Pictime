'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { api } from './api';
import type { EditorGallery } from './types';

export function SettingsForm({ gallery }: { gallery: EditorGallery }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const body: Record<string, unknown> = {
      title: form.get('title'),
      subtitle: form.get('subtitle'),
      expiresAt: form.get('expiresAt') ? new Date(`${form.get('expiresAt')}T23:59:59`).toISOString() : null,
    };
    const newPassword = String(form.get('password') ?? '');
    if (form.get('removePassword')) body.password = null;
    else if (newPassword) body.password = newPassword;
    setStatus('A guardar…');
    try {
      await api(`/api/admin/galleries/${gallery.id}`, 'PATCH', body);
      setStatus('Guardado');
      (formEl.elements.namedItem('password') as HTMLInputElement).value = '';
      router.refresh();
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  async function onDelete() {
    if (!confirm(`Apagar a galeria "${gallery.title}" e todas as fotos? Não é possível desfazer.`)) return;
    await api(`/api/admin/galleries/${gallery.id}`, 'DELETE');
    router.push('/admin');
    router.refresh();
  }

  return (
    <section className={styles.panel}>
      <h2>Definições</h2>
      <form onSubmit={onSubmit}>
        <label className={styles.field}>Nomes do casal<input name="title" defaultValue={gallery.title} required maxLength={120} /></label>
        <label className={styles.field}>Data e local<input name="subtitle" defaultValue={gallery.subtitle} maxLength={200} /></label>
        <label className={styles.field}>
          Nova palavra-passe
          <input name="password" type="text" minLength={4} autoComplete="off" placeholder={gallery.hasPassword ? 'Protegida — deixa vazio para manter' : 'Sem palavra-passe'} />
        </label>
        {gallery.hasPassword && (
          <label className={styles.row}><input type="checkbox" name="removePassword" /> Remover palavra-passe</label>
        )}
        <label className={styles.field}>
          Expira em
          <input name="expiresAt" type="date" defaultValue={gallery.expiresAt?.slice(0, 10) ?? ''} />
        </label>
        <div className={styles.row}>
          <button className={styles.button} type="submit">Guardar definições</button>
          {status && <span className={styles.muted}>{status}</span>}
        </div>
      </form>
      <hr style={{ margin: '20px 0', border: 0, borderTop: '1px solid #eee' }} />
      <button className={`${styles.ghost} ${styles.danger}`} onClick={onDelete}>Apagar galeria</button>
    </section>
  );
}
