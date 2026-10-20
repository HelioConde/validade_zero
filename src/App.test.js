import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { STORAGE_KEY } from './domain/validade';

beforeEach(() => window.localStorage.clear());

test('renders empty inventory and entry form', () => {
  render(<App />);
  expect(screen.getByText('Seu controle começa aqui')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar primeiro lote/i }));
  expect(screen.getByRole('heading', { name: /Cadastrar novo lote/i })).toBeInTheDocument();
});

test('registers a lot and persists it locally', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar primeiro lote/i }));
  fireEvent.change(screen.getByPlaceholderText('Ex.: Leite integral 1 L'), { target: { value: 'Leite integral' } });
  fireEvent.change(screen.getByPlaceholderText('Ex.: L-2026-001'), { target: { value: 'L01' } });
  fireEvent.change(screen.getByLabelText(/Data de validade/), { target: { value: '2030-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar lote/ }));
  expect(screen.getByText('Leite integral')).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1);
});

test('describes invalid fields individually and focuses the first one', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar primeiro lote/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar lote' }));
  expect(screen.getByText(/Informe o nome do produto/)).toBeInTheDocument();
  expect(screen.getByText(/Informe o lote do produto/)).toBeInTheDocument();
  expect(screen.getByText(/Informe uma data de validade válida/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Nome do produto/ })).toHaveFocus();
});
