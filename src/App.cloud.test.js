import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { STORAGE_KEY } from './domain/validade';
import { CATALOG_STORAGE_KEY } from './domain/catalogo';
import { cloudApi, signIn } from './cloud/api';

jest.mock('./cloud/api', () => ({
  CLOUD_ENABLED: true,
  hasStoredCloudSession: jest.fn(() => false),
  restoreSession: jest.fn(async () => null),
  signIn: jest.fn(async () => ({ id: 'user-123' })),
  signOut: jest.fn(async () => {}),
  signUp: jest.fn(),
  cloudApi: {
    listLots: jest.fn(async () => []),
    countCatalog: jest.fn(async () => 0),
    migrateLocalCatalog: jest.fn(async list => list.length),
    migrateLocalLots: jest.fn(async list => list.length),
    findProduct: jest.fn(async () => null)
  }
}));

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => jest.restoreAllMocks());

function registerSample() {
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar primeiro lote/i }));
  fireEvent.change(screen.getByPlaceholderText('Ex.: Leite integral 1 L'), { target: { value: 'BISCOITO INTEGRAL' } });
  fireEvent.change(screen.getByPlaceholderText('Ex.: L-2026-001'), { target: { value: 'L-LOCAL-1' } });
  fireEvent.change(screen.getByLabelText('Data de validade *'), { target: { value: '2030-12-31' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar lote' }));
}

async function importSample() {
  const csv = 'codigo;nome;setor_sugerido;revisar\n000123;BISCOITO INTEGRAL;Mercearia;OK\n';
  const file = new File([csv], 'catalogo.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('Arquivo CSV do catálogo'), { target: { files: [file] } });
  await screen.findByText(/Catálogo importado: 1 produtos/);
}

test('visitante entra diretamente no teste sem autenticação', () => {
  render(<App />);
  expect(screen.getByRole('region', { name: 'Modo de demonstração local' })).toBeInTheDocument();
  expect(screen.getByText('Seu controle começa aqui')).toBeInTheDocument();
  expect(signIn).not.toHaveBeenCalled();
});

test('testar, visitar login e voltar não apaga lote nem catálogo locais', async () => {
  render(<App />);
  registerSample();
  await importSample();
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1);
  expect(JSON.parse(window.localStorage.getItem(CATALOG_STORAGE_KEY)).products).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar na nuvem' }));
  expect(screen.getByRole('heading', { name: 'Entrar no Validade Zero' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Continuar sem login/ }));
  expect(screen.getByRole('region', { name: 'Modo de demonstração local' })).toBeInTheDocument();
  expect(screen.getByText('BISCOITO INTEGRAL', { exact: true })).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem(CATALOG_STORAGE_KEY)).products).toHaveLength(1);
});

test('migra lote e catálogo sem sobrescrever dados existentes na nuvem', async () => {
  render(<App />);
  registerSample();
  await importSample();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar na nuvem' }));
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'teste@example.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-segura' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar', exact: true }));
  expect(await screen.findByRole('button', { name: 'Migrar dados locais para a nuvem' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Migrar dados locais para a nuvem' }));
  await waitFor(() => expect(cloudApi.migrateLocalCatalog).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(cloudApi.migrateLocalLots).toHaveBeenCalledTimes(1));
  expect(cloudApi.migrateLocalCatalog.mock.calls[0][0][0]).toMatchObject({code:'000123', name:'BISCOITO INTEGRAL'});
  expect(cloudApi.migrateLocalLots.mock.calls[0][0][0]).toMatchObject({batch:'L-LOCAL-1'});
  await screen.findByText(/Migração concluída/);
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1);
  expect(JSON.parse(window.localStorage.getItem(CATALOG_STORAGE_KEY)).products).toHaveLength(1);
});
