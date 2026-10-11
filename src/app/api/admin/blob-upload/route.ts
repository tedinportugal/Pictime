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
