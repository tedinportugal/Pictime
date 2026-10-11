'use client';
import { useState } from 'react';
import styles from './Gallery.module.css';

export function NameDialog({ onSubmit, onCancel }: { onSubmit: (name: string) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className={styles.dialogBackdrop} onClick={onCancel}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Identificação"
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSubmit(name.trim()); setBusy(false); }}
      >
        <p style={{ margin: 0 }}>Para guardar as tuas favoritas, diz-nos o teu nome.</p>
        <label className={styles.unlockField}>
          O teu nome
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus />
        </label>
        <button className={styles.primary} type="submit" disabled={busy || !name.trim()}>Continuar</button>
      </form>
    </div>
  );
}
