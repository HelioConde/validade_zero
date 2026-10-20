import { importProducts, listLots, signIn, signOut, upsertLot, requestError } from './api';

function fakeResponse(data, range = '0-0/1') {
  return { ok: true, status: 200, headers: { get: key => key === 'content-range' ? range : null }, json: async () => data };
}

afterEach(() => { window.localStorage.clear(); jest.restoreAllMocks(); });

test('mostra erros conhecidos sem expor detalhes de chamadas', () => {
  expect(requestError({ message: 'Sessão expirada' })).toBe('Sessão expirada');
  expect(requestError({ msg: 'Falha de acesso' })).toBe('Falha de acesso');
  expect(requestError(null)).toMatch(/Supabase/);
});

test('autentica e envia lotes com token do usuário, não chave de administrador', async () => {
  const fetchMock = jest.fn(async (url, options) => {
    if (url.includes('/auth/v1/token')) return fakeResponse({
      user: { id: '11111111-1111-1111-1111-111111111111' },
      access_token: 'jwt-de-teste', refresh_token: 'refresh-de-teste', expires_in: 3600
    });
    if (url.includes('/rest/v1/validadezero_lotes')) return fakeResponse([]);
    if (url.includes('/auth/v1/logout')) return fakeResponse(null);
    throw new Error('Rota inesperada: ' + url);
  });
  global.fetch = fetchMock;
  await signIn('teste@example.com', 'senha-segura');
  const row = { id: 'L-001', name: 'BISCOITO', code: '000123', sector: 'Mercearia',
    batch: 'LOTE-1', quantity: 4, expiration: '2030-12-31' };
  await upsertLot(row, false);
  const post = fetchMock.mock.calls.find(([url, request]) =>
    url.includes('/rest/v1/validadezero_lotes') && request.method === 'POST');
  expect(post).toBeDefined();
  expect(post[1].headers.Authorization).toBe('Bearer jwt-de-teste');
  expect(post[1].headers.Prefer).toContain('missing=default');
  expect(JSON.parse(post[1].body)).toEqual(row);
  expect(JSON.parse(post[1].body)).not.toHaveProperty('user_id');

  await listLots();
  expect(fetchMock.mock.calls.some(([url, request]) =>
    url.includes('validadezero_lotes') && request.method === 'GET')).toBe(true);
  await signOut();
});

test('importa catálogo incrementalmente e não sobrescreve caminho da fotografia', async () => {
  const fetchMock = jest.fn(async (url, options) => {
    if (url.includes('/auth/v1/token')) return fakeResponse({
      user: { id: '11111111-1111-1111-1111-111111111111' },
      access_token: 'jwt-de-teste', refresh_token: 'refresh-de-teste', expires_in: 3600
    });
    if (url.includes('/rest/v1/rpc/validadezero_importar_catalogo')) return fakeResponse(null);
    throw new Error('Rota inesperada');
  });
  global.fetch = fetchMock;
  await signIn('teste@example.com', 'senha-segura');
  const group = Array.from({ length: 201 }, (_, index) => ({
    code: String(index).padStart(13, '0'), name: 'Produto ' + index, sector: '', review: false
  }));
  expect(await importProducts(group)).toBe(201);
  const posts = fetchMock.mock.calls.filter(([url]) => url.includes('/rest/v1/rpc/validadezero_importar_catalogo'));
  expect(posts).toHaveLength(2);
  expect(JSON.parse(posts[0][1].body).p_items).toHaveLength(200);
  expect(posts[0][0]).toContain('rpc/validadezero_importar_catalogo');
  expect(posts[0][1].headers.Authorization).toBe('Bearer jwt-de-teste');
  expect(JSON.parse(posts[0][1].body).p_items[0]).not.toHaveProperty('photo_path');
});
