const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function resolveAvatarApiUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Redimensiona e comprime para JPEG antes do upload (mesma ideia do app mobile). */
export async function compressImageForAvatar(
  file: File,
  maxDimension = 1024,
  quality = 0.82
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height, 1));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem');

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem'))),
      'image/jpeg',
      quality
    );
  });
}
