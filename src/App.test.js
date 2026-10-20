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
  fireEvent.change(screen.getByLabelText('EAN / código interno *'), { target: { value: '0789012345678' } });
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
  expect(screen.getByText(/Informe o EAN ou código interno numérico/)).toBeInTheDocument();
  expect(screen.getByText(/Informe o lote do produto/)).toBeInTheDocument();
  expect(screen.getByText(/Informe uma data de validade válida/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Nome do produto/ })).toHaveFocus();
});

test('EAN obrigatório: não salva lote sem código e rejeita letras', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar primeiro lote/i }));
  fireEvent.change(screen.getByLabelText('Nome do produto *'), { target: { value: 'BISCOITO' } });
  fireEvent.change(screen.getByLabelText('Lote *'), { target: { value: 'L-001' } });
  fireEvent.change(screen.getByLabelText('Data de validade *'), { target: { value: '2030-12-31' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar lote' }));
  expect(screen.getByText(/Informe o EAN ou código interno numérico/)).toBeInTheDocument();
  expect(screen.getByLabelText('EAN / código interno *')).toHaveFocus();
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

  fireEvent.change(screen.getByLabelText('EAN / código interno *'), { target: { value: 'EAN-INVALIDO' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar lote' }));
  expect(screen.getByText(/Informe o EAN ou código interno numérico/)).toBeInTheDocument();
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

  fireEvent.change(screen.getByLabelText('EAN / código interno *'), { target: { value: '0789012345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar lote' }));
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))[0].code).toBe('0789012345678');
});

test('os dois campos exibem controle de câmera próximo ao input', () => {
  render(<App />);
  expect(screen.getByLabelText('Código EAN / código interno').parentElement.querySelector('.ean-input-camera')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Escanear EAN com a câmera' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar primeiro lote/i }));
  expect(screen.getByLabelText('EAN / código interno *').parentElement.querySelector('.ean-input-camera')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Escanear EAN do lote com a câmera' })).toBeInTheDocument();
});
