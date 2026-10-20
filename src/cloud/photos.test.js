import { signIn, signOut, uploadProductPhoto, downloadProductPhoto, productPhotoPathIsValid } from './api';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const imageId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const path = owner + '/000123/' + imageId + '.jpg';
const blob = new Blob(['JPEG teste'], { type: 'image/jpeg' });
const ok = (data = {}) => ({
  ok: true, status: 200, headers: { get: () => null },
  json: async () => data, blob: async () => blob
});

let originalFetch;
let originalCrypto;
beforeEach(() => {
  originalFetch = global.fetch;
  originalCrypto = global.crypto;
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => imageId } });
});
afterEach(async () => {
  try { await signOut(); } catch { /* ignore cleanup errors */ }
  global.fetch = originalFetch;
  Object.defineProperty(global, 'crypto', { configurable: true, value: originalCrypto });
  window.localStorage.clear();
});

test('restringe caminho de foto ao dono, código e UUID', () => {
  expect(productPhotoPathIsValid(path, owner, '000123')).toBe(true);
  expect(productPhotoPathIsValid(path, other, '000123')).toBe(false);
  expect(productPhotoPathIsValid(path, owner, '123')).toBe(false);
  expect(productPhotoPathIsValid(owner + '/000123/../../foto.jpg', owner, '000123')).toBe(false);
});

test('foto é enviada como JPEG privado e vinculada ao EAN autenticado', async () => {
  const requests = [];
  global.fetch = jest.fn(async (url, init = {}) => {
    requests.push([url, init]);
    if (url.includes('/auth/v1/token')) return ok({
      user: { id: owner }, access_token: 'token-pessoal', refresh_token: 'refresh', expires_in: 3600
    });
    if (url.includes('/rest/v1/validadezero_catalogo') && init.method === 'PATCH') {
      return ok([{ code: '000123', photo_path: path }]);
    }
    if (url.includes('/storage/v1/object/')) return ok();
    if (url.includes('/auth/v1/logout')) return ok();
    throw new Error('URL inesperada ' + url);
  });
  await signIn('teste@example.com', 'senha-segura');
  const result = await uploadProductPhoto({ code: '000123', userId: owner, blob });
  expect(result).toBe(path);
  const upload = requests.find(([url, init]) => url.includes('/storage/v1/object/validadezero-produtos/') && init.method === 'POST');
  expect(upload).toBeDefined();
  expect(upload[0]).toContain(path);
  expect(upload[1].headers.Authorization).toBe('Bearer token-pessoal');
  expect(upload[1].headers['Content-Type']).toBe('image/jpeg');
  const patch = requests.find(([url, init]) => url.includes('/rest/v1/validadezero_catalogo') && init.method === 'PATCH');
  expect(JSON.parse(patch[1].body).photo_path).toBe(path);
  expect(JSON.parse(patch[1].body)).not.toHaveProperty('user_id');
  const downloaded = await downloadProductPhoto(path, owner, '000123');
  expect(downloaded.type).toBe('image/jpeg');
  await expect(downloadProductPhoto(path, other, '000123')).rejects.toThrow(/sem permissão/);
});

test('limpeza de upload falho usa API Storage, não exclui linhas por SQL', async () => {
  const requests = [];
  global.fetch = jest.fn(async (url, init = {}) => {
    requests.push([url, init]);
    if (url.includes('/auth/v1/token')) return ok({
      user: { id: owner }, access_token: 'token-pessoal', refresh_token: 'refresh', expires_in: 3600
    });
    if (url.includes('/rest/v1/validadezero_catalogo')) return ok([]);
    return ok();
  });
  await signIn('teste@example.com', 'senha-segura');
  await expect(uploadProductPhoto({ code: '000123', userId: owner, blob })).rejects.toThrow(/não foi atualizado/);
  const cleanup = requests.find(([url, init]) => url.endsWith('/storage/v1/object/validadezero-produtos') && init.method === 'DELETE');
  expect(cleanup).toBeDefined();
  expect(JSON.parse(cleanup[1].body)).toEqual({ prefixes: [path] });
});
