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
  await page.getByLabel('EAN / código interno *').fill('7898276970072');
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
  await page.getByLabel('EAN / código interno *').fill('7898276970072');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Leite integral atualizado', { exact: true })).toBeVisible();

  await page.screenshot({ path: 'test-results/' + testInfo.project.name + '-dashboard-populado.png', fullPage: true });
});

test('confirmação para mudanças não salvas e exclusão de lote', async ({ page }) => {
  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await page.getByRole('textbox', { name: /Nome do produto/ }).fill('Iogurte');
  await page.getByLabel('EAN / código interno *').fill('7898276970072');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Fechar formulário' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastrar novo lote' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Fechar formulário' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastrar novo lote' })).toHaveCount(0);

  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await page.getByRole('textbox', { name: /Nome do produto/ }).fill('Iogurte');
  await page.getByLabel('EAN / código interno *').fill('7898276970072');
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
  await expect(page.getByLabel('EAN / código interno *')).toHaveValue('07890123456780');
  await expect(page.getByLabel('Setor *')).toHaveValue('Mercearia');
  await page.getByLabel('Lote *').fill('B-01');
  await page.getByLabel('Data de validade *').fill('2030-12-31');
  await page.getByRole('button', { name: 'Cadastrar lote', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tabela de lotes' }).getByText('BISCOITO DE CHOCOLATE', { exact: true })).toBeVisible();
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


test('câmera reconhece EAN e consulta o catálogo sem modificar validade', async ({ page }) => {
  const csv = 'codigo;nome;setor_sugerido;revisar\n7891234567895;BISCOITO INTEGRAL;Mercearia;OK\n';
  await page.getByLabel('Arquivo CSV do catálogo').setInputFiles({
    name: 'catalogo.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
  });
  await page.evaluate(() => {
    window.BarcodeDetector = class {
      static async getSupportedFormats() { return ['ean_13']; }
      async detect() { return [{ rawValue: '7891234567895' }]; }
    };
    navigator.mediaDevices.getUserMedia = async () => new MediaStream();
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { configurable: true, get: () => 3 });
    HTMLMediaElement.prototype.play = async () => {};
    HTMLMediaElement.prototype.pause = () => {};
  });
  await page.getByRole('button', { name: 'Escanear EAN com a câmera' }).click();
  await expect(page.getByRole('region', { name: 'Leitor de EAN' })).toBeVisible();
  await expect(page.getByLabel('Código EAN / código interno')).toHaveValue('7891234567895');
  await expect(page.getByLabel('Produto encontrado').getByText('BISCOITO INTEGRAL')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Leitor de EAN' })).toHaveCount(0);
});

test('OCR sugere validade sem preencher data antes da escolha explícita', async ({ page }) => {
  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await page.evaluate(() => {
    window.Tesseract = {
      createWorker: async () => ({
        recognize: async () => ({ data: { text: 'FAB: 10/01/2026\nVAL: 30/11/2026' } }),
        terminate: async () => {}
      })
    };
  });
  await page.getByRole('button', { name: /Ler validade pela câmera/ }).click();
  const input = page.getByLabel('Selecionar imagem da validade');
  await input.setInputFiles({
    name: 'embalagem.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+p2ioAAAAASUVORK5CYII=', 'base64')
  });
  await expect(page.getByText(/Selecione a validade correta/)).toBeVisible();
  await expect(page.getByLabel('Data de validade *')).toHaveValue('');
  await expect(page.getByRole('button', { name: /30\/11\/2026/ })).toBeVisible();
  await page.getByRole('button', { name: /30\/11\/2026/ }).click();
  await expect(page.getByLabel('Data de validade *')).toHaveValue('2026-11-30');
  await expect(page.getByRole('region', { name: 'Reconhecimento da validade' })).toHaveCount(0);
});

test('permite retorno à digitação caso a câmera não esteja disponível', async ({ page }) => {
  await page.evaluate(() => {
    window.BarcodeDetector = class {
      static async getSupportedFormats() { return ['ean_13']; }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      const err = new Error('Sem permissão');
      err.name = 'NotAllowedError';
      throw err;
    };
  });
  await page.getByRole('button', { name: 'Escanear EAN com a câmera' }).click();
  await expect(page.getByText(/Permissão da câmera negada/)).toBeVisible();
  await page.getByRole('button', { name: 'Voltar para digitação' }).click();
  await expect(page.getByLabel('Código EAN / código interno')).toBeEnabled();
});


test('visitante testa localmente e pode voltar do login sem perder lotes', async ({ page }) => {
  await expect(page.getByRole('region', { name: 'Modo de demonstração local' })).toBeVisible();
  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await page.getByLabel('Nome do produto *').fill('BISCOITO TESTE');
  await page.getByLabel('EAN / código interno *').fill('7898276970072');
  await page.getByLabel('Lote *').fill('TESTE-001');
  await page.getByLabel('Data de validade *').fill('2030-12-31');
  await page.getByRole('button', { name: 'Cadastrar lote', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tabela de lotes' }).getByText('BISCOITO TESTE')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar na nuvem' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar no Validade Zero' })).toBeVisible();
  await page.getByRole('button', { name: /Continuar sem login/ }).click();
  await expect(page.getByRole('region', { name: 'Tabela de lotes' }).getByText('BISCOITO TESTE')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Tabela de lotes' }).getByText('BISCOITO TESTE')).toBeVisible();
});

test('versão de teste local é utilizável sem qualquer chamada à API Supabase', async ({ page }) => {
  const hits = [];
  await page.route('**/*.supabase.co/**', route => {
    hits.push(route.request().url());
    route.abort();
  });
  await page.reload();
  await expect(page.getByRole('region', { name: 'Modo de demonstração local' })).toBeVisible();
  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await page.getByLabel('Nome do produto *').fill('LEITE LOCAL');
  await page.getByLabel('EAN / código interno *').fill('7898276970072');
  await page.getByLabel('Lote *').fill('L-123');
  await page.getByLabel('Data de validade *').fill('2030-11-10');
  await page.getByRole('button', { name: 'Cadastrar lote', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tabela de lotes' }).getByText('LEITE LOCAL')).toBeVisible();
  expect(hits).toHaveLength(0);
});

test('migração para conta autenticada preserva dados locais sem sobrescrever nuvem', async ({ page }) => {
  const requests = [];
  await page.route('**/*.supabase.co/**', async route => {
    const request = route.request(), url = request.url(), method = request.method();
    requests.push({ url, method, body: request.postData() || '' });
    if (url.includes('/auth/v1/token')) return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ user:{id:'conta-test'}, access_token:'jwt-e2e',
        refresh_token:'refresh-e2e', expires_in:3600 })
    });
    if (url.includes('/rest/v1/validadezero_catalogo') && method==='GET') {
      return route.fulfill({ status:200, contentType:'application/json',
        headers:{'content-range':'0-0/0', 'access-control-expose-headers':'content-range'}, body:'[]' });
    }
    if (url.includes('/rest/v1/validadezero_lotes') && method==='GET') {
      return route.fulfill({ status:200, contentType:'application/json', body:'[]' });
    }
    return route.fulfill({ status: 201, contentType:'application/json', body:'{}' });
  });
  await page.getByRole('button', { name: /Cadastrar primeiro lote/ }).click();
  await page.getByLabel('Nome do produto *').fill('MIGRAR SUCO');
  await page.getByLabel('EAN / código interno *').fill('7898276970072');
  await page.getByLabel('Lote *').fill('S-001');
  await page.getByLabel('Data de validade *').fill('2030-12-31');
  await page.getByRole('button', { name: 'Cadastrar lote', exact: true }).click();
  await page.getByLabel('Arquivo CSV do catálogo').setInputFiles({
    name:'catalogo.csv', mimeType:'text/csv',
    buffer:Buffer.from('codigo;nome;setor_sugerido\n000444;MIGRAR SUCO;Bebidas\n')
  });
  await expect(page.getByText(/Catálogo importado: 1 produtos/)).toBeVisible();
  await page.getByRole('button', { name: 'Salvar na nuvem' }).click();
  await page.getByLabel('E-mail').fill('teste@example.com');
  await page.getByLabel('Senha').fill('senha-segura');
  await page.getByRole('button', { name: 'Entrar', exact:true }).click();
  await expect(page.getByRole('button', { name:'Migrar dados locais para a nuvem' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name:'Migrar dados locais para a nuvem' }).click();
  await expect(page.getByText(/Migração concluída/)).toBeVisible();
  const uploads = requests.filter(x => x.method==='POST' && x.url.includes('/rest/v1/'));
  expect(uploads).toHaveLength(2);
  expect(uploads.every(x => x.url.includes('on_conflict=user_id'))).toBe(true);
  const photoPreserved = uploads.find(x => x.url.includes('validadezero_catalogo'));
  expect(photoPreserved.body).not.toContain('photo_path');
  expect(await page.evaluate(() => localStorage.getItem('validade-zero:catalogo:v1') !== null)).toBeTruthy();
});


test('busca EAN no catálogo central do servidor sem login nem importação CSV', async ({page}) => {
  const requests=[];
  await page.route('**/rest/v1/validadezero_catalogo_central?**', async route=>{
    requests.push(route.request().url());
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{
      code:'7898276970072',name:'ESPUMANTE CASA VALDUGA 750ML 130 ANOS',
      sector:'Bebidas',needs_review:false
    }])});
  });
  await expect(page.getByRole('region', {name:'Modo de demonstração local'})).toBeVisible();
  await page.getByLabel('Código EAN / código interno').fill('7898276970072');
  await page.getByRole('button',{name:'Buscar produto'}).click();
  await expect(page.getByLabel('Produto encontrado').getByText('ESPUMANTE CASA VALDUGA 750ML 130 ANOS')).toBeVisible();
  await expect(page.getByText('Fonte: catálogo central do servidor')).toBeVisible();
  expect(requests).toHaveLength(1);
  await page.getByRole('button',{name:'Cadastrar lote deste produto'}).click();
  await expect(page.getByLabel('Nome do produto *')).toHaveValue('ESPUMANTE CASA VALDUGA 750ML 130 ANOS');
  await expect(page.getByLabel('Setor *')).toHaveValue('Bebidas');
  await page.getByLabel('Lote *').fill('EAN-001');
  await page.getByLabel('Data de validade *').fill('2030-12-31');
  await page.getByRole('button',{name:'Cadastrar lote',exact:true}).click();
  await expect(page.getByRole('region',{name:'Tabela de lotes'}).getByText('ESPUMANTE CASA VALDUGA 750ML 130 ANOS')).toBeVisible();
});

test('falha do catálogo central não impede usar lotes locais', async ({page}) => {
  await page.route('**/rest/v1/validadezero_catalogo_central?**',route=>route.abort());
  await page.getByLabel('Código EAN / código interno').fill('7898276970072');
  await page.getByRole('button',{name:'Buscar produto'}).click();
  await expect(page.getByText(/Não foi possível consultar o servidor/)).toBeVisible();
  await page.getByRole('button',{name:/Cadastrar primeiro lote/}).click();
  await page.getByLabel('Nome do produto *').fill('PRODUTO MANUAL');
  await page.getByLabel('EAN / código interno *').fill('7898276970072');
  await page.getByLabel('Lote *').fill('M-001');
  await page.getByLabel('Data de validade *').fill('2030-12-31');
  await page.getByRole('button',{name:'Cadastrar lote',exact:true}).click();
  await expect(page.getByRole('region',{name:'Tabela de lotes'}).getByText('PRODUTO MANUAL')).toBeVisible();
});


test('EAN do lote é obrigatório e o ícone de câmera lê o código no próprio formulário', async ({page}) => {
  await page.getByRole('button', {name:/Cadastrar primeiro lote/}).click();
  await page.getByLabel('Nome do produto *').fill('SUCO DE UVA');
  await page.getByLabel('Lote *').fill('S-001');
  await page.getByLabel('Data de validade *').fill('2030-12-31');
  await page.getByRole('button',{name:'Cadastrar lote',exact:true}).click();
  await expect(page.getByText(/Informe o EAN ou código interno numérico/)).toBeVisible();
  await expect(page.getByLabel('EAN / código interno *')).toBeFocused();
  await page.getByLabel('EAN / código interno *').fill('EAN ABC');
  await page.getByRole('button',{name:'Cadastrar lote',exact:true}).click();
  await expect(page.getByText(/Informe o EAN ou código interno numérico/)).toBeVisible();

  await page.evaluate(() => {
    window.BarcodeDetector = class {
      static async getSupportedFormats() { return ['ean_13']; }
      async detect() { return [{rawValue:'7898276970072'}]; }
    };
    navigator.mediaDevices.getUserMedia = async () => new MediaStream();
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {configurable:true,get:()=>3});
    HTMLMediaElement.prototype.play = async () => {};
    HTMLMediaElement.prototype.pause = () => {};
  });
  await page.getByRole('button',{name:'Escanear EAN do lote com a câmera'}).click();
  await expect(page.getByRole('region',{name:'Leitor de EAN'})).toBeVisible();
  await expect(page.getByLabel('EAN / código interno *')).toHaveValue('7898276970072');
  await expect(page.getByRole('region',{name:'Leitor de EAN'})).toHaveCount(0);
  await page.getByRole('button',{name:'Cadastrar lote',exact:true}).click();
  await expect(page.getByRole('region',{name:'Tabela de lotes'}).getByText('SUCO DE UVA')).toBeVisible();
});

test('ícone de câmera fica junto do EAN na Identificação rápida', async ({page}) => {
  await expect(page.getByLabel('Código EAN / código interno').locator('..').getByRole('button',{name:'Escanear EAN com a câmera'})).toBeVisible();
  await page.getByRole('button',{name:/Cadastrar primeiro lote/}).click();
  await expect(page.getByLabel('EAN / código interno *').locator('..').getByRole('button',{name:'Escanear EAN do lote com a câmera'})).toBeVisible();
});


test('foto do EAN é cadastrada uma única vez e reaparece no formulário e após recarregar', async ({page}) => {
  await page.route('**/rest/v1/validadezero_catalogo_central?**', route =>
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{
      code:'7898276970072',name:'ESPUMANTE CASA VALDUGA 750ML 130 ANOS',
      sector:'Bebidas',needs_review:false
    }])})
  );
  await page.getByLabel('Código EAN / código interno').fill('7898276970072');
  await page.getByRole('button',{name:'Buscar produto'}).click();
  await expect(page.getByRole('region',{name:'Fotografia do produto'})).toBeVisible();
  await expect(page.getByText('Este produto ainda não tem fotografia')).toBeVisible();
  await expect(page.getByRole('button',{name:'Cadastrar foto com câmera'})).toBeVisible();
  const jpgBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 88; canvas.height = 88;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d25b27';ctx.fillRect(0,0,88,88);
    return canvas.toDataURL('image/jpeg',0.8).split(',')[1];
  });
  await page.getByLabel('Selecionar fotografia do produto').setInputFiles({
    name:'produto.jpg',mimeType:'image/jpeg',buffer:Buffer.from(jpgBase64,'base64')
  });
  await expect(page.getByAltText(/Fotografia cadastrada: ESPUMANTE CASA VALDUGA/)).toBeVisible();
  await page.getByRole('button',{name:'Cadastrar lote deste produto'}).click();
  await expect(page.locator('.entry-form').getByAltText(/Fotografia cadastrada: ESPUMANTE CASA VALDUGA/)).toBeVisible();
  await expect(page.locator('.entry-form').getByRole('button',{name:'Trocar foto'})).toBeVisible();
  await page.reload();
  await page.getByLabel('Código EAN / código interno').fill('7898276970072');
  await page.getByRole('button',{name:'Buscar produto'}).click();
  await expect(page.getByAltText(/Fotografia cadastrada: ESPUMANTE CASA VALDUGA/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Trocar foto'})).toBeVisible();
});

test('OCR da validade abre a partir do ícone dentro do input e só preenche após confirmação', async ({page}) => {
  await page.getByRole('button',{name:/Cadastrar primeiro lote/}).click();
  await expect(page.getByLabel('Data de validade *').locator('..')
    .getByRole('button',{name:'Ler validade pela câmera'})).toBeVisible();
  await page.evaluate(() => {
    window.Tesseract = {
      createWorker:async()=>({
        recognize:async()=>({data:{text:'FAB 05/01/2027\nVAL 30/11/2027'}}),
        terminate:async()=>{}
      })
    };
  });
  await page.getByRole('button',{name:'Ler validade pela câmera'}).click();
  await expect(page.getByRole('region',{name:'Reconhecimento da validade'})).toBeVisible();
  await page.getByLabel('Selecionar imagem da validade').setInputFiles({
    name:'rotulo.png',mimeType:'image/png',
    buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+p2ioAAAAASUVORK5CYII=','base64')
  });
  await expect(page.getByLabel('Data de validade *')).toHaveValue('');
  await page.getByRole('button',{name:/30\/11\/2027/}).click();
  await expect(page.getByLabel('Data de validade *')).toHaveValue('2027-11-30');
  await expect(page.getByRole('region',{name:'Reconhecimento da validade'})).toHaveCount(0);
});
