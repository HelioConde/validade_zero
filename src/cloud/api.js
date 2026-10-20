// Client-side Supabase REST/Auth, sem SDK extra. Somente a chave PUBLICÁVEL é usada.
export const CLOUD_ENABLED =
  process.env.REACT_APP_CLOUD_MODE !== 'off' &&
  Boolean(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY);

const URL_BASE = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || '';
const SESSION_KEY = 'validade-zero:supabase-session:v1';
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
    'select=code,name,sector,needs_review&code=eq.' + encodeURIComponent(code) + '&limit=1');
  const row = data[0];
  return row ? { code: row.code, name: row.name, sector: row.sector, review: row.needs_review } : null;
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

export const cloudApi = {
  listLots, upsertLot, deleteLot, countCatalog, findProduct, importProducts, migrateLocalLots
};
