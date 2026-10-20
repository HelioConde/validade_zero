const { test, expect } = require('@playwright/test');

function futureDate(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('painel inicial, navegação por teclado e screenshot', async ({ page }, testInfo) => {
  await expect(page).toHaveTitle(/Validade Zero/);
  await expect(page.getByRole('heading', { name: /Visão geral/ })).toBeVisible();
  await expect(page.getByText('Seu controle começa aqui')).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();

  const width = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(width.scrollWidth).toBeLessThanOrEqual(width.innerWidth + 1);

  const name = testInfo.project.name;
  await page.screenshot({ path: 'test-results/' + name + '-dashboard-vazio.png', fullPage: true });
});

test('cadastrar, editar, buscar e filtrar lotes', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await expect(page.getByRole('heading', { name: 'Cadastrar novo lote' })).toBeVisible();
  await page.getByRole('button', { name: 'Cadastrar lote' }).click();
  await expect(page.locator('#error-name')).toBeVisible();
  await expect(page.locator('#entry-name')).toBeFocused();

  await page.getByRole('textbox', { name: /Nome do produto/ }).fill('Leite integral');
  await page.getByRole('textbox', { name: /^Lote/ }).fill('L-2026-01');
  await page.getByLabel('Data de validade *').fill(futureDate(3));
  await page.getByRole('button', { name: 'Cadastrar lote' }).click();

  await expect(page.getByText('Leite integral', { exact: true })).toBeVisible();
  await expect(page.getByText('Lote cadastrado com sucesso.')).toBeVisible();
  await page.getByRole('searchbox', { name: /Buscar produto/ }).fill('não-encontra');
  await expect(page.getByText('Nenhum lote encontrado')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();

  const tabs = page.getByRole('group', { name: 'Filtrar por vencimento' });
  await tabs.getByRole('button', { name: 'Até 7 dias' }).click();
  await expect(page.getByText('Leite integral', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Editar lote L-2026-01' }).click();
  await expect(page.getByRole('heading', { name: 'Editar lote' })).toBeVisible();
  await page.getByRole('textbox', { name: /Nome do produto/ }).fill('Leite integral atualizado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Leite integral atualizado', { exact: true })).toBeVisible();

  await page.screenshot({ path: 'test-results/' + testInfo.project.name + '-dashboard-populado.png', fullPage: true });
});

test('confirmação para mudanças não salvas e exclusão de lote', async ({ page }) => {
  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await page.getByRole('textbox', { name: /Nome do produto/ }).fill('Iogurte');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Fechar formulário' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastrar novo lote' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Fechar formulário' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastrar novo lote' })).toHaveCount(0);

  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await page.getByRole('textbox', { name: /Nome do produto/ }).fill('Iogurte');
  await page.getByRole('textbox', { name: /^Lote/ }).fill('I-01');
  await page.getByLabel('Data de validade *').fill('2020-01-01');
  await page.getByRole('button', { name: 'Cadastrar lote' }).click();
  await expect(page.getByText('Iogurte', { exact: true })).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Excluir lote I-01' }).click();
  await expect(page.getByText('Seu controle começa aqui')).toBeVisible();
});
