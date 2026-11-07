import { MAX_IMAGE_BYTES, extensionMime, type ImageMime } from './imageImport';

function normalizedMime(value: string): ImageMime | null {
  switch (value.trim().toLowerCase()) {
    case 'image/svg+xml': return 'image/svg+xml';
    case 'image/png': return 'image/png';
    case 'image/jpeg': case 'image/jpg': return 'image/jpeg';
    case 'image/webp': return 'image/webp';
    default: return null;
  }
}

/** MIME is authoritative when present. An image suffix never rescues a refused MIME. */
export function validateImageFile(file: File): ImageMime {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Los archivos de imagen no deben superar los 10 MiB.');
  const byExtension = extensionMime(file.name);
  const byMime = normalizedMime(file.type);
  if (file.type && !byMime) throw new Error('Formatos de imagen admitidos: SVG, PNG, JPEG y WebP.');
  const mime = byMime ?? byExtension;
  if (!mime) throw new Error('Formatos de imagen admitidos: SVG, PNG, JPEG y WebP.');
  if (byMime && byExtension && byMime !== byExtension) throw new Error('El tipo MIME de la imagen y la extensión del archivo no coinciden.');
  return mime;
}
