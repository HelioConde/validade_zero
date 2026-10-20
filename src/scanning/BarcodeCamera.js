import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { cameraError, startBarcodeScanner } from './barcode';

export default function BarcodeCamera({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const detectedRef = useRef(onDetected);
  const [status, setStatus] = useState('Solicitando permissão para abrir a câmera…');
  const [error, setError] = useState('');
  useEffect(() => { detectedRef.current = onDetected; }, [onDetected]);
  useEffect(() => {
    let disposed = false;
    let stop = () => {};
    startBarcodeScanner(videoRef.current, code => {
      if (!disposed) detectedRef.current(code);
    }).then(cleanup => {
      if (disposed) cleanup();
      else { stop = cleanup; setStatus('Aponte o código de barras para a câmera.'); }
    }).catch(cause => {
      if (!disposed) {
        setError(cameraError(cause));
        setStatus('');
      }
    });
    return () => { disposed = true; stop(); };
  }, []);
  return <section className="scanner-window" aria-label="Leitor de EAN">
    <div className="scanner-window__heading"><strong><Icon name="scan" size={20}/> Ler EAN pela câmera</strong>
      <button type="button" className="icon-button" aria-label="Fechar leitor de EAN" onClick={onClose}><Icon name="close" size={18}/></button>
    </div>
    <video className="scanner-video" ref={videoRef} autoPlay playsInline muted aria-label="Visualização da câmera para código de barras"/>
    {status && <p role="status">{status}</p>}
    {error && <p className="scanner-error" role="alert">{error}</p>}
    <p className="scanner-hint">Centralize o EAN-8, EAN-13 ou UPC na imagem. A leitura preenche a busca; confira o produto antes de cadastrar o lote.</p>
    <button type="button" className="btn btn--outline" onClick={onClose}>Voltar para digitação</button>
  </section>;
}
