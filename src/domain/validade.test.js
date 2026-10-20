import { daysUntil, formatDate, isValidEntry, parseDateOnly, sortByExpiry, statusOf, summarize, toCsv } from './validade';

const now = new Date(2026, 9, 20);

test('validates dates without accepting nonexistent days', () => {
  expect(parseDateOnly('2026-02-30')).toBeNull();
  expect(parseDateOnly('2028-02-29')).not.toBeNull();
  expect(parseDateOnly('2026-2-5')).toBeNull();
});
test('calculates status with local calendar dates and thresholds', () => {
  expect(daysUntil('2026-10-20', now)).toBe(0);
  expect(statusOf('2026-10-19', now)).toBe('expired');
  expect(statusOf('2026-10-20', now)).toBe('urgent');
  expect(statusOf('2026-10-27', now)).toBe('urgent');
  expect(statusOf('2026-10-28', now)).toBe('attention');
  expect(statusOf('2026-11-19', now)).toBe('attention');
  expect(statusOf('2026-11-20', now)).toBe('ok');
});
test('calculates across daylight saving transitions', () => {
  expect(daysUntil('2026-03-09', new Date(2026, 2, 8))).toBe(1);
});
test('sorts FEFO and groups status counts', () => {
  const entries = [
    { name: 'B', batch: '2', quantity: 3, expiration: '2026-10-29' },
    { name: 'A', batch: '1', quantity: 2, expiration: '2026-10-19' }
  ];
  expect(sortByExpiry(entries)[0].name).toBe('A');
  expect(summarize(entries, now)).toMatchObject({ total: 2, units: 5, expired: 1, attention: 1 });
});
test('requires complete and valid positive-quantity entries', () => {
  const entry = { id: 'x', name: 'Produto', code: '', batch: 'L', sector: 'Mercearia', quantity: 5, expiration: '2026-10-20' };
  expect(isValidEntry(entry)).toBe(true);
  expect(isValidEntry({ ...entry, quantity: 0 })).toBe(false);
  expect(isValidEntry({ ...entry, expiration: '2026-02-30' })).toBe(false);
});
test('escapes CSV values to reduce spreadsheet formula injection', () => {
  const content = toCsv([{ name: '=2+3', code: '123', batch: 'L', sector: 'Outros', quantity: 3, expiration: '2026-11-01' }]);
  expect(content).toContain("\"'=2+3\"");
  expect(content).toContain('Produto');
  expect(formatDate('2026-10-20')).toBe('20/10/2026');
});
