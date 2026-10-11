import styles from '@/app/admin/admin.module.css';
import type { EditorChapter, EditorFavorites, EditorGallery, EditorPhoto } from './types';
import { UploadPanel } from './UploadPanel';
import { PhotoManager } from './PhotoManager';
import { SettingsForm } from './SettingsForm';
import { ThemeForm } from './ThemeForm';
import { SharePanel } from './SharePanel';
import { FavoritesPanel } from './FavoritesPanel';

export function GalleryEditor(props: { gallery: EditorGallery; photos: EditorPhoto[]; chapters: EditorChapter[]; favorites: EditorFavorites[] }) {
  const { gallery, photos, chapters, favorites } = props;
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>{gallery.title}</h1>
        <span className={styles.muted}>{photos.length} fotos</span>
      </header>
      <SharePanel slug={gallery.slug} />
      <UploadPanel galleryId={gallery.id} />
      <PhotoManager gallery={gallery} photos={photos} chapters={chapters} />
      <FavoritesPanel favorites={favorites} photos={photos} />
      <SettingsForm gallery={gallery} />
      <ThemeForm gallery={gallery} />
    </main>
  );
}
