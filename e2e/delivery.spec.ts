import { expect, test } from '@playwright/test';
import path from 'node:path';

const fixture = (name: string) => path.join(process.cwd(), 'e2e', 'fixtures', name);

test('o fotógrafo entrega uma galeria e o cliente favorita e descarrega', async ({ page }) => {
  // Fotógrafo
  await page.goto('/admin');
  await page.getByLabel('Palavra-passe').fill('e2e-admin-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Galerias' })).toBeVisible();

  await page.getByRole('link', { name: 'Nova galeria' }).click();
  const title = `João & Inês ${Date.now()}`;
  await page.getByLabel('Nomes do casal').fill(title);
  await page.getByLabel('Data e local').fill('12.06.2026 · Sintra');
  await page.getByRole('button', { name: 'Criar galeria' }).click();

  await page.getByLabel('Adicionar fotos').setInputFiles([fixture('a.jpg'), fixture('b.jpg'), fixture('c.jpg')]);
  await expect(page.getByText('3 de 3 concluídas')).toBeVisible({ timeout: 60_000 });

  await page.getByLabel('Nova palavra-passe').fill('amor2026');
  await page.getByRole('button', { name: 'Guardar definições' }).click();
  await expect(page.getByText('Guardado')).toBeVisible();
  const link = await page.getByTestId('share-link').inputValue();

  // Cliente (sem a sessão do fotógrafo)
  await page.context().clearCookies();
  await page.goto(link);
  await page.getByLabel('Palavra-passe').fill('errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Palavra-passe incorreta.')).toBeVisible();
  await page.getByLabel('Palavra-passe').fill('amor2026');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect(await page.content()).not.toContain('/originals/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.getByRole('link', { name: 'Ver galeria' }).click();
  await page.getByRole('button', { name: 'Abrir foto 1' }).click();
  const lightbox = page.getByRole('dialog', { name: 'Foto' });
  await lightbox.getByRole('button', { name: 'Adicionar às favoritas' }).click();
  await page.getByLabel('O teu nome').fill('Inês');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(lightbox.getByRole('button', { name: 'Remover das favoritas' })).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), lightbox.getByRole('link', { name: 'Descarregar foto' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^[abc]\.jpg$/);
  await lightbox.getByRole('button', { name: 'Fechar' }).click();

  const [zip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descarregar tudo' }).click()]);
  expect(zip.suggestedFilename()).toBe(`${title}.zip`);

  // O fotógrafo vê a favorita
  await page.goto('/admin/login');
  await page.getByLabel('Palavra-passe').fill('e2e-admin-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByText('Inês', { exact: true })).toBeVisible();
});
