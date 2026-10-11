import { ADMIN_COOKIE } from '@/lib/auth/admin';
import { sign } from '@/lib/security/sign';

export function adminCookieHeader(): string {
  return `${ADMIN_COOKIE}=${encodeURIComponent(sign('admin', 3600))}`;
}
