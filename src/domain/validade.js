export const STORAGE_KEY = 'validade-zero:lotes:v1';

export const SECTORS = [
  'Mercearia', 'Hortifruti', 'Açougue', 'Padaria', 'Frios e laticínios',
  'Perecíveis', 'Congelados', 'Bebidas', 'Higiene e beleza', 'Outros'
];

export function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

export function daysUntil(expiration, today = new Date()) {
  const date = parseDateOnly(expiration);
  if (!date) return null;
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

export function statusOf(expiration, today = new Date()) {
  const days = daysUntil(expiration, today);
  if (days === null) return 'invalid';
  if (days < 0) return 'expired';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'attention';
  return 'ok';
}

export function statusLabel(expiration, today = new Date()) {
  const days = daysUntil(expiration, today);
  if (days === null) return 'Data inválida';
  if (days < 0) return 'Vencido há ' + Math.abs(days) + ' dia' + (Math.abs(days) === 1 ? '' : 's');
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return 'Em ' + days + ' dias';
}

export function summarize(entries, today = new Date()) {
  const result = { total: entries.length, units: 0, expired: 0, urgent: 0, attention: 0, ok: 0 };
  for (const entry of entries) {
    result.units += Number(entry.quantity) || 0;
    const status = statusOf(entry.expiration, today);
    if (Object.prototype.hasOwnProperty.call(result, status)) result[status] += 1;
  }
  return result;
}

export function sortByExpiry(entries) {
  return [...entries].sort((a, b) =>
    a.expiration.localeCompare(b.expiration) ||
    a.name.localeCompare(b.name, 'pt-BR') ||
    a.batch.localeCompare(b.batch, 'pt-BR')
  );
}

export function isValidEntry(entry) {
  return Boolean(
    entry && typeof entry.id === 'string' &&
    typeof entry.name === 'string' && entry.name.trim() &&
    typeof entry.sector === 'string' && entry.sector.trim() &&
    typeof entry.batch === 'string' && entry.batch.trim() &&
    typeof entry.code === 'string' &&
    Number.isSafeInteger(entry.quantity) && entry.quantity > 0 &&
    parseDateOnly(entry.expiration)
  );
}

export function readEntries(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

function csvValue(value) {
  let str = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(str)) str = "'" + str;
  return '"' + str.replace(/"/g, '""') + '"';
}

export function toCsv(entries) {
  const header = ['Produto', 'Código', 'Setor', 'Lote', 'Quantidade', 'Validade', 'Situação'];
  const rows = sortByExpiry(entries).map(e => [
    e.name, e.code, e.sector, e.batch, e.quantity, e.expiration, statusLabel(e.expiration)
  ]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvValue).join(';')).join('\r\n');
}

export function formatDate(date) {
  const parsed = parseDateOnly(date);
  return parsed ? new Intl.DateTimeFormat('pt-BR').format(parsed) : '—';
}
