# Galeria de Entrega com Marca — Especificação de Design

Data: 2026-10-11
Origem: recriação do conceito Pic-Time (reel "Why your final gallery matters").

## 1. Objetivo

App web pessoal para um fotógrafo/videógrafo de casamentos criar galerias e entregá-las aos clientes numa página com a sua marca (logo, fonte, cores), substituindo a "pasta genérica com link de download".

**Sucesso:**
- O cliente abre o link (sobretudo no telemóvel) e sente luxo desde o primeiro ecrã; vê fotos, marca favoritas e descarrega.
- O fotógrafo cria uma galeria e envia o link em poucos minutos.

**Fora do MVP:** site/portfólio, loja de impressões, multi-utilizador, planos e pagamentos, automações.

## 2. Stack (abordagem aprovada)

- Next.js (App Router) + TypeScript, deploy na Vercel.
- Armazenamento de fotos: Vercel Blob (ou Cloudflare R2).
- Base de dados: Postgres (Neon ou Supabase), acedida via ORM (Drizzle ou Prisma).
- Processamento de imagem: `sharp` para gerar versões web e miniaturas.
- Autenticação do painel: palavra-passe única do fotógrafo (sessão por cookie assinado). Sem registo de utilizadores.

## 3. Arquitetura

Três áreas independentes:

1. **Painel do fotógrafo** (`/admin`, privado): CRUD de galerias, upload em lote, tema, geração de link, lista de favoritos.
2. **Galeria do cliente** (`/g/[slug]`, pública por link único): capa, grelha, lightbox, favoritos, downloads.
3. **Camada de dados e armazenamento**: modelos, API, pipeline de imagem.

### Modelo de dados

- `Gallery`: id, slug (aleatório, ≥12 chars), title, subtitle (data/local), coverPhotoId, theme (JSON: preset, fontes, cores, modo claro/escuro), passwordHash (opcional), expiresAt (opcional), createdAt.
- `Chapter` (opcional): id, galleryId, name, order.
- `Photo`: id, galleryId, chapterId?, order, originalUrl, webUrl, thumbUrl, width, height.
- `Favorite`: id, galleryId, photoId, visitorName/email, createdAt.

Os originais ficam só para download; a galeria serve as versões web/miniatura.

## 4. Experiência do cliente

- **Capa:** foto em tela cheia com zoom lento; nome do casal em serifada itálica grande; data/local em letra pequena espaçada; logo no topo; botão discreto "Ver galeria".
- **Galeria:** grelha editorial de proporções mistas sem cortes forçados, carregamento progressivo, capítulos opcionais, fundo creme ou escuro.
- **Lightbox:** ecrã inteiro, swipe (mobile) e setas (desktop), coração de favorito, download individual.
- **Favoritos/Downloads:** identificação por nome ou e-mail (sem conta); "Descarregar tudo" (ZIP) e "Descarregar favoritas".
- **Acesso:** link único, palavra-passe opcional, expiração opcional.
- **Estilo:** creme, cinza e verde-azeitona; tipografia serifada elegante; muito espaço em branco; 3 presets editoriais de tema.

## 5. Painel do fotógrafo

- Lista de galerias; "Nova galeria".
- Upload em lote (arrastar e largar) com progresso e retoma; miniaturas geradas automaticamente.
- Escolha de capa, ordenação, capítulos, tema (preset, fonte, cores), logo.
- "Copiar link"; ver favoritas por cliente.

## 6. Erros e limites

- Link inexistente/expirado: página com a marca do fotógrafo e mensagem clara.
- Upload interrompido: retoma por ficheiro; falhas individuais listadas sem bloquear o lote.
- ZIP grandes: geração com estado de progresso (streaming), sem timeout do servidor.
- Palavra-passe da galeria: limite de tentativas.

## 7. Testes

- Testes automáticos do fluxo principal: criar galeria, upload, abrir como cliente, favoritar, descarregar.
- Testes unitários do pipeline de imagem e do controlo de acesso (slug, palavra-passe, expiração).
- Verificação visual em viewport mobile (375px) e desktop.

## 8. Fases

1. Esqueleto, autenticação do painel e sistema de temas.
2. Upload e armazenamento, pipeline de imagem.
3. Galeria do cliente (capa, grelha, lightbox).
4. Favoritos e downloads (individual e ZIP).
5. Acabamento, páginas de erro e deploy.

## 9. Decisões em aberto (a resolver no plano)

- Vercel Blob vs R2 e Neon vs Supabase (escolha final por custo/limites de ficheiros).
- Nome da app e do domínio.
