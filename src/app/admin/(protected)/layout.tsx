import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isAdminToken } from '@/lib/auth/admin';
import { BRAND_NAME } from '@/lib/brand';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(token)) redirect('/admin/login');
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
