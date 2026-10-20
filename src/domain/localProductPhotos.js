// Fotos da demonstração permanecem SOMENTE neste navegador (IndexedDB).
// Nunca enviamos imagens locais automaticamente ao Supabase.
const DB_NAME = 'validade-zero-product-photos';
const STORE = 'photos';
const VERSION = 1;
const codePattern = /^\d{1,14}$/;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Este navegador não oferece IndexedDB. Use a versão em nuvem para salvar a fotografia.'));
    const req = window.indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('Não foi possível abrir o armazenamento local de fotografias.'));
  });
}

async function withStore(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const req = action(store);
      let value;
      req.onsuccess = () => { value = req.result; };
      req.onerror = () => reject(new Error('Falha ao acessar fotografia neste navegador.'));
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(new Error('A gravação local da fotografia falhou.'));
      tx.onabort = () => reject(new Error('A gravação local da fotografia foi interrompida.'));
    });
  } finally { db.close(); }
}

export function localProductPhotoPath(code) { return 'local:' + code; }

export async function loadLocalProductPhoto(code) {
  if (!codePattern.test(String(code))) return null;
  return (await withStore('readonly', store => store.get(String(code)))) || null;
}

export const localPhotoApi = {
  async downloadProductPhoto(path, _userId, code) {
    if (path !== localProductPhotoPath(code)) throw new Error('Fotografia local inválida.');
    const photo = await loadLocalProductPhoto(code);
    if (!photo) throw new Error('Fotografia não encontrada neste navegador.');
    return photo;
  },
  async uploadProductPhoto({ code, blob }) {
    if (!codePattern.test(String(code))) throw new Error('EAN ou código interno inválido.');
    if (!(blob instanceof Blob) || blob.type !== 'image/jpeg' || !blob.size || blob.size > 2 * 1024 * 1024) {
      throw new Error('Envie uma fotografia JPEG de até 2 MB.');
    }
    await withStore('readwrite', store => store.put(blob, String(code)));
    return localProductPhotoPath(code);
  }
};
