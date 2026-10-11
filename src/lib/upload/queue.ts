export class PermanentError extends Error {}

export type ItemStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'failed';

export interface QueueItem {
  id: string;
  name: string;
  status: ItemStatus;
  progress: number;
  error?: string;
  attempts: number;
}

export interface QueueDeps<F> {
  upload(file: F, onProgress: (pct: number) => void): Promise<string>;
  ingest(originalUrl: string, file: F): Promise<void>;
}

export interface QueueOptions {
  concurrency?: number;
  maxAttempts?: number;
  onChange?: (items: QueueItem[]) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function runQueue<F extends { name: string }>(files: F[], deps: QueueDeps<F>, opts: QueueOptions = {}): Promise<QueueItem[]> {
  const concurrency = opts.concurrency ?? 3;
  const maxAttempts = opts.maxAttempts ?? 3;
  const sleep = opts.sleep ?? defaultSleep;
  const items: QueueItem[] = files.map((f, i) => ({ id: String(i), name: f.name, status: 'pending', progress: 0, attempts: 0 }));
  const emit = () => opts.onChange?.(items.map((i) => ({ ...i })));
  const update = (i: number, patch: Partial<QueueItem>) => {
    items[i] = { ...items[i], ...patch };
    emit();
  };

  let next = 0;
  async function worker() {
    while (next < files.length) {
      const i = next++;
      for (;;) {
        update(i, { status: 'uploading', progress: 0, attempts: items[i].attempts + 1, error: undefined });
        try {
          const url = await deps.upload(files[i], (pct) => update(i, { progress: Math.round(pct) }));
          update(i, { status: 'processing', progress: 100 });
          await deps.ingest(url, files[i]);
          update(i, { status: 'done' });
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (err instanceof PermanentError || items[i].attempts >= maxAttempts) {
            update(i, { status: 'failed', error: message });
            break;
          }
          await sleep(500 * items[i].attempts);
        }
      }
    }
  }

  emit();
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
  return items;
}
