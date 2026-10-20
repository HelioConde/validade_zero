import { migrateLocalCatalog, signIn, signOut } from './api';

afterEach(async () => {
  try { await signOut(); } catch { /* sem rede durante cleanup */ }
  window.localStorage.clear();
  jest.restoreAllMocks();
});

test('migração do catálogo não sobrescreve produto já presente na nuvem', async () => {
  const fetchMock = jest.fn(async (url, options = {}) => {
    if (url.includes('/auth/v1/token')) return {
      ok: true, status: 200, headers: { get: () => null },
      json: async () => ({
        user: { id: 'conta-teste' }, access_token:'jwt-teste', refresh_token:'refresh-teste', expires_in:3600
      })
    };
    if (url.includes('/rest/v1/validadezero_catalogo')) return {
      ok: true, status: 201, headers: { get: () => null }, json: async () => []
    };
    return { ok: true, status: 204, headers: { get: () => null }, json: async () => ({}) };
  });
  global.fetch = fetchMock;
  await signIn('teste@example.com', 'senha-segura');
  const products = [{ code:'000123', name:'BISCOITO', sector:'Mercearia', review:false }];
  expect(await migrateLocalCatalog(products)).toBe(1);
  const [,req] = fetchMock.mock.calls.find(([url]) => url.includes('/rest/v1/validadezero_catalogo'));
  expect(req.method).toBe('POST');
  expect(req.headers.Prefer).toContain('resolution=ignore-duplicates');
  expect(req.headers.Prefer).toContain('missing=default');
  expect(JSON.parse(req.body)[0]).not.toHaveProperty('user_id');
  expect(JSON.parse(req.body)[0]).not.toHaveProperty('photo_path');
  expect(req.headers.Authorization).toBe('Bearer jwt-teste');
});
