
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const PHOTO_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export function validatePhotoInput(file) {
  if (!file || !ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Escolha uma fotografia JPG, PNG ou WebP. Imagens HEIC não são aceitas neste navegador.');
  }
  if (file.size <= 0 || file.size > PHOTO_MAX_INPUT_BYTES) {
    throw new Error('A fotografia original deve ter no máximo 8 MB.');
  }
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a fotografia.')); };
    image.src = url;
  });
}

export async function prepareProductPhoto(file) {
  validatePhotoInput(file);
  const image = await loadImage(file);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width < 50 || height < 50 || width > 15000 || height > 15000) {
    throw new Error('A fotografia precisa ter dimensões válidas e pelo menos 50 pixels.');
  }
  const scale = Math.min(1, 1200 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('O navegador não conseguiu processar a fotografia.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.67, 0.52]) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob?.type === 'image/jpeg' && blob.size > 0 && blob.size <= PHOTO_MAX_OUTPUT_BYTES) return blob;
  }
  throw new Error('Não foi possível comprimir a fotografia para menos de 2 MB.');
}
