import styles from '../admin.module.css';
import { BRAND_NAME } from '@/lib/brand';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className={styles.shell}>
      <main className={styles.login}>
        <h1 className={styles.brand}>{BRAND_NAME}</h1>
        <form method="post" action="/api/admin/login">
          <label className={styles.field}>
            Palavra-passe
            <input type="password" name="password" required autoFocus autoComplete="current-password" />
          </label>
          {error && <p className={styles.error}>Palavra-passe incorreta.</p>}
          <button className={styles.button} type="submit">Entrar</button>
        </form>
      </main>
    </div>
  );
}
