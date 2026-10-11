export interface Storage {
  /** Guarda o ficheiro e devolve o URL público. */
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  get(url: string): Promise<Buffer>;
  open(url: string): Promise<ReadableStream<Uint8Array>>;
  delete(urls: string[]): Promise<void>;
  /** true se o URL pertence a este storage (impede SSRF na ingestão). */
  isOwnUrl(url: string): boolean;
}
