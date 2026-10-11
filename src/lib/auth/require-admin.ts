import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isAdminToken } from './admin';

/**
 * Chamar no topo de cada página do painel: num pedido RSC parcial o Next.js
 * pode renderizar a página sem voltar a correr o layout (protected).
 */
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(token)) redirect('/admin/login');
}
