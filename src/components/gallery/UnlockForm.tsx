import styles from './Gallery.module.css';
import { GalleryMessage } from './GalleryMessage';

const ERRORS: Record<string, string> = {
  '1': 'Palavra-passe incorreta.',
  limit: 'Demasiadas tentativas. Tenta daqui a 15 minutos.',
};

export function UnlockForm({ slug, title, logoUrl, brand, error }: { slug: string; title: string; logoUrl: string | null; brand: string; error?: string }) {
  return (
    <GalleryMessage logoUrl={logoUrl} brand={brand} title={title} message="Esta galeria é privada.">
      <form method="post" action={`/api/g/${slug}/unlock`} className={styles.unlock}>
        <label className={styles.unlockField}>
          Palavra-passe
          <input type="password" name="password" required autoFocus autoComplete="current-password" />
        </label>
        {error && ERRORS[error] && <p role="alert" className={styles.unlockError}>{ERRORS[error]}</p>}
        <button type="submit" className={styles.primary}>Entrar</button>
      </form>
    </GalleryMessage>
  );
}
