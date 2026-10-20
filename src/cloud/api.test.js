import { requestError } from './api';

test('retorna mensagem de erro conhecida e evita mostrar JSON desconhecido', () => {
  expect(requestError({ message: 'Sessão expirada' })).toBe('Sessão expirada');
  expect(requestError({ msg: 'Falha de acesso' })).toBe('Falha de acesso');
  expect(requestError(null)).toMatch(/Supabase/);
});