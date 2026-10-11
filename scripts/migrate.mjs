// Aplica as migrações ao Postgres de produção durante o build da Vercel.
// Sem DATABASE_URL (desenvolvimento), não faz nada: o PGlite migra sozinho.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('migrate: sem DATABASE_URL, a saltar');
} else {
  await migrate(drizzle({ client: neon(url) }), { migrationsFolder: 'drizzle' });
  console.log('migrate: migrações aplicadas');
}
