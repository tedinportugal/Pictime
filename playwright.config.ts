import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,
  workers: 1,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run e2e:server',
    url: 'http://localhost:3100/admin/login',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATA_DIR: '.data-e2e',
      ADMIN_PASSWORD: 'e2e-admin-password',
      SESSION_SECRET: 'e2e-session-secret-'.padEnd(48, 'x'),
      NEXT_PUBLIC_BRAND_NAME: 'Estúdio Teste',
      BLOB_READ_WRITE_TOKEN: '',
      DATABASE_URL: '',
    },
  },
});
