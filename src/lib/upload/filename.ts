const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const ORIGINAL_KEY_RE = new RegExp(`^galleries/(${UUID})/originals/[A-Za-z0-9][A-Za-z0-9._-]*$`, 'i');
export const LOGO_KEY_RE = new RegExp(`^galleries/(${UUID})/logo/[A-Za-z0-9][A-Za-z0-9._-]*$`, 'i');

export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).filter(Boolean).slice(-2).join('-');
  const cleaned = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(-100);
  return cleaned || 'ficheiro';
}
