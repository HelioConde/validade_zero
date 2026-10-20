import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { recogniseExpiry } from './expiry';

export default function ExpiryCamera({ onConfirm }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [rawText, setRawText] = useState('');
  const videoRef = useRef(null);
  const captureRef = useRef(null);
  const imageRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!preview) return undefined;
    let cancelled = false;
    const video = videoRef.current;
    async function openCamera() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('O navegador precisa de HTTPS e permissão de câmera.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: 'environment' } }
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        if (!cancelled) { setMessage('Não foi possível iniciar a câmera: ' + error.message + '. Você pode fotografar ou selecionar uma imagem.'); setPreview(false); }
      }
    }
    openCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (video) { video.pause(); video.srcObject = null; }
    };
  }, [preview]);

  async function processImage(blob) {
    if (!blob || !blob.type.startsWith('image/')) { setMessage('Selecione uma imagem válida.'); return; }
    if (blob.size > 8 * 1024 * 1024) { setMessage('A imagem deve ter no máximo 8 MB.'); return; }
    setBusy(true); setMessage('Reconhecendo a data na imagem…'); setCandidates([]); setRawText('');
    try {
      const result = await recogniseExpiry(blob);
      setRawText(result.text.slice(0, 600));
      setCandidates(result.candidates);
      setMessage(result.candidates.length
        ? 'Selecione a validade correta. Nenhuma data será salva sem confirmação.'
        : 'Não encontrei uma data completa confiável. Fotografe mais perto ou digite a validade manualmente.');
    } catch (error) {
      setMessage('Não foi possível processar a imagem: ' + error.message + '. Preencha a data manualmente.');
    } finally { setBusy(false); }
  }

  async function snap() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) {
      setMessage('A câmera ainda não está pronta para fotografar.');
      return;
    }
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 1600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) { setMessage('Não foi possível capturar a imagem.'); return; }
    ctx.filter = 'grayscale(1) contrast(1.5)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    setPreview(false); // libera câmera antes do processamento pesado
    await processImage(blob);
  }

  function close() {
    setPreview(false); setOpen(false); setBusy(false);
    setMessage(''); setCandidates([]); setRawText('');
  }

  return <div className="expiry-scanner no-print">
    {!open ? <button type="button" className="btn btn--outline" onClick={() => setOpen(true)}>
      <Icon name="camera" size={17}/> Ler validade pela câmera (OCR)
    </button> : <section className="expiry-scanner__panel" aria-label="Reconhecimento da validade">
      <div className="scanner-window__heading"><strong><Icon name="camera" size={20}/> Reconhecer validade</strong>
        <button type="button" className="icon-button" aria-label="Fechar leitor de validade" onClick={close}><Icon name="close" size={18}/></button>
      </div>
      <p>Enquadre somente a data impressa, com boa luz. Confira se não é a data de fabricação.</p>
      {preview && <video ref={videoRef} className="scanner-video" autoPlay playsInline muted aria-label="Câmera para validade"/>}
      <div className="expiry-scanner__buttons">
        {!preview && <button type="button" className="btn btn--outline" disabled={busy} onClick={() => { setMessage(''); setPreview(true); }}><Icon name="camera" size={17}/> Abrir câmera</button>}
        {preview && <button type="button" className="btn btn--primary" disabled={busy} onClick={snap}><Icon name="camera" size={17}/> Fotografar data</button>}
        <button type="button" className="btn btn--outline" disabled={busy} onClick={() => captureRef.current?.click()}>Câmera do celular</button>
        <button type="button" className="btn btn--outline" disabled={busy} onClick={() => imageRef.current?.click()}>Selecionar imagem</button>
      </div>
      <input ref={captureRef} tabIndex={-1} className="sr-only" aria-label="Fotografar validade" type="file" accept="image/*" capture="environment"
        onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) { setPreview(false); processImage(file); } }}/>
      <input ref={imageRef} tabIndex={-1} className="sr-only" aria-label="Selecionar imagem da validade" type="file" accept="image/*"
        onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) { setPreview(false); processImage(file); } }}/>
      {busy && <p className="ocr-progress" role="status">Analisando imagem localmente. A primeira leitura pode baixar o modelo de reconhecimento…</p>}
      {message && <p className="scanner-notice" role="status">{message}</p>}
      {candidates.length > 0 && <div className="ocr-candidates">
        <strong>Datas encontradas — escolha após conferir a embalagem</strong>
        {candidates.map(item => <button type="button" key={item.date} className="ocr-candidate" onClick={() => { onConfirm(item.date); close(); }}>
          <Icon name="calendar" size={18}/> <span>{item.date.split('-').reverse().join('/')}</span>
          <small>{item.labelled ? 'Próxima a VAL/VENC/EXP' : 'Sem indicação de validade'}</small>
          <Icon name="check" size={18}/>
        </button>)}
      </div>}
      {rawText && <details className="ocr-original"><summary>Ver texto reconhecido</summary><pre>{rawText}</pre></details>}
      <p className="scanner-hint">A imagem não é enviada ao Supabase. O OCR roda no dispositivo; o motor e o modelo são baixados sob demanda. Você ainda deve confirmar manualmente a data selecionada.</p>
    </section>}
  </div>;
}
