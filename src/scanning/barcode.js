import { loadBrowserScript, ZXING_CDN } from './loader';
import { cameraCapabilities, requestAutoFocus, availableZoom, applyCameraZoom, supportsTorch, applyCameraTorch } from './focus';

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a'];

export function scannedGtin(value) {
  const code = String(value || '').trim();
  return /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(code) ? code : null;
}

export function cameraError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return 'Permissão da câmera negada. Libere o acesso nas configurações do navegador ou digite o código.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'Nenhuma câmera disponível neste dispositivo. Digite o EAN manualmente.';
  }
  return (error?.message || 'Não foi possível abrir a câmera.') + ' Você pode digitar o EAN manualmente.';
}

export async function startBarcodeScanner(video, onCode, onCameraReady) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('A câmera exige HTTPS e um dispositivo compatível.');
  }
  let disposed = false;
  let stream = null;
  let interval = null;
  let controls = null;
  let activeTrack = null;
  const stop = () => {
    disposed = true;
    if (interval !== null) window.clearInterval(interval);
    if (controls) { try { Promise.resolve(controls.stop()).catch(() => {}); } catch { /* dispositivo já fechado */ } }
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (!stream && video?.srcObject?.getTracks) video.srcObject.getTracks().forEach(track => track.stop());
    if (video) { video.pause(); video.srcObject = null; }
  };
  async function prepareCamera(track) {
    if (!track || disposed) return;
    activeTrack = track;
    const caps = cameraCapabilities(track);
    const autofocus = await requestAutoFocus(track);
    if (disposed) return;
    const zoom = availableZoom(caps, track);
    onCameraReady?.({
      focusSupported: Boolean(caps.focusMode && Array.isArray(caps.focusMode) &&
        caps.focusMode.some(m => m === 'continuous' || m === 'auto')),
      autofocus,
      zoom,
      torch: supportsTorch(caps),
      refocus: () => requestAutoFocus(activeTrack),
      setZoom: value => applyCameraZoom(activeTrack, value),
      setTorch: enabled => applyCameraTorch(activeTrack, enabled)
    });
  }
  try {
    const Native = window.BarcodeDetector;
    const supported = Native?.getSupportedFormats
      ? await Native.getSupportedFormats().catch(() => [])
      : [];
    const formats = BARCODE_FORMATS.filter(format => supported.includes(format));
    if (disposed) return stop;
    if (formats.length) {
      const detector = new Native({ formats });
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (disposed) { stop(); return stop; }
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await prepareCamera(stream.getVideoTracks?.()[0]);
      let busy = false;
      interval = window.setInterval(async () => {
        if (busy || disposed || video.readyState < 2) return;
        busy = true;
        try {
          const matches = await detector.detect(video);
          if (disposed) return;
          const code = matches.map(item => scannedGtin(item.rawValue)).find(Boolean);
          if (code) { stop(); onCode(code); }
        } catch { /* quadro desfocado; tentar próximo */ }
        finally { busy = false; }
      }, 220);
    } else {
      const ZXing = await loadBrowserScript(ZXING_CDN, 'ZXingBrowser');
      if (disposed) return stop;
      const reader = new ZXing.BrowserMultiFormatReader();
      controls = await reader.decodeFromConstraints({
        audio: false, video: { facingMode: { ideal: 'environment' },
          width: { ideal: 1920 }, height: { ideal: 1080 } }
      }, video, result => {
        if (disposed || !result) return;
        const code = scannedGtin(typeof result.getText === 'function' ? result.getText() : result.text);
        if (code) { stop(); onCode(code); }
      });
      if (disposed) stop();
      else await prepareCamera(video?.srcObject?.getVideoTracks?.()[0]);
    }
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}
