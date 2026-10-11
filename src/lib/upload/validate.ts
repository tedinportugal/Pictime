const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff']);
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'tif', 'tiff']);

/**
 * Verifica o ficheiro no browser antes do envio. Em produção o Vercel Blob recusa
 * tipos fora da lista com um erro genérico em inglês, por isso decide-se aqui.
 * Devolve a mensagem de erro, ou null se o ficheiro pode ser enviado.
 */
export function uploadProblem(file: { name: string; type: string }): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const type = file.type.toLowerCase();
  if (ext === 'heic' || ext === 'heif' || type === 'image/heic' || type === 'image/heif') {
    return 'Formato HEIC não suportado. Exporta a foto em JPEG.';
  }
  if (ALLOWED_TYPES.has(type) || (!type && ALLOWED_EXT.has(ext))) return null;
  return 'Formato não suportado. Usa JPEG, PNG, WebP ou TIFF.';
}
