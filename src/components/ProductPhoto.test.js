import { PHOTO_MAX_INPUT_BYTES, validatePhotoInput } from '../cloud/photo';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import ProductPhoto from './ProductPhoto';

jest.mock('../cloud/photo', () => {
  const actual = jest.requireActual('../cloud/photo');
  return { ...actual, prepareProductPhoto: jest.fn(async () =>
    new Blob(['JPG'], { type: 'image/jpeg' })) };
});

const userId = '11111111-1111-4111-8111-111111111111';
const path = userId + '/000123/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg';
let originalCreate, originalRevoke;
beforeEach(() => {
  originalCreate = URL.createObjectURL; originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:test-photo');
  URL.revokeObjectURL = jest.fn();
});
afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

test('valida formato e tamanho antes de enviar imagem', () => {
  expect(() => validatePhotoInput(new File(['a'], 'foto.heic', { type: 'image/heic' }))).toThrow(/JPG/);
  expect(() => validatePhotoInput(new File(['a'], 'foto.jpg', { type: 'image/jpeg' }))).not.toThrow();
  expect(() => validatePhotoInput({ size: PHOTO_MAX_INPUT_BYTES + 1, type: 'image/jpeg' })).toThrow(/8 MB/);
});

test('pede foto apenas quando ausente e reutiliza após salvar no cadastro', async () => {
  const cloud = {
    uploadProductPhoto: jest.fn(async () => path),
    downloadProductPhoto: jest.fn(async () => new Blob(['JPG'], { type: 'image/jpeg' }))
  };
  function Wrapper() {
    const [item, setItem] = useState({ name: 'BISCOITO', code: '000123', photoPath: '' });
    return <ProductPhoto cloud={cloud} userId={userId} product={item}
      onPhotoSaved={(code, photoPath) => setItem(current => ({ ...current, photoPath }))}/>;
  }
  render(<Wrapper/>);
  expect(screen.getByText(/ainda não tem fotografia/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Selecionar fotografia do produto'), {
    target: { files: [new File(['JPG'], 'foto.jpg', { type: 'image/jpeg' })] }
  });
  await waitFor(() => expect(cloud.uploadProductPhoto).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByText('Fotografia cadastrada')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByAltText(/Fotografia cadastrada: BISCOITO/)).toBeInTheDocument());
  expect(screen.queryByText(/ainda não tem fotografia/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Trocar foto/ })).toBeInTheDocument();
  expect(cloud.downloadProductPhoto).toHaveBeenCalledWith(path, userId, '000123');
});
