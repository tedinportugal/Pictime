import type { ThemeSettings } from '@/lib/theme/types';

export interface EditorGallery {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  coverPhotoId: string | null;
  theme: ThemeSettings;
  hasPassword: boolean;
  expiresAt: string | null;
}

export interface EditorPhoto {
  id: string;
  filename: string;
  thumbUrl: string;
  chapterId: string | null;
}

export interface EditorChapter {
  id: string;
  name: string;
}

export interface EditorFavorites {
  visitorId: string;
  visitorName: string;
  photoIds: string[];
}
