import { NewGalleryForm } from '@/components/admin/NewGalleryForm';
import { requireAdmin } from '@/lib/auth/require-admin';
import styles from '../../admin.module.css';

export default async function NewGalleryPage() {
  await requireAdmin();
  return (
    <main className={styles.main}>
      <header className={styles.header}><h1>Nova galeria</h1></header>
      <NewGalleryForm />
    </main>
  );
}
