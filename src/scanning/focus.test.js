import {
  cameraCapabilities, supportedFocusMode, requestAutoFocus,
  availableZoom, applyCameraZoom, supportsTorch, applyCameraTorch
} from './focus';

function fakeTrack(capabilities, settings = { zoom: 1 }) {
  return {
    getCapabilities: jest.fn(() => capabilities),
    getSettings: jest.fn(() => settings),
    applyConstraints: jest.fn(async () => {})
  };
}

test('prioriza foco contínuo e solicita a configuração à câmera real', async () => {
  const track = fakeTrack({ focusMode: ['manual', 'auto', 'continuous'] });
  expect(supportedFocusMode(track.getCapabilities())).toBe('continuous');
  expect(await requestAutoFocus(track)).toBe(true);
  expect(track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ focusMode: 'continuous' }] });
});

test('faz fallback para auto e não falha se controle de foco for indisponível', async () => {
  const auto = fakeTrack({ focusMode: ['auto'] });
  expect(await requestAutoFocus(auto)).toBe(true);
  expect(auto.applyConstraints).toHaveBeenCalledWith({ advanced: [{ focusMode: 'auto' }] });
  const unsupported = fakeTrack({});
  expect(await requestAutoFocus(unsupported)).toBe(false);
  expect(unsupported.applyConstraints).not.toHaveBeenCalled();
  expect(await requestAutoFocus(null)).toBe(false);
  const rejected = fakeTrack({ focusMode: ['continuous'] });
  rejected.applyConstraints.mockRejectedValue(new Error('OverconstrainedError'));
  expect(await requestAutoFocus(rejected)).toBe(false);
});

test('zoom só é habilitado na faixa anunciada e nunca ultrapassa limites', async () => {
  const track = fakeTrack({ zoom: { min: 1, max: 3.5 } }, { zoom: 1.5 });
  expect(availableZoom(track.getCapabilities(), track)).toEqual({ min: 1, max: 3.5, value: 1.5 });
  expect(await applyCameraZoom(track, 2)).toBe(true);
  expect(track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ zoom: 2 }] });
  expect(await applyCameraZoom(track, 5)).toBe(false);
  expect(await applyCameraZoom(track, NaN)).toBe(false);
  expect(track.applyConstraints).toHaveBeenCalledTimes(1);
  expect(availableZoom({}, track)).toBeNull();
  expect(availableZoom({ zoom: { min: 1, max: 1 } }, track)).toBeNull();
});

test('lanterna apenas quando o dispositivo declara suporte', async () => {
  const track = fakeTrack({ torch: true });
  expect(supportsTorch(track.getCapabilities())).toBe(true);
  expect(await applyCameraTorch(track, true)).toBe(true);
  expect(track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
  const unsupported = fakeTrack({});
  expect(await applyCameraTorch(unsupported, true)).toBe(false);
  expect(unsupported.applyConstraints).not.toHaveBeenCalled();
});

test('getCapabilities ausente e exceção na API não bloqueiam o leitor', () => {
  expect(cameraCapabilities(null)).toEqual({});
  expect(cameraCapabilities({ getCapabilities: () => { throw new Error('unsupported'); } })).toEqual({});
});
