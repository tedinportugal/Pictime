'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { PRESETS } from '@/lib/theme/presets';
import { BODY_FONTS, HEADING_FONTS, PRESET_IDS, type ThemeColors, type ThemeSettings } from '@/lib/theme/types';
import { themeToCssVars } from '@/lib/theme/css';
import { uploadToStorage } from '@/lib/upload/client';
import { api } from './api';
import type { EditorGallery } from './types';

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  background: 'Fundo',
  surface: 'Superfície',
  text: 'Texto',
  muted: 'Texto secundário',
  accent: 'Destaque',
};

export function ThemeForm({ gallery }: { gallery: EditorGallery }) {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeSettings>(gallery.theme);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setStatus('A guardar…');
    try {
      await api(`/api/admin/galleries/${gallery.id}`, 'PATCH', { theme });
      setStatus('Tema guardado');
      router.refresh();
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setStatus('A enviar logo…');
    try {
      const url = await uploadToStorage(gallery.id, 'logo', file);
      setTheme((t) => ({ ...t, logoUrl: url }));
      setStatus('Logo pronto — guarda o tema');
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  return (
    <section className={styles.panel}>
      <h2>Tema</h2>
      <label className={styles.field}>
        Estilo
        <select value={theme.preset} onChange={(e) => setTheme({ ...structuredClone(PRESETS[e.target.value as ThemeSettings['preset']]), logoUrl: theme.logoUrl })}>
          {PRESET_IDS.map((id) => <option key={id} value={id}>{id[0].toUpperCase() + id.slice(1)}</option>)}
        </select>
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          Fonte dos títulos
          <select value={theme.headingFont} onChange={(e) => setTheme({ ...theme, headingFont: e.target.value as ThemeSettings['headingFont'] })}>
            {HEADING_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          Fonte do texto
          <select value={theme.bodyFont} onChange={(e) => setTheme({ ...theme, bodyFont: e.target.value as ThemeSettings['bodyFont'] })}>
            {BODY_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.row}>
        {(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map((k) => (
          <label key={k} className={styles.field}>
            {COLOR_LABELS[k]}
            <input type="color" value={theme.colors[k]} onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, [k]: e.target.value.toUpperCase() } })} />
          </label>
        ))}
      </div>
      <div className={styles.row} style={{ marginBottom: 12 }}>
        <label className={styles.ghost}>
          {theme.logoUrl ? 'Trocar logo' : 'Carregar logo'}
          <input type="file" accept="image/png,image/svg+xml,image/webp" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
        </label>
        {theme.logoUrl && <button className={styles.ghost} onClick={() => setTheme({ ...theme, logoUrl: null })}>Remover logo</button>}
      </div>
      <div
        style={{ ...(themeToCssVars(theme) as React.CSSProperties), background: 'var(--bg)', color: 'var(--text)', padding: 24, borderRadius: 8, textAlign: 'center', marginBottom: 12 }}
      >
        {theme.logoUrl && <img src={theme.logoUrl} alt="" style={{ maxHeight: 32, margin: '0 auto 12px' }} />}
        <div style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '2rem' }}>{gallery.title}</div>
        <div style={{ fontFamily: 'var(--font-body)', color: 'var(--muted)', letterSpacing: '.3em', fontSize: '.7rem', textTransform: 'uppercase' }}>{gallery.subtitle}</div>
      </div>
      <div className={styles.row}>
        <button className={styles.button} onClick={save}>Guardar tema</button>
        {status && <span className={styles.muted}>{status}</span>}
      </div>
    </section>
  );
}
