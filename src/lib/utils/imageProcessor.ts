import {
  terminateWorkers,
  vectorizeImageInWorker
} from './workerManager';
import { tracingOptions, DEFAULT_TRACING_PRESET, type TracingPresetId } from '../import/tracingPresets';

export const MAX_RASTER_PIXELS = 16_000_000;
export const MAX_RASTER_DIMENSION = 8192;

function cancellationError(): DOMException {
  return new DOMException('Se canceló la vectorización de la imagen.', 'AbortError');
}

export function validateRasterDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('La imagen de trama (raster) tiene dimensiones inválidas.');
  }
  if (width > MAX_RASTER_DIMENSION || height > MAX_RASTER_DIMENSION) {
    throw new Error(`Las dimensiones de la imagen no deben superar los ${MAX_RASTER_DIMENSION} px por lado.`);
  }
  if (width * height > MAX_RASTER_PIXELS) {
    throw new Error('Las imágenes de trama están limitadas a 16 megapíxeles para proteger la memoria y la fluidez.');
  }
}

function extractImageData(
  source: CanvasImageSource,
  width: number,
  height: number
): ImageData {
  validateRasterDimensions(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No se pudo crear el lienzo para decodificar la imagen.');
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

async function decodeWithImageBitmap(file: File, signal?: AbortSignal): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    if (signal?.aborted) throw cancellationError();
    return extractImageData(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

function decodeWithImageElement(file: File, signal?: AbortSignal): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = (): void => {
      URL.revokeObjectURL(objectUrl);
      signal?.removeEventListener('abort', abort);
    };
    const abort = (): void => {
      cleanup();
      image.src = '';
      reject(cancellationError());
    };

    image.onload = () => {
      try {
        const data = extractImageData(image, image.naturalWidth || image.width, image.naturalHeight || image.height);
        cleanup();
        resolve(data);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('No se pudo decodificar la imagen.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    image.src = objectUrl;
  });
}

/** Decode on the UI thread, then transfer pixels to the vectorization Worker. */
export async function vectorizeImage(file: File, signal?: AbortSignal, preset: TracingPresetId = DEFAULT_TRACING_PRESET): Promise<string> {
  if (signal?.aborted) throw cancellationError();
  if (preset === 'photo') {
    const { preparePhoto } = await import('../import/photoImport');
    if (signal?.aborted) throw cancellationError();
    const result = await preparePhoto(file, undefined, signal);
    if (!result.diagnostics.canApply) throw new Error(result.diagnostics.warnings.join(' ') || 'Preparé la foto y confirmá un contorno válido.');
    return result.svg;
  }
  const imageData = typeof createImageBitmap === 'function'
    ? await decodeWithImageBitmap(file, signal)
    : await decodeWithImageElement(file, signal);
  if (signal?.aborted) throw cancellationError();
  return vectorizeImageInWorker(imageData, tracingOptions(preset), signal);
}

export function terminateImageProcessor(): void {
  terminateWorkers();
}

/** Read a file as text (for SVG files). */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsText(file);
  });
}

/** Remove passive wrappers before the strict SVG parser validates the source. */
export function cleanSVG(svgString: string): string {
  svgString = svgString.replace(/<\?xml[^?]*\?>/g, '');
  svgString = svgString.replace(/<!--[\s\S]*?-->/g, '');
  if (!svgString.includes('<svg')) {
    throw new Error('SVG inválido: no se encontró ningún elemento <svg>');
  }
  return svgString.trim();
}
