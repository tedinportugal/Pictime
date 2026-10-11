import { rmSync } from 'node:fs';
rmSync(process.env.DATA_DIR ?? '.data-e2e', { recursive: true, force: true });
