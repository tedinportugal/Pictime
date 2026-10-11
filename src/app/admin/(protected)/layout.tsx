import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';
import { BRAND_NAME } from '@/lib/brand';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/admin" className={styles.brand}>{BRAND_NAME}</Link>
        <form method="post" action="/api/admin/logout">
          <button className={styles.ghost} type="submit">Sair</button>
        </form>
      </header>
      {children}
    </div>
  );
}
