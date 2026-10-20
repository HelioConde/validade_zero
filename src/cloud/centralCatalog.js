// Leitura pública do catálogo central de referência do Validade Zero.
// Apenas nomes, setores e códigos: jamais lotes, donos ou fotografias privadas.
const BASE_URL = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
const PUBLIC_KEY = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || '';

export function canSearchCentralCatalog() {
  return Boolean(BASE_URL && PUBLIC_KEY);
}

export async function findCentralProduct(code, options = {}) {
  const cleanCode = String(code || '').trim();
  if (!/^\d{1,14}$/.test(cleanCode)) return null;

  const base = options.url !== undefined ? options.url : BASE_URL;
  const key = options.key !== undefined ? options.key : PUBLIC_KEY;
  if (!base || !key) return null;

  const fetcher = options.fetcher || fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetcher(
      base.replace(/\/$/, '') + '/rest/v1/validadezero_catalogo_central?select=code,name,sector,needs_review&code=eq.' +
      encodeURIComponent(cleanCode) + '&limit=1',
      {
        method: 'GET',
        headers: { apikey: key, Accept: 'application/json' },
        signal: controller.signal
      }
    );
    if (!response.ok) throw new Error('Catálogo central indisponível (HTTP ' + response.status + ').');
    const result = await response.json();
    if (!Array.isArray(result)) throw new Error('Resposta inesperada do catálogo central.');
    const row = result[0];
    if (!row) return null;
    if (row.code !== cleanCode || typeof row.name !== 'string') {
      throw new Error('Produto retornado não corresponde ao EAN pesquisado.');
    }
    return {
      code: row.code,
      name: row.name,
      sector: row.sector || '',
      review: Boolean(row.needs_review),
      source: 'central'
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('A consulta ao catálogo central demorou demais. Verifique a conexão.');
    throw error;
  } finally { clearTimeout(timeout); }
}
