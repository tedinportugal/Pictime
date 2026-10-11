import { NewGalleryForm } from '@/components/admin/NewGalleryForm';
import styles from '../../admin.module.css';

export default function NewGalleryPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}><h1>Nova galeria</h1></header>
      <NewGalleryForm />
    </main>
  );
}
