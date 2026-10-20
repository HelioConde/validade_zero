import { extractExpiryCandidates } from './expiry';
import { scannedGtin, cameraError } from './barcode';

test('identifica datas de validade com formatos brasileiros e internacionais', () => {
  expect(extractExpiryCandidates('FAB 01/10/2026\nVAL 30/11/2026')).toEqual([
    { date:'2026-11-30', labelled:true, original:'30/11/2026' }
  ]);
  expect(extractExpiryCandidates('VENC: 05.12.26')).toEqual([
    { date:'2026-12-05', labelled:true, original:'05.12.26' }
  ]);
  expect(extractExpiryCandidates('EXP: 2027-01-31')).toEqual([
    { date:'2027-01-31', labelled:true, original:'2027-01-31' }
  ]);
});

test('não inventa ano, descarta impossíveis e sinaliza datas sem rótulo', () => {
  expect(extractExpiryCandidates('VENC 31/02/2027; 10/2027')).toEqual([]);
  expect(extractExpiryCandidates('LOTE A2 FAB 07/07/2026')).toEqual([]);
  expect(extractExpiryCandidates('01/12/2028')).toEqual([
    { date:'2028-12-01', labelled:false, original:'01/12/2028' }
  ]);
});

test('deduplica e prioriza marcações de VAL', () => {
  const candidates = extractExpiryCandidates('01/11/2026\nVAL: 01/11/2026\nEXP 20/12/2026');
  expect(candidates).toHaveLength(2);
  expect(candidates[0].date).toBe('2026-11-01');
  expect(candidates[0].labelled).toBe(true);
});

test('reconhece EANs e UPC apenas numéricos, com zeros preservados', () => {
  expect(scannedGtin('0789012345678')).toBe('0789012345678');
  expect(scannedGtin('12345678')).toBe('12345678');
  expect(scannedGtin('1234')).toBeNull();
  expect(scannedGtin('A12345678')).toBeNull();
  expect(cameraError({ name:'NotAllowedError' })).toMatch(/Permissão/);
});
