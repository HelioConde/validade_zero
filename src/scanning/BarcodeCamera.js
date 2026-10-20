import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { cameraError, startBarcodeScanner } from './barcode';

export default function BarcodeCamera({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const detectedRef = useRef(onDetected);
  const cameraControls = useRef(null);
  const [status, setStatus] = useState('Solicitando permissão para abrir a câmera…');
  const [error, setError] = useState('');
  const [focusInfo, setFocusInfo] = useState('');
  const [canRefocus, setCanRefocus] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  useEffect(() => { detectedRef.current = onDetected; }, [onDetected]);
  useEffect(() => {
    let disposed = false;
    let stop = () => {};
    startBarcodeScanner(videoRef.current, code => {
      if (!disposed) detectedRef.current(code);
    }, options => {
      if (disposed) return;
      cameraControls.current = options;
      setCanRefocus(options.focusSupported);
      setFocusInfo(options.autofocus
        ? 'Foco automático contínuo ativado. Mantenha o EAN no centro.'
        : 'O navegador não permite ajustar o foco. Afaste ou aproxime a câmera lentamente até a imagem ficar nítida.');
      setZoom(options.zoom);
      setTorchSupported(options.torch);
    }).then(cleanup => {
      if (disposed) cleanup();
      else { stop = cleanup; setStatus('Aponte o código de barras para a câmera.'); }
    }).catch(cause => {
      if (!disposed) {
        setError(cameraError(cause));
        setStatus('');
      }
    });
    return () => { disposed = true; cameraControls.current = null; stop(); };
  }, []);
  async function refocus() {
    const ready = await cameraControls.current?.refocus?.();
    setFocusInfo(ready
      ? 'Foco solicitado novamente. Mantenha o código imóvel por um instante.'
      : 'Foco manual indisponível neste navegador. Experimente ajustar a distância ou o zoom.');
  }

  async function changeZoom(value) {
    const requested = Number(value);
    if (!Number.isFinite(requested)) return;
    const changed = await cameraControls.current?.setZoom?.(requested);
    if (changed) setZoom(current => current ? { ...current, value: requested } : current);
    else setFocusInfo('O dispositivo não conseguiu aplicar o zoom. Experimente alterar a distância.');
  }

  async function toggleTorch() {
    const next = !torchOn;
    if (await cameraControls.current?.setTorch?.(next)) setTorchOn(next);
    else setFocusInfo('Não foi possível controlar a lanterna neste navegador.');
  }

  return <section className="scanner-window" aria-label="Leitor de EAN">
    <div className="scanner-window__heading"><strong><Icon name="scan" size={20}/> Ler EAN pela câmera</strong>
      <button type="button" className="icon-button" aria-label="Fechar leitor de EAN" onClick={onClose}><Icon name="close" size={18}/></button>
    </div>
    <div className="barcode-viewfinder">
      <video className="scanner-video" ref={videoRef} autoPlay playsInline muted aria-label="Visualização da câmera para código de barras"/>
      <div className="barcode-viewfinder__guide" aria-hidden="true"><span/></div>
    </div>
    {focusInfo && <p className="scanner-focus-info" role="status">{focusInfo}</p>}
    {(canRefocus || zoom || torchSupported) && <div className="scanner-controls" aria-label="Ajustes da câmera para leitura do EAN">
      {canRefocus && <button type="button" className="btn btn--outline" onClick={refocus}>
        <Icon name="scan" size={17}/> Reajustar foco
      </button>}
      {zoom && <label className="scanner-zoom">Zoom <input type="range" min={zoom.min} max={zoom.max}
        step="0.1" value={zoom.value} aria-label="Zoom da câmera"
        onChange={event => changeZoom(event.target.value)}/><strong>{zoom.value.toFixed(1)}×</strong></label>}
      {torchSupported && <button type="button" className="btn btn--outline" aria-pressed={torchOn}
        onClick={toggleTorch}>{torchOn ? 'Desligar luz' : 'Ligar luz'}</button>}
    </div>}
    {status && <p role="status">{status}</p>}
    {error && <p className="scanner-error" role="alert">{error}</p>}
    <p className="scanner-hint">Mantenha o código EAN dentro da moldura, na horizontal e com boa iluminação. Se ficar borrado, afaste o celular alguns centímetros, use zoom quando disponível ou reajuste o foco. A leitura preenche o campo automaticamente.</p>
    <button type="button" className="btn btn--outline" onClick={onClose}>Voltar para digitação</button>
  </section>;
}
