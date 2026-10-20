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

test('tema principal preto e estados de validade com cores semânticas', async ({ page }) => {
  const theme = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      brand: style.getPropertyValue('--brand').trim(),
      sidebar: getComputedStyle(document.querySelector('.sidebar')).backgroundColor,
      primaryButton: getComputedStyle(document.querySelector('.btn--primary')).backgroundColor,
      statusDanger: style.getPropertyValue('--danger').trim(),
      statusWarning: style.getPropertyValue('--warning').trim()
    };
  });
  expect(['#111111', '#111']).toContain(theme.brand);
  expect(theme.sidebar).toBe('rgb(16, 16, 18)');
  expect(theme.primaryButton).toBe('rgb(17, 17, 17)');
  expect(theme.statusDanger).not.toBe(theme.brand);
  expect(theme.statusWarning).not.toBe(theme.brand);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#101012');
});


test('importa catálogo local e preenche nome e setor ao buscar EAN', async ({ page }) => {
  const csv = '\uFEFFcodigo;nome;setor_sugerido;revisar\r\n"07890123456780";"BISCOITO DE CHOCOLATE";"Mercearia";"OK"\r\n"472";"CASTANHA PARA";"";"Revisar"\r\n';
  await page.getByLabel('Arquivo CSV do catálogo').setInputFiles({
    name: 'catalogo.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
  });
  await expect(page.getByText(/Catálogo importado: 2 produtos/)).toBeVisible();
  await page.getByLabel('Código EAN / código interno').fill('07890123456780');
  await page.getByRole('button', { name: 'Buscar produto' }).click();
  await expect(page.getByLabel('Produto encontrado').getByText('BISCOITO DE CHOCOLATE')).toBeVisible();
  await page.getByRole('button', { name: 'Cadastrar lote deste produto' }).click();
  await expect(page.getByLabel('Nome do produto *')).toHaveValue('BISCOITO DE CHOCOLATE');
  await expect(page.getByLabel('Código / EAN')).toHaveValue('07890123456780');
  await expect(page.getByLabel('Setor *')).toHaveValue('Mercearia');
  await page.getByLabel('Lote *').fill('B-01');
  await page.getByLabel('Data de validade *').fill('2030-12-31');
  await page.getByRole('button', { name: 'Cadastrar lote', exact: true }).click();
  await expect(page.getByText('BISCOITO DE CHOCOLATE', { exact: true })).toBeVisible();
});

test('exige setor manual quando catálogo não possui categoria', async ({ page }) => {
  const csv = 'codigo;nome;setor_sugerido;revisar\n472;CASTANHA PARA;;Revisar\n';
  await page.getByLabel('Arquivo CSV do catálogo').setInputFiles({
    name: 'catalogo.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
  });
  await page.getByLabel('Código EAN / código interno').fill('472');
  await page.getByRole('button', { name: 'Buscar produto' }).click();
  await page.getByRole('button', { name: 'Cadastrar lote deste produto' }).click();
  await expect(page.getByLabel('Setor *')).toHaveValue('');
  await page.getByLabel('Lote *').fill('L-02');
  await page.getByLabel('Data de validade *').fill('2030-12-31');
  await page.getByRole('button', { name: 'Cadastrar lote', exact: true }).click();
  await expect(page.getByText('Selecione um setor válido.')).toBeVisible();
});
