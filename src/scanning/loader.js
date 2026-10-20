// Dependências do navegador carregadas apenas quando usuário solicita câmera/OCR.
// URLs fixadas em versões específicas. Nenhuma foto é enviada ao servidor Validade Zero.
const cache = new Map();
export const ZXING_CDN = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
export const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

export function loadBrowserScript(url, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => window[globalName]
        ? resolve(window[globalName])
        : reject(new Error('A biblioteca de leitura não foi inicializada.'));
      script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca. Verifique a conexão.'));
      document.head.appendChild(script);
    }).catch(error => { cache.delete(url); throw error; }));
  }
  return cache.get(url);
}
