// Solicita capacidades da câmera apenas quando presentes. Navegadores sem suporte
// continuam escaneando normalmente com o foco físico padrão do aparelho.
export function cameraCapabilities(track) {
  try { return track?.getCapabilities?.() || {}; }
  catch { return {}; }
}

export function supportedFocusMode(capabilities) {
  const options = capabilities?.focusMode;
  if (!Array.isArray(options)) return null;
  return options.includes('continuous') ? 'continuous'
    : options.includes('auto') ? 'auto' : null;
}

export async function requestAutoFocus(track) {
  const mode = supportedFocusMode(cameraCapabilities(track));
  if (!mode || typeof track?.applyConstraints !== 'function') return false;
  try {
    await track.applyConstraints({ advanced: [{ focusMode: mode }] });
    return true;
  } catch { return false; }
}

export function availableZoom(capabilities, track) {
  const capability = capabilities?.zoom;
  const min = capability?.min;
  const max = capability?.max;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || min >= 6) return null;
  const current = track?.getSettings?.()?.zoom;
  const cappedMax = Math.min(max, 6);
  return { min, max: cappedMax, value: Number.isFinite(current)
    ? Math.min(cappedMax, Math.max(min, current)) : Math.max(min, 1) };
}

export async function applyCameraZoom(track, requested) {
  const cap = availableZoom(cameraCapabilities(track), track);
  if (!cap || typeof track?.applyConstraints !== 'function') return false;
  const zoom = Number(requested);
  if (!Number.isFinite(zoom) || zoom < cap.min || zoom > cap.max) return false;
  try { await track.applyConstraints({ advanced: [{ zoom }] }); return true; }
  catch { return false; }
}

export function supportsTorch(capabilities) {
  return capabilities?.torch === true ||
    (Array.isArray(capabilities?.torch) && capabilities.torch.includes(true));
}

export async function applyCameraTorch(track, enabled) {
  if (!supportsTorch(cameraCapabilities(track)) || typeof track?.applyConstraints !== 'function') return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: Boolean(enabled) }] });
    return true;
  } catch { return false; }
}
