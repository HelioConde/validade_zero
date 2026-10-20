import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { prepareProductPhoto } from '../cloud/photo';

export default function ProductPhoto({ product, cloud, userId, onPhotoSaved, localMode = false }) {
  const captureRef = useRef(null);
  const fileRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let mounted = true;
    let url = '';
    setPhotoUrl('');
    if (product.photoPath) {
      cloud.downloadProductPhoto(product.photoPath, userId, product.code)
        .then(blob => {
          if (!mounted) return;
          url = URL.createObjectURL(blob);
          setPhotoUrl(url);
          setMessage('');
        })
        .catch(() => { if (mounted) setMessage('Não foi possível exibir a fotografia. Tente novamente.'); });
    }
    return () => {
      mounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [product.code, product.photoPath, userId, cloud, reload]);

  async function upload(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(true); setMessage('Preparando a fotografia…');
    try {
      const blob = await prepareProductPhoto(file);
      setMessage(localMode ? 'Salvando foto neste navegador…' : 'Enviando foto para o Supabase…');
      // No modo nuvem, associe ao cadastro privado antes de gravar a imagem.
      // Não crie cadastro com nome provisório.
      if (!localMode && (product.source === 'central' || product.source === 'manual')) {
        if (!product.name || product.name === 'Produto não cadastrado') {
          throw new Error('Informe o nome do produto antes de cadastrar a fotografia.');
        }
        await cloud.adoptCentralProduct(product);
      }
      const photoPath = await cloud.uploadProductPhoto({
        code: product.code, userId, blob, oldPath: product.photoPath || ''
      });
      onPhotoSaved?.(product.code, photoPath);
      setMessage('Fotografia salva no cadastro. Não será pedida novamente para este EAN.');
      setReload(current => current + 1);
    } catch (error) {
      setMessage('Não foi possível salvar a fotografia: ' + (error?.message || 'erro inesperado.'));
    } finally {
      setBusy(false);
    }
  }

  return <section className="product-photo" aria-label="Fotografia do produto">
    <div className="product-photo__visual">
      {photoUrl ? <img src={photoUrl} alt={'Fotografia cadastrada: ' + product.name}/>
        : <div className="product-photo__placeholder"><Icon name="camera" size={24}/><span>{product.photoPath ? 'Carregando foto…' : 'Sem foto'}</span></div>}
    </div>
    <div className="product-photo__content">
      <strong>{product.photoPath ? 'Fotografia cadastrada' : 'Este produto ainda não tem fotografia'}</strong>
      <p>{product.photoPath
        ? 'Foto reutilizada automaticamente nas próximas consultas deste EAN.'
        : 'Fotografe uma vez para reconhecer o produto visualmente nos próximos registros. Você pode continuar sem foto.'}</p>
      <div className="product-photo__actions">
        <button type="button" className="btn btn--outline" disabled={busy} onClick={() => captureRef.current?.click()}>
          <Icon name="camera" size={16}/>{product.photoPath ? 'Trocar foto' : 'Cadastrar foto com câmera'}
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
          Escolher arquivo
        </button>
        {product.photoPath && !photoUrl && <button type="button" className="btn btn--ghost" disabled={busy}
          onClick={() => setReload(current => current + 1)}>Recarregar imagem</button>}
      </div>
      <input className="sr-only" type="file" ref={captureRef} accept="image/jpeg,image/png,image/webp" capture="environment"
        aria-label="Tirar fotografia do produto" tabIndex={-1} onChange={upload}/>
      <input className="sr-only" type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp"
        aria-label="Selecionar fotografia do produto" tabIndex={-1} onChange={upload}/>
      {message && <p className="product-photo__status" role="status">{message}</p>}
      <small>{localMode ? 'Foto armazenada só neste navegador (IndexedDB), não sincronizada.' : 'Foto JPEG otimizada, até 2 MB, guardada em pasta privada da sua conta.'}</small>
    </div>
  </section>;
}
