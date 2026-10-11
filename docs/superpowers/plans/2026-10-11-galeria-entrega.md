# Galeria de Entrega com Marca — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web pessoal onde um fotógrafo de casamentos cria galerias e as entrega aos clientes numa página com a sua marca (capa editorial, grelha, lightbox, favoritas, downloads), em vez de uma pasta genérica.

**Architecture:** Next.js (App Router) monolítico com três áreas: painel privado (`/admin`), galeria pública por link (`/g/[slug]`) e API (`/api/...`). Dados em Postgres via Drizzle (PGlite local em dev/testes, Neon em produção). Ficheiros atrás de uma interface `Storage` (disco local em dev/testes, Vercel Blob em produção); os originais vão do browser diretamente para o storage e o servidor gera versões web/miniatura com `sharp`.

**Tech Stack:** Next.js 15+ (App Router, TypeScript strict), React 19, Drizzle ORM + drizzle-kit, @electric-sql/pglite, @neondatabase/serverless, @vercel/blob, sharp, client-zip, zod@3, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-galeria-entrega-design.md`

**Decisões em aberto da spec, resolvidas aqui:** Vercel Blob (ficheiros) + Neon (Postgres). Nome da app: "Galeria" (nome de pasta `galeria/`); a marca visível vem de `NEXT_PUBLIC_BRAND_NAME`.

## Global Constraints

- Node ≥ 20. Next.js ≥ 15: `params` e `searchParams` de páginas/rotas são `Promise` e têm de ser `await`-ed.
- TypeScript `strict`. Imports internos via alias `@/` → `src/`.
- Toda a cópia de interface em Português (Portugal).
- Slug da galeria: parte aleatória com ≥ 12 caracteres.
- Versão web: lado maior ≤ 2400px, JPEG q82. Miniatura: lado maior ≤ 800px, JPEG q75. Orientação EXIF aplicada.
- Os URLs dos originais nunca aparecem no HTML/props da galeria do cliente; originais só saem pelas rotas de download, que verificam acesso.
- Rotas de API não importam `next/server` nem `next/headers`; usam `Request`/`Response` padrão (testáveis em Vitest). Só páginas/layouts usam `next/headers`.
- Variáveis de ambiente: `ADMIN_PASSWORD` (≥ 12 chars), `SESSION_SECRET` (≥ 32 chars), `DATABASE_URL` (produção), `BLOB_READ_WRITE_TOKEN` (produção), `NEXT_PUBLIC_STORAGE=blob` (produção), `NEXT_PUBLIC_BRAND_NAME`, `DATA_DIR` (dev; por omissão `.data`).
- Mobile first: a 375px de largura não há scroll horizontal.
- Respeitar `prefers-reduced-motion` (sem animação de capa).
- IDs inválidos (não-UUID) em URLs devolvem 404, nunca 500.

## Review Focus

1. **Acesso direto à API de uma galeria protegida ou expirada** (download, ZIP, favoritas, visitante sem cookie de desbloqueio) → 401/410, nunca o ficheiro. Testes nas Tasks 10 e 11.
2. **Fotos de telemóvel com orientação EXIF** (ex.: orientação 6) → aparecem direitas, com largura/altura já rodadas. Teste na Task 3.
3. **Ficheiro não-imagem, corrompido ou HEIC no meio de um lote** → só esse ficheiro falha com mensagem PT clara, o original é apagado, os restantes continuam. Testes nas Tasks 3, 5 e 6.
4. **IDs malformados em URLs** (`/api/g/x/favorites/abc`) → 404, não erro 500 do Postgres. Testes nas Tasks 4 e 10.
5. **Nomes com acentos e símbolos** ("João & Inês") em slugs e nomes de ficheiros descarregados → legíveis e com cabeçalhos HTTP seguros. Testes nas Tasks 2 e 11.

---

## File Structure

Tudo dentro de `galeria/` (novo repositório git, irmão de `docs/`).

```
galeria/
  next.config.ts                  config (pacotes externos de servidor)
  drizzle.config.ts               drizzle-kit
  vitest.config.ts
  playwright.config.ts
  scripts/reset-e2e.mjs           limpa DATA_DIR antes do servidor E2E
  drizzle/                        migrações geradas
  src/
    db/schema.ts                  tabelas
    db/client.ts                  getDb() / setDbForTests()
    lib/env.ts                    dataDir()
    lib/brand.ts                  BRAND_NAME
    lib/http.ts                   parseJson, isUuid, notFound, clientIp
    lib/security/slug.ts          generateSlug, slugify
    lib/security/password.ts      hashPassword, verifyPassword
    lib/security/sign.ts          sign, unsign
    lib/security/cookies.ts       getCookie, serializeCookie
    lib/auth/admin.ts             sessão do fotógrafo
    lib/theme/types.ts            ThemeSettings
    lib/theme/presets.ts          presets + themeFromPreset
    lib/theme/schema.ts           validação zod
    lib/theme/css.ts              themeToCssVars
    lib/storage/types.ts          interface Storage
    lib/storage/local.ts          disco
    lib/storage/blob.ts           Vercel Blob
    lib/storage/index.ts          getStorage() / setStorageForTests()
    lib/images/process.ts         sharp: web + thumb
    lib/galleries/repo.ts         CRUD galerias
    lib/galleries/chapters.ts     CRUD capítulos
    lib/galleries/validation.ts   schemas zod da API admin
    lib/photos/repo.ts            CRUD fotos
    lib/photos/ingest.ts          original → web/thumb → linha na BD
    lib/upload/filename.ts        safeFilename
    lib/upload/queue.ts           fila de upload com retries (pura)
    lib/upload/client.ts          uploadToStorage (browser)
    lib/access/access.ts          evaluateAccess, cookies de desbloqueio
    lib/access/rate-limit.ts      tentativas de palavra-passe
    lib/access/server.ts          accessForPage (usa next/headers)
    lib/favorites/visitor.ts      cookie do visitante
    lib/favorites/repo.ts         favoritas
    lib/gallery/layout.ts         justifiedRows, groupByChapter
    lib/downloads/filename.ts     contentDisposition, dedupeNames, mimeFromFilename
    lib/downloads/zip.ts          planZipParts, zipResponse
    lib/downloads/sets.ts         photosForSet
    app/layout.tsx, app/globals.css, app/fonts.ts, app/page.tsx
    app/admin/admin.module.css
    app/admin/login/page.tsx
    app/admin/(protected)/layout.tsx
    app/admin/(protected)/page.tsx
    app/admin/(protected)/new/page.tsx
    app/admin/(protected)/galleries/[id]/page.tsx
    app/g/[slug]/page.tsx, app/g/[slug]/not-found.tsx
    app/api/admin/login/route.ts, app/api/admin/logout/route.ts
    app/api/admin/galleries/route.ts
    app/api/admin/galleries/[id]/route.ts
    app/api/admin/galleries/[id]/chapters/route.ts
    app/api/admin/chapters/[id]/route.ts
    app/api/admin/galleries/[id]/photos/route.ts
    app/api/admin/galleries/[id]/photos/reorder/route.ts
    app/api/admin/photos/[id]/route.ts
    app/api/admin/files/[...key]/route.ts      upload local (dev)
    app/api/admin/blob-upload/route.ts         token de upload Vercel Blob
    app/api/files/[...key]/route.ts            servir ficheiros locais (dev)
    app/api/g/[slug]/unlock/route.ts
    app/api/g/[slug]/visitor/route.ts
    app/api/g/[slug]/favorites/[photoId]/route.ts
    app/api/g/[slug]/photos/[photoId]/download/route.ts
    app/api/g/[slug]/zip/route.ts
    app/api/g/[slug]/zip/manifest/route.ts
    components/admin/*            painel (cliente)
    components/gallery/*          galeria do cliente
  tests/                          Vitest
  e2e/                            Playwright
```

---

### Task 1: Esqueleto, base de dados e helpers de teste

**Files:**
- Create: `galeria/` (create-next-app), `next.config.ts`, `drizzle.config.ts`, `vitest.config.ts`, `src/lib/env.ts`, `src/lib/theme/types.ts`, `src/db/schema.ts`, `src/db/client.ts`, `tests/setup.ts`, `tests/helpers/db.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Produces:
  - `type Db` (`src/db/client.ts`), `getDb(): Promise<Db>`, `setDbForTests(db: Db | null): void`
  - Tabelas `galleries`, `chapters`, `photos`, `favorites`, `unlockAttempts` (`src/db/schema.ts`)
  - `ThemeSettings`, `ThemePresetId`, `HeadingFont`, `BodyFont`, `PRESET_IDS`, `HEADING_FONTS`, `BODY_FONTS` (`src/lib/theme/types.ts`)
  - `dataDir(): string` (`src/lib/env.ts`)
  - `createTestDb(): Promise<Db>` (`tests/helpers/db.ts`)

- [ ] **Step 1: Criar o projeto e instalar dependências**

A partir de `C:\Users\gader\Desktop\Claude`:

```bash
npx create-next-app@latest galeria --ts --app --src-dir --no-tailwind --no-eslint --import-alias "@/*" --use-npm --yes
cd galeria
git init
npm i drizzle-orm @electric-sql/pglite @neondatabase/serverless @vercel/blob sharp client-zip zod@3
npm i -D drizzle-kit vitest @playwright/test
rm -f src/app/page.module.css public/*.svg
```

Acrescentar ao `.gitignore`:

```
.data
.data-e2e
e2e/fixtures
test-results
playwright-report
```

Em `package.json`, definir `scripts`:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "e2e:server": "node scripts/reset-e2e.mjs && next dev --port 3100",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

- [ ] **Step 2: Configurações**

`next.config.ts`:

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['sharp', '@electric-sql/pglite'],
};

export default config;
```

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
```

`tests/setup.ts`:

```ts
process.env.SESSION_SECRET = 'test-session-secret-'.padEnd(48, 'x');
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
```

- [ ] **Step 3: Tipos de tema e esquema da BD**

`src/lib/theme/types.ts`:

```ts
export const PRESET_IDS = ['marfim', 'oliva', 'noite'] as const;
export const HEADING_FONTS = ['cormorant', 'playfair', 'bodoni'] as const;
export const BODY_FONTS = ['inter', 'jost'] as const;

export type ThemePresetId = (typeof PRESET_IDS)[number];
export type HeadingFont = (typeof HEADING_FONTS)[number];
export type BodyFont = (typeof BODY_FONTS)[number];

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
}

export interface ThemeSettings {
  preset: ThemePresetId;
  headingFont: HeadingFont;
  bodyFont: BodyFont;
  colors: ThemeColors;
  logoUrl: string | null;
}
```

`src/db/schema.ts`:

```ts
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
```

- [ ] **Step 4: Gerar a migração**

Run: `npm run db:generate`
Expected: cria `drizzle/0000_*.sql` e `drizzle/meta/`.

- [ ] **Step 5: Cliente da BD e helper de teste**

`src/lib/env.ts`:

```ts
import path from 'node:path';

export function dataDir(): string {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), '.data');
}
```

`src/db/client.ts`:

```ts
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { dataDir } from '@/lib/env';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let override: Db | null = null;
let cached: Promise<Db> | null = null;

export function setDbForTests(db: Db | null): void {
  override = db;
}

export async function getDb(): Promise<Db> {
  if (override) return override;
  cached ??= createDb();
  return cached;
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    return drizzle({ client: neon(url), schema }) as unknown as Db;
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const dir = path.join(dataDir(), 'pglite');
  await mkdir(dir, { recursive: true });
  const db = drizzle({ client: new PGlite(dir), schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return db as unknown as Db;
}
```

`tests/helpers/db.ts`:

```ts
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';
import type { Db } from '@/db/client';

export async function createTestDb(): Promise<Db> {
  const db = drizzle({ client: new PGlite(), schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return db as unknown as Db;
}
```

- [ ] **Step 6: Escrever o teste**

`tests/db.test.ts`:

```ts
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
```

- [ ] **Step 7: Correr o teste**

Run: `npm test -- tests/db.test.ts`
Expected: PASS (1 teste).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Drizzle schema and test DB"
```

---

### Task 2: Primitivas de segurança, autenticação do painel e temas

**Files:**
- Create: `src/lib/security/slug.ts`, `src/lib/security/password.ts`, `src/lib/security/sign.ts`, `src/lib/security/cookies.ts`, `src/lib/auth/admin.ts`, `src/lib/http.ts`, `src/lib/brand.ts`, `src/lib/theme/presets.ts`, `src/lib/theme/schema.ts`, `src/lib/theme/css.ts`, `src/app/fonts.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/admin/admin.module.css`, `src/app/admin/login/page.tsx`, `src/app/admin/(protected)/layout.tsx`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/logout/route.ts`, `tests/helpers/auth.ts`
- Test: `tests/security.test.ts`, `tests/admin-auth.test.ts`, `tests/theme.test.ts`

**Interfaces:**
- Consumes: `ThemeSettings`, `PRESET_IDS`, `HEADING_FONTS`, `BODY_FONTS` (Task 1)
- Produces:
  - `slugify(s: string): string`, `generateSlug(title: string): string`
  - `hashPassword(pw: string): Promise<string>`, `verifyPassword(pw: string, stored: string): Promise<boolean>`
  - `sign(value: string, ttlSeconds: number, now?: number): string`, `unsign(token: string | undefined, now?: number): string | null`
  - `getCookie(req: Request, name: string): string | undefined`, `serializeCookie(name: string, value: string, opts: { maxAge: number; path?: string }): string`
  - `ADMIN_COOKIE`, `checkAdminPassword(input: string): boolean`, `createAdminSessionCookie(): string`, `clearAdminSessionCookie(): string`, `isAdminToken(token: string | undefined): boolean`, `isAdminRequest(req: Request): boolean`, `unauthorized(): Response`
  - `parseJson<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }>`, `isUuid(s: string): boolean`, `notFound(message?: string): Response`, `clientIp(req: Request): string`
  - `BRAND_NAME: string`
  - `PRESETS: Record<ThemePresetId, ThemeSettings>`, `themeFromPreset(id: ThemePresetId): ThemeSettings`, `themeSchema` (zod), `themeToCssVars(t: ThemeSettings): Record<string, string>`
  - `fontVariables: string` (`src/app/fonts.ts`)
  - `adminCookieHeader(): string` (`tests/helpers/auth.ts`)

- [ ] **Step 1: Escrever os testes de segurança**

`tests/security.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateSlug, slugify } from '@/lib/security/slug';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { sign, unsign } from '@/lib/security/sign';
import { getCookie, serializeCookie } from '@/lib/security/cookies';

describe('slug', () => {
  it('remove acentos e símbolos', () => {
    expect(slugify('João & Inês')).toBe('joao-ines');
  });
  it('gera nome + 12 caracteres aleatórios', () => {
    const s = generateSlug('João & Inês');
    expect(s).toMatch(/^joao-ines-[a-z2-9]{12}$/);
    expect(generateSlug('João & Inês')).not.toBe(s);
  });
  it('funciona sem título utilizável', () => {
    expect(generateSlug('&&&')).toMatch(/^galeria-[a-z2-9]{12}$/);
  });
});

describe('password', () => {
  it('verifica a palavra-passe correta e rejeita a errada', async () => {
    const h = await hashPassword('amor2026');
    expect(await verifyPassword('amor2026', h)).toBe(true);
    expect(await verifyPassword('amor2027', h)).toBe(false);
    expect(await verifyPassword('amor2026', 'lixo')).toBe(false);
  });
});

describe('sign', () => {
  it('recupera o valor dentro do prazo', () => {
    const t = sign('olá', 60, 1_000);
    expect(unsign(t, 2_000)).toBe('olá');
  });
  it('rejeita tokens expirados ou adulterados', () => {
    const t = sign('admin', 60, 0);
    expect(unsign(t, 61_000)).toBeNull();
    expect(unsign(t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), 1)).toBeNull();
    expect(unsign(undefined)).toBeNull();
    expect(unsign('a.b')).toBeNull();
  });
});

describe('cookies', () => {
  it('lê cookies do pedido', () => {
    const req = new Request('http://x', { headers: { cookie: 'a=1; visitor=x%20y' } });
    expect(getCookie(req, 'visitor')).toBe('x y');
    expect(getCookie(req, 'nope')).toBeUndefined();
  });
  it('serializa com HttpOnly e SameSite', () => {
    expect(serializeCookie('a', 'b c', { maxAge: 10 })).toBe('a=b%20c; Path=/; Max-Age=10; HttpOnly; SameSite=Lax');
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/security.test.ts`
Expected: FAIL ("Failed to resolve import '@/lib/security/slug'").

- [ ] **Step 3: Implementar as primitivas**

`src/lib/security/slug.ts`:

```ts
import { randomBytes } from 'node:crypto';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // 32 símbolos, sem ambíguos

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

function randomPart(length: number): string {
  let out = '';
  for (const b of randomBytes(length)) out += ALPHABET[b & 31];
  return out;
}

export function generateSlug(title: string): string {
  return `${slugify(title) || 'galeria'}-${randomPart(12)}`;
}
```

`src/lib/security/password.ts`:

```ts
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64url');
  const actual = await scryptAsync(pw, Buffer.from(saltB64, 'base64url'), expected.length);
  return timingSafeEqual(actual, expected);
}
```

`src/lib/security/sign.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET tem de estar definido (>= 32 caracteres)');
  return s;
}

function mac(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function sign(value: string, ttlSeconds: number, now = Date.now()): string {
  const payload = `${Buffer.from(value).toString('base64url')}.${now + ttlSeconds * 1000}`;
  return `${payload}.${mac(payload)}`;
}

export function unsign(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [value, exp, sig] = parts;
  const expected = Buffer.from(mac(`${value}.${exp}`));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  if (!(Number(exp) > now)) return null;
  return Buffer.from(value, 'base64url').toString();
}
```

`src/lib/security/cookies.ts`:

```ts
export function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function serializeCookie(name: string, value: string, opts: { maxAge: number; path?: string }): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=${opts.path ?? '/'}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Lax${secure}`;
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm test -- tests/security.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever os testes de autenticação e tema**

`tests/helpers/auth.ts`:

```ts
import { ADMIN_COOKIE } from '@/lib/auth/admin';
import { sign } from '@/lib/security/sign';

export function adminCookieHeader(): string {
  return `${ADMIN_COOKIE}=${encodeURIComponent(sign('admin', 3600))}`;
}
```

`tests/admin-auth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/admin/login/route';
import { isAdminRequest } from '@/lib/auth/admin';
import { adminCookieHeader } from './helpers/auth';

function form(password: string): Request {
  const body = new FormData();
  body.set('password', password);
  return new Request('http://localhost/api/admin/login', { method: 'POST', body });
}

describe('login do fotógrafo', () => {
  it('cria sessão com a palavra-passe certa', async () => {
    const res = await login(form('correct-horse-battery'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin');
    expect(res.headers.get('set-cookie')).toMatch(/^admin_session=/);
  });
  it('volta ao login com erro se a palavra-passe estiver errada', async () => {
    const res = await login(form('errada'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/login?error=1');
    expect(res.headers.get('set-cookie')).toBeNull();
  });
  it('reconhece pedidos autenticados', () => {
    expect(isAdminRequest(new Request('http://x', { headers: { cookie: adminCookieHeader() } }))).toBe(true);
    expect(isAdminRequest(new Request('http://x'))).toBe(false);
  });
});
```

`tests/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { themeFromPreset } from '@/lib/theme/presets';
import { themeSchema } from '@/lib/theme/schema';
import { themeToCssVars } from '@/lib/theme/css';

describe('tema', () => {
  it('converte um preset em variáveis CSS', () => {
    const vars = themeToCssVars(themeFromPreset('noite'));
    expect(vars['--bg']).toBe('#141414');
    expect(vars['--font-heading']).toBe('var(--font-cormorant)');
    expect(vars['--font-body']).toBe('var(--font-inter)');
  });
  it('devolve cópias independentes do preset', () => {
    const a = themeFromPreset('marfim');
    a.colors.background = '#000000';
    expect(themeFromPreset('marfim').colors.background).toBe('#F6F1E9');
  });
  it('rejeita cores inválidas', () => {
    const t = themeFromPreset('oliva');
    expect(themeSchema.safeParse(t).success).toBe(true);
    expect(themeSchema.safeParse({ ...t, colors: { ...t.colors, text: 'red; x:y' } }).success).toBe(false);
  });
});
```

- [ ] **Step 6: Correr e ver falhar**

Run: `npm test -- tests/admin-auth.test.ts tests/theme.test.ts`
Expected: FAIL (módulos em falta).

- [ ] **Step 7: Implementar autenticação, helpers HTTP e tema**

`src/lib/auth/admin.ts`:

```ts
import { createHash, timingSafeEqual } from 'node:crypto';
import { sign, unsign } from '@/lib/security/sign';
import { getCookie, serializeCookie } from '@/lib/security/cookies';

export const ADMIN_COOKIE = 'admin_session';
const TTL = 60 * 60 * 24 * 30;

const digest = (s: string) => createHash('sha256').update(s).digest();

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) throw new Error('ADMIN_PASSWORD tem de estar definido (>= 12 caracteres)');
  return timingSafeEqual(digest(input), digest(expected));
}

export function createAdminSessionCookie(): string {
  return serializeCookie(ADMIN_COOKIE, sign('admin', TTL), { maxAge: TTL });
}

export function clearAdminSessionCookie(): string {
  return serializeCookie(ADMIN_COOKIE, '', { maxAge: 0 });
}

export function isAdminToken(token: string | undefined): boolean {
  return unsign(token) === 'admin';
}

export function isAdminRequest(req: Request): boolean {
  return isAdminToken(getCookie(req, ADMIN_COOKIE));
}

export function unauthorized(): Response {
  return Response.json({ error: 'Sessão inválida' }, { status: 401 });
}
```

`src/lib/http.ts`:

```ts
import type { z } from 'zod';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

export function notFound(message = 'Não encontrado'): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';
}

export async function parseJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: Response.json({ error: 'JSON inválido' }, { status: 400 }) };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, response: Response.json({ error: 'Dados inválidos', issues: result.error.issues }, { status: 400 }) };
  }
  return { ok: true, data: result.data };
}
```

`src/lib/brand.ts`:

```ts
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Estúdio';
```

`src/lib/theme/presets.ts`:

```ts
import type { ThemePresetId, ThemeSettings } from './types';

export const PRESETS: Record<ThemePresetId, ThemeSettings> = {
  marfim: {
    preset: 'marfim', headingFont: 'cormorant', bodyFont: 'inter', logoUrl: null,
    colors: { background: '#F6F1E9', surface: '#EDE6DA', text: '#2B2A26', muted: '#7A746A', accent: '#6B6A4F' },
  },
  oliva: {
    preset: 'oliva', headingFont: 'playfair', bodyFont: 'jost', logoUrl: null,
    colors: { background: '#EEEBE3', surface: '#E2DED2', text: '#2F2E24', muted: '#77735F', accent: '#5B5A3F' },
  },
  noite: {
    preset: 'noite', headingFont: 'cormorant', bodyFont: 'inter', logoUrl: null,
    colors: { background: '#141414', surface: '#1F1E1C', text: '#EFEAE2', muted: '#A39D92', accent: '#C9B99A' },
  },
};

export function themeFromPreset(id: ThemePresetId): ThemeSettings {
  return structuredClone(PRESETS[id]);
}
```

`src/lib/theme/schema.ts`:

```ts
import { z } from 'zod';
import { BODY_FONTS, HEADING_FONTS, PRESET_IDS } from './types';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const themeSchema = z.object({
  preset: z.enum(PRESET_IDS),
  headingFont: z.enum(HEADING_FONTS),
  bodyFont: z.enum(BODY_FONTS),
  colors: z.object({ background: hex, surface: hex, text: hex, muted: hex, accent: hex }),
  logoUrl: z.string().max(2000).nullable(),
});
```

`src/lib/theme/css.ts`:

```ts
import type { BodyFont, HeadingFont, ThemeSettings } from './types';

const HEADING: Record<HeadingFont, string> = {
  cormorant: 'var(--font-cormorant)',
  playfair: 'var(--font-playfair)',
  bodoni: 'var(--font-bodoni)',
};
const BODY: Record<BodyFont, string> = { inter: 'var(--font-inter)', jost: 'var(--font-jost)' };

export function themeToCssVars(t: ThemeSettings): Record<string, string> {
  return {
    '--bg': t.colors.background,
    '--surface': t.colors.surface,
    '--text': t.colors.text,
    '--muted': t.colors.muted,
    '--accent': t.colors.accent,
    '--font-heading': HEADING[t.headingFont],
    '--font-body': BODY[t.bodyFont],
  };
}
```

- [ ] **Step 8: Rotas de login/logout**

`src/app/api/admin/login/route.ts`:

```ts
import { checkAdminPassword, createAdminSessionCookie } from '@/lib/auth/admin';

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData();
  const password = String(form.get('password') ?? '');
  if (!checkAdminPassword(password)) {
    return new Response(null, { status: 303, headers: { Location: '/admin/login?error=1' } });
  }
  return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': createAdminSessionCookie() } });
}
```

`src/app/api/admin/logout/route.ts`:

```ts
import { clearAdminSessionCookie } from '@/lib/auth/admin';

export async function POST(): Promise<Response> {
  return new Response(null, { status: 303, headers: { Location: '/admin/login', 'Set-Cookie': clearAdminSessionCookie() } });
}
```

- [ ] **Step 9: Correr e ver passar**

Run: `npm test`
Expected: PASS (todos).

- [ ] **Step 10: Fontes, layout raiz e estilos globais**

`src/app/fonts.ts`:

```ts
import { Bodoni_Moda, Cormorant_Garamond, Inter, Jost, Playfair_Display } from 'next/font/google';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-playfair', display: 'swap' });
const bodoni = Bodoni_Moda({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-bodoni', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jost = Jost({ subsets: ['latin'], variable: '--font-jost', display: 'swap' });

export const fontVariables = [cormorant, playfair, bodoni, inter, jost].map((f) => f.variable).join(' ');
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { fontVariables } from './fonts';
import { BRAND_NAME } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = { title: BRAND_NAME };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
```

`src/app/globals.css` (substitui o ficheiro gerado):

```css
:root {
  --bg: #f6f1e9;
  --surface: #ede6da;
  --text: #2b2a26;
  --muted: #7a746a;
  --accent: #6b6a4f;
  --font-heading: var(--font-cormorant);
  --font-body: var(--font-inter);
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
img { display: block; max-width: 100%; }
button, input, select { font: inherit; }
a { color: inherit; }
```

`src/app/page.tsx` (substitui o gerado):

```tsx
import { BRAND_NAME } from '@/lib/brand';

export default function Home() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontWeight: 300, fontSize: '3rem' }}>{BRAND_NAME}</h1>
    </main>
  );
}
```

- [ ] **Step 11: Página de login e guarda do painel**

`src/app/admin/admin.module.css`:

```css
.shell { min-height: 100svh; background: #fafaf8; color: #222; font-family: var(--font-inter), system-ui, sans-serif; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e5e2dc; }
.brand { font-family: var(--font-cormorant); font-style: italic; font-size: 1.5rem; text-decoration: none; }
.main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
.header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 24px; }
.header h1 { margin: 0; font-weight: 500; }
.button { display: inline-block; padding: 10px 16px; background: #2b2a26; color: #fff; border: 0; border-radius: 6px; text-decoration: none; cursor: pointer; }
.button:disabled { opacity: .5; cursor: default; }
.ghost { padding: 6px 10px; background: transparent; border: 1px solid #d6d2ca; border-radius: 6px; cursor: pointer; }
.danger { color: #a3261b; border-color: #e4b9b4; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.list a { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 14px 16px; background: #fff; border: 1px solid #e5e2dc; border-radius: 8px; text-decoration: none; }
.list span { color: #77736b; font-size: .9rem; }
.empty { color: #77736b; }
.panel { background: #fff; border: 1px solid #e5e2dc; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
.panel h2 { margin: 0 0 12px; font-size: 1.05rem; font-weight: 600; }
.field { display: grid; gap: 4px; margin-bottom: 12px; }
.field input, .field select { padding: 9px 10px; border: 1px solid #d6d2ca; border-radius: 6px; background: #fff; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.muted { color: #77736b; font-size: .9rem; }
.error { color: #a3261b; }
.dropzone { border: 2px dashed #cfcac0; border-radius: 10px; padding: 28px 16px; text-align: center; }
.dropzoneActive { border-color: #6b6a4f; background: #f4f2ea; }
.queue { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 4px; font-size: .9rem; }
.queue li { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.photoGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.photoCard { border: 1px solid #e5e2dc; border-radius: 8px; overflow: hidden; background: #fff; font-size: .8rem; }
.photoCard img { width: 100%; aspect-ratio: 1; object-fit: cover; }
.photoCard .row { padding: 6px; }
.cover { outline: 3px solid #6b6a4f; }
.login { max-width: 360px; margin: 15vh auto 0; padding: 0 16px; }
```

`src/app/admin/login/page.tsx`:

```tsx
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
```

`src/app/admin/(protected)/layout.tsx`:

```tsx
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
```

- [ ] **Step 12: Verificar manualmente**

Criar `.env.local`:

```
ADMIN_PASSWORD=uma-palavra-passe-longa
SESSION_SECRET=troca-isto-por-um-segredo-com-mais-de-32-caracteres
NEXT_PUBLIC_BRAND_NAME=Estúdio
```

Run: `npm run dev`, abrir `http://localhost:3000/admin`.
Expected: redireciona para `/admin/login`; palavra-passe errada mostra "Palavra-passe incorreta."; a certa leva a `/admin` (404 por agora, a página chega na Task 4).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: security primitives, admin login and theme system"
```

---

### Task 3: Storage e pipeline de imagem

**Files:**
- Create: `src/lib/storage/types.ts`, `src/lib/storage/local.ts`, `src/lib/storage/blob.ts`, `src/lib/storage/index.ts`, `src/lib/images/process.ts`, `tests/helpers/storage.ts`, `tests/helpers/images.ts`
- Test: `tests/storage.test.ts`, `tests/images.test.ts`

**Interfaces:**
- Consumes: `dataDir()` (Task 1)
- Produces:
  - `interface Storage { put(key: string, body: Buffer, contentType: string): Promise<string>; get(url: string): Promise<Buffer>; open(url: string): Promise<ReadableStream<Uint8Array>>; delete(urls: string[]): Promise<void>; isOwnUrl(url: string): boolean }`
  - `LOCAL_PREFIX = '/api/files/'`, `createLocalStorage(rootDir: string): Storage`, `localPathForKey(rootDir: string, key: string): string`, `isSafeKey(key: string): boolean`
  - `createBlobStorage(): Storage`
  - `getStorage(): Storage`, `setStorageForTests(s: Storage | null): void`, `storageDriver(): 'local' | 'blob'`
  - `processImage(input: Buffer): Promise<ProcessedImage>` com `ProcessedImage = { web: Buffer; thumb: Buffer; width: number; height: number }`; `class InvalidImageError extends Error`
  - `createTempStorage(): Promise<{ storage: Storage; root: string }>` (`tests/helpers/storage.ts`), `makeJpeg(width: number, height: number, orientation?: number): Promise<Buffer>` (`tests/helpers/images.ts`)

- [ ] **Step 1: Helpers de teste**

`tests/helpers/storage.ts`:

```ts
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalStorage } from '@/lib/storage/local';

export async function createTempStorage() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'galeria-'));
  return { storage: createLocalStorage(root), root };
}
```

`tests/helpers/images.ts`:

```ts
import sharp from 'sharp';

export async function makeJpeg(width: number, height: number, orientation?: number): Promise<Buffer> {
  let img = sharp({ create: { width, height, channels: 3, background: '#8a8070' } }).jpeg();
  if (orientation) img = img.withMetadata({ orientation });
  return img.toBuffer();
}
```

- [ ] **Step 2: Escrever os testes**

`tests/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createTempStorage } from './helpers/storage';
import { isSafeKey } from '@/lib/storage/local';

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

describe('storage local', () => {
  it('guarda, lê, abre como stream e apaga', async () => {
    const { storage } = await createTempStorage();
    const url = await storage.put('galleries/g1/web/a.jpg', Buffer.from('olá'), 'image/jpeg');
    expect(url).toBe('/api/files/galleries/g1/web/a.jpg');
    expect(storage.isOwnUrl(url)).toBe(true);
    expect((await storage.get(url)).toString()).toBe('olá');
    expect(await readAll(await storage.open(url))).toBe('olá');
    await storage.delete([url]);
    await expect(storage.get(url)).rejects.toThrow();
  });
  it('recusa chaves perigosas', async () => {
    expect(isSafeKey('galleries/../../etc/passwd')).toBe(false);
    expect(isSafeKey('/abs')).toBe(false);
    expect(isSafeKey('galleries/a b.jpg')).toBe(false);
    const { storage } = await createTempStorage();
    await expect(storage.put('../x', Buffer.from(''), 'text/plain')).rejects.toThrow();
    expect(storage.isOwnUrl('https://evil.example/x')).toBe(false);
  });
});
```

`tests/images.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { InvalidImageError, processImage } from '@/lib/images/process';
import { makeJpeg } from './helpers/images';

describe('processImage', () => {
  it('reduz para 2400px (web) e 800px (miniatura)', async () => {
    const out = await processImage(await makeJpeg(4000, 3000));
    expect(out.width).toBe(2400);
    expect(out.height).toBe(1800);
    const thumb = await sharp(out.thumb).metadata();
    expect(Math.max(thumb.width!, thumb.height!)).toBe(800);
  });
  it('não aumenta imagens pequenas', async () => {
    const out = await processImage(await makeJpeg(600, 400));
    expect([out.width, out.height]).toEqual([600, 400]);
  });
  it('aplica a orientação EXIF (foto de telemóvel na vertical)', async () => {
    const out = await processImage(await makeJpeg(3000, 2000, 6));
    expect([out.width, out.height]).toEqual([1600, 2400]);
    const meta = await sharp(out.web).metadata();
    expect([meta.width, meta.height]).toEqual([1600, 2400]);
  });
  it('rejeita ficheiros que não são imagem com mensagem clara', async () => {
    await expect(processImage(Buffer.from('isto não é uma foto'))).rejects.toThrow(InvalidImageError);
    await expect(processImage(Buffer.from('isto não é uma foto'))).rejects.toThrow('não é uma imagem válida');
  });
  it('rejeita imagens truncadas', async () => {
    const full = await makeJpeg(1200, 800);
    await expect(processImage(full.subarray(0, 300))).rejects.toThrow(InvalidImageError);
  });
});
```

- [ ] **Step 3: Correr e ver falhar**

Run: `npm test -- tests/storage.test.ts tests/images.test.ts`
Expected: FAIL (módulos em falta).

- [ ] **Step 4: Implementar o storage**

`src/lib/storage/types.ts`:

```ts
export interface Storage {
  /** Guarda o ficheiro e devolve o URL público. */
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  get(url: string): Promise<Buffer>;
  open(url: string): Promise<ReadableStream<Uint8Array>>;
  delete(urls: string[]): Promise<void>;
  /** true se o URL pertence a este storage (impede SSRF na ingestão). */
  isOwnUrl(url: string): boolean;
}
```

`src/lib/storage/local.ts`:

```ts
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { Storage } from './types';

export const LOCAL_PREFIX = '/api/files/';

export function isSafeKey(key: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(key) && !key.split('/').some((p) => p === '..' || p === '.' || p === '');
}

export function localPathForKey(rootDir: string, key: string): string {
  if (!isSafeKey(key)) throw new Error(`Chave inválida: ${key}`);
  return path.join(rootDir, ...key.split('/'));
}

export function createLocalStorage(rootDir: string): Storage {
  const pathForUrl = (url: string) => {
    if (!url.startsWith(LOCAL_PREFIX)) throw new Error(`URL não pertence ao storage local: ${url}`);
    return localPathForKey(rootDir, url.slice(LOCAL_PREFIX.length));
  };
  return {
    async put(key, body) {
      const p = localPathForKey(rootDir, key);
      await mkdir(path.dirname(p), { recursive: true });
      await writeFile(p, body);
      return LOCAL_PREFIX + key;
    },
    get: (url) => readFile(pathForUrl(url)),
    async open(url) {
      const p = pathForUrl(url);
      await stat(p); // falha cedo se não existir
      return Readable.toWeb(createReadStream(p)) as ReadableStream<Uint8Array>;
    },
    async delete(urls) {
      await Promise.all(urls.filter((u) => u.startsWith(LOCAL_PREFIX)).map((u) => rm(pathForUrl(u), { force: true })));
    },
    isOwnUrl(url) {
      return url.startsWith(LOCAL_PREFIX) && isSafeKey(url.slice(LOCAL_PREFIX.length));
    },
  };
}
```

`src/lib/storage/blob.ts`:

```ts
import { del, put } from '@vercel/blob';
import type { Storage } from './types';

export function createBlobStorage(): Storage {
  const fetchOk = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`Falha ao ler ficheiro (${res.status})`);
    return res;
  };
  return {
    async put(key, body, contentType) {
      const r = await put(key, body, { access: 'public', contentType, addRandomSuffix: true });
      return r.url;
    },
    get: async (url) => Buffer.from(await (await fetchOk(url)).arrayBuffer()),
    open: async (url) => (await fetchOk(url)).body!,
    async delete(urls) {
      if (urls.length) await del(urls);
    },
    isOwnUrl(url) {
      try {
        const u = new URL(url);
        return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com');
      } catch {
        return false;
      }
    },
  };
}
```

`src/lib/storage/index.ts`:

```ts
import path from 'node:path';
import { dataDir } from '@/lib/env';
import { createBlobStorage } from './blob';
import { createLocalStorage } from './local';
import type { Storage } from './types';

export type { Storage } from './types';

let override: Storage | null = null;
let cached: Storage | null = null;

export function setStorageForTests(s: Storage | null): void {
  override = s;
}

export function storageDriver(): 'local' | 'blob' {
  return process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'local';
}

export function getStorage(): Storage {
  if (override) return override;
  cached ??= storageDriver() === 'blob' ? createBlobStorage() : createLocalStorage(path.join(dataDir(), 'files'));
  return cached;
}
```

- [ ] **Step 5: Implementar o pipeline de imagem**

`src/lib/images/process.ts`:

```ts
import sharp from 'sharp';

export interface ProcessedImage {
  web: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

export class InvalidImageError extends Error {}

const SUPPORTED = new Set(['jpeg', 'png', 'webp', 'tiff']);

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw new InvalidImageError('O ficheiro não é uma imagem válida.');
  }
  if (format === 'heif') throw new InvalidImageError('Formato HEIC não suportado. Exporta a foto em JPEG.');
  if (!format || !SUPPORTED.has(format)) throw new InvalidImageError(`Formato não suportado (${format ?? 'desconhecido'}).`);

  try {
    const base = sharp(input, { failOn: 'truncated' }).rotate();
    const web = await base
      .clone()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const thumb = await base
      .clone()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
    return { web: web.data, thumb, width: web.info.width, height: web.info.height };
  } catch {
    throw new InvalidImageError('O ficheiro não é uma imagem válida (pode estar corrompido).');
  }
}
```

- [ ] **Step 6: Correr e ver passar**

Run: `npm test -- tests/storage.test.ts tests/images.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: storage abstraction (local + Vercel Blob) and image pipeline"
```

---

### Task 4: Galerias e capítulos (repositório + API admin + lista no painel)

**Files:**
- Create: `src/lib/galleries/repo.ts`, `src/lib/galleries/chapters.ts`, `src/lib/galleries/validation.ts`, `src/app/api/admin/galleries/route.ts`, `src/app/api/admin/galleries/[id]/route.ts`, `src/app/api/admin/galleries/[id]/chapters/route.ts`, `src/app/api/admin/chapters/[id]/route.ts`, `src/app/admin/(protected)/page.tsx`, `src/app/admin/(protected)/new/page.tsx`, `src/components/admin/NewGalleryForm.tsx`
- Test: `tests/galleries.test.ts`, `tests/galleries-api.test.ts`

**Interfaces:**
- Consumes: `Db`, `getDb`, `setDbForTests`, tabelas (Task 1); `generateSlug`, `hashPassword`, `themeFromPreset`, `themeSchema`, `isAdminRequest`, `unauthorized`, `parseJson`, `isUuid`, `notFound` (Task 2); `getStorage`, `setStorageForTests` (Task 3)
- Produces:
  - `type Gallery = typeof galleries.$inferSelect`
  - `createGallery(db: Db, input: NewGalleryInput): Promise<Gallery>` com `NewGalleryInput = { title: string; subtitle?: string; preset?: ThemePresetId; password?: string | null; expiresAt?: Date | null }`
  - `listGalleries(db: Db): Promise<(Gallery & { photoCount: number })[]>`
  - `getGalleryById(db: Db, id: string): Promise<Gallery | null>`, `getGalleryBySlug(db: Db, slug: string): Promise<Gallery | null>`
  - `updateGallery(db: Db, id: string, patch: GalleryPatch): Promise<Gallery | null>` com `GalleryPatch = { title?: string; subtitle?: string; theme?: ThemeSettings; coverPhotoId?: string | null; password?: string | null; expiresAt?: Date | null }`
  - `deleteGallery(db: Db, id: string): Promise<string[]>` (URLs de ficheiros a apagar)
  - `type Chapter`, `listChapters(db, galleryId): Promise<Chapter[]>`, `createChapter(db, galleryId, name): Promise<Chapter>`, `renameChapter(db, id, name): Promise<Chapter | null>`, `deleteChapter(db, id): Promise<boolean>`
  - `createGallerySchema`, `patchGallerySchema`, `chapterSchema` (zod)
  - API: `POST/GET /api/admin/galleries`, `PATCH/DELETE /api/admin/galleries/[id]`, `POST /api/admin/galleries/[id]/chapters`, `PATCH/DELETE /api/admin/chapters/[id]`

- [ ] **Step 1: Escrever os testes do repositório**

`tests/galleries.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import type { Db } from '@/db/client';
import { photos } from '@/db/schema';
import { createGallery, deleteGallery, getGalleryById, getGalleryBySlug, listGalleries, updateGallery } from '@/lib/galleries/repo';
import { createChapter, deleteChapter, listChapters, renameChapter } from '@/lib/galleries/chapters';
import { verifyPassword } from '@/lib/security/password';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('galerias', () => {
  it('cria com slug legível, tema por omissão e palavra-passe cifrada', async () => {
    const g = await createGallery(db, { title: '  João & Inês ', subtitle: 'Sintra', password: 'amor2026' });
    expect(g.title).toBe('João & Inês');
    expect(g.slug).toMatch(/^joao-ines-[a-z2-9]{12}$/);
    expect(g.theme.preset).toBe('marfim');
    expect(await verifyPassword('amor2026', g.passwordHash!)).toBe(true);
    expect((await getGalleryBySlug(db, g.slug))?.id).toBe(g.id);
  });

  it('lista com número de fotos, mais recente primeiro', async () => {
    const a = await createGallery(db, { title: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    await createGallery(db, { title: 'B' });
    await db.insert(photos).values({ galleryId: a.id, filename: 'x.jpg', originalUrl: 'o', webUrl: 'w', thumbUrl: 't', width: 1, height: 1, bytes: 1 });
    const list = await listGalleries(db);
    expect(list.map((g) => [g.title, g.photoCount])).toEqual([['B', 0], ['A', 1]]);
  });

  it('atualiza campos e remove a palavra-passe com null', async () => {
    const g = await createGallery(db, { title: 'A', password: 'x1234' });
    const u = await updateGallery(db, g.id, { title: 'B', password: null, expiresAt: new Date('2030-01-01T00:00:00Z') });
    expect(u?.title).toBe('B');
    expect(u?.passwordHash).toBeNull();
    expect(u?.expiresAt?.toISOString()).toBe('2030-01-01T00:00:00.000Z');
  });

  it('devolve null para ids que não são UUID (sem erro do Postgres)', async () => {
    expect(await getGalleryById(db, 'abc')).toBeNull();
    expect(await updateGallery(db, 'abc', { title: 'x' })).toBeNull();
  });

  it('ao apagar devolve os URLs dos ficheiros', async () => {
    const g = await createGallery(db, { title: 'A' });
    await db.insert(photos).values({ galleryId: g.id, filename: 'x.jpg', originalUrl: 'o1', webUrl: 'w1', thumbUrl: 't1', width: 1, height: 1, bytes: 1 });
    await updateGallery(db, g.id, { theme: { ...g.theme, logoUrl: 'logo1' } });
    expect((await deleteGallery(db, g.id)).sort()).toEqual(['logo1', 'o1', 't1', 'w1']);
    expect(await getGalleryById(db, g.id)).toBeNull();
  });
});

describe('capítulos', () => {
  it('cria por ordem, renomeia e apaga', async () => {
    const g = await createGallery(db, { title: 'A' });
    const c1 = await createChapter(db, g.id, 'Preparação');
    await createChapter(db, g.id, 'Cerimónia');
    await renameChapter(db, c1.id, 'Manhã');
    expect((await listChapters(db, g.id)).map((c) => c.name)).toEqual(['Manhã', 'Cerimónia']);
    expect(await deleteChapter(db, c1.id)).toBe(true);
    expect(await deleteChapter(db, 'abc')).toBe(false);
    expect(await listChapters(db, g.id)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/galleries.test.ts`
Expected: FAIL (módulos em falta).

- [ ] **Step 3: Implementar o repositório e os capítulos**

`src/lib/galleries/repo.ts`:

```ts
import { count, desc, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { galleries, photos } from '@/db/schema';
import { generateSlug } from '@/lib/security/slug';
import { hashPassword } from '@/lib/security/password';
import { themeFromPreset } from '@/lib/theme/presets';
import type { ThemePresetId, ThemeSettings } from '@/lib/theme/types';
import { isUuid } from '@/lib/http';

export type Gallery = typeof galleries.$inferSelect;

export interface NewGalleryInput {
  title: string;
  subtitle?: string;
  preset?: ThemePresetId;
  password?: string | null;
  expiresAt?: Date | null;
}

export interface GalleryPatch {
  title?: string;
  subtitle?: string;
  theme?: ThemeSettings;
  coverPhotoId?: string | null;
  password?: string | null;
  expiresAt?: Date | null;
}

export async function createGallery(db: Db, input: NewGalleryInput): Promise<Gallery> {
  const [row] = await db
    .insert(galleries)
    .values({
      slug: generateSlug(input.title),
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() ?? '',
      theme: themeFromPreset(input.preset ?? 'marfim'),
      passwordHash: input.password ? await hashPassword(input.password) : null,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
  return row;
}

export async function listGalleries(db: Db): Promise<(Gallery & { photoCount: number })[]> {
  const rows = await db
    .select({ gallery: galleries, photoCount: count(photos.id) })
    .from(galleries)
    .leftJoin(photos, eq(photos.galleryId, galleries.id))
    .groupBy(galleries.id)
    .orderBy(desc(galleries.createdAt));
  return rows.map((r) => ({ ...r.gallery, photoCount: Number(r.photoCount) }));
}

export async function getGalleryById(db: Db, id: string): Promise<Gallery | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(galleries).where(eq(galleries.id, id));
  return row ?? null;
}

export async function getGalleryBySlug(db: Db, slug: string): Promise<Gallery | null> {
  const [row] = await db.select().from(galleries).where(eq(galleries.slug, slug));
  return row ?? null;
}

export async function updateGallery(db: Db, id: string, patch: GalleryPatch): Promise<Gallery | null> {
  if (!isUuid(id)) return null;
  const values: Partial<typeof galleries.$inferInsert> = {};
  if (patch.title !== undefined) values.title = patch.title.trim();
  if (patch.subtitle !== undefined) values.subtitle = patch.subtitle.trim();
  if (patch.theme !== undefined) values.theme = patch.theme;
  if (patch.coverPhotoId !== undefined) values.coverPhotoId = patch.coverPhotoId;
  if (patch.expiresAt !== undefined) values.expiresAt = patch.expiresAt;
  if (patch.password !== undefined) values.passwordHash = patch.password ? await hashPassword(patch.password) : null;
  if (Object.keys(values).length === 0) return getGalleryById(db, id);
  const [row] = await db.update(galleries).set(values).where(eq(galleries.id, id)).returning();
  return row ?? null;
}

export async function deleteGallery(db: Db, id: string): Promise<string[]> {
  const gallery = await getGalleryById(db, id);
  if (!gallery) return [];
  const files = await db
    .select({ o: photos.originalUrl, w: photos.webUrl, t: photos.thumbUrl })
    .from(photos)
    .where(eq(photos.galleryId, id));
  await db.delete(galleries).where(eq(galleries.id, id));
  const urls = files.flatMap((f) => [f.o, f.w, f.t]);
  if (gallery.theme.logoUrl) urls.push(gallery.theme.logoUrl);
  return urls;
}
```

`src/lib/galleries/chapters.ts`:

```ts
import { asc, count, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { chapters } from '@/db/schema';
import { isUuid } from '@/lib/http';

export type Chapter = typeof chapters.$inferSelect;

export async function listChapters(db: Db, galleryId: string): Promise<Chapter[]> {
  return db.select().from(chapters).where(eq(chapters.galleryId, galleryId)).orderBy(asc(chapters.order));
}

export async function createChapter(db: Db, galleryId: string, name: string): Promise<Chapter> {
  const [{ n }] = await db.select({ n: count() }).from(chapters).where(eq(chapters.galleryId, galleryId));
  const [row] = await db.insert(chapters).values({ galleryId, name: name.trim(), order: Number(n) }).returning();
  return row;
}

export async function renameChapter(db: Db, id: string, name: string): Promise<Chapter | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.update(chapters).set({ name: name.trim() }).where(eq(chapters.id, id)).returning();
  return row ?? null;
}

export async function deleteChapter(db: Db, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await db.delete(chapters).where(eq(chapters.id, id)).returning({ id: chapters.id });
  return rows.length > 0;
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm test -- tests/galleries.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever os testes da API**

`tests/galleries-api.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { createTempStorage } from './helpers/storage';
import { adminCookieHeader } from './helpers/auth';
import { setDbForTests, type Db } from '@/db/client';
import { setStorageForTests } from '@/lib/storage';
import { GET as list, POST as create } from '@/app/api/admin/galleries/route';
import { DELETE as remove, PATCH as patch } from '@/app/api/admin/galleries/[id]/route';
import { POST as addChapter } from '@/app/api/admin/galleries/[id]/chapters/route';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  setDbForTests(db);
  setStorageForTests((await createTempStorage()).storage);
});
afterEach(() => {
  setDbForTests(null);
  setStorageForTests(null);
});

const req = (method: string, body?: unknown, admin = true) =>
  new Request('http://localhost/api', {
    method,
    headers: { 'content-type': 'application/json', ...(admin ? { cookie: adminCookieHeader() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('API admin de galerias', () => {
  it('exige sessão', async () => {
    expect((await create(req('POST', { title: 'A' }, false))).status).toBe(401);
    expect((await list(req('GET', undefined, false))).status).toBe(401);
  });

  it('cria, edita e apaga', async () => {
    const created = await create(req('POST', { title: 'Ana + Rui', subtitle: 'Porto', preset: 'noite' }));
    expect(created.status).toBe(201);
    const g = await created.json();
    expect(g.theme.preset).toBe('noite');
    expect(g).not.toHaveProperty('passwordHash');
    expect(g.hasPassword).toBe(false);

    const edited = await patch(req('PATCH', { title: 'Ana & Rui', password: 'segredo1' }), ctx(g.id));
    expect(edited.status).toBe(200);
    expect((await edited.json()).hasPassword).toBe(true);

    expect((await addChapter(req('POST', { name: 'Festa' }), ctx(g.id))).status).toBe(201);
    expect((await remove(req('DELETE'), ctx(g.id))).status).toBe(204);
    expect((await patch(req('PATCH', { title: 'x' }), ctx(g.id))).status).toBe(404);
  });

  it('valida os dados', async () => {
    expect((await create(req('POST', { title: '' }))).status).toBe(400);
    const g = await (await create(req('POST', { title: 'A' }))).json();
    const badTheme = { ...g.theme, colors: { ...g.theme.colors, text: 'red' } };
    expect((await patch(req('PATCH', { theme: badTheme }), ctx(g.id))).status).toBe(400);
    expect((await patch(req('PATCH', { theme: { ...g.theme, logoUrl: 'https://evil.example/x.png' } }), ctx(g.id))).status).toBe(400);
    expect((await patch(req('PATCH', { coverPhotoId: crypto.randomUUID() }), ctx(g.id))).status).toBe(400);
  });

  it('id malformado devolve 404', async () => {
    expect((await patch(req('PATCH', { title: 'x' }), ctx('abc'))).status).toBe(404);
  });
});
```

- [ ] **Step 6: Correr e ver falhar**

Run: `npm test -- tests/galleries-api.test.ts`
Expected: FAIL (rotas em falta).

- [ ] **Step 7: Validação e rotas**

`src/lib/galleries/validation.ts`:

```ts
import { z } from 'zod';
import { PRESET_IDS } from '@/lib/theme/types';
import { themeSchema } from '@/lib/theme/schema';
import type { Gallery } from './repo';

const password = z.string().min(4).max(200).nullable().optional();
const expiresAt = z.coerce.date().nullable().optional();

export const createGallerySchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).optional(),
  preset: z.enum(PRESET_IDS).optional(),
  password,
  expiresAt,
});

export const patchGallerySchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  subtitle: z.string().trim().max(200).optional(),
  theme: themeSchema.optional(),
  coverPhotoId: z.string().uuid().nullable().optional(),
  password,
  expiresAt,
});

export const chapterSchema = z.object({ name: z.string().trim().min(1).max(80) });

/** Forma pública da galeria para o painel (nunca expõe o hash). */
export function toAdminGallery(g: Gallery) {
  const { passwordHash, ...rest } = g;
  return { ...rest, hasPassword: passwordHash !== null };
}
```

`src/app/api/admin/galleries/route.ts`:

```ts
import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { parseJson } from '@/lib/http';
import { createGallery, listGalleries } from '@/lib/galleries/repo';
import { createGallerySchema, toAdminGallery } from '@/lib/galleries/validation';

export async function GET(req: Request): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const rows = await listGalleries(await getDb());
  return Response.json(rows.map((g) => ({ ...toAdminGallery(g), photoCount: g.photoCount })));
}

export async function POST(req: Request): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const parsed = await parseJson(req, createGallerySchema);
  if (!parsed.ok) return parsed.response;
  const gallery = await createGallery(await getDb(), parsed.data);
  return Response.json(toAdminGallery(gallery), { status: 201 });
}
```

`src/app/api/admin/galleries/[id]/route.ts`:

```ts
import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { deleteGallery, getGalleryById, updateGallery } from '@/lib/galleries/repo';
import { patchGallerySchema, toAdminGallery } from '@/lib/galleries/validation';
import { getPhoto } from '@/lib/photos/repo';
import { getStorage } from '@/lib/storage';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const parsed = await parseJson(req, patchGallerySchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;

  if (patch.coverPhotoId && !(await getPhoto(db, id, patch.coverPhotoId))) {
    return Response.json({ error: 'A foto de capa não pertence a esta galeria' }, { status: 400 });
  }
  if (patch.theme?.logoUrl && !getStorage().isOwnUrl(patch.theme.logoUrl)) {
    return Response.json({ error: 'Logo inválido' }, { status: 400 });
  }
  const updated = await updateGallery(db, id, patch);
  return updated ? Response.json(toAdminGallery(updated)) : notFound();
}

export async function DELETE(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const urls = await deleteGallery(db, id);
  await getStorage().delete(urls);
  return new Response(null, { status: 204 });
}
```

Esta rota usa `getPhoto` da Task 5. Para os testes desta task passarem já, cria agora `src/lib/photos/repo.ts` com o conteúdo completo da Task 5, Step 3 (o ficheiro é escrito uma só vez; a Task 5 acrescenta os testes dele).

`src/app/api/admin/galleries/[id]/chapters/route.ts`:

```ts
import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { getGalleryById } from '@/lib/galleries/repo';
import { createChapter } from '@/lib/galleries/chapters';
import { chapterSchema } from '@/lib/galleries/validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const parsed = await parseJson(req, chapterSchema);
  if (!parsed.ok) return parsed.response;
  return Response.json(await createChapter(db, id, parsed.data.name), { status: 201 });
}
```

`src/app/api/admin/chapters/[id]/route.ts`:

```ts
import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { deleteChapter, renameChapter } from '@/lib/galleries/chapters';
import { chapterSchema } from '@/lib/galleries/validation';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const parsed = await parseJson(req, chapterSchema);
  if (!parsed.ok) return parsed.response;
  const row = await renameChapter(await getDb(), id, parsed.data.name);
  return row ? Response.json(row) : notFound();
}

export async function DELETE(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  return (await deleteChapter(await getDb(), id)) ? new Response(null, { status: 204 }) : notFound();
}
```

- [ ] **Step 8: Correr e ver passar**

Run: `npm test`
Expected: PASS (todos).

- [ ] **Step 9: Lista de galerias e "Nova galeria" no painel**

`src/app/admin/(protected)/page.tsx`:

```tsx
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
```

`src/app/admin/(protected)/new/page.tsx`:

```tsx
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
```

`src/components/admin/NewGalleryForm.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';

export function NewGalleryForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/galleries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.get('title'), subtitle: form.get('subtitle'), preset: form.get('preset') }),
    });
    if (!res.ok) {
      setBusy(false);
      setError('Não foi possível criar a galeria.');
      return;
    }
    const g = await res.json();
    router.push(`/admin/galleries/${g.id}`);
  }

  return (
    <form className={styles.panel} onSubmit={onSubmit}>
      <label className={styles.field}>Nomes do casal<input name="title" required maxLength={120} placeholder="Nando + Hannah" /></label>
      <label className={styles.field}>Data e local<input name="subtitle" maxLength={200} placeholder="12.06.2026 · Sintra" /></label>
      <label className={styles.field}>
        Estilo
        <select name="preset" defaultValue="marfim">
          <option value="marfim">Marfim</option>
          <option value="oliva">Oliva</option>
          <option value="noite">Noite</option>
        </select>
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.button} disabled={busy} type="submit">Criar galeria</button>
    </form>
  );
}
```

- [ ] **Step 10: Verificar manualmente**

Run: `npm run dev`; entrar em `/admin`, clicar "Nova galeria", criar.
Expected: a galeria aparece em `/admin` (a página de edição dá 404 até à Task 7).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: galleries and chapters repository, admin API and list UI"
```

---

### Task 5: Fotos — repositório, ingestão e rotas de upload

**Files:**
- Create: `src/lib/photos/repo.ts` (se ainda não existir da Task 4), `src/lib/photos/ingest.ts`, `src/lib/upload/filename.ts`, `src/app/api/admin/galleries/[id]/photos/route.ts`, `src/app/api/admin/galleries/[id]/photos/reorder/route.ts`, `src/app/api/admin/photos/[id]/route.ts`, `src/app/api/admin/files/[...key]/route.ts`, `src/app/api/admin/blob-upload/route.ts`, `src/app/api/files/[...key]/route.ts`
- Test: `tests/photos.test.ts`, `tests/photos-api.test.ts`

**Interfaces:**
- Consumes: `Db`, `getDb` (Task 1); `isAdminRequest`, `unauthorized`, `parseJson`, `isUuid`, `notFound` (Task 2); `Storage`, `getStorage`, `storageDriver`, `LOCAL_PREFIX`, `localPathForKey`, `processImage`, `InvalidImageError` (Task 3); `getGalleryById`, `updateGallery` (Task 4)
- Produces:
  - `type Photo = typeof photos.$inferSelect`
  - `addPhoto(db: Db, values: NewPhoto): Promise<Photo>` com `NewPhoto = Omit<typeof photos.$inferInsert, 'order'>`
  - `listPhotos(db: Db, galleryId: string): Promise<Photo[]>`
  - `getPhoto(db: Db, galleryId: string, photoId: string): Promise<Photo | null>`, `getPhotoById(db: Db, photoId: string): Promise<Photo | null>`
  - `reorderPhotos(db: Db, galleryId: string, ids: string[]): Promise<void>`
  - `setPhotoChapter(db: Db, photoId: string, chapterId: string | null): Promise<Photo | null>`
  - `deletePhoto(db: Db, photoId: string): Promise<string[]>` (URLs a apagar)
  - `ingestPhoto(deps: { db: Db; storage: Storage }, input: { galleryId: string; originalUrl: string; filename: string }): Promise<Photo>`
  - `safeFilename(name: string): string`, `ORIGINAL_KEY_RE: RegExp`, `LOGO_KEY_RE: RegExp`
  - API: `POST /api/admin/galleries/[id]/photos` `{ originalUrl, filename }` → 201 foto | 422 `{ error }`; `POST /api/admin/galleries/[id]/photos/reorder` `{ ids }`; `PATCH /api/admin/photos/[id]` `{ chapterId }`; `DELETE /api/admin/photos/[id]`; `PUT /api/admin/files/<key>` → `{ url }` (só storage local); `POST /api/admin/blob-upload` (token Vercel Blob); `GET /api/files/<key>` (só local; nunca originais)

- [ ] **Step 1: Escrever os testes**

`tests/photos.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { createTempStorage } from './helpers/storage';
import { makeJpeg } from './helpers/images';
import type { Db } from '@/db/client';
import type { Storage } from '@/lib/storage';
import { createGallery } from '@/lib/galleries/repo';
import { createChapter } from '@/lib/galleries/chapters';
import { deletePhoto, getPhoto, listPhotos, reorderPhotos, setPhotoChapter } from '@/lib/photos/repo';
import { ingestPhoto } from '@/lib/photos/ingest';
import { InvalidImageError } from '@/lib/images/process';
import { safeFilename } from '@/lib/upload/filename';

let db: Db;
let storage: Storage;
beforeEach(async () => {
  db = await createTestDb();
  storage = (await createTempStorage()).storage;
});

async function upload(galleryId: string, name: string, body: Buffer) {
  const originalUrl = await storage.put(`galleries/${galleryId}/originals/${safeFilename(name)}`, body, 'image/jpeg');
  return ingestPhoto({ db, storage }, { galleryId, originalUrl, filename: name });
}

describe('ingestão', () => {
  it('gera web e miniatura e guarda dimensões e tamanho do original', async () => {
    const g = await createGallery(db, { title: 'A' });
    const original = await makeJpeg(3000, 2000);
    const p = await upload(g.id, 'DSC_0001.jpg', original);
    expect([p.width, p.height, p.bytes, p.filename]).toEqual([2400, 1600, original.length, 'DSC_0001.jpg']);
    expect((await storage.get(p.webUrl)).length).toBeGreaterThan(0);
    expect((await storage.get(p.thumbUrl)).length).toBeGreaterThan(0);
  });

  it('ficheiro inválido: lança InvalidImageError e apaga o original', async () => {
    const g = await createGallery(db, { title: 'A' });
    const url = await storage.put(`galleries/${g.id}/originals/x.jpg`, Buffer.from('lixo'), 'image/jpeg');
    await expect(ingestPhoto({ db, storage }, { galleryId: g.id, originalUrl: url, filename: 'x.jpg' })).rejects.toThrow(InvalidImageError);
    await expect(storage.get(url)).rejects.toThrow();
    expect(await listPhotos(db, g.id)).toHaveLength(0);
  });
});

describe('repositório de fotos', () => {
  it('ordena, muda capítulo e apaga', async () => {
    const g = await createGallery(db, { title: 'A' });
    const img = await makeJpeg(400, 300);
    const a = await upload(g.id, 'a.jpg', img);
    const b = await upload(g.id, 'b.jpg', img);
    expect((await listPhotos(db, g.id)).map((p) => p.filename)).toEqual(['a.jpg', 'b.jpg']);
    await reorderPhotos(db, g.id, [b.id, a.id]);
    expect((await listPhotos(db, g.id)).map((p) => p.filename)).toEqual(['b.jpg', 'a.jpg']);

    const c = await createChapter(db, g.id, 'Festa');
    expect((await setPhotoChapter(db, a.id, c.id))?.chapterId).toBe(c.id);

    const urls = await deletePhoto(db, a.id);
    expect(urls).toEqual([a.originalUrl, a.webUrl, a.thumbUrl]);
    expect(await getPhoto(db, g.id, a.id)).toBeNull();
    expect(await getPhoto(db, g.id, 'abc')).toBeNull();
  });
});

describe('safeFilename', () => {
  it('tira acentos e caracteres perigosos', () => {
    expect(safeFilename('Noivos Ínês (1).JPG')).toBe('Noivos-Ines-1-.JPG');
    expect(safeFilename('../../etc/passwd')).toBe('etc-passwd');
    expect(safeFilename('')).toBe('ficheiro');
  });
});
```

`tests/photos-api.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { createTempStorage } from './helpers/storage';
import { adminCookieHeader } from './helpers/auth';
import { makeJpeg } from './helpers/images';
import { setDbForTests, type Db } from '@/db/client';
import { setStorageForTests, type Storage } from '@/lib/storage';
import { createGallery } from '@/lib/galleries/repo';
import { POST as ingest } from '@/app/api/admin/galleries/[id]/photos/route';
import { PUT as putFile } from '@/app/api/admin/files/[...key]/route';
import { GET as getFile } from '@/app/api/files/[...key]/route';

let db: Db;
let storage: Storage;
beforeEach(async () => {
  db = await createTestDb();
  storage = (await createTempStorage()).storage;
  setDbForTests(db);
  setStorageForTests(storage);
});
afterEach(() => {
  setDbForTests(null);
  setStorageForTests(null);
});

const json = (body: unknown) =>
  new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: adminCookieHeader() },
    body: JSON.stringify(body),
  });

describe('upload local + ingestão', () => {
  it('fluxo completo: PUT do original e POST da ingestão', async () => {
    const g = await createGallery(db, { title: 'A' });
    const key = `galleries/${g.id}/originals/abc-foto.jpg`.split('/');
    const put = await putFile(
      new Request('http://localhost', { method: 'PUT', headers: { cookie: adminCookieHeader() }, body: await makeJpeg(800, 600) }),
      { params: Promise.resolve({ key }) },
    );
    expect(put.status).toBe(201);
    const { url } = await put.json();
    const res = await ingest(json({ originalUrl: url, filename: 'foto.jpg' }), { params: Promise.resolve({ id: g.id }) });
    expect(res.status).toBe(201);
    const photo = await res.json();
    expect(photo.width).toBe(800);
  });

  it('PUT exige sessão e caminho de originais/logo da galeria', async () => {
    const g = await createGallery(db, { title: 'A' });
    const noAuth = await putFile(new Request('http://localhost', { method: 'PUT', body: 'x' }), { params: Promise.resolve({ key: ['galleries', g.id, 'originals', 'a.jpg'] }) });
    expect(noAuth.status).toBe(401);
    const badPath = await putFile(
      new Request('http://localhost', { method: 'PUT', headers: { cookie: adminCookieHeader() }, body: 'x' }),
      { params: Promise.resolve({ key: ['galleries', g.id, 'web', 'a.jpg'] }) },
    );
    expect(badPath.status).toBe(400);
  });

  it('ficheiro inválido devolve 422 com mensagem PT', async () => {
    const g = await createGallery(db, { title: 'A' });
    const url = await storage.put(`galleries/${g.id}/originals/x.jpg`, Buffer.from('lixo'), 'image/jpeg');
    const res = await ingest(json({ originalUrl: url, filename: 'x.jpg' }), { params: Promise.resolve({ id: g.id }) });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('imagem válida');
  });

  it('recusa URLs externos ou de outra galeria (SSRF)', async () => {
    const g = await createGallery(db, { title: 'A' });
    const other = await createGallery(db, { title: 'B' });
    const foreign = await storage.put(`galleries/${other.id}/originals/x.jpg`, await makeJpeg(10, 10), 'image/jpeg');
    for (const originalUrl of ['http://169.254.169.254/latest', foreign]) {
      const res = await ingest(json({ originalUrl, filename: 'x.jpg' }), { params: Promise.resolve({ id: g.id }) });
      expect(res.status).toBe(400);
    }
  });

  it('servidor de ficheiros locais nunca serve originais', async () => {
    const g = await createGallery(db, { title: 'A' });
    await storage.put(`galleries/${g.id}/originals/x.jpg`, Buffer.from('o'), 'image/jpeg');
    await storage.put(`galleries/${g.id}/web/x.jpg`, Buffer.from('w'), 'image/jpeg');
    const ctx = (sub: string) => ({ params: Promise.resolve({ key: ['galleries', g.id, sub, 'x.jpg'] }) });
    expect((await getFile(new Request('http://localhost'), ctx('originals'))).status).toBe(404);
    const ok = await getFile(new Request('http://localhost'), ctx('web'));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('w');
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/photos.test.ts tests/photos-api.test.ts`
Expected: FAIL (módulos/rotas em falta).

- [ ] **Step 3: Repositório de fotos e nomes de ficheiro**

`src/lib/photos/repo.ts`:

```ts
import { and, asc, count, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { photos } from '@/db/schema';
import { isUuid } from '@/lib/http';

export type Photo = typeof photos.$inferSelect;
export type NewPhoto = Omit<typeof photos.$inferInsert, 'order'>;

export async function addPhoto(db: Db, values: NewPhoto): Promise<Photo> {
  const [{ n }] = await db.select({ n: count() }).from(photos).where(eq(photos.galleryId, values.galleryId));
  const [row] = await db.insert(photos).values({ ...values, order: Number(n) }).returning();
  return row;
}

export async function listPhotos(db: Db, galleryId: string): Promise<Photo[]> {
  return db.select().from(photos).where(eq(photos.galleryId, galleryId)).orderBy(asc(photos.order), asc(photos.createdAt));
}

export async function getPhoto(db: Db, galleryId: string, photoId: string): Promise<Photo | null> {
  if (!isUuid(photoId) || !isUuid(galleryId)) return null;
  const [row] = await db.select().from(photos).where(and(eq(photos.id, photoId), eq(photos.galleryId, galleryId)));
  return row ?? null;
}

export async function getPhotoById(db: Db, photoId: string): Promise<Photo | null> {
  if (!isUuid(photoId)) return null;
  const [row] = await db.select().from(photos).where(eq(photos.id, photoId));
  return row ?? null;
}

export async function reorderPhotos(db: Db, galleryId: string, ids: string[]): Promise<void> {
  for (const [i, id] of ids.entries()) {
    if (!isUuid(id)) continue;
    await db.update(photos).set({ order: i }).where(and(eq(photos.id, id), eq(photos.galleryId, galleryId)));
  }
}

export async function setPhotoChapter(db: Db, photoId: string, chapterId: string | null): Promise<Photo | null> {
  if (!isUuid(photoId)) return null;
  const [row] = await db.update(photos).set({ chapterId }).where(eq(photos.id, photoId)).returning();
  return row ?? null;
}

export async function deletePhoto(db: Db, photoId: string): Promise<string[]> {
  if (!isUuid(photoId)) return [];
  const [row] = await db.delete(photos).where(eq(photos.id, photoId)).returning();
  return row ? [row.originalUrl, row.webUrl, row.thumbUrl] : [];
}
```

`src/lib/upload/filename.ts`:

```ts
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const ORIGINAL_KEY_RE = new RegExp(`^galleries/(${UUID})/originals/[A-Za-z0-9][A-Za-z0-9._-]*$`, 'i');
export const LOGO_KEY_RE = new RegExp(`^galleries/(${UUID})/logo/[A-Za-z0-9][A-Za-z0-9._-]*$`, 'i');

export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).filter(Boolean).slice(-2).join('-');
  const cleaned = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(-100);
  return cleaned || 'ficheiro';
}
```

Nota sobre `safeFilename('../../etc/passwd')`: `split` dá `['..','..','etc','passwd']`, os dois últimos juntam-se em `etc-passwd`. Para `'Noivos Ínês (1).JPG'` dá `Noivos-Ines-1-.JPG`.

- [ ] **Step 4: Ingestão**

`src/lib/photos/ingest.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { Db } from '@/db/client';
import type { Storage } from '@/lib/storage';
import { InvalidImageError, processImage } from '@/lib/images/process';
import { addPhoto, type Photo } from './repo';

export async function ingestPhoto(
  deps: { db: Db; storage: Storage },
  input: { galleryId: string; originalUrl: string; filename: string },
): Promise<Photo> {
  const { db, storage } = deps;
  const original = await storage.get(input.originalUrl);
  let processed;
  try {
    processed = await processImage(original);
  } catch (err) {
    if (err instanceof InvalidImageError) await storage.delete([input.originalUrl]);
    throw err;
  }
  const id = randomUUID();
  const [webUrl, thumbUrl] = await Promise.all([
    storage.put(`galleries/${input.galleryId}/web/${id}.jpg`, processed.web, 'image/jpeg'),
    storage.put(`galleries/${input.galleryId}/thumb/${id}.jpg`, processed.thumb, 'image/jpeg'),
  ]);
  return addPhoto(db, {
    id,
    galleryId: input.galleryId,
    filename: input.filename.slice(0, 200),
    originalUrl: input.originalUrl,
    webUrl,
    thumbUrl,
    width: processed.width,
    height: processed.height,
    bytes: original.length,
  });
}
```

- [ ] **Step 5: Rotas**

`src/app/api/admin/galleries/[id]/photos/route.ts`:

```ts
import { z } from 'zod';
import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { getGalleryById } from '@/lib/galleries/repo';
import { ingestPhoto } from '@/lib/photos/ingest';
import { InvalidImageError } from '@/lib/images/process';
import { getStorage } from '@/lib/storage';

const bodySchema = z.object({ originalUrl: z.string().min(1).max(2000), filename: z.string().trim().min(1).max(200) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const parsed = await parseJson(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  const storage = getStorage();
  const { originalUrl, filename } = parsed.data;
  const path = decodeURIComponent(new URL(originalUrl, 'http://local').pathname);
  if (!storage.isOwnUrl(originalUrl) || !path.includes(`/galleries/${id}/originals/`)) {
    return Response.json({ error: 'Origem do ficheiro inválida' }, { status: 400 });
  }
  try {
    const photo = await ingestPhoto({ db, storage }, { galleryId: id, originalUrl, filename });
    return Response.json(photo, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidImageError) return Response.json({ error: err.message }, { status: 422 });
    throw err;
  }
}
```

`src/app/api/admin/galleries/[id]/photos/reorder/route.ts`:

```ts
import { z } from 'zod';
import { getDb } from '@/db/client';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { getGalleryById } from '@/lib/galleries/repo';
import { reorderPhotos } from '@/lib/photos/repo';

const bodySchema = z.object({ ids: z.array(z.string().uuid()).max(5000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  if (!(await getGalleryById(db, id))) return notFound();
  const parsed = await parseJson(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  await reorderPhotos(db, id, parsed.data.ids);
  return new Response(null, { status: 204 });
}
```

`src/app/api/admin/photos/[id]/route.ts`:

```ts
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { chapters } from '@/db/schema';
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound, parseJson } from '@/lib/http';
import { getGalleryById, updateGallery } from '@/lib/galleries/repo';
import { deletePhoto, getPhotoById, setPhotoChapter } from '@/lib/photos/repo';
import { getStorage } from '@/lib/storage';

type Ctx = { params: Promise<{ id: string }> };
const patchSchema = z.object({ chapterId: z.string().uuid().nullable() });

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  const photo = await getPhotoById(db, id);
  if (!photo) return notFound();
  const parsed = await parseJson(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { chapterId } = parsed.data;
  if (chapterId) {
    const [c] = await db.select().from(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.galleryId, photo.galleryId)));
    if (!c) return Response.json({ error: 'Capítulo inválido' }, { status: 400 });
  }
  return Response.json(await setPhotoChapter(db, id, chapterId));
}

export async function DELETE(req: Request, { params }: Ctx): Promise<Response> {
  if (!isAdminRequest(req)) return unauthorized();
  const { id } = await params;
  const db = await getDb();
  const photo = await getPhotoById(db, id);
  if (!photo) return notFound();
  const gallery = await getGalleryById(db, photo.galleryId);
  if (gallery?.coverPhotoId === id) await updateGallery(db, gallery.id, { coverPhotoId: null });
  await getStorage().delete(await deletePhoto(db, id));
  return new Response(null, { status: 204 });
}
```

`src/app/api/admin/files/[...key]/route.ts`:

```ts
import { isAdminRequest, unauthorized } from '@/lib/auth/admin';
import { notFound } from '@/lib/http';
import { getStorage, storageDriver } from '@/lib/storage';
import { LOGO_KEY_RE, ORIGINAL_KEY_RE } from '@/lib/upload/filename';

/** Upload direto para o storage local (só em desenvolvimento). */
export async function PUT(req: Request, { params }: { params: Promise<{ key: string[] }> }): Promise<Response> {
  if (storageDriver() !== 'local') return notFound();
  if (!isAdminRequest(req)) return unauthorized();
  const key = (await params).key.join('/');
  if (!ORIGINAL_KEY_RE.test(key) && !LOGO_KEY_RE.test(key)) {
    return Response.json({ error: 'Caminho inválido' }, { status: 400 });
  }
  const body = Buffer.from(await req.arrayBuffer());
  const url = await getStorage().put(key, body, req.headers.get('content-type') ?? 'application/octet-stream');
  return Response.json({ url }, { status: 201 });
}
```

`src/app/api/files/[...key]/route.ts`:

```ts
import path from 'node:path';
import { notFound } from '@/lib/http';
import { isSafeKey } from '@/lib/storage/local';
import { getStorage, storageDriver } from '@/lib/storage';

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

/** Serve versões web, miniaturas e logos do storage local. Nunca originais. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }): Promise<Response> {
  if (storageDriver() !== 'local') return notFound();
  const parts = (await params).key;
  const key = parts.join('/');
  if (!isSafeKey(key) || parts[2] === 'originals') return notFound();
  try {
    const stream = await getStorage().open(`/api/files/${key}`);
    return new Response(stream, {
      headers: {
        'Content-Type': TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return notFound();
  }
}
```

`src/app/api/admin/blob-upload/route.ts`:

```ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAdminRequest } from '@/lib/auth/admin';
import { notFound } from '@/lib/http';
import { storageDriver } from '@/lib/storage';
import { LOGO_KEY_RE, ORIGINAL_KEY_RE } from '@/lib/upload/filename';

/** Emite tokens para o browser enviar originais diretamente para o Vercel Blob (evita o limite de 4,5 MB das funções). */
export async function POST(req: Request): Promise<Response> {
  if (storageDriver() !== 'blob') return notFound();
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // A chamada de conclusão vem dos servidores da Vercel (sem cookie) e é verificada por assinatura pelo handleUpload.
        if (!isAdminRequest(req)) throw new Error('Sessão inválida');
        if (!ORIGINAL_KEY_RE.test(pathname) && !LOGO_KEY_RE.test(pathname)) throw new Error('Caminho inválido');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/svg+xml'],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 6: Correr e ver passar**

Run: `npm test`
Expected: PASS (todos).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: photo ingestion, upload routes and local file serving"
```

---

### Task 6: Fila de upload no browser

**Files:**
- Create: `src/lib/upload/queue.ts`, `src/lib/upload/client.ts`
- Test: `tests/upload-queue.test.ts`

**Interfaces:**
- Consumes: `safeFilename` (Task 5)
- Produces:
  - `class PermanentError extends Error`
  - `type ItemStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'failed'`
  - `interface QueueItem { id: string; name: string; status: ItemStatus; progress: number; error?: string; attempts: number }`
  - `runQueue<F extends { name: string }>(files: F[], deps: QueueDeps<F>, opts?: QueueOptions): Promise<QueueItem[]>` com `QueueDeps<F> = { upload(file: F, onProgress: (pct: number) => void): Promise<string>; ingest(originalUrl: string, file: F): Promise<void> }` e `QueueOptions = { concurrency?: number; maxAttempts?: number; onChange?: (items: QueueItem[]) => void; sleep?: (ms: number) => Promise<void> }`
  - `uploadToStorage(galleryId: string, kind: 'originals' | 'logo', file: File, onProgress?: (pct: number) => void): Promise<string>`

- [ ] **Step 1: Escrever o teste**

`tests/upload-queue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PermanentError, runQueue } from '@/lib/upload/queue';

const noSleep = () => Promise.resolve();
const files = (...names: string[]) => names.map((name) => ({ name }));

describe('runQueue', () => {
  it('conclui todos os ficheiros', async () => {
    const result = await runQueue(files('a', 'b', 'c'), { upload: async (f) => `u/${f.name}`, ingest: async () => {} }, { sleep: noSleep });
    expect(result.map((r) => r.status)).toEqual(['done', 'done', 'done']);
  });

  it('repete falhas temporárias e regista as tentativas', async () => {
    let calls = 0;
    const result = await runQueue(
      files('a'),
      { upload: async () => { if (++calls === 1) throw new Error('rede'); return 'u'; }, ingest: async () => {} },
      { sleep: noSleep },
    );
    expect(result[0]).toMatchObject({ status: 'done', attempts: 2 });
  });

  it('não repete erros permanentes e continua o lote', async () => {
    let ingests = 0;
    const result = await runQueue(
      files('mau.heic', 'bom.jpg'),
      {
        upload: async (f) => f.name,
        ingest: async (url) => { ingests++; if (url === 'mau.heic') throw new PermanentError('Formato HEIC não suportado.'); },
      },
      { sleep: noSleep },
    );
    expect(result[0]).toMatchObject({ status: 'failed', error: 'Formato HEIC não suportado.', attempts: 1 });
    expect(result[1].status).toBe('done');
    expect(ingests).toBe(2);
  });

  it('desiste após maxAttempts', async () => {
    const result = await runQueue(files('a'), { upload: async () => { throw new Error('offline'); }, ingest: async () => {} }, { sleep: noSleep, maxAttempts: 3 });
    expect(result[0]).toMatchObject({ status: 'failed', attempts: 3, error: 'offline' });
  });

  it('respeita a concorrência e emite progresso', async () => {
    let active = 0;
    let peak = 0;
    const snapshots: number[] = [];
    await runQueue(
      files('1', '2', '3', '4', '5'),
      {
        upload: async (_f, onProgress) => {
          active++; peak = Math.max(peak, active);
          onProgress(50);
          await new Promise((r) => setTimeout(r, 5));
          active--;
          return 'u';
        },
        ingest: async () => {},
      },
      { concurrency: 2, sleep: noSleep, onChange: (items) => snapshots.push(items.filter((i) => i.status === 'done').length) },
    );
    expect(peak).toBe(2);
    expect(snapshots.at(-1)).toBe(5);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/upload-queue.test.ts`
Expected: FAIL (módulo em falta).

- [ ] **Step 3: Implementar a fila**

`src/lib/upload/queue.ts`:

```ts
export class PermanentError extends Error {}

export type ItemStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'failed';

export interface QueueItem {
  id: string;
  name: string;
  status: ItemStatus;
  progress: number;
  error?: string;
  attempts: number;
}

export interface QueueDeps<F> {
  upload(file: F, onProgress: (pct: number) => void): Promise<string>;
  ingest(originalUrl: string, file: F): Promise<void>;
}

export interface QueueOptions {
  concurrency?: number;
  maxAttempts?: number;
  onChange?: (items: QueueItem[]) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function runQueue<F extends { name: string }>(files: F[], deps: QueueDeps<F>, opts: QueueOptions = {}): Promise<QueueItem[]> {
  const concurrency = opts.concurrency ?? 3;
  const maxAttempts = opts.maxAttempts ?? 3;
  const sleep = opts.sleep ?? defaultSleep;
  const items: QueueItem[] = files.map((f, i) => ({ id: String(i), name: f.name, status: 'pending', progress: 0, attempts: 0 }));
  const emit = () => opts.onChange?.(items.map((i) => ({ ...i })));
  const update = (i: number, patch: Partial<QueueItem>) => {
    items[i] = { ...items[i], ...patch };
    emit();
  };

  let next = 0;
  async function worker() {
    while (next < files.length) {
      const i = next++;
      for (;;) {
        update(i, { status: 'uploading', progress: 0, attempts: items[i].attempts + 1, error: undefined });
        try {
          const url = await deps.upload(files[i], (pct) => update(i, { progress: Math.round(pct) }));
          update(i, { status: 'processing', progress: 100 });
          await deps.ingest(url, files[i]);
          update(i, { status: 'done' });
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (err instanceof PermanentError || items[i].attempts >= maxAttempts) {
            update(i, { status: 'failed', error: message });
            break;
          }
          await sleep(500 * items[i].attempts);
        }
      }
    }
  }

  emit();
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
  return items;
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm test -- tests/upload-queue.test.ts`
Expected: PASS.

- [ ] **Step 5: Upload a partir do browser**

`src/lib/upload/client.ts`:

```ts
import { safeFilename } from './filename';

/** Envia um ficheiro do browser diretamente para o storage e devolve o URL. */
export async function uploadToStorage(
  galleryId: string,
  kind: 'originals' | 'logo',
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const key = `galleries/${galleryId}/${kind}/${crypto.randomUUID().slice(0, 8)}-${safeFilename(file.name)}`;
  if (process.env.NEXT_PUBLIC_STORAGE === 'blob') {
    const { upload } = await import('@vercel/blob/client');
    const result = await upload(key, file, {
      access: 'public',
      handleUploadUrl: '/api/admin/blob-upload',
      multipart: file.size > 20 * 1024 * 1024,
      onUploadProgress: (e) => onProgress?.(e.percentage),
    });
    return result.url;
  }
  const res = await fetch(`/api/admin/files/${key}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
  if (!res.ok) throw new Error(`O envio falhou (${res.status})`);
  onProgress?.(100);
  return (await res.json()).url as string;
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: resilient browser upload queue"
```

---

### Task 7: Editor da galeria no painel

**Files:**
- Create: `src/lib/favorites/repo.ts`, `src/app/admin/(protected)/galleries/[id]/page.tsx`, `src/components/admin/types.ts`, `src/components/admin/GalleryEditor.tsx`, `src/components/admin/UploadPanel.tsx`, `src/components/admin/PhotoManager.tsx`, `src/components/admin/SettingsForm.tsx`, `src/components/admin/ThemeForm.tsx`, `src/components/admin/SharePanel.tsx`, `src/components/admin/FavoritesPanel.tsx`, `src/components/admin/api.ts`
- Test: `tests/favorites-repo.test.ts`

**Interfaces:**
- Consumes: `getGalleryById` (Task 4), `listChapters` (Task 4), `listPhotos` (Task 5), `runQueue`, `PermanentError`, `uploadToStorage` (Task 6), `PRESETS`, `HEADING_FONTS`, `BODY_FONTS` (Tasks 1–2)
- Produces:
  - `addFavorite(db: Db, v: { galleryId: string; photoId: string; visitorId: string; visitorName: string }): Promise<void>`
  - `removeFavorite(db: Db, v: { photoId: string; visitorId: string }): Promise<void>`
  - `listVisitorFavoriteIds(db: Db, galleryId: string, visitorId: string): Promise<string[]>`
  - `listFavoritePhotos(db: Db, galleryId: string, visitorId: string): Promise<Photo[]>`
  - `listFavoritesByVisitor(db: Db, galleryId: string): Promise<VisitorFavorites[]>` com `VisitorFavorites = { visitorId: string; visitorName: string; photoIds: string[] }`
  - Página `/admin/galleries/[id]` com rótulos usados no E2E: "Adicionar fotos", "N de M concluídas", "Nomes do casal", "Data e local", "Nova palavra-passe", "Remover palavra-passe", "Expira em", "Guardar definições", "Guardado", `data-testid="share-link"`

- [ ] **Step 1: Escrever o teste do repositório de favoritas**

`tests/favorites-repo.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import type { Db } from '@/db/client';
import { photos } from '@/db/schema';
import { createGallery } from '@/lib/galleries/repo';
import { addFavorite, listFavoritePhotos, listFavoritesByVisitor, listVisitorFavoriteIds, removeFavorite } from '@/lib/favorites/repo';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

async function seed() {
  const g = await createGallery(db, { title: 'A' });
  const rows = await db
    .insert(photos)
    .values(['a', 'b'].map((n, i) => ({ galleryId: g.id, filename: `${n}.jpg`, originalUrl: n, webUrl: n, thumbUrl: n, width: 1, height: 1, bytes: 1, order: i })))
    .returning();
  return { g, a: rows[0], b: rows[1] };
}

describe('favoritas', () => {
  it('é idempotente por visitante e separa visitantes', async () => {
    const { g, a, b } = await seed();
    await addFavorite(db, { galleryId: g.id, photoId: a.id, visitorId: 'v1', visitorName: 'Inês' });
    await addFavorite(db, { galleryId: g.id, photoId: a.id, visitorId: 'v1', visitorName: 'Inês' });
    await addFavorite(db, { galleryId: g.id, photoId: b.id, visitorId: 'v1', visitorName: 'Inês' });
    await addFavorite(db, { galleryId: g.id, photoId: a.id, visitorId: 'v2', visitorName: 'Mãe' });
    expect(await listVisitorFavoriteIds(db, g.id, 'v1')).toEqual([a.id, b.id]);
    expect((await listFavoritePhotos(db, g.id, 'v1')).map((p) => p.filename)).toEqual(['a.jpg', 'b.jpg']);
    const byVisitor = await listFavoritesByVisitor(db, g.id);
    expect(byVisitor.map((v) => [v.visitorName, v.photoIds.length])).toEqual([['Inês', 2], ['Mãe', 1]]);
    await removeFavorite(db, { photoId: a.id, visitorId: 'v1' });
    expect(await listVisitorFavoriteIds(db, g.id, 'v1')).toEqual([b.id]);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/favorites-repo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar o repositório de favoritas**

`src/lib/favorites/repo.ts`:

```ts
import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { favorites, photos } from '@/db/schema';
import type { Photo } from '@/lib/photos/repo';

export interface VisitorFavorites {
  visitorId: string;
  visitorName: string;
  photoIds: string[];
}

export async function addFavorite(db: Db, v: { galleryId: string; photoId: string; visitorId: string; visitorName: string }): Promise<void> {
  await db.insert(favorites).values(v).onConflictDoNothing({ target: [favorites.photoId, favorites.visitorId] });
}

export async function removeFavorite(db: Db, v: { photoId: string; visitorId: string }): Promise<void> {
  await db.delete(favorites).where(and(eq(favorites.photoId, v.photoId), eq(favorites.visitorId, v.visitorId)));
}

export async function listFavoritePhotos(db: Db, galleryId: string, visitorId: string): Promise<Photo[]> {
  const rows = await db
    .select({ photo: photos })
    .from(favorites)
    .innerJoin(photos, eq(photos.id, favorites.photoId))
    .where(and(eq(favorites.galleryId, galleryId), eq(favorites.visitorId, visitorId)))
    .orderBy(asc(photos.order), asc(photos.createdAt));
  return rows.map((r) => r.photo);
}

export async function listVisitorFavoriteIds(db: Db, galleryId: string, visitorId: string): Promise<string[]> {
  return (await listFavoritePhotos(db, galleryId, visitorId)).map((p) => p.id);
}

export async function listFavoritesByVisitor(db: Db, galleryId: string): Promise<VisitorFavorites[]> {
  const rows = await db
    .select({ visitorId: favorites.visitorId, visitorName: favorites.visitorName, photoId: favorites.photoId })
    .from(favorites)
    .innerJoin(photos, eq(photos.id, favorites.photoId))
    .where(eq(favorites.galleryId, galleryId))
    .orderBy(asc(favorites.createdAt), asc(photos.order));
  const map = new Map<string, VisitorFavorites>();
  for (const r of rows) {
    const entry = map.get(r.visitorId) ?? { visitorId: r.visitorId, visitorName: r.visitorName, photoIds: [] };
    entry.photoIds.push(r.photoId);
    map.set(r.visitorId, entry);
  }
  return [...map.values()];
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm test -- tests/favorites-repo.test.ts`
Expected: PASS.

- [ ] **Step 5: Tipos e chamadas à API do editor**

`src/components/admin/types.ts`:

```ts
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
```

`src/components/admin/api.ts`:

```ts
export async function api(path: string, method: string, body?: unknown): Promise<Response> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok && res.status !== 422) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Erro ${res.status}`);
  }
  return res;
}
```

- [ ] **Step 6: Página e componente principal**

`src/app/admin/(protected)/galleries/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { getGalleryById } from '@/lib/galleries/repo';
import { listChapters } from '@/lib/galleries/chapters';
import { listPhotos } from '@/lib/photos/repo';
import { listFavoritesByVisitor } from '@/lib/favorites/repo';
import { GalleryEditor } from '@/components/admin/GalleryEditor';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const gallery = await getGalleryById(db, id);
  if (!gallery) notFound();
  const [photoRows, chapterRows, favorites] = await Promise.all([listPhotos(db, id), listChapters(db, id), listFavoritesByVisitor(db, id)]);
  return (
    <GalleryEditor
      gallery={{
        id: gallery.id,
        slug: gallery.slug,
        title: gallery.title,
        subtitle: gallery.subtitle,
        coverPhotoId: gallery.coverPhotoId,
        theme: gallery.theme,
        hasPassword: gallery.passwordHash !== null,
        expiresAt: gallery.expiresAt?.toISOString() ?? null,
      }}
      photos={photoRows.map((p) => ({ id: p.id, filename: p.filename, thumbUrl: p.thumbUrl, chapterId: p.chapterId }))}
      chapters={chapterRows.map((c) => ({ id: c.id, name: c.name }))}
      favorites={favorites}
    />
  );
}
```

`src/components/admin/GalleryEditor.tsx`:

```tsx
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
```

- [ ] **Step 7: Painel de upload**

`src/components/admin/UploadPanel.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { PermanentError, runQueue, type QueueItem } from '@/lib/upload/queue';
import { uploadToStorage } from '@/lib/upload/client';

const LABELS: Record<QueueItem['status'], string> = {
  pending: 'Em espera',
  uploading: 'A enviar',
  processing: 'A processar',
  done: 'Concluída',
  failed: 'Falhou',
};

export function UploadPanel({ galleryId }: { galleryId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [failed, setFailed] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function start(files: File[]) {
    if (files.length === 0 || busy) return;
    setBusy(true);
    const result = await runQueue(
      files,
      {
        upload: (file, onProgress) => uploadToStorage(galleryId, 'originals', file, onProgress),
        ingest: async (originalUrl, file) => {
          const res = await fetch(`/api/admin/galleries/${galleryId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalUrl, filename: file.name }),
          });
          if (res.status === 422 || res.status === 400) throw new PermanentError((await res.json()).error);
          if (!res.ok) throw new Error(`Erro ${res.status}`);
        },
      },
      { onChange: setItems },
    );
    setFailed(files.filter((_, i) => result[i].status === 'failed'));
    setBusy(false);
    router.refresh();
  }

  const done = items.filter((i) => i.status === 'done').length;

  return (
    <section className={styles.panel}>
      <h2>Fotos</h2>
      <div
        className={`${styles.dropzone} ${over ? styles.dropzoneActive : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); start([...e.dataTransfer.files]); }}
      >
        <p>Arrasta as fotos para aqui ou</p>
        <label className={styles.button}>
          Escolher ficheiros
          <input
            aria-label="Adicionar fotos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/tiff"
            hidden
            onChange={(e) => { start([...(e.target.files ?? [])]); e.target.value = ''; }}
          />
        </label>
      </div>
      {items.length > 0 && (
        <>
          <p className={styles.muted}>{done} de {items.length} concluídas</p>
          <ul className={styles.queue}>
            {items.filter((i) => i.status !== 'done').map((i) => (
              <li key={i.id}>
                <span>{i.name}{i.error && <span className={styles.error}> — {i.error}</span>}</span>
                <span>{i.status === 'uploading' ? `${i.progress}%` : LABELS[i.status]}</span>
              </li>
            ))}
          </ul>
          {!busy && failed.length > 0 && (
            <button className={styles.ghost} onClick={() => start(failed)}>Tentar novamente ({failed.length})</button>
          )}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 8: Gestão de fotos e capítulos**

`src/components/admin/PhotoManager.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { api } from './api';
import type { EditorChapter, EditorGallery, EditorPhoto } from './types';

export function PhotoManager({ gallery, photos, chapters }: { gallery: EditorGallery; photos: EditorPhoto[]; chapters: EditorChapter[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState('');

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const move = (index: number, delta: number) =>
    run(() => {
      const ids = photos.map((p) => p.id);
      const [id] = ids.splice(index, 1);
      ids.splice(index + delta, 0, id);
      return api(`/api/admin/galleries/${gallery.id}/photos/reorder`, 'POST', { ids });
    });

  return (
    <section className={styles.panel}>
      <h2>Organização</h2>
      <div className={styles.row} style={{ marginBottom: 12 }}>
        {chapters.map((c) => (
          <span key={c.id} className={styles.row}>
            <strong>{c.name}</strong>
            <button className={styles.ghost} onClick={() => { const name = prompt('Novo nome', c.name); if (name) run(() => api(`/api/admin/chapters/${c.id}`, 'PATCH', { name })); }}>Renomear</button>
            <button className={`${styles.ghost} ${styles.danger}`} onClick={() => run(() => api(`/api/admin/chapters/${c.id}`, 'DELETE'))}>Apagar</button>
          </span>
        ))}
        <form className={styles.row} onSubmit={(e) => { e.preventDefault(); if (newChapter.trim()) run(async () => { await api(`/api/admin/galleries/${gallery.id}/chapters`, 'POST', { name: newChapter }); setNewChapter(''); }); }}>
          <input aria-label="Novo capítulo" placeholder="Novo capítulo (ex.: Cerimónia)" value={newChapter} onChange={(e) => setNewChapter(e.target.value)} />
          <button className={styles.ghost} type="submit">Adicionar capítulo</button>
        </form>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {photos.length === 0 ? (
        <p className={styles.muted}>Ainda não há fotos.</p>
      ) : (
        <div className={styles.photoGrid}>
          {photos.map((p, i) => (
            <figure key={p.id} className={`${styles.photoCard} ${gallery.coverPhotoId === p.id ? styles.cover : ''}`} style={{ margin: 0 }}>
              <img src={p.thumbUrl} alt={p.filename} loading="lazy" />
              <div className={styles.row}>
                <button className={styles.ghost} aria-label="Mover para trás" disabled={i === 0} onClick={() => move(i, -1)}>←</button>
                <button className={styles.ghost} aria-label="Mover para a frente" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>→</button>
                <button className={styles.ghost} onClick={() => run(() => api(`/api/admin/galleries/${gallery.id}`, 'PATCH', { coverPhotoId: p.id }))}>
                  {gallery.coverPhotoId === p.id ? 'Capa ✓' : 'Capa'}
                </button>
              </div>
              <div className={styles.row}>
                {chapters.length > 0 && (
                  <select aria-label="Capítulo" value={p.chapterId ?? ''} onChange={(e) => run(() => api(`/api/admin/photos/${p.id}`, 'PATCH', { chapterId: e.target.value || null }))}>
                    <option value="">Sem capítulo</option>
                    {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <button className={`${styles.ghost} ${styles.danger}`} onClick={() => { if (confirm(`Apagar ${p.filename}?`)) run(() => api(`/api/admin/photos/${p.id}`, 'DELETE')); }}>Apagar</button>
              </div>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 9: Definições, tema, partilha e favoritas**

`src/components/admin/SettingsForm.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { api } from './api';
import type { EditorGallery } from './types';

export function SettingsForm({ gallery }: { gallery: EditorGallery }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      title: form.get('title'),
      subtitle: form.get('subtitle'),
      expiresAt: form.get('expiresAt') ? new Date(`${form.get('expiresAt')}T23:59:59`).toISOString() : null,
    };
    const newPassword = String(form.get('password') ?? '');
    if (form.get('removePassword')) body.password = null;
    else if (newPassword) body.password = newPassword;
    setStatus('A guardar…');
    try {
      await api(`/api/admin/galleries/${gallery.id}`, 'PATCH', body);
      setStatus('Guardado');
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  async function onDelete() {
    if (!confirm(`Apagar a galeria "${gallery.title}" e todas as fotos? Não é possível desfazer.`)) return;
    await api(`/api/admin/galleries/${gallery.id}`, 'DELETE');
    router.push('/admin');
    router.refresh();
  }

  return (
    <section className={styles.panel}>
      <h2>Definições</h2>
      <form onSubmit={onSubmit}>
        <label className={styles.field}>Nomes do casal<input name="title" defaultValue={gallery.title} required maxLength={120} /></label>
        <label className={styles.field}>Data e local<input name="subtitle" defaultValue={gallery.subtitle} maxLength={200} /></label>
        <label className={styles.field}>
          Nova palavra-passe
          <input name="password" type="text" minLength={4} autoComplete="off" placeholder={gallery.hasPassword ? 'Protegida — deixa vazio para manter' : 'Sem palavra-passe'} />
        </label>
        {gallery.hasPassword && (
          <label className={styles.row}><input type="checkbox" name="removePassword" /> Remover palavra-passe</label>
        )}
        <label className={styles.field}>
          Expira em
          <input name="expiresAt" type="date" defaultValue={gallery.expiresAt?.slice(0, 10) ?? ''} />
        </label>
        <div className={styles.row}>
          <button className={styles.button} type="submit">Guardar definições</button>
          {status && <span className={styles.muted}>{status}</span>}
        </div>
      </form>
      <hr style={{ margin: '20px 0', border: 0, borderTop: '1px solid #eee' }} />
      <button className={`${styles.ghost} ${styles.danger}`} onClick={onDelete}>Apagar galeria</button>
    </section>
  );
}
```

`src/components/admin/ThemeForm.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { PRESETS } from '@/lib/theme/presets';
import { BODY_FONTS, HEADING_FONTS, PRESET_IDS, type ThemeColors, type ThemeSettings } from '@/lib/theme/types';
import { themeToCssVars } from '@/lib/theme/css';
import { uploadToStorage } from '@/lib/upload/client';
import { api } from './api';
import type { EditorGallery } from './types';

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  background: 'Fundo',
  surface: 'Superfície',
  text: 'Texto',
  muted: 'Texto secundário',
  accent: 'Destaque',
};

export function ThemeForm({ gallery }: { gallery: EditorGallery }) {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeSettings>(gallery.theme);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setStatus('A guardar…');
    try {
      await api(`/api/admin/galleries/${gallery.id}`, 'PATCH', { theme });
      setStatus('Guardado');
      router.refresh();
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setStatus('A enviar logo…');
    try {
      const url = await uploadToStorage(gallery.id, 'logo', file);
      setTheme((t) => ({ ...t, logoUrl: url }));
      setStatus('Logo pronto — guarda o tema');
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  return (
    <section className={styles.panel}>
      <h2>Tema</h2>
      <label className={styles.field}>
        Estilo
        <select value={theme.preset} onChange={(e) => setTheme({ ...structuredClone(PRESETS[e.target.value as ThemeSettings['preset']]), logoUrl: theme.logoUrl })}>
          {PRESET_IDS.map((id) => <option key={id} value={id}>{id[0].toUpperCase() + id.slice(1)}</option>)}
        </select>
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          Fonte dos títulos
          <select value={theme.headingFont} onChange={(e) => setTheme({ ...theme, headingFont: e.target.value as ThemeSettings['headingFont'] })}>
            {HEADING_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          Fonte do texto
          <select value={theme.bodyFont} onChange={(e) => setTheme({ ...theme, bodyFont: e.target.value as ThemeSettings['bodyFont'] })}>
            {BODY_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.row}>
        {(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map((k) => (
          <label key={k} className={styles.field}>
            {COLOR_LABELS[k]}
            <input type="color" value={theme.colors[k]} onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, [k]: e.target.value.toUpperCase() } })} />
          </label>
        ))}
      </div>
      <div className={styles.row} style={{ marginBottom: 12 }}>
        <label className={styles.ghost}>
          {theme.logoUrl ? 'Trocar logo' : 'Carregar logo'}
          <input type="file" accept="image/png,image/svg+xml,image/webp" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
        </label>
        {theme.logoUrl && <button className={styles.ghost} onClick={() => setTheme({ ...theme, logoUrl: null })}>Remover logo</button>}
      </div>
      <div
        style={{ ...(themeToCssVars(theme) as React.CSSProperties), background: 'var(--bg)', color: 'var(--text)', padding: 24, borderRadius: 8, textAlign: 'center', marginBottom: 12 }}
      >
        {theme.logoUrl && <img src={theme.logoUrl} alt="" style={{ maxHeight: 32, margin: '0 auto 12px' }} />}
        <div style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '2rem' }}>{gallery.title}</div>
        <div style={{ fontFamily: 'var(--font-body)', color: 'var(--muted)', letterSpacing: '.3em', fontSize: '.7rem', textTransform: 'uppercase' }}>{gallery.subtitle}</div>
      </div>
      <div className={styles.row}>
        <button className={styles.button} onClick={save}>Guardar tema</button>
        {status && <span className={styles.muted}>{status}</span>}
      </div>
    </section>
  );
}
```

`src/components/admin/SharePanel.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import styles from '@/app/admin/admin.module.css';

export function SharePanel({ slug }: { slug: string }) {
  const [link, setLink] = useState(`/g/${slug}`);
  const [copied, setCopied] = useState(false);
  useEffect(() => setLink(`${window.location.origin}/g/${slug}`), [slug]);

  return (
    <section className={styles.panel}>
      <h2>Link para o cliente</h2>
      <div className={styles.row}>
        <input data-testid="share-link" readOnly value={link} style={{ flex: 1, minWidth: 0, padding: 9 }} onFocus={(e) => e.target.select()} />
        <button className={styles.button} onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? 'Copiado' : 'Copiar link'}
        </button>
        <a className={styles.ghost} href={link} target="_blank" rel="noreferrer">Abrir</a>
      </div>
    </section>
  );
}
```

`src/components/admin/FavoritesPanel.tsx`:

```tsx
'use client';
import styles from '@/app/admin/admin.module.css';
import type { EditorFavorites, EditorPhoto } from './types';

export function FavoritesPanel({ favorites, photos }: { favorites: EditorFavorites[]; photos: EditorPhoto[] }) {
  const byId = new Map(photos.map((p) => [p.id, p]));
  return (
    <section className={styles.panel}>
      <h2>Favoritas dos clientes</h2>
      {favorites.length === 0 ? (
        <p className={styles.muted}>Ainda ninguém escolheu favoritas.</p>
      ) : (
        favorites.map((v) => {
          const names = v.photoIds.map((id) => byId.get(id)?.filename).filter(Boolean) as string[];
          return (
            <div key={v.visitorId} style={{ marginBottom: 12 }}>
              <div className={styles.row}>
                <strong>{v.visitorName}</strong>
                <span className={styles.muted}>{names.length} fotos</span>
                <button className={styles.ghost} onClick={() => navigator.clipboard.writeText(names.join('\n'))}>Copiar nomes dos ficheiros</button>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
```

- [ ] **Step 10: Verificar manualmente**

Run: `npm run dev`. Em `/admin`, abrir a galeria criada:
- arrastar 3 JPEG e um ficheiro `.txt` renomeado para `.jpg` → 3 concluídas e 1 falha com "não é uma imagem válida"; "Tentar novamente (1)" aparece;
- mover fotos, escolher capa, criar capítulo e atribuir;
- mudar palavra-passe e data → "Guardado";
- mudar preset e cores → pré-visualização muda; "Guardar tema" → "Guardado".
Expected: tudo acima funciona sem erros na consola.

- [ ] **Step 11: Correr todos os testes e commit**

Run: `npm test`
Expected: PASS.

```bash
git add -A
git commit -m "feat: gallery editor (upload, organisation, settings, theme, share, favorites)"
```

---

### Task 8: Controlo de acesso do cliente (palavra-passe, expiração, limite de tentativas)

**Files:**
- Create: `src/lib/access/access.ts`, `src/lib/access/rate-limit.ts`, `src/lib/access/server.ts`, `src/app/api/g/[slug]/unlock/route.ts`
- Test: `tests/access.test.ts`

**Interfaces:**
- Consumes: `Gallery`, `getGalleryBySlug`, `updateGallery`, `createGallery` (Task 4); `sign`, `unsign`, `serializeCookie`, `getCookie`, `verifyPassword`, `clientIp` (Task 2)
- Produces:
  - `type AccessResult = { status: 'ok'; gallery: Gallery } | { status: 'not_found' } | { status: 'expired'; gallery: Gallery } | { status: 'locked'; gallery: Gallery }`
  - `unlockCookieName(galleryId: string): string`, `createUnlockCookie(g: Gallery): string`
  - `evaluateAccess(gallery: Gallery | null, unlockToken: string | undefined, now?: Date): AccessResult`
  - `accessFromRequest(db: Db, req: Request, slug: string): Promise<AccessResult>`
  - `accessErrorResponse(a: Exclude<AccessResult, { status: 'ok' }>): Response`
  - `accessForPage(slug: string): Promise<AccessResult>` (server components)
  - `MAX_ATTEMPTS = 5`, `WINDOW_MS = 15 * 60 * 1000`, `isRateLimited(db, galleryId, ip, now?)`, `recordFailedAttempt(db, galleryId, ip, now?)`
  - API: `POST /api/g/[slug]/unlock` (form `password`) → 303 para `/g/<slug>` (+ cookie) ou `/g/<slug>?error=1` / `?error=limit`

- [ ] **Step 1: Escrever os testes**

`tests/access.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { setDbForTests, type Db } from '@/db/client';
import { createGallery, updateGallery } from '@/lib/galleries/repo';
import { createUnlockCookie, evaluateAccess, unlockCookieName } from '@/lib/access/access';
import { MAX_ATTEMPTS, isRateLimited, recordFailedAttempt } from '@/lib/access/rate-limit';
import { POST as unlock } from '@/app/api/g/[slug]/unlock/route';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  setDbForTests(db);
});
afterEach(() => setDbForTests(null));

const tokenFrom = (setCookie: string) => decodeURIComponent(setCookie.split(';')[0].split('=').slice(1).join('='));

describe('evaluateAccess', () => {
  it('cobre todos os estados', async () => {
    const open = await createGallery(db, { title: 'A' });
    const locked = await createGallery(db, { title: 'B', password: 'amor2026' });
    const expired = await createGallery(db, { title: 'C', expiresAt: new Date('2020-01-01') });
    expect(evaluateAccess(null, undefined).status).toBe('not_found');
    expect(evaluateAccess(open, undefined).status).toBe('ok');
    expect(evaluateAccess(locked, undefined).status).toBe('locked');
    expect(evaluateAccess(locked, tokenFrom(createUnlockCookie(locked))).status).toBe('ok');
    expect(evaluateAccess(expired, undefined).status).toBe('expired');
  });

  it('o cookie de uma galeria não abre outra', async () => {
    const a = await createGallery(db, { title: 'A', password: 'x1234' });
    const b = await createGallery(db, { title: 'B', password: 'x1234' });
    expect(evaluateAccess(b, tokenFrom(createUnlockCookie(a))).status).toBe('locked');
  });

  it('mudar a palavra-passe invalida desbloqueios antigos', async () => {
    const g = await createGallery(db, { title: 'A', password: 'antiga1' });
    const token = tokenFrom(createUnlockCookie(g));
    const updated = (await updateGallery(db, g.id, { password: 'nova1234' }))!;
    expect(evaluateAccess(updated, token).status).toBe('locked');
  });

  it('expiração tem prioridade sobre o desbloqueio', async () => {
    const g = await createGallery(db, { title: 'A', password: 'x1234' });
    const token = tokenFrom(createUnlockCookie(g));
    const expired = (await updateGallery(db, g.id, { expiresAt: new Date(Date.now() - 1000) }))!;
    expect(evaluateAccess(expired, token).status).toBe('expired');
  });
});

describe('POST /api/g/[slug]/unlock', () => {
  const post = (slug: string, password: string, ip = '1.1.1.1') => {
    const body = new FormData();
    body.set('password', password);
    return unlock(new Request(`http://localhost/api/g/${slug}/unlock`, { method: 'POST', body, headers: { 'x-forwarded-for': ip } }), {
      params: Promise.resolve({ slug }),
    });
  };

  it('desbloqueia com a palavra-passe certa', async () => {
    const g = await createGallery(db, { title: 'A', password: 'amor2026' });
    const res = await post(g.slug, 'amor2026');
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`/g/${g.slug}`);
    expect(res.headers.get('set-cookie')).toContain(unlockCookieName(g.id));
  });

  it('erra, e ao fim de 5 tentativas bloqueia esse IP durante 15 minutos', async () => {
    const g = await createGallery(db, { title: 'A', password: 'amor2026' });
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect((await post(g.slug, 'errada')).headers.get('location')).toBe(`/g/${g.slug}?error=1`);
    }
    const blocked = await post(g.slug, 'amor2026');
    expect(blocked.headers.get('location')).toBe(`/g/${g.slug}?error=limit`);
    expect(blocked.headers.get('set-cookie')).toBeNull();
    expect((await post(g.slug, 'amor2026', '2.2.2.2')).headers.get('set-cookie')).not.toBeNull();
  });

  it('a janela de tempo expira', async () => {
    const g = await createGallery(db, { title: 'A', password: 'x1234' });
    const old = new Date(Date.now() - 16 * 60 * 1000);
    for (let i = 0; i < MAX_ATTEMPTS; i++) await recordFailedAttempt(db, g.id, '9.9.9.9', old);
    expect(await isRateLimited(db, g.id, '9.9.9.9')).toBe(false);
  });

  it('galeria inexistente devolve 404', async () => {
    expect((await post('nao-existe', 'x')).status).toBe(404);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/access.test.ts`
Expected: FAIL (módulos em falta).

- [ ] **Step 3: Implementar**

`src/lib/access/access.ts`:

```ts
import type { Db } from '@/db/client';
import { getGalleryBySlug, type Gallery } from '@/lib/galleries/repo';
import { sign, unsign } from '@/lib/security/sign';
import { getCookie, serializeCookie } from '@/lib/security/cookies';

const TTL = 60 * 60 * 24 * 30;

export type AccessResult =
  | { status: 'ok'; gallery: Gallery }
  | { status: 'not_found' }
  | { status: 'expired'; gallery: Gallery }
  | { status: 'locked'; gallery: Gallery };

export function unlockCookieName(galleryId: string): string {
  return `g_${galleryId.replace(/-/g, '')}`;
}

/** Inclui um fragmento do hash: mudar a palavra-passe invalida desbloqueios antigos. */
function unlockValue(g: Gallery): string {
  return `${g.id}:${(g.passwordHash ?? '').slice(-16)}`;
}

export function createUnlockCookie(g: Gallery): string {
  return serializeCookie(unlockCookieName(g.id), sign(unlockValue(g), TTL), { maxAge: TTL });
}

export function evaluateAccess(gallery: Gallery | null, unlockToken: string | undefined, now = new Date()): AccessResult {
  if (!gallery) return { status: 'not_found' };
  if (gallery.expiresAt && gallery.expiresAt <= now) return { status: 'expired', gallery };
  if (gallery.passwordHash && unsign(unlockToken, now.getTime()) !== unlockValue(gallery)) return { status: 'locked', gallery };
  return { status: 'ok', gallery };
}

export async function accessFromRequest(db: Db, req: Request, slug: string): Promise<AccessResult> {
  const gallery = await getGalleryBySlug(db, slug);
  return evaluateAccess(gallery, gallery ? getCookie(req, unlockCookieName(gallery.id)) : undefined);
}

export function accessErrorResponse(a: Exclude<AccessResult, { status: 'ok' }>): Response {
  switch (a.status) {
    case 'not_found':
      return Response.json({ error: 'Galeria não encontrada' }, { status: 404 });
    case 'expired':
      return Response.json({ error: 'Esta galeria expirou' }, { status: 410 });
    case 'locked':
      return Response.json({ error: 'Galeria protegida por palavra-passe', code: 'locked' }, { status: 401 });
  }
}
```

`src/lib/access/rate-limit.ts`:

```ts
import { and, count, eq, gt } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { unlockAttempts } from '@/db/schema';

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export async function isRateLimited(db: Db, galleryId: string, ip: string, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const [row] = await db
    .select({ n: count() })
    .from(unlockAttempts)
    .where(and(eq(unlockAttempts.galleryId, galleryId), eq(unlockAttempts.ip, ip), gt(unlockAttempts.createdAt, since)));
  return Number(row?.n ?? 0) >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(db: Db, galleryId: string, ip: string, now = new Date()): Promise<void> {
  await db.insert(unlockAttempts).values({ galleryId, ip, createdAt: now });
}
```

`src/lib/access/server.ts`:

```ts
import { cookies } from 'next/headers';
import { getDb } from '@/db/client';
import { getGalleryBySlug } from '@/lib/galleries/repo';
import { evaluateAccess, unlockCookieName, type AccessResult } from './access';

export async function accessForPage(slug: string): Promise<AccessResult> {
  const gallery = await getGalleryBySlug(await getDb(), slug);
  const jar = await cookies();
  return evaluateAccess(gallery, gallery ? jar.get(unlockCookieName(gallery.id))?.value : undefined);
}
```

`src/app/api/g/[slug]/unlock/route.ts`:

```ts
import { getDb } from '@/db/client';
import { getGalleryBySlug } from '@/lib/galleries/repo';
import { verifyPassword } from '@/lib/security/password';
import { clientIp, notFound } from '@/lib/http';
import { createUnlockCookie } from '@/lib/access/access';
import { isRateLimited, recordFailedAttempt } from '@/lib/access/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const db = await getDb();
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery) return notFound('Galeria não encontrada');
  const back = (query: string, cookie?: string) =>
    new Response(null, { status: 303, headers: { Location: `/g/${gallery.slug}${query}`, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
  if (!gallery.passwordHash) return back('');

  const ip = clientIp(req);
  if (await isRateLimited(db, gallery.id, ip)) return back('?error=limit');
  const password = String((await req.formData()).get('password') ?? '');
  if (!(await verifyPassword(password, gallery.passwordHash))) {
    await recordFailedAttempt(db, gallery.id, ip);
    return back('?error=1');
  }
  return back('', createUnlockCookie(gallery));
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: client gallery access control with unlock rate limiting"
```

---

### Task 9: Galeria do cliente — capa, grelha, lightbox, páginas de estado

**Files:**
- Create: `src/lib/gallery/layout.ts`, `src/app/g/[slug]/page.tsx`, `src/app/g/[slug]/not-found.tsx`, `src/components/gallery/types.ts`, `src/components/gallery/ThemedShell.tsx`, `src/components/gallery/Cover.tsx`, `src/components/gallery/Cover.module.css`, `src/components/gallery/GalleryMessage.tsx`, `src/components/gallery/UnlockForm.tsx`, `src/components/gallery/Gallery.module.css`, `src/components/gallery/GalleryView.tsx`, `src/components/gallery/PhotoGrid.tsx`, `src/components/gallery/Lightbox.tsx`
- Test: `tests/layout.test.ts`

**Interfaces:**
- Consumes: `accessForPage` (Task 8), `listPhotos` (Task 5), `listChapters` (Task 4), `themeToCssVars` (Task 2), `BRAND_NAME` (Task 2)
- Produces:
  - `justifiedRows(items: LayoutItem[], containerWidth: number, targetHeight: number, gap: number): Row[]` com `LayoutItem = { id: string; width: number; height: number }`, `Row = { height: number; items: { id: string; width: number; height: number }[] }`
  - `groupByChapter<T extends { chapterId: string | null }>(photos: T[], chapters: { id: string; name: string }[]): { id: string | null; name: string | null; photos: T[] }[]`
  - `ClientPhoto = { id: string; thumbUrl: string; webUrl: string; width: number; height: number; chapterId: string | null }`
  - `GalleryView` props: `{ slug: string; title: string; photos: ClientPhoto[]; chapters: { id: string; name: string }[]; initialFavoriteIds: string[]; initialVisitorName: string | null }` (favoritas e downloads ligam-se na Task 10/11; nesta task o coração e o botão de download já existem na UI)
  - Rótulos usados no E2E: link "Ver galeria", botões "Abrir foto N", diálogo `aria-label="Foto"` com botões "Adicionar às favoritas"/"Remover das favoritas", link "Descarregar foto", botão "Fechar"; formulário de desbloqueio com campo "Palavra-passe", botão "Entrar", mensagens "Palavra-passe incorreta." e "Demasiadas tentativas. Tenta daqui a 15 minutos."

- [ ] **Step 1: Escrever o teste do layout**

`tests/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { groupByChapter, justifiedRows } from '@/lib/gallery/layout';

const item = (id: string, w: number, h: number) => ({ id, width: w, height: h });

describe('justifiedRows', () => {
  it('preenche a largura nas linhas completas sem cortar (mantém proporções)', () => {
    const items = [item('a', 3, 2), item('b', 2, 3), item('c', 3, 2), item('d', 3, 2), item('e', 1, 1)];
    const rows = justifiedRows(items, 1000, 300, 8);
    for (const row of rows.slice(0, -1)) {
      const total = row.items.reduce((s, i) => s + i.width, 0) + 8 * (row.items.length - 1);
      expect(Math.abs(total - 1000)).toBeLessThan(0.5);
    }
    for (const row of rows) for (const placed of row.items) {
      const original = items.find((i) => i.id === placed.id)!;
      expect(placed.width / placed.height).toBeCloseTo(original.width / original.height, 5);
    }
  });

  it('a última linha não é esticada', () => {
    const rows = justifiedRows([item('a', 3, 2), item('b', 3, 2), item('c', 1, 1)], 1000, 300, 8);
    expect(rows.at(-1)!.height).toBe(300);
  });

  it('em ecrã estreito cabe tudo e mantém a ordem', () => {
    const items = Array.from({ length: 7 }, (_, i) => item(String(i), i % 2 ? 2 : 3, i % 2 ? 3 : 2));
    const rows = justifiedRows(items, 343, 180, 4);
    expect(rows.flatMap((r) => r.items.map((i) => i.id))).toEqual(items.map((i) => i.id));
    for (const row of rows) expect(row.items.reduce((s, i) => s + i.width, 0)).toBeLessThanOrEqual(343);
  });

  it('lista vazia dá zero linhas', () => {
    expect(justifiedRows([], 1000, 300, 8)).toEqual([]);
  });
});

describe('groupByChapter', () => {
  it('fotos sem capítulo primeiro, depois por ordem dos capítulos, sem secções vazias', () => {
    const photos = [
      { id: '1', chapterId: 'c2' },
      { id: '2', chapterId: null },
      { id: '3', chapterId: 'c1' },
      { id: '4', chapterId: 'apagado' },
    ];
    const chapters = [{ id: 'c1', name: 'Cerimónia' }, { id: 'c2', name: 'Festa' }, { id: 'c3', name: 'Vazio' }];
    expect(groupByChapter(photos, chapters).map((s) => [s.name, s.photos.map((p) => p.id)])).toEqual([
      [null, ['2', '4']],
      ['Cerimónia', ['3']],
      ['Festa', ['1']],
    ]);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar o layout**

`src/lib/gallery/layout.ts`:

```ts
export interface LayoutItem {
  id: string;
  width: number;
  height: number;
}

export interface Row {
  height: number;
  items: LayoutItem[];
}

function place(items: LayoutItem[], height: number): Row {
  return { height, items: items.map((i) => ({ id: i.id, width: (i.width / i.height) * height, height })) };
}

/** Grelha justificada: cada linha ocupa a largura toda, sem cortar fotos. */
export function justifiedRows(items: LayoutItem[], containerWidth: number, targetHeight: number, gap: number): Row[] {
  const rows: Row[] = [];
  let current: LayoutItem[] = [];
  let aspectSum = 0;
  for (const item of items) {
    current.push(item);
    aspectSum += item.width / item.height;
    if (aspectSum * targetHeight + gap * (current.length - 1) >= containerWidth) {
      rows.push(place(current, (containerWidth - gap * (current.length - 1)) / aspectSum));
      current = [];
      aspectSum = 0;
    }
  }
  if (current.length) rows.push(place(current, targetHeight));
  return rows;
}

export function groupByChapter<T extends { chapterId: string | null }>(
  photos: T[],
  chapters: { id: string; name: string }[],
): { id: string | null; name: string | null; photos: T[] }[] {
  const known = new Set(chapters.map((c) => c.id));
  const sections = [
    { id: null, name: null, photos: photos.filter((p) => !p.chapterId || !known.has(p.chapterId)) },
    ...chapters.map((c) => ({ id: c.id, name: c.name, photos: photos.filter((p) => p.chapterId === c.id) })),
  ];
  return sections.filter((s) => s.photos.length > 0);
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm test -- tests/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Componentes de estado (shell, mensagem, desbloqueio)**

`src/components/gallery/types.ts`:

```ts
export interface ClientPhoto {
  id: string;
  thumbUrl: string;
  webUrl: string;
  width: number;
  height: number;
  chapterId: string | null;
}
```

`src/components/gallery/ThemedShell.tsx`:

```tsx
export function ThemedShell({ vars, children }: { vars: Record<string, string>; children: React.ReactNode }) {
  return (
    <div style={{ ...(vars as React.CSSProperties), background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', minHeight: '100svh' }}>
      {children}
    </div>
  );
}
```

`src/components/gallery/GalleryMessage.tsx`:

```tsx
import styles from './Gallery.module.css';

export function GalleryMessage({ logoUrl, brand, title, message, children }: {
  logoUrl: string | null;
  brand: string;
  title: string | null;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <main className={styles.message}>
      {logoUrl ? <img src={logoUrl} alt={brand} className={styles.messageLogo} /> : <p className={styles.messageBrand}>{brand}</p>}
      {title && <p className={styles.messageTitle}>{title}</p>}
      <p className={styles.messageText}>{message}</p>
      {children}
    </main>
  );
}
```

`src/components/gallery/UnlockForm.tsx`:

```tsx
import styles from './Gallery.module.css';
import { GalleryMessage } from './GalleryMessage';

const ERRORS: Record<string, string> = {
  '1': 'Palavra-passe incorreta.',
  limit: 'Demasiadas tentativas. Tenta daqui a 15 minutos.',
};

export function UnlockForm({ slug, title, logoUrl, brand, error }: { slug: string; title: string; logoUrl: string | null; brand: string; error?: string }) {
  return (
    <GalleryMessage logoUrl={logoUrl} brand={brand} title={title} message="Esta galeria é privada.">
      <form method="post" action={`/api/g/${slug}/unlock`} className={styles.unlock}>
        <label className={styles.unlockField}>
          Palavra-passe
          <input type="password" name="password" required autoFocus autoComplete="current-password" />
        </label>
        {error && ERRORS[error] && <p role="alert" className={styles.unlockError}>{ERRORS[error]}</p>}
        <button type="submit" className={styles.primary}>Entrar</button>
      </form>
    </GalleryMessage>
  );
}
```

- [ ] **Step 6: Estilos da galeria**

`src/components/gallery/Cover.module.css`:

```css
.cover { position: relative; height: 100svh; overflow: hidden; background: #111; color: #fff; }
.image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; animation: kenburns 20s ease-out forwards; }
@keyframes kenburns { from { transform: scale(1.08); } to { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .image { animation: none; } }
.shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,.28), rgba(0,0,0,.04) 40%, rgba(0,0,0,.5)); }
.logo { position: absolute; top: 28px; left: 50%; transform: translateX(-50%); max-height: 40px; max-width: 60vw; }
.brand { position: absolute; top: 28px; left: 0; right: 0; text-align: center; font-family: var(--font-heading); font-style: italic; font-size: 1.25rem; }
.content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 0 16px 12svh; text-align: center; }
.title { font-family: var(--font-heading); font-style: italic; font-weight: 300; font-size: clamp(2.5rem, 10vw, 6.5rem); line-height: 1; margin: 0; overflow-wrap: anywhere; }
.subtitle { text-transform: uppercase; letter-spacing: .32em; font-size: .72rem; margin: 1.25rem 0 0; }
.enter { margin-top: 2.5rem; color: inherit; text-decoration: none; text-transform: uppercase; letter-spacing: .28em; font-size: .72rem; padding-bottom: 6px; border-bottom: 1px solid currentColor; }
```

`src/components/gallery/Gallery.module.css`:

```css
.toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid color-mix(in srgb, var(--text) 10%, transparent); }
.toolbarTitle { font-family: var(--font-heading); font-style: italic; font-size: 1.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.toolbarActions { display: flex; gap: 8px; flex-shrink: 0; }
.chip { background: transparent; color: var(--text); border: 1px solid color-mix(in srgb, var(--text) 25%, transparent); border-radius: 999px; padding: 7px 14px; font-size: .8rem; letter-spacing: .04em; cursor: pointer; }
.chip[aria-pressed="true"] { background: var(--text); color: var(--bg); }
.content { max-width: 1600px; margin: 0 auto; padding: 24px 16px 96px; }
.chapterTitle { font-family: var(--font-heading); font-style: italic; font-weight: 300; font-size: 2rem; text-align: center; margin: 48px 0 24px; }
.row { display: flex; margin-bottom: 8px; }
.tile { position: relative; padding: 0; border: 0; background: var(--surface); cursor: zoom-in; overflow: hidden; }
.tile img { width: 100%; height: 100%; object-fit: cover; transition: opacity .4s; }
.heart { position: absolute; right: 6px; bottom: 6px; width: 34px; height: 34px; border-radius: 50%; border: 0; background: rgba(0,0,0,.35); color: #fff; font-size: 1rem; cursor: pointer; opacity: 0; transition: opacity .2s; }
.tile:hover .heart, .heart[aria-pressed="true"] { opacity: 1; }
@media (hover: none) { .heart { opacity: 1; } }
.empty { text-align: center; color: var(--muted); padding: 64px 0; }
.lightbox { position: fixed; inset: 0; z-index: 50; background: rgba(10,10,10,.96); display: flex; align-items: center; justify-content: center; touch-action: pan-y; }
.lightboxImage { max-width: 100vw; max-height: calc(100svh - 72px); object-fit: contain; user-select: none; }
.lightboxBar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 14px 16px; color: #eee; font-size: .85rem; }
.lightboxBar a, .lightboxBar button { color: #eee; background: transparent; border: 1px solid rgba(255,255,255,.3); border-radius: 999px; padding: 7px 14px; text-decoration: none; cursor: pointer; font-size: .8rem; }
.nav { position: absolute; top: 50%; transform: translateY(-50%); background: transparent; border: 0; color: #eee; font-size: 2.5rem; padding: 16px; cursor: pointer; }
.nav:disabled { opacity: .2; }
.prev { left: 0; }
.next { right: 0; }
@media (max-width: 600px) { .nav { display: none; } }
.message { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px 16px; }
.messageLogo { max-height: 44px; margin-bottom: 32px; }
.messageBrand { font-family: var(--font-heading); font-style: italic; font-size: 1.5rem; margin: 0 0 32px; }
.messageTitle { font-family: var(--font-heading); font-style: italic; font-weight: 300; font-size: clamp(2rem, 8vw, 3.5rem); margin: 0; }
.messageText { color: var(--muted); letter-spacing: .04em; margin: 16px 0 0; }
.unlock { display: grid; gap: 12px; width: 100%; max-width: 320px; margin-top: 32px; }
.unlockField { display: grid; gap: 6px; text-align: left; font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.unlockField input { padding: 12px; border: 1px solid color-mix(in srgb, var(--text) 25%, transparent); background: transparent; color: var(--text); border-radius: 4px; }
.unlockError { color: #b3372b; margin: 0; font-size: .9rem; }
.primary { padding: 12px 18px; background: var(--text); color: var(--bg); border: 0; border-radius: 4px; letter-spacing: .12em; text-transform: uppercase; font-size: .75rem; cursor: pointer; }
.dialogBackdrop { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.5); display: grid; place-items: center; padding: 16px; }
.dialog { background: var(--bg); color: var(--text); padding: 24px; border-radius: 8px; width: 100%; max-width: 360px; display: grid; gap: 12px; }
.downloads { border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent); margin-top: 64px; padding-top: 32px; text-align: center; }
.downloads ul { list-style: none; padding: 0; display: grid; gap: 8px; justify-content: center; }
```

- [ ] **Step 7: Capa, grelha e lightbox**

`src/components/gallery/Cover.tsx`:

```tsx
import styles from './Cover.module.css';

export function Cover({ title, subtitle, imageUrl, logoUrl, brand }: { title: string; subtitle: string; imageUrl: string | null; logoUrl: string | null; brand: string }) {
  return (
    <header className={styles.cover}>
      {imageUrl && <img className={styles.image} src={imageUrl} alt="" fetchPriority="high" />}
      <div className={styles.shade} />
      {logoUrl ? <img className={styles.logo} src={logoUrl} alt={brand} /> : <div className={styles.brand}>{brand}</div>}
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <a className={styles.enter} href="#galeria">Ver galeria</a>
      </div>
    </header>
  );
}
```

`src/components/gallery/PhotoGrid.tsx`:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { justifiedRows } from '@/lib/gallery/layout';
import styles from './Gallery.module.css';
import type { ClientPhoto } from './types';

const GAP = 8;

export function PhotoGrid({ photos, startIndex, favoriteIds, onOpen, onToggleFavorite }: {
  photos: ClientPhoto[];
  startIndex: number;
  favoriteIds: Set<string>;
  onOpen: (index: number) => void;
  onToggleFavorite: (photoId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const target = width < 600 ? 180 : 300;
  const rows = width ? justifiedRows(photos, width, target, GAP) : [];
  const indexOf = new Map(photos.map((p, i) => [p.id, i]));
  const byId = new Map(photos.map((p) => [p.id, p]));

  return (
    <div ref={ref}>
      {rows.map((row, r) => (
        <div key={r} className={styles.row} style={{ gap: GAP, height: Math.floor(row.height) }}>
          {row.items.map((placed) => {
            const photo = byId.get(placed.id)!;
            const i = startIndex + indexOf.get(placed.id)!;
            const fav = favoriteIds.has(photo.id);
            return (
              <div key={photo.id} className={styles.tile} style={{ width: Math.floor(placed.width), flexShrink: 0 }}>
                <button aria-label={`Abrir foto ${i + 1}`} onClick={() => onOpen(i)} style={{ all: 'unset', display: 'block', width: '100%', height: '100%', cursor: 'zoom-in' }}>
                  <img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" />
                </button>
                <button className={styles.heart} aria-label={fav ? 'Remover das favoritas' : 'Adicionar às favoritas'} aria-pressed={fav} onClick={() => onToggleFavorite(photo.id)}>
                  {fav ? '♥' : '♡'}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

`src/components/gallery/Lightbox.tsx`:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import styles from './Gallery.module.css';
import type { ClientPhoto } from './types';

export function Lightbox({ slug, photos, index, favoriteIds, onToggleFavorite, onNavigate, onClose }: {
  slug: string;
  photos: ClientPhoto[];
  index: number;
  favoriteIds: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  onNavigate: (delta: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate(1);
      if (e.key === 'ArrowLeft') onNavigate(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onNavigate]);

  const fav = favoriteIds.has(photo.id);
  const neighbours = [photos[index - 1], photos[index + 1]].filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      className={styles.lightbox}
      onPointerDown={(e) => { startX.current = e.clientX; }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 50) onNavigate(dx < 0 ? 1 : -1);
      }}
    >
      <img key={photo.id} className={styles.lightboxImage} src={photo.webUrl} alt="" draggable={false} />
      {neighbours.map((p) => <link key={p.id} rel="prefetch" as="image" href={p.webUrl} />)}
      <button className={`${styles.nav} ${styles.prev}`} aria-label="Foto anterior" disabled={index === 0} onClick={() => onNavigate(-1)}>‹</button>
      <button className={`${styles.nav} ${styles.next}`} aria-label="Foto seguinte" disabled={index === photos.length - 1} onClick={() => onNavigate(1)}>›</button>
      <div className={styles.lightboxBar}>
        <span>{index + 1} / {photos.length}</span>
        <button aria-label={fav ? 'Remover das favoritas' : 'Adicionar às favoritas'} aria-pressed={fav} onClick={() => onToggleFavorite(photo.id)}>{fav ? '♥' : '♡'}</button>
        <a href={`/api/g/${slug}/photos/${photo.id}/download`} download>Descarregar foto</a>
        <button onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Vista da galeria (estado das favoritas fica local nesta task)**

`src/components/gallery/GalleryView.tsx`:

```tsx
'use client';
import { useCallback, useMemo, useState } from 'react';
import { groupByChapter } from '@/lib/gallery/layout';
import styles from './Gallery.module.css';
import { PhotoGrid } from './PhotoGrid';
import { Lightbox } from './Lightbox';
import type { ClientPhoto } from './types';

export interface GalleryViewProps {
  slug: string;
  title: string;
  photos: ClientPhoto[];
  chapters: { id: string; name: string }[];
  initialFavoriteIds: string[];
  initialVisitorName: string | null;
}

export function GalleryView({ slug, title, photos, chapters, initialFavoriteIds }: GalleryViewProps) {
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(initialFavoriteIds));
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = onlyFavorites ? photos.filter((p) => favoriteIds.has(p.id)) : photos;
  const sections = useMemo(() => groupByChapter(visible, chapters), [visible, chapters]);
  const ordered = useMemo(() => sections.flatMap((s) => s.photos), [sections]);

  const toggleFavorite = useCallback((photoId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }, []);

  const navigate = useCallback(
    (delta: number) => setOpenIndex((i) => (i === null ? i : Math.min(Math.max(i + delta, 0), ordered.length - 1))),
    [ordered.length],
  );
  const close = useCallback(() => setOpenIndex(null), []);

  let offset = 0;
  return (
    <>
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>{title}</span>
        <div className={styles.toolbarActions}>
          <button className={styles.chip} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites((v) => !v)}>
            Favoritas ({favoriteIds.size})
          </button>
        </div>
      </div>
      <section id="galeria" className={styles.content}>
        {ordered.length === 0 && <p className={styles.empty}>{onlyFavorites ? 'Ainda não escolheste favoritas.' : 'As fotos estão a caminho.'}</p>}
        {sections.map((section) => {
          const start = offset;
          offset += section.photos.length;
          return (
            <div key={section.id ?? 'sem-capitulo'}>
              {section.name && <h2 className={styles.chapterTitle}>{section.name}</h2>}
              <PhotoGrid photos={section.photos} startIndex={start} favoriteIds={favoriteIds} onOpen={setOpenIndex} onToggleFavorite={toggleFavorite} />
            </div>
          );
        })}
      </section>
      {openIndex !== null && ordered[openIndex] && (
        <Lightbox slug={slug} photos={ordered} index={openIndex} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} onNavigate={navigate} onClose={close} />
      )}
    </>
  );
}
```

Nota: o `startIndex` de cada `PhotoGrid` é a posição da secção em `ordered`; dentro do `PhotoGrid` o índice global é `startIndex + posição na secção`.

- [ ] **Step 9: Página e "não encontrada"**

`src/app/g/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { accessForPage } from '@/lib/access/server';
import { listPhotos } from '@/lib/photos/repo';
import { listChapters } from '@/lib/galleries/chapters';
import { themeToCssVars } from '@/lib/theme/css';
import { BRAND_NAME } from '@/lib/brand';
import { VISITOR_COOKIE, readVisitor } from '@/lib/favorites/visitor';
import { listVisitorFavoriteIds } from '@/lib/favorites/repo';
import { ThemedShell } from '@/components/gallery/ThemedShell';
import { Cover } from '@/components/gallery/Cover';
import { GalleryMessage } from '@/components/gallery/GalleryMessage';
import { UnlockForm } from '@/components/gallery/UnlockForm';
import { GalleryView } from '@/components/gallery/GalleryView';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const access = await accessForPage((await params).slug);
  return {
    title: access.status === 'not_found' ? BRAND_NAME : `${access.gallery.title} · ${BRAND_NAME}`,
    robots: { index: false, follow: false },
  };
}

export default async function GalleryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const access = await accessForPage(slug);
  if (access.status === 'not_found') notFound();
  const { gallery } = access;
  const vars = themeToCssVars(gallery.theme);
  const logoUrl = gallery.theme.logoUrl;

  if (access.status === 'expired') {
    return (
      <ThemedShell vars={vars}>
        <GalleryMessage logoUrl={logoUrl} brand={BRAND_NAME} title={gallery.title} message="Esta galeria expirou. Contacta-nos para voltar a ter acesso." />
      </ThemedShell>
    );
  }
  if (access.status === 'locked') {
    return (
      <ThemedShell vars={vars}>
        <UnlockForm slug={gallery.slug} title={gallery.title} logoUrl={logoUrl} brand={BRAND_NAME} error={error} />
      </ThemedShell>
    );
  }

  const db = await getDb();
  const [photoRows, chapterRows] = await Promise.all([listPhotos(db, gallery.id), listChapters(db, gallery.id)]);
  const visitor = readVisitor((await cookies()).get(VISITOR_COOKIE)?.value);
  const favoriteIds = visitor ? await listVisitorFavoriteIds(db, gallery.id, visitor.id) : [];
  const cover = photoRows.find((p) => p.id === gallery.coverPhotoId) ?? photoRows[0] ?? null;

  return (
    <ThemedShell vars={vars}>
      <Cover title={gallery.title} subtitle={gallery.subtitle} imageUrl={cover?.webUrl ?? null} logoUrl={logoUrl} brand={BRAND_NAME} />
      <GalleryView
        slug={gallery.slug}
        title={gallery.title}
        photos={photoRows.map((p) => ({ id: p.id, thumbUrl: p.thumbUrl, webUrl: p.webUrl, width: p.width, height: p.height, chapterId: p.chapterId }))}
        chapters={chapterRows.map((c) => ({ id: c.id, name: c.name }))}
        initialFavoriteIds={favoriteIds}
        initialVisitorName={visitor?.name ?? null}
      />
    </ThemedShell>
  );
}
```

Esta página importa `@/lib/favorites/visitor` (Task 10). Cria já esse ficheiro com o conteúdo completo da Task 10, Step 3, para a página compilar; a Task 10 acrescenta os testes dele.

`src/app/g/[slug]/not-found.tsx`:

```tsx
import { BRAND_NAME } from '@/lib/brand';
import { themeFromPreset } from '@/lib/theme/presets';
import { themeToCssVars } from '@/lib/theme/css';
import { ThemedShell } from '@/components/gallery/ThemedShell';
import { GalleryMessage } from '@/components/gallery/GalleryMessage';

export default function GalleryNotFound() {
  return (
    <ThemedShell vars={themeToCssVars(themeFromPreset('marfim'))}>
      <GalleryMessage logoUrl={null} brand={BRAND_NAME} title={null} message="Não encontrámos esta galeria. Confirma o link que recebeste." />
    </ThemedShell>
  );
}
```

- [ ] **Step 10: Verificar manualmente**

Run: `npm run dev`. Abrir o link da galeria (painel → "Abrir"):
- capa em ecrã inteiro com zoom lento, nomes em itálico, "Ver galeria" desce até à grelha;
- grelha sem cortes, linhas completas, última linha natural; DevTools a 375px: sem scroll horizontal;
- lightbox: setas, Escape, swipe (modo telemóvel nas DevTools);
- com palavra-passe: formulário, erro "Palavra-passe incorreta.", desbloqueio funciona;
- `/g/nao-existe` mostra a página com a marca.
Expected: tudo acima confirmado.

- [ ] **Step 11: Correr os testes e commit**

Run: `npm test`
Expected: PASS.

```bash
git add -A
git commit -m "feat: client gallery cover, justified grid, lightbox and status pages"
```

---

### Task 10: Favoritas do cliente

**Files:**
- Create: `src/lib/favorites/visitor.ts` (se ainda não existir da Task 9), `src/app/api/g/[slug]/visitor/route.ts`, `src/app/api/g/[slug]/favorites/[photoId]/route.ts`, `src/components/gallery/NameDialog.tsx`
- Modify: `src/components/gallery/GalleryView.tsx`
- Test: `tests/favorites-api.test.ts`

**Interfaces:**
- Consumes: `accessFromRequest`, `accessErrorResponse`, `createUnlockCookie` (Task 8); `addFavorite`, `removeFavorite` (Task 7); `getPhoto` (Task 5); `sign`, `unsign`, `serializeCookie`, `getCookie`, `parseJson` (Task 2)
- Produces:
  - `VISITOR_COOKIE = 'visitor'`, `interface Visitor { id: string; name: string }`, `createVisitorCookie(name: string): { cookie: string; visitor: Visitor }`, `readVisitor(token: string | undefined): Visitor | null`
  - API: `POST /api/g/[slug]/visitor` `{ name }` → 200 + cookie; `PUT|DELETE /api/g/[slug]/favorites/[photoId]` → `{ favorited: boolean }` | 401 `{ code: 'visitor_required' }` | 401 `{ code: 'locked' }` | 410 | 404
  - Diálogo `aria-label="Identificação"` com campo "O teu nome" e botão "Continuar"

- [ ] **Step 1: Escrever os testes**

`tests/favorites-api.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { setDbForTests, type Db } from '@/db/client';
import { photos } from '@/db/schema';
import { createGallery, updateGallery, type Gallery } from '@/lib/galleries/repo';
import { createUnlockCookie } from '@/lib/access/access';
import { listVisitorFavoriteIds } from '@/lib/favorites/repo';
import { createVisitorCookie, readVisitor } from '@/lib/favorites/visitor';
import { POST as identify } from '@/app/api/g/[slug]/visitor/route';
import { DELETE as unfav, PUT as fav } from '@/app/api/g/[slug]/favorites/[photoId]/route';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  setDbForTests(db);
});
afterEach(() => setDbForTests(null));

const pair = (setCookie: string) => setCookie.split(';')[0];

async function seed(opts: { password?: string } = {}) {
  const g = await createGallery(db, { title: 'A', password: opts.password });
  const [p] = await db.insert(photos).values({ galleryId: g.id, filename: 'a.jpg', originalUrl: 'o', webUrl: 'w', thumbUrl: 't', width: 1, height: 1, bytes: 1 }).returning();
  return { g, p };
}

const call = (handler: typeof fav, g: Gallery, photoId: string, cookies: string[]) =>
  handler(new Request('http://localhost', { method: 'PUT', headers: { cookie: cookies.join('; ') } }), {
    params: Promise.resolve({ slug: g.slug, photoId }),
  });

describe('visitante', () => {
  it('o cookie guarda id e nome e não aceita adulteração', () => {
    const { cookie, visitor } = createVisitorCookie('Inês');
    const token = decodeURIComponent(pair(cookie).split('=').slice(1).join('='));
    expect(readVisitor(token)).toEqual(visitor);
    expect(readVisitor(token.slice(0, -2) + 'xx')).toBeNull();
  });

  it('POST /visitor valida o nome', async () => {
    const { g } = await seed();
    const post = (name: unknown) =>
      identify(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }), {
        params: Promise.resolve({ slug: g.slug }),
      });
    expect((await post('')).status).toBe(400);
    const ok = await post('  Inês ');
    expect(ok.status).toBe(200);
    expect((await ok.json()).name).toBe('Inês');
    expect(ok.headers.get('set-cookie')).toMatch(/^visitor=/);
  });
});

describe('favoritas', () => {
  it('adiciona (idempotente) e remove', async () => {
    const { g, p } = await seed();
    const { cookie, visitor } = createVisitorCookie('Inês');
    expect((await (await call(fav, g, p.id, [pair(cookie)])).json()).favorited).toBe(true);
    expect((await call(fav, g, p.id, [pair(cookie)])).status).toBe(200);
    expect(await listVisitorFavoriteIds(db, g.id, visitor.id)).toEqual([p.id]);
    expect((await (await call(unfav, g, p.id, [pair(cookie)])).json()).favorited).toBe(false);
    expect(await listVisitorFavoriteIds(db, g.id, visitor.id)).toEqual([]);
  });

  it('sem nome pede identificação', async () => {
    const { g, p } = await seed();
    const res = await call(fav, g, p.id, []);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('visitor_required');
  });

  it('galeria protegida sem desbloqueio: 401 locked, mesmo com visitante', async () => {
    const { g, p } = await seed({ password: 'amor2026' });
    const visitor = pair(createVisitorCookie('X').cookie);
    const res = await call(fav, g, p.id, [visitor]);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('locked');
    expect((await call(fav, g, p.id, [visitor, pair(createUnlockCookie(g))])).status).toBe(200);
  });

  it('galeria expirada: 410', async () => {
    const { g, p } = await seed();
    const expired = (await updateGallery(db, g.id, { expiresAt: new Date(Date.now() - 1000) }))!;
    expect((await call(fav, expired, p.id, [pair(createVisitorCookie('X').cookie)])).status).toBe(410);
  });

  it('id malformado ou de outra galeria: 404', async () => {
    const { g } = await seed();
    const other = await seed();
    const visitor = pair(createVisitorCookie('X').cookie);
    expect((await call(fav, g, 'abc', [visitor])).status).toBe(404);
    expect((await call(fav, g, other.p.id, [visitor])).status).toBe(404);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/favorites-api.test.ts`
Expected: FAIL.

- [ ] **Step 3: Visitante e rotas**

`src/lib/favorites/visitor.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { sign, unsign } from '@/lib/security/sign';
import { serializeCookie } from '@/lib/security/cookies';

export const VISITOR_COOKIE = 'visitor';
const TTL = 60 * 60 * 24 * 365;

export interface Visitor {
  id: string;
  name: string;
}

export function createVisitorCookie(name: string): { cookie: string; visitor: Visitor } {
  const visitor = { id: randomUUID(), name };
  return { cookie: serializeCookie(VISITOR_COOKIE, sign(JSON.stringify(visitor), TTL), { maxAge: TTL }), visitor };
}

export function readVisitor(token: string | undefined): Visitor | null {
  const raw = unsign(token);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return typeof v?.id === 'string' && typeof v?.name === 'string' ? { id: v.id, name: v.name } : null;
  } catch {
    return null;
  }
}
```

`src/app/api/g/[slug]/visitor/route.ts`:

```ts
import { z } from 'zod';
import { getDb } from '@/db/client';
import { parseJson } from '@/lib/http';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { createVisitorCookie } from '@/lib/favorites/visitor';

const bodySchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const access = await accessFromRequest(await getDb(), req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const parsed = await parseJson(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { cookie, visitor } = createVisitorCookie(parsed.data.name);
  return Response.json({ name: visitor.name }, { headers: { 'Set-Cookie': cookie } });
}
```

`src/app/api/g/[slug]/favorites/[photoId]/route.ts`:

```ts
import { getDb } from '@/db/client';
import { notFound } from '@/lib/http';
import { getCookie } from '@/lib/security/cookies';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { VISITOR_COOKIE, readVisitor } from '@/lib/favorites/visitor';
import { addFavorite, removeFavorite } from '@/lib/favorites/repo';
import { getPhoto } from '@/lib/photos/repo';

type Ctx = { params: Promise<{ slug: string; photoId: string }> };

async function handle(req: Request, { params }: Ctx, favorited: boolean): Promise<Response> {
  const { slug, photoId } = await params;
  const db = await getDb();
  const access = await accessFromRequest(db, req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const visitor = readVisitor(getCookie(req, VISITOR_COOKIE));
  if (!visitor) return Response.json({ error: 'Indica o teu nome primeiro', code: 'visitor_required' }, { status: 401 });
  const photo = await getPhoto(db, access.gallery.id, photoId);
  if (!photo) return notFound();
  if (favorited) await addFavorite(db, { galleryId: access.gallery.id, photoId, visitorId: visitor.id, visitorName: visitor.name });
  else await removeFavorite(db, { photoId, visitorId: visitor.id });
  return Response.json({ favorited });
}

export const PUT = (req: Request, ctx: Ctx) => handle(req, ctx, true);
export const DELETE = (req: Request, ctx: Ctx) => handle(req, ctx, false);
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm test -- tests/favorites-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Diálogo do nome e ligação na vista**

`src/components/gallery/NameDialog.tsx`:

```tsx
'use client';
import { useState } from 'react';
import styles from './Gallery.module.css';

export function NameDialog({ onSubmit, onCancel }: { onSubmit: (name: string) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className={styles.dialogBackdrop} onClick={onCancel}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Identificação"
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSubmit(name.trim()); setBusy(false); }}
      >
        <p style={{ margin: 0 }}>Para guardar as tuas favoritas, diz-nos o teu nome.</p>
        <label className={styles.unlockField}>
          O teu nome
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus />
        </label>
        <button className={styles.primary} type="submit" disabled={busy || !name.trim()}>Continuar</button>
      </form>
    </div>
  );
}
```

Em `src/components/gallery/GalleryView.tsx`, substituir a função `GalleryView` e os imports por:

```tsx
'use client';
import { useCallback, useMemo, useState } from 'react';
import { groupByChapter } from '@/lib/gallery/layout';
import styles from './Gallery.module.css';
import { PhotoGrid } from './PhotoGrid';
import { Lightbox } from './Lightbox';
import { NameDialog } from './NameDialog';
import type { ClientPhoto } from './types';

export interface GalleryViewProps {
  slug: string;
  title: string;
  photos: ClientPhoto[];
  chapters: { id: string; name: string }[];
  initialFavoriteIds: string[];
  initialVisitorName: string | null;
}

export function GalleryView({ slug, title, photos, chapters, initialFavoriteIds, initialVisitorName }: GalleryViewProps) {
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(initialFavoriteIds));
  const [visitorName, setVisitorName] = useState(initialVisitorName);
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = onlyFavorites ? photos.filter((p) => favoriteIds.has(p.id)) : photos;
  const sections = useMemo(() => groupByChapter(visible, chapters), [visible, chapters]);
  const ordered = useMemo(() => sections.flatMap((s) => s.photos), [sections]);

  const flip = (photoId: string) =>
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });

  const sendToggle = useCallback(
    async (photoId: string, makeFavorite: boolean) => {
      flip(photoId); // otimista
      const res = await fetch(`/api/g/${slug}/favorites/${photoId}`, { method: makeFavorite ? 'PUT' : 'DELETE' });
      if (res.ok) return;
      flip(photoId); // reverter
      const data = await res.json().catch(() => ({}));
      if (data.code === 'visitor_required') {
        setVisitorName(null);
        setPendingFavorite(photoId);
      } else if (data.code === 'locked' || res.status === 410) {
        window.location.reload();
      }
    },
    [slug],
  );

  const toggleFavorite = useCallback(
    (photoId: string) => {
      if (!visitorName) {
        setPendingFavorite(photoId);
        return;
      }
      void sendToggle(photoId, !favoriteIds.has(photoId));
    },
    [visitorName, favoriteIds, sendToggle],
  );

  async function submitName(name: string) {
    const res = await fetch(`/api/g/${slug}/visitor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!res.ok) return;
    setVisitorName(name);
    const photoId = pendingFavorite;
    setPendingFavorite(null);
    if (photoId) await sendToggle(photoId, !favoriteIds.has(photoId));
  }

  const navigate = useCallback(
    (delta: number) => setOpenIndex((i) => (i === null ? i : Math.min(Math.max(i + delta, 0), ordered.length - 1))),
    [ordered.length],
  );
  const close = useCallback(() => setOpenIndex(null), []);

  let offset = 0;
  return (
    <>
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>{title}</span>
        <div className={styles.toolbarActions}>
          <button className={styles.chip} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites((v) => !v)}>
            Favoritas ({favoriteIds.size})
          </button>
        </div>
      </div>
      <section id="galeria" className={styles.content}>
        {ordered.length === 0 && <p className={styles.empty}>{onlyFavorites ? 'Ainda não escolheste favoritas.' : 'As fotos estão a caminho.'}</p>}
        {sections.map((section) => {
          const start = offset;
          offset += section.photos.length;
          return (
            <div key={section.id ?? 'sem-capitulo'}>
              {section.name && <h2 className={styles.chapterTitle}>{section.name}</h2>}
              <PhotoGrid photos={section.photos} startIndex={start} favoriteIds={favoriteIds} onOpen={setOpenIndex} onToggleFavorite={toggleFavorite} />
            </div>
          );
        })}
      </section>
      {openIndex !== null && ordered[openIndex] && (
        <Lightbox slug={slug} photos={ordered} index={openIndex} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} onNavigate={navigate} onClose={close} />
      )}
      {pendingFavorite && <NameDialog onSubmit={submitName} onCancel={() => setPendingFavorite(null)} />}
    </>
  );
}
```

- [ ] **Step 6: Verificar manualmente**

Run: `npm run dev`. Na galeria do cliente: clicar no coração → pede nome → "Continuar" → coração fica cheio; recarregar a página → continua cheio; "Favoritas (n)" filtra; no painel, "Favoritas dos clientes" mostra o nome e o número.
Expected: confirmado.

- [ ] **Step 7: Testes e commit**

Run: `npm test`
Expected: PASS.

```bash
git add -A
git commit -m "feat: client favorites with visitor identification"
```

---

### Task 11: Downloads (foto individual e ZIP por partes)

**Files:**
- Create: `src/lib/downloads/filename.ts`, `src/lib/downloads/zip.ts`, `src/lib/downloads/sets.ts`, `src/app/api/g/[slug]/photos/[photoId]/download/route.ts`, `src/app/api/g/[slug]/zip/route.ts`, `src/app/api/g/[slug]/zip/manifest/route.ts`, `src/components/gallery/DownloadPanel.tsx`
- Modify: `src/components/gallery/GalleryView.tsx` (renderizar `<DownloadPanel>` no fim da secção `#galeria`)
- Test: `tests/downloads.test.ts`

**Interfaces:**
- Consumes: `accessFromRequest`, `accessErrorResponse`, `createUnlockCookie` (Task 8); `listPhotos`, `getPhoto`, `Photo` (Task 5); `listFavoritePhotos` (Task 7); `readVisitor`, `VISITOR_COOKIE`, `createVisitorCookie` (Task 10); `getStorage`, `Storage` (Task 3)
- Produces:
  - `contentDisposition(filename: string): string`, `dedupeNames(names: string[]): string[]`, `mimeFromFilename(name: string): string`
  - `ZIP_PART_MAX_BYTES = 2 * 1024 ** 3`, `ZIP_PART_MAX_COUNT = 200`, `planZipParts<T extends { bytes: number }>(items: T[], maxBytes?: number, maxCount?: number): T[][]`, `zipResponse(storage: Storage, photos: Photo[], zipName: string): Response`
  - `type DownloadSet = 'all' | 'favorites'`, `photosForSet(db: Db, galleryId: string, set: DownloadSet, req: Request): Promise<Photo[] | Response>`
  - API: `GET /api/g/[slug]/photos/[photoId]/download`; `GET /api/g/[slug]/zip/manifest?set=all|favorites` → `{ parts: { part: number; count: number; bytes: number; url: string }[] }`; `GET /api/g/[slug]/zip?set=…&part=N`

- [ ] **Step 1: Escrever os testes**

`tests/downloads.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { createTempStorage } from './helpers/storage';
import { makeJpeg } from './helpers/images';
import { setDbForTests, type Db } from '@/db/client';
import { setStorageForTests, type Storage } from '@/lib/storage';
import { createGallery, updateGallery, type Gallery } from '@/lib/galleries/repo';
import { ingestPhoto } from '@/lib/photos/ingest';
import { createUnlockCookie } from '@/lib/access/access';
import { addFavorite } from '@/lib/favorites/repo';
import { createVisitorCookie } from '@/lib/favorites/visitor';
import { contentDisposition, dedupeNames } from '@/lib/downloads/filename';
import { planZipParts } from '@/lib/downloads/zip';
import { GET as downloadOne } from '@/app/api/g/[slug]/photos/[photoId]/download/route';
import { GET as zip } from '@/app/api/g/[slug]/zip/route';
import { GET as manifest } from '@/app/api/g/[slug]/zip/manifest/route';

let db: Db;
let storage: Storage;
beforeEach(async () => {
  db = await createTestDb();
  storage = (await createTempStorage()).storage;
  setDbForTests(db);
  setStorageForTests(storage);
});
afterEach(() => {
  setDbForTests(null);
  setStorageForTests(null);
});

const pair = (c: string) => c.split(';')[0];

async function seed(title = 'João & Inês', password?: string) {
  const g = await createGallery(db, { title, password });
  const add = async (name: string) => {
    const url = await storage.put(`galleries/${g.id}/originals/${crypto.randomUUID().slice(0, 8)}.jpg`, await makeJpeg(300, 200), 'image/jpeg');
    return ingestPhoto({ db, storage }, { galleryId: g.id, originalUrl: url, filename: name });
  };
  return { g, a: await add('IMG_1.jpg'), b: await add('IMG_1.jpg') };
}

const get = (url: string, cookies: string[] = []) => new Request(url, { headers: { cookie: cookies.join('; ') } });

describe('nomes de ficheiros', () => {
  it('Content-Disposition seguro com acentos', () => {
    expect(contentDisposition('João & Inês.zip')).toBe(`attachment; filename="Joao & Ines.zip"; filename*=UTF-8''Jo%C3%A3o%20%26%20In%C3%AAs.zip`);
    expect(contentDisposition('a"\r\nb.jpg')).toBe(`attachment; filename="a___b.jpg"; filename*=UTF-8''a%22%0D%0Ab.jpg`);
  });
  it('desduplica nomes repetidos', () => {
    expect(dedupeNames(['a.jpg', 'A.jpg', 'a.jpg', 'b'])).toEqual(['a.jpg', 'A (2).jpg', 'a (3).jpg', 'b']);
  });
});

describe('planZipParts', () => {
  it('divide por tamanho e por número', () => {
    const items = [5, 5, 5, 20, 1].map((bytes) => ({ bytes }));
    expect(planZipParts(items, 10, 100).map((p) => p.map((i) => i.bytes))).toEqual([[5, 5], [5], [20], [1]]);
    expect(planZipParts(items, 1000, 2).map((p) => p.length)).toEqual([2, 2, 1]);
    expect(planZipParts([], 10, 10)).toEqual([]);
  });
});

describe('download individual', () => {
  it('devolve o original com o nome do ficheiro', async () => {
    const { g, a } = await seed();
    const res = await downloadOne(get('http://localhost'), { params: Promise.resolve({ slug: g.slug, photoId: a.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain('IMG_1.jpg');
    expect(Buffer.from(await res.arrayBuffer()).length).toBe(a.bytes);
  });

  it('galeria protegida: 401 sem desbloqueio, 200 com', async () => {
    const { g, a } = await seed('A', 'amor2026');
    const ctx = { params: Promise.resolve({ slug: g.slug, photoId: a.id }) };
    expect((await downloadOne(get('http://localhost'), ctx)).status).toBe(401);
    expect((await downloadOne(get('http://localhost', [pair(createUnlockCookie(g))]), { params: Promise.resolve({ slug: g.slug, photoId: a.id }) })).status).toBe(200);
  });

  it('galeria expirada: 410; id malformado: 404', async () => {
    const { g, a } = await seed();
    expect((await downloadOne(get('http://localhost'), { params: Promise.resolve({ slug: g.slug, photoId: 'abc' }) })).status).toBe(404);
    await updateGallery(db, g.id, { expiresAt: new Date(Date.now() - 1000) });
    expect((await downloadOne(get('http://localhost'), { params: Promise.resolve({ slug: g.slug, photoId: a.id }) })).status).toBe(410);
  });
});

describe('ZIP', () => {
  async function fetchZip(g: Gallery, query: string, cookies: string[] = []) {
    return zip(get(`http://localhost/api/g/${g.slug}/zip?${query}`, cookies), { params: Promise.resolve({ slug: g.slug }) });
  }

  it('manifesto e ZIP com tamanho exato, nomes únicos e nome do casal', async () => {
    const { g } = await seed();
    const m = await manifest(get(`http://localhost/api/g/${g.slug}/zip/manifest?set=all`), { params: Promise.resolve({ slug: g.slug }) });
    const { parts } = await m.json();
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ part: 1, count: 2 });

    const res = await fetchZip(g, 'set=all&part=1');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain(`filename*=UTF-8''Jo%C3%A3o%20%26%20In%C3%AAs.zip`);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.subarray(0, 2).toString()).toBe('PK');
    expect(body.length).toBe(Number(res.headers.get('content-length')));
    expect(body.includes(Buffer.from('IMG_1.jpg'))).toBe(true);
    expect(body.includes(Buffer.from('IMG_1 (2).jpg'))).toBe(true);
  });

  it('favoritas exigem visitante e só incluem as dele', async () => {
    const { g, a } = await seed();
    expect((await fetchZip(g, 'set=favorites&part=1')).status).toBe(401);
    const { cookie, visitor } = createVisitorCookie('Inês');
    await addFavorite(db, { galleryId: g.id, photoId: a.id, visitorId: visitor.id, visitorName: 'Inês' });
    const res = await fetchZip(g, 'set=favorites&part=1', [pair(cookie)]);
    expect(res.status).toBe(200);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.includes(Buffer.from('IMG_1 (2).jpg'))).toBe(false);
  });

  it('parte inexistente ou set inválido: 400/404; galeria protegida: 401', async () => {
    const { g } = await seed();
    expect((await fetchZip(g, 'set=all&part=9')).status).toBe(404);
    expect((await fetchZip(g, 'set=tudo&part=1')).status).toBe(400);
    const locked = await seed('B', 'x1234');
    expect((await fetchZip(locked.g, 'set=all&part=1')).status).toBe(401);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test -- tests/downloads.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar nomes, ZIP e conjuntos**

`src/lib/downloads/filename.ts`:

```ts
const encodeRfc5987 = (s: string) =>
  encodeURIComponent(s).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function contentDisposition(filename: string): string {
  const fallback = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}

export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
  });
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff' };

export function mimeFromFilename(name: string): string {
  return MIME[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
}
```

Nota sobre `dedupeNames(['a.jpg','A.jpg','a.jpg','b'])`: a contagem é por nome sem diferenciar maiúsculas, por isso o segundo é `A (2).jpg` e o terceiro `a (3).jpg`.

`src/lib/downloads/zip.ts`:

```ts
import { downloadZip, predictLength } from 'client-zip';
import type { Storage } from '@/lib/storage';
import type { Photo } from '@/lib/photos/repo';
import { contentDisposition, dedupeNames } from './filename';

export const ZIP_PART_MAX_BYTES = 2 * 1024 ** 3;
export const ZIP_PART_MAX_COUNT = 200;

export function planZipParts<T extends { bytes: number }>(items: T[], maxBytes = ZIP_PART_MAX_BYTES, maxCount = ZIP_PART_MAX_COUNT): T[][] {
  const parts: T[][] = [];
  let current: T[] = [];
  let size = 0;
  for (const item of items) {
    if (current.length && (size + item.bytes > maxBytes || current.length >= maxCount)) {
      parts.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.bytes;
  }
  if (current.length) parts.push(current);
  return parts;
}

/** ZIP em streaming (sem compressão: JPEG já está comprimido), com Content-Length exato para o browser mostrar progresso. */
export function zipResponse(storage: Storage, photos: Photo[], zipName: string): Response {
  const names = dedupeNames(photos.map((p) => p.filename));
  const length = predictLength(photos.map((p, i) => ({ name: names[i], size: p.bytes })));
  async function* entries() {
    for (const [i, photo] of photos.entries()) {
      yield { name: names[i], lastModified: photo.createdAt, size: photo.bytes, input: new Response(await storage.open(photo.originalUrl)) };
    }
  }
  const zip = downloadZip(entries(), { length });
  return new Response(zip.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Length': String(length),
      'Content-Disposition': contentDisposition(zipName),
    },
  });
}
```

`src/lib/downloads/sets.ts`:

```ts
import type { Db } from '@/db/client';
import { getCookie } from '@/lib/security/cookies';
import { listPhotos, type Photo } from '@/lib/photos/repo';
import { listFavoritePhotos } from '@/lib/favorites/repo';
import { VISITOR_COOKIE, readVisitor } from '@/lib/favorites/visitor';

export type DownloadSet = 'all' | 'favorites';

export function parseSet(value: string | null): DownloadSet | null {
  return value === 'all' || value === 'favorites' ? value : null;
}

export async function photosForSet(db: Db, galleryId: string, set: DownloadSet, req: Request): Promise<Photo[] | Response> {
  if (set === 'all') return listPhotos(db, galleryId);
  const visitor = readVisitor(getCookie(req, VISITOR_COOKIE));
  if (!visitor) return Response.json({ error: 'Indica o teu nome primeiro', code: 'visitor_required' }, { status: 401 });
  return listFavoritePhotos(db, galleryId, visitor.id);
}
```

- [ ] **Step 4: Rotas**

`src/app/api/g/[slug]/photos/[photoId]/download/route.ts`:

```ts
import { getDb } from '@/db/client';
import { notFound } from '@/lib/http';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { getPhoto } from '@/lib/photos/repo';
import { getStorage } from '@/lib/storage';
import { contentDisposition, mimeFromFilename } from '@/lib/downloads/filename';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; photoId: string }> }): Promise<Response> {
  const { slug, photoId } = await params;
  const db = await getDb();
  const access = await accessFromRequest(db, req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const photo = await getPhoto(db, access.gallery.id, photoId);
  if (!photo) return notFound();
  return new Response(await getStorage().open(photo.originalUrl), {
    headers: {
      'Content-Type': mimeFromFilename(photo.filename),
      'Content-Length': String(photo.bytes),
      'Content-Disposition': contentDisposition(photo.filename),
      'Cache-Control': 'private, no-store',
    },
  });
}
```

`src/app/api/g/[slug]/zip/manifest/route.ts`:

```ts
import { getDb } from '@/db/client';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { parseSet, photosForSet } from '@/lib/downloads/sets';
import { planZipParts } from '@/lib/downloads/zip';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const set = parseSet(new URL(req.url).searchParams.get('set'));
  if (!set) return Response.json({ error: 'Conjunto inválido' }, { status: 400 });
  const db = await getDb();
  const access = await accessFromRequest(db, req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const photos = await photosForSet(db, access.gallery.id, set, req);
  if (photos instanceof Response) return photos;
  const parts = planZipParts(photos).map((p, i) => ({
    part: i + 1,
    count: p.length,
    bytes: p.reduce((s, x) => s + x.bytes, 0),
    url: `/api/g/${access.gallery.slug}/zip?set=${set}&part=${i + 1}`,
  }));
  return Response.json({ parts });
}
```

`src/app/api/g/[slug]/zip/route.ts`:

```ts
import { getDb } from '@/db/client';
import { notFound } from '@/lib/http';
import { accessErrorResponse, accessFromRequest } from '@/lib/access/access';
import { parseSet, photosForSet } from '@/lib/downloads/sets';
import { planZipParts, zipResponse } from '@/lib/downloads/zip';
import { getStorage } from '@/lib/storage';

export const maxDuration = 300;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const search = new URL(req.url).searchParams;
  const set = parseSet(search.get('set'));
  const part = Number(search.get('part') ?? '1');
  if (!set || !Number.isInteger(part) || part < 1) return Response.json({ error: 'Pedido inválido' }, { status: 400 });
  const db = await getDb();
  const access = await accessFromRequest(db, req, slug);
  if (access.status !== 'ok') return accessErrorResponse(access);
  const photos = await photosForSet(db, access.gallery.id, set, req);
  if (photos instanceof Response) return photos;
  const parts = planZipParts(photos);
  const chosen = parts[part - 1];
  if (!chosen) return notFound();
  const base = set === 'favorites' ? `${access.gallery.title} - favoritas` : access.gallery.title;
  const name = parts.length > 1 ? `${base} - parte ${part} de ${parts.length}.zip` : `${base}.zip`;
  return zipResponse(getStorage(), chosen, name);
}
```

- [ ] **Step 5: Correr e ver passar**

Run: `npm test -- tests/downloads.test.ts`
Expected: PASS.

- [ ] **Step 6: Painel de downloads na galeria**

`src/components/gallery/DownloadPanel.tsx`:

```tsx
'use client';
import { useState } from 'react';
import styles from './Gallery.module.css';

interface Part { part: number; count: number; bytes: number; url: string }

const formatBytes = (n: number) =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} GB` : `${Math.max(1, Math.round(n / 1024 ** 2))} MB`;

export function DownloadPanel({ slug, hasFavorites, onNeedName }: { slug: string; hasFavorites: boolean; onNeedName: () => void }) {
  const [parts, setParts] = useState<Part[] | null>(null);
  const [clicked, setClicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function load(set: 'all' | 'favorites') {
    setError(null);
    const res = await fetch(`/api/g/${slug}/zip/manifest?set=${set}`);
    const data = await res.json().catch(() => ({}));
    if (data.code === 'visitor_required') return onNeedName();
    if (!res.ok) return setError(data.error ?? 'Não foi possível preparar o download.');
    if (data.parts.length === 0) return setError('Não há fotos para descarregar.');
    if (data.parts.length === 1) {
      window.location.href = data.parts[0].url;
      return;
    }
    setClicked(new Set());
    setParts(data.parts);
  }

  return (
    <div className={styles.downloads}>
      <div className={styles.toolbarActions} style={{ justifyContent: 'center' }}>
        <button className={styles.primary} onClick={() => load('all')}>Descarregar tudo</button>
        {hasFavorites && <button className={styles.chip} onClick={() => load('favorites')}>Descarregar favoritas</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {parts && (
        <>
          <p style={{ color: 'var(--muted)' }}>A galeria é grande, por isso está dividida em {parts.length} partes.</p>
          <ul>
            {parts.map((p) => (
              <li key={p.part}>
                <a className={styles.chip} href={p.url} onClick={() => setClicked((s) => new Set(s).add(p.part))}>
                  {clicked.has(p.part) ? '✓ ' : ''}Parte {p.part} de {parts.length} · {p.count} fotos · {formatBytes(p.bytes)}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

Em `src/components/gallery/GalleryView.tsx`:
- acrescentar `import { DownloadPanel } from './DownloadPanel';`
- imediatamente antes de `</section>` (fecho de `#galeria`), inserir:

```tsx
        {photos.length > 0 && (
          <DownloadPanel slug={slug} hasFavorites={favoriteIds.size > 0} onNeedName={() => setPendingFavorite('')} />
        )}
```

- e trocar a última linha do JSX por uma que aceite `pendingFavorite === ''` (pedido de nome sem foto associada):

```tsx
      {pendingFavorite !== null && <NameDialog onSubmit={submitName} onCancel={() => setPendingFavorite(null)} />}
```

- em `submitName`, trocar `if (photoId) await sendToggle(...)` — já ignora a string vazia, nada a mudar.

- [ ] **Step 7: Verificar manualmente**

Run: `npm run dev`. Na galeria do cliente: "Descarregar foto" no lightbox descarrega o original com o nome certo; "Descarregar tudo" descarrega `<Nomes>.zip` e o browser mostra o tamanho total; com favoritas, "Descarregar favoritas" só traz essas.
Expected: confirmado; o ZIP abre no explorador do Windows.

- [ ] **Step 8: Testes e commit**

Run: `npm test`
Expected: PASS.

```bash
git add -A
git commit -m "feat: original downloads and streamed ZIP in parts"
```

---

### Task 12: Teste E2E, verificação mobile e deploy

**Files:**
- Create: `playwright.config.ts`, `scripts/reset-e2e.mjs`, `e2e/global-setup.ts`, `e2e/delivery.spec.ts`, `README.md`

**Interfaces:**
- Consumes: todos os rótulos de UI listados nas Tasks 2, 7, 9 e 10.
- Produces: suite `npm run test:e2e` (desktop + mobile) e instruções de deploy.

- [ ] **Step 1: Configuração do Playwright**

```bash
npx playwright install chromium
```

`scripts/reset-e2e.mjs`:

```js
import { rmSync } from 'node:fs';
rmSync(process.env.DATA_DIR ?? '.data-e2e', { recursive: true, force: true });
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,
  workers: 1,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run e2e:server',
    url: 'http://localhost:3100/admin/login',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATA_DIR: '.data-e2e',
      ADMIN_PASSWORD: 'e2e-admin-password',
      SESSION_SECRET: 'e2e-session-secret-'.padEnd(48, 'x'),
      NEXT_PUBLIC_BRAND_NAME: 'Estúdio Teste',
      BLOB_READ_WRITE_TOKEN: '',
      DATABASE_URL: '',
    },
  },
});
```

`e2e/global-setup.ts`:

```ts
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export default async function globalSetup() {
  const dir = path.join(process.cwd(), 'e2e', 'fixtures');
  await mkdir(dir, { recursive: true });
  const specs: [string, number, number, string][] = [
    ['a.jpg', 3000, 2000, '#b7a58c'],
    ['b.jpg', 2000, 3000, '#6b6a4f'],
    ['c.jpg', 2400, 1600, '#d9cfc0'],
  ];
  for (const [name, width, height, background] of specs) {
    await sharp({ create: { width, height, channels: 3, background } }).jpeg().toFile(path.join(dir, name));
  }
}
```

- [ ] **Step 2: Escrever o teste E2E**

`e2e/delivery.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import path from 'node:path';

const fixture = (name: string) => path.join(process.cwd(), 'e2e', 'fixtures', name);

test('o fotógrafo entrega uma galeria e o cliente favorita e descarrega', async ({ page }) => {
  // Fotógrafo
  await page.goto('/admin');
  await page.getByLabel('Palavra-passe').fill('e2e-admin-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Galerias' })).toBeVisible();

  await page.getByRole('link', { name: 'Nova galeria' }).click();
  const title = `João & Inês ${Date.now()}`;
  await page.getByLabel('Nomes do casal').fill(title);
  await page.getByLabel('Data e local').fill('12.06.2026 · Sintra');
  await page.getByRole('button', { name: 'Criar galeria' }).click();

  await page.getByLabel('Adicionar fotos').setInputFiles([fixture('a.jpg'), fixture('b.jpg'), fixture('c.jpg')]);
  await expect(page.getByText('3 de 3 concluídas')).toBeVisible({ timeout: 60_000 });

  await page.getByLabel('Nova palavra-passe').fill('amor2026');
  await page.getByRole('button', { name: 'Guardar definições' }).click();
  await expect(page.getByText('Guardado')).toBeVisible();
  const link = await page.getByTestId('share-link').inputValue();

  // Cliente (sem a sessão do fotógrafo)
  await page.context().clearCookies();
  await page.goto(link);
  await page.getByLabel('Palavra-passe').fill('errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Palavra-passe incorreta.')).toBeVisible();
  await page.getByLabel('Palavra-passe').fill('amor2026');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect(await page.content()).not.toContain('/originals/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.getByRole('link', { name: 'Ver galeria' }).click();
  await page.getByRole('button', { name: 'Abrir foto 1' }).click();
  const lightbox = page.getByRole('dialog', { name: 'Foto' });
  await lightbox.getByRole('button', { name: 'Adicionar às favoritas' }).click();
  await page.getByLabel('O teu nome').fill('Inês');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(lightbox.getByRole('button', { name: 'Remover das favoritas' })).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), lightbox.getByRole('link', { name: 'Descarregar foto' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^[abc]\.jpg$/);
  await lightbox.getByRole('button', { name: 'Fechar' }).click();

  const [zip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descarregar tudo' }).click()]);
  expect(zip.suggestedFilename()).toBe(`${title}.zip`);

  // O fotógrafo vê a favorita
  await page.goto('/admin/login');
  await page.getByLabel('Palavra-passe').fill('e2e-admin-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByText('Inês')).toBeVisible();
});
```

- [ ] **Step 3: Correr e corrigir até passar**

Run: `npm run test:e2e`
Expected: 2 testes PASS (desktop e mobile). Se algum rótulo não corresponder, corrigir o componente (não o teste) para bater certo com os rótulos das Interfaces.

- [ ] **Step 4: README com instruções de deploy**

`README.md`:

````markdown
# Galeria

Galerias de entrega com a tua marca para clientes de casamento.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # e preencher
npm run dev                  # http://localhost:3000/admin
npm test                     # testes unitários/integração
npm run test:e2e             # fluxo completo (desktop + mobile)
```

Em desenvolvimento a base de dados (PGlite) e os ficheiros ficam em `.data/`.

## Variáveis de ambiente

| Variável | Dev | Produção |
|---|---|---|
| `ADMIN_PASSWORD` | obrigatória (≥ 12) | obrigatória (≥ 12) |
| `SESSION_SECRET` | obrigatória (≥ 32) | obrigatória (≥ 32) |
| `NEXT_PUBLIC_BRAND_NAME` | opcional | o nome do teu estúdio |
| `DATABASE_URL` | — | Neon (pooled) |
| `BLOB_READ_WRITE_TOKEN` | — | Vercel Blob |
| `NEXT_PUBLIC_STORAGE` | — | `blob` |

## Deploy na Vercel

1. `git push` para um repositório no GitHub e importar o projeto na Vercel.
2. Em **Storage**, criar uma base **Neon Postgres** e um **Blob store** e ligá-los ao projeto (definem `DATABASE_URL` e `BLOB_READ_WRITE_TOKEN`).
3. Definir `ADMIN_PASSWORD`, `SESSION_SECRET`, `NEXT_PUBLIC_BRAND_NAME` e `NEXT_PUBLIC_STORAGE=blob`.
4. Aplicar as migrações: `DATABASE_URL=<url> npm run db:migrate`.
5. Fazer deploy e abrir `https://<domínio>/admin`.
6. (Opcional) Ligar um domínio próprio em **Settings → Domains**.
````

`.env.example`:

```
ADMIN_PASSWORD=
SESSION_SECRET=
NEXT_PUBLIC_BRAND_NAME=
```

- [ ] **Step 5: Verificação final**

Run: `npm test && npm run test:e2e && npm run build`
Expected: tudo PASS e build sem erros de tipos.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: end-to-end delivery flow; docs: deploy guide"
```
