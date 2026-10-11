import { describe, expect, it } from 'vitest';
import { uploadProblem } from '@/lib/upload/validate';
import { PermanentError, runQueue } from '@/lib/upload/queue';

describe('uploadProblem', () => {
  it('aceita JPEG, PNG, WebP e TIFF (pelo tipo ou pela extensão)', () => {
    expect(uploadProblem({ name: 'a.jpg', type: 'image/jpeg' })).toBeNull();
    expect(uploadProblem({ name: 'a.PNG', type: '' })).toBeNull();
    expect(uploadProblem({ name: 'a.tif', type: 'image/tiff' })).toBeNull();
    expect(uploadProblem({ name: 'a.webp', type: 'image/webp' })).toBeNull();
  });
  it('recusa HEIC com mensagem clara', () => {
    expect(uploadProblem({ name: 'IMG_0001.HEIC', type: '' })).toBe('Formato HEIC não suportado. Exporta a foto em JPEG.');
    expect(uploadProblem({ name: 'x.jpg', type: 'image/heic' })).toBe('Formato HEIC não suportado. Exporta a foto em JPEG.');
  });
  it('recusa outros ficheiros', () => {
    expect(uploadProblem({ name: 'contrato.pdf', type: 'application/pdf' })).toBe('Formato não suportado. Usa JPEG, PNG, WebP ou TIFF.');
    expect(uploadProblem({ name: 'video.mov', type: 'video/quicktime' })).toBe('Formato não suportado. Usa JPEG, PNG, WebP ou TIFF.');
  });
});

describe('fila com validação', () => {
  it('um HEIC falha logo, sem tentativas extra, e o resto do lote continua', async () => {
    let uploads = 0;
    const result = await runQueue(
      [{ name: 'IMG_1.heic', type: '' }, { name: 'a.jpg', type: 'image/jpeg' }],
      {
        upload: async (f) => {
          const problem = uploadProblem(f);
          if (problem) throw new PermanentError(problem);
          uploads++;
          return 'u';
        },
        ingest: async () => {},
      },
      { sleep: () => Promise.resolve() },
    );
    expect(result[0]).toMatchObject({ status: 'failed', attempts: 1, error: 'Formato HEIC não suportado. Exporta a foto em JPEG.' });
    expect(result[1].status).toBe('done');
    expect(uploads).toBe(1);
  });
});
