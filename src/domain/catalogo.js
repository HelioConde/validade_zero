import { SECTORS } from './validade';

export const CATALOG_STORAGE_KEY = 'validade-zero:catalogo:v1';
export const MAX_CATALOG_CSV_BYTES = 8 * 1024 * 1024;
export const MAX_CATALOG_PRODUCTS = 30000;

function normaliseHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function parseDelimitedCsv(content, separator = ';') {
  if (typeof content !== 'string' || !content.trim()) throw new Error('CSV vazio.');
  const rows = [];
  let cell = '';
  let row = [];
  let quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (quoted && content[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || !cell) quoted = !quoted;
      else throw new Error('Aspas inválidas no arquivo CSV.');
    } else if (char === separator && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      row.push(cell);
      if (row.some(item => item.trim())) rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && content[i + 1] === '\n') i++;
    } else {
      cell += char;
    }
    if (rows.length > MAX_CATALOG_PRODUCTS + 1) {
      throw new Error('O catálogo excede 30.000 produtos.');
    }
  }
  if (quoted) throw new Error('O CSV contém aspas não fechadas.');
  row.push(cell);
  if (row.some(item => item.trim())) rows.push(row);
  return rows;
}

function firstIndex(keys, aliases) {
  for (const alias of aliases) {
    const i = keys.indexOf(alias);
    if (i >= 0) return i;
  }
  return -1;
}

/** Importa nomes e códigos; nunca inventa EAN ou setor ausente. */
export function parseProductCatalogCsv(content) {
  const firstLine = (content || '').replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  const rows = parseDelimitedCsv(content.replace(/^\uFEFF/, ''), separator);
  if (rows.length < 2) throw new Error('Inclua um cabeçalho e pelo menos um produto.');

  const keys = rows[0].map(normaliseHeader);
  const codeIndex = firstIndex(keys, ['codigo', 'ean', 'gtin', 'codigo_ean_texto', 'code', 'barcode']);
  const nameIndex = firstIndex(keys, ['nome', 'nome_corrigido', 'produto', 'descricao']);
  const sectorIndex = firstIndex(keys, ['setor_confirmado', 'setor', 'setor_sugerido']);
  const reviewIndex = firstIndex(keys, ['revisar', 'revisao']);
  if (codeIndex < 0 || nameIndex < 0) {
    throw new Error('O CSV precisa das colunas "codigo" e "nome".');
  }

  const products = [];
  const seen = new Set();
  let invalid = 0;
  let duplicates = 0;
  for (const cells of rows.slice(1)) {
    const code = String(cells[codeIndex] || '').trim();
    const name = String(cells[nameIndex] || '').trim().replace(/\s+/g, ' ');
    const sectorRaw = sectorIndex >= 0 ? String(cells[sectorIndex] || '').trim() : '';
    const sector = SECTORS.find(value => value.toLowerCase() === sectorRaw.toLowerCase()) || '';
    const reviewRaw = reviewIndex >= 0 ? String(cells[reviewIndex] || '').trim() : '';
    if (!/^\d{1,14}$/.test(code) || !name || name.length > 120 || /^[=+@-]/.test(name)) {
      invalid++;
      continue;
    }
    if (seen.has(code)) {
      duplicates++;
      continue;
    }
    seen.add(code);
    products.push({ code, name, sector, review: /^revisar$/i.test(reviewRaw) });
  }
  if (!products.length) throw new Error('Nenhum produto válido foi encontrado.');
  return { products, invalid, duplicates };
}

export function loadCatalog(storage) {
  try {
    const raw = storage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.products)) return [];
    return parsed.products.filter(item =>
      item && typeof item.code === 'string' && /^\d{1,14}$/.test(item.code) &&
      typeof item.name === 'string' && item.name.length > 0 && item.name.length <= 120 &&
      typeof item.sector === 'string' && (item.sector === '' || SECTORS.includes(item.sector))
    ).slice(0, MAX_CATALOG_PRODUCTS);
  } catch {
    return [];
  }
}

export function saveCatalog(storage, products) {
  if (!Array.isArray(products) || !products.length || products.length > MAX_CATALOG_PRODUCTS) {
    throw new Error('Catálogo inválido ou grande demais.');
  }
  storage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ version: 1, products }));
}

export function findProductByCode(products, code) {
  const normalized = String(code || '').trim();
  return products.find(product => product.code === normalized) || null;
}
