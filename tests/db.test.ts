import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { galleries, photos } from '@/db/schema';

const theme = {
  preset: 'marfim' as const,
  headingFont: 'cormorant' as const,
  bodyFont: 'inter' as const,
  colors: { background: '#F6F1E9', surface: '#EDE6DA', text: '#2B2A26', muted: '#7A746A', accent: '#6B6A4F' },
  logoUrl: null,
};

describe('schema', () => {
  it('guarda uma galeria e apaga as fotos em cascata', async () => {
    const db = await createTestDb();
    const [g] = await db.insert(galleries).values({ slug: 'abc-123456789012', title: 'Ana + Rui', theme }).returning();
    await db.insert(photos).values({
      galleryId: g.id, filename: 'a.jpg', originalUrl: 'o', webUrl: 'w', thumbUrl: 't', width: 10, height: 10, bytes: 100,
    });
    await db.delete(galleries).where(eq(galleries.id, g.id));
    expect(await db.select().from(photos)).toHaveLength(0);
  });
});
