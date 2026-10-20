// Client-side Supabase REST/Auth, sem SDK extra. Somente a chave PUBLICÁVEL é usada.
export const CLOUD_ENABLED =
  process.env.REACT_APP_CLOUD_MODE !== 'off' &&
  Boolean(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY);

const URL_BASE = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || '';
const SESSION_KEY = 'validade-zero:supabase-session:v1';
export function hasStoredCloudSession() {
  try { return Boolean(window.localStorage.getItem(SESSION_KEY)); }
  catch { return false; }
}
const PAGE_SIZE = 1000;
let session = null;
let refreshing = null;

export function requestError(error, fallback) {
  if (error?.message && typeof error.message === 'string') return error.message;
  if (error?.msg && typeof error.msg === 'string') return error.msg;
  return fallback || 'Não foi possível conectar ao Supabase.';
}

async function responseOrError(response) {
  if (response.ok) return response;
  let message = '';
  try { message = requestError(await response.json(), ''); } catch { /* resposta inesperada */ }
  throw new Error(message || 'Erro do Supabase (HTTP ' + response.status + ').');
}

function writeSession(payload) {
  if (!payload?.access_token || !payload?.refresh_token) throw new Error('Sessão inválida.');
  session = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Number(payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600))
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function clearSession() {
  session = null;
  window.localStorage.removeItem(SESSION_KEY);
}
async function authRequest(path, { method = 'POST', body, token } = {}) {
  const response = await fetch(URL_BASE + '/auth/v1/' + path, {
    method,
    headers: {
      apikey: KEY,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  await responseOrError(response);
  return response.status === 204 ? null : response.json();
}
async function refreshSession() {
  if (!session?.refresh_token) throw new Error('Faça login para continuar.');
  if (!refreshing) {
    refreshing = authRequest('token?grant_type=refresh_token', {
      body: { refresh_token: session.refresh_token }
    }).then(payload => { writeSession(payload); return session.access_token; })
      .catch(error => { clearSession(); throw error; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}
async function accessToken() {
  if (!session) throw new Error('Faça login para continuar.');
  if (session.expires_at <= Date.now() / 1000 + 45) return refreshSession();
  return session.access_token;
}

async function dbRequest(table, query = '', { method = 'GET', body, prefer = '' } = {}) {
  const token = await accessToken();
  const response = await fetch(URL_BASE + '/rest/v1/' + table + (query ? '?' + query : ''), {
    method,
    headers: {
      apikey: KEY, Authorization: 'Bearer ' + token,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  await responseOrError(response);
  if (method === 'HEAD' || response.status === 204 || prefer.includes('return=minimal')) {
    return { data: null, count: response.headers.get('content-range') };
  }
  const data = await response.json();
  return { data, count: response.headers.get('content-range') };
}

function lotFields(entry) {
  return {
    id: entry.id,
    name: entry.name, code: entry.code, sector: entry.sector, batch: entry.batch,
    quantity: entry.quantity, expiration: entry.expiration
  };
}

export async function restoreSession() {
  try {
    session = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
    if (!session?.access_token || !session?.refresh_token) { clearSession(); return null; }
    const token = await accessToken();
    const user = await authRequest('user', { method: 'GET', token });
    return user?.id ? user : null;
  } catch {
    clearSession();
    return null;
  }
}
export async function signIn(email, password) {
  const payload = await authRequest('token?grant_type=password', { body: { email, password } });
  writeSession(payload);
  return payload.user;
}
export async function signUp(email, password) {
  const payload = await authRequest('signup?redirect_to=' + encodeURIComponent(window.location.origin + window.location.pathname), {
    body: { email, password },
  });
  if (payload?.access_token) { writeSession(payload); return { user: payload.user, confirmed: true }; }
  return { user: null, confirmed: false };
}
export async function signOut() {
  const token = session?.access_token;
  try { if (token) await authRequest('logout', { token }); } finally { clearSession(); }
}

export async function listLots() {
  const all = [];
  for (let offset = 0; offset < 50000; offset += PAGE_SIZE) {
    const { data } = await dbRequest('validadezero_lotes',
      'select=id,name,code,sector,batch,quantity,expiration&order=id.asc&limit=' + PAGE_SIZE + '&offset=' + offset);
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}
export async function upsertLot(entry, isEditing) {
  const values = lotFields(entry);
  if (isEditing) {
    const { id, ...update } = values;
    const { data } = await dbRequest('validadezero_lotes',
      'id=eq.' + encodeURIComponent(id) + '&select=id', {
        method: 'PATCH', body: { ...update, updated_at: new Date().toISOString() },
        prefer: 'return=representation'
      });
    if (!data?.length) throw new Error('Lote não encontrado ou sem permissão para editar.');
  } else {
    await dbRequest('validadezero_lotes', '', {
      method: 'POST', body: values, prefer: 'missing=default,return=minimal'
    });
  }
}
export async function deleteLot(id) {
  const { data } = await dbRequest('validadezero_lotes',
    'id=eq.' + encodeURIComponent(id) + '&select=id', {
      method: 'DELETE', prefer: 'return=representation'
    });
  if (!data?.length) throw new Error('Lote não encontrado ou sem permissão para excluir.');
}
export async function countCatalog() {
  const { count } = await dbRequest('validadezero_catalogo',
    'select=code&limit=1', { prefer: 'count=exact' });
  const total = count?.split('/')?.[1];
  if (!total || total === '*') throw new Error('Não foi possível consultar a contagem do catálogo.');
  return Number(total);
}
export async function findProduct(code) {
  const { data } = await dbRequest('validadezero_catalogo',
    'select=code,name,sector,needs_review,photo_path&code=eq.' + encodeURIComponent(code) + '&limit=1');
  const row = data[0];
  return row ? { code: row.code, name: row.name, sector: row.sector, review: row.needs_review, photoPath: row.photo_path || '' } : null;
}

// Importação é incremental e mantém fotos já existentes: não escreve photo_path.
export async function importProducts(products, onProgress) {
  let done = 0;
  for (let start = 0; start < products.length; start += 200) {
    const group = products.slice(start, start + 200).map(p => ({
      code: p.code, name: p.name, sector: p.sector, needs_review: Boolean(p.review),
      updated_at: new Date().toISOString()
    }));
    await dbRequest('rpc/validadezero_importar_catalogo', '', {
      method: 'POST', body: { p_items: group }
    });
    done += group.length;
    if (onProgress) onProgress(done);
  }
  return done;
}
// Migração do catálogo local, apenas produtos AUSENTES: não substitui fotos/nome/setor remotos.
export async function migrateLocalCatalog(products, onProgress) {
  let processed = 0;
  for (let i = 0; i < products.length; i += 200) {
    const group = products.slice(i, i + 200).map(item => ({
      code: item.code, name: item.name, sector: item.sector || '',
      needs_review: Boolean(item.review)
    }));
    await dbRequest('validadezero_catalogo', 'on_conflict=user_id,code', {
      method: 'POST', body: group,
      prefer: 'missing=default,resolution=ignore-duplicates,return=minimal'
    });
    processed += group.length;
    if (onProgress) onProgress(processed);
  }
  return processed;
}

// Migração aditiva, nunca apaga dados existentes nem reescreve lotes iguais.
export async function migrateLocalLots(entries) {
  let total = 0;
  for (let i = 0; i < entries.length; i += 100) {
    const group = entries.slice(i, i + 100).map(lotFields);
    await dbRequest('validadezero_lotes', 'on_conflict=user_id,id', {
      method: 'POST', body: group, prefer: 'missing=default,resolution=ignore-duplicates,return=minimal'
    });
    total += group.length;
  }
  return total;
}


const PHOTO_BUCKET = 'validadezero-produtos';
const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_CODE = /^\d{1,14}$/;

export function productPhotoPathIsValid(path, userId, code) {
  if (typeof path !== 'string' || typeof userId !== 'string' || !VALID_UUID.test(userId) || !VALID_CODE.test(code)) return false;
  const bits = path.split('/');
  return bits.length === 3 && bits[0] === userId && bits[1] === code &&
    VALID_UUID.test(bits[2].replace(/\.jpg$/i, '')) && /\.jpg$/i.test(bits[2]);
}

async function storageRequest(path, { method = 'GET', blob, mime = '', json } = {}) {
  const token = await accessToken();
  const response = await fetch(URL_BASE + '/storage/v1/' + path, {
    method,
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + token,
      ...(blob ? { 'Content-Type': mime || blob.type || 'image/jpeg', 'cache-control': '3600', 'x-upsert': 'false' } : {}),
      ...(json ? { 'Content-Type': 'application/json' } : {})
    },
    ...(blob ? { body: blob } : json ? { body: JSON.stringify(json) } : {})
  });
  await responseOrError(response);
  return response;
}

export async function downloadProductPhoto(path, userId, code) {
  if (!productPhotoPathIsValid(path, userId, code)) throw new Error('Caminho da fotografia inválido ou sem permissão.');
  const segments = path.split('/').map(encodeURIComponent).join('/');
  const response = await storageRequest('object/authenticated/' + PHOTO_BUCKET + '/' + segments);
  return response.blob();
}

async function removeStoredProductPhoto(path) {
  await storageRequest('object/' + PHOTO_BUCKET, {
    method: 'DELETE', json: { prefixes: [path] }
  });
}

export async function uploadProductPhoto({ code, userId, blob, oldPath = '' }) {
  if (!VALID_CODE.test(code) || !VALID_UUID.test(userId)) throw new Error('Código ou usuário inválido.');
  if (!blob || blob.type !== 'image/jpeg' || blob.size < 1 || blob.size > 2 * 1024 * 1024) {
    throw new Error('A fotografia precisa estar em JPEG com até 2 MB.');
  }
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null;
  if (!uuid || !VALID_UUID.test(uuid)) throw new Error('Não foi possível gerar um identificador seguro.');
  const path = [userId, code, uuid + '.jpg'].join('/');
  const endpoint = 'object/' + PHOTO_BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/');
  await storageRequest(endpoint, { method: 'POST', blob, mime: 'image/jpeg' });
  try {
    const { data } = await dbRequest('validadezero_catalogo',
      'code=eq.' + encodeURIComponent(code) + '&select=code,photo_path', {
        method: 'PATCH', body: { photo_path: path, updated_at: new Date().toISOString() },
        prefer: 'return=representation'
      });
    if (!Array.isArray(data) || data.length !== 1 || data[0].photo_path !== path) {
      throw new Error('O cadastro não foi atualizado. Verifique se o produto pertence à sua conta.');
    }
  } catch (error) {
    try { await removeStoredProductPhoto(path); } catch { /* Limpeza automática pode falhar; reenvio usa novo arquivo. */ }
    throw error;
  }
  if (oldPath && oldPath !== path && productPhotoPathIsValid(oldPath, userId, code)) {
    try {
      await removeStoredProductPhoto(oldPath);
    } catch { /* A nova imagem já foi salva; a limpeza da anterior não deve impedir o uso. */ }
  }
  return path;
}

export const cloudApi = {
  listLots, upsertLot, deleteLot, countCatalog, findProduct, importProducts,
  migrateLocalCatalog, migrateLocalLots,
  downloadProductPhoto, uploadProductPhoto
};
