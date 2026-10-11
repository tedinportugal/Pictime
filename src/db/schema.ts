import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { ThemeSettings } from '../lib/theme/types';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const galleries = pgTable('galleries', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  coverPhotoId: uuid('cover_photo_id'),
  theme: jsonb('theme').$type<ThemeSettings>().notNull(),
  passwordHash: text('password_hash'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  galleryId: uuid('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
});

export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  galleryId: uuid('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
  order: integer('order').notNull().default(0),
  filename: text('filename').notNull(),
  originalUrl: text('original_url').notNull(),
  webUrl: text('web_url').notNull(),
  thumbUrl: text('thumb_url').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  bytes: integer('bytes').notNull(),
  createdAt: createdAt(),
});

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    galleryId: uuid('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
    photoId: uuid('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
    visitorId: text('visitor_id').notNull(),
    visitorName: text('visitor_name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('favorites_photo_visitor').on(t.photoId, t.visitorId)],
);

export const unlockAttempts = pgTable(
  'unlock_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    galleryId: uuid('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
    ip: text('ip').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('unlock_attempts_lookup').on(t.galleryId, t.ip, t.createdAt)],
);

export const adminLoginAttempts = pgTable(
  'admin_login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ip: text('ip').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('admin_login_attempts_lookup').on(t.ip, t.createdAt)],
);
