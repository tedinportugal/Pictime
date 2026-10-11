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
4. As migrações aplicam-se sozinhas em cada build (`scripts/migrate.mjs`) quando `DATABASE_URL` existe.
5. Fazer deploy e abrir `https://<domínio>/admin`.
6. (Opcional) Ligar um domínio próprio em **Settings → Domains**.
