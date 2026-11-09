export type PhotoSettings = Readonly<{
  threshold: number | null;
  foreground: 'dark' | 'light';
  crop: Readonly<{ x: number; y: number; width: number; height: number }>;
  /** Foreground component area in processing pixels; zero keeps every island. */
  minComponentArea: number;
  /** Destructive outer-silhouette choice, never enabled implicitly. */
  fillHoles: boolean;
}>;

export const DEFAULT_PHOTO_SETTINGS: PhotoSettings = Object.freeze({
  threshold: null,
  foreground: 'dark',
  crop: Object.freeze({ x: 0, y: 0, width: 1, height: 1 }),
  minComponentArea: 0,
  fillHoles: false
});

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePhotoCrop(value: unknown): PhotoSettings['crop'] {
  if (!record(value)) throw new Error('El recorte (crop) debe contener x, y, width y height entre 0 y 1.');
  const { x, y, width, height } = value;
  if (
    typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number' ||
    ![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 ||
    x >= 1 || y >= 1 || width > 1 || height > 1 || x + width > 1 + Number.EPSILON || y + height > 1 + Number.EPSILON
  ) throw new Error('Recorte (crop) inválido: elegí una zona no vacía comprendida íntegramente entre 0 y 1.');
  return Object.freeze({ x, y, width, height });
}

/** Validate and detach settings before handing them to asynchronous work. */
export function parsePhotoSettings(value: unknown): PhotoSettings {
  if (!record(value)) throw new Error('Los ajustes de la foto son inválidos.');
  const { threshold, foreground, minComponentArea, fillHoles } = value;
  if (threshold !== null && (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 0 || threshold > 255)) {
    throw new Error('El umbral (threshold) debe ser automático (null) o un entero entre 0 y 255.');
  }
  if (foreground !== 'dark' && foreground !== 'light') throw new Error('Elegí explícitamente un primer plano oscuro o claro.');
  if (typeof minComponentArea !== 'number' || !Number.isInteger(minComponentArea) || minComponentArea < 0 || minComponentArea > 1_000_000) {
    throw new Error('La limpieza debe ser un área entera entre 0 y 1 000 000 de píxeles de procesamiento.');
  }
  if (typeof fillHoles !== 'boolean') throw new Error('El relleno de agujeros debe ser una opción booleana explícita.');
  return Object.freeze({ threshold, foreground, crop: parsePhotoCrop(value.crop), minComponentArea, fillHoles });
}
