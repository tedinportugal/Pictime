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
