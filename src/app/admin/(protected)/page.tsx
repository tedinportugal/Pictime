import Link from 'next/link';
import { getDb } from '@/db/client';
import { listGalleries } from '@/lib/galleries/repo';
import styles from '../admin.module.css';

export default async function AdminHome() {
  const galleries = await listGalleries(await getDb());
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>Galerias</h1>
        <Link className={styles.button} href="/admin/new">Nova galeria</Link>
      </header>
      {galleries.length === 0 ? (
        <p className={styles.empty}>Ainda não tens galerias.</p>
      ) : (
        <ul className={styles.list}>
          {galleries.map((g) => (
            <li key={g.id}>
              <Link href={`/admin/galleries/${g.id}`}>
                <strong>{g.title}</strong>
                <span>{g.photoCount} fotos</span>
                <span>{g.subtitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
