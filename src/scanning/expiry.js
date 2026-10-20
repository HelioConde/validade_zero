import { parseDateOnly } from '../domain/validade';
import { loadBrowserScript, TESSERACT_CDN } from './loader';

function isoDate(day, month, year) {
  const yyyy = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  const iso = [String(yyyy).padStart(4, '0'), String(Number(month)).padStart(2, '0'), String(Number(day)).padStart(2, '0')].join('-');
  return parseDateOnly(iso) ? iso : null;
}

const LABEL = /\b(?:VAL(?:IDADE)?|VENC(?:IMENTO)?|VTO|EXP(?:IRY|IRATION)?|BEST BEFORE)\s*[.:-]?\s*/gi;
const MADE = /\b(?:FAB(?:RICA(?:CAO|ÇÃO)?)?|PROD(?:U(?:C|Ç)AO|UCTION)?|MFG|LOTE|LOT)\b/i;
const DATE = /\b(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2}|\d{4})\b|\b(\d{4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\b/g;

/** Extrai sugestões, sem supor datas sem ano, sem salvar automaticamente. */
export function extractExpiryCandidates(text) {
  const matches = new Map();
  for (const line of String(text || '').toUpperCase().split(/[\n\r]+/)) {
    const labels = [...line.matchAll(LABEL)];
    const section = labels.length ? line.slice(labels[labels.length - 1].index + labels[labels.length - 1][0].length) : line;
    const hasValidLabel = labels.length > 0;
    if (!hasValidLabel && MADE.test(line)) continue;
    for (const match of section.matchAll(DATE)) {
      const date = match[4]
        ? isoDate(match[6], match[5], match[4])
        : isoDate(match[1], match[2], match[3]);
      if (!date) continue;
      const previous = matches.get(date);
      matches.set(date, { date, labelled: hasValidLabel || Boolean(previous?.labelled), original: match[0] });
    }
  }
  return [...matches.values()].sort((a, b) => Number(b.labelled) - Number(a.labelled) || a.date.localeCompare(b.date));
}

export async function recogniseExpiry(blob) {
  const lib = await loadBrowserScript(TESSERACT_CDN, 'Tesseract');
  const worker = await lib.createWorker('eng');
  try {
    const { data } = await worker.recognize(blob);
    return { text: data?.text || '', candidates: extractExpiryCandidates(data?.text || '') };
  } finally { await worker.terminate(); }
}
