import { ImageTracer, getSvgString, type ImageTracerOptions } from 'imagetracer';
import { DEFAULT_PHOTO_SETTINGS, parsePhotoSettings, type PhotoSettings } from '../lib/import/photoSettings';
import { getPhotoRasterPlan, processPhotoPixels, type ProcessedPhoto } from '../lib/import/photoProcessing';
import { validateImageFile } from '../lib/import/imageValidation';
import type { PhotoTraceResult, PhotoWorkerRequest, PhotoWorkerResponse } from '../lib/import/photoImport';

/** Fresh palette per trace: the installed TypeScript tracer may otherwise mutate palette objects. */
export function photoTraceOptions(): Partial<ImageTracerOptions> {
  return {
    pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }],
    colorsampling: 0, numberofcolors: 2, mincolorratio: 0, colorquantcycles: 1,
    pathomit: 0, blurradius: 0, blurdelta: 0, ltres: 0.1, qtres: 0.1,
    linefilter: false, rightangleenhance: true, strokewidth: 0, layering: 0,
    // In 0.2.2 the hole serializer rounds without the requested precision unless this is -1.
    roundcoords: -1, scale: 1, viewbox: true, desc: false, lcpr: 0, qcpr: 0
  };
}
function emptySVG(width: number, height: number): string {
  // Preview surfaces own their white background; SVG paths are all cutting contours.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"></svg>`;
}

/** Keep only the black layer; drawing the white layer last would overpaint nested islands. */
export function traceProcessedPhoto(pixels: ProcessedPhoto): PhotoTraceResult {
  const { width, height } = pixels.imageData;
  const diagnostics = { ...pixels.diagnostics, warnings: [...pixels.diagnostics.warnings] };
  if (!pixels.traceable) {
    diagnostics.canApply = false;
    diagnostics.warnings.push('No se ejecutó el trazado para esta máscara vacía o demasiado compleja: ajustá los parámetros antes de aplicarla.');
    return { svg: emptySVG(width, height), diagnostics };
  }
  const tracer = new ImageTracer();
  // getSvgString (unlike imageDataToSVG) requires resolved defaults, notably scale.
  const options = tracer.checkOptions(photoTraceOptions());
  const traced = tracer.imageDataToTracedata(pixels.imageData as ImageData, options);
  const foreground = traced.layers[0] as Array<{ isholepath: boolean; holechildren: number[]; segments: unknown[] }>;
  const components = foreground.filter(path => !path.isholepath).length;
  const holes = foreground.filter(path => path.isholepath).length;
  const linkedHoles = foreground.reduce((total, path) => total + path.holechildren.length, 0);
  if (components !== diagnostics.components || holes !== diagnostics.holes || linkedHoles !== holes || foreground.some(path => !path.segments.length)) {
    diagnostics.canApply = false;
    diagnostics.warnings.push('La topología del trazado no coincide con la máscara (componentes o agujeros). Ajustá el umbral o recortá: este resultado no se puede aplicar.');
  }
  const blackOnly = { ...traced, layers: [foreground], palette: [traced.palette[0]] };
  const svg = getSvgString(blackOnly, options);
  if (svg.length > 2_000_000) {
    diagnostics.canApply = false;
    diagnostics.warnings.push('SVG demasiado complejo (límite de 2 millones de caracteres). Recortá el sujeto o elegí una limpieza explícita.');
    return { svg: emptySVG(width, height), diagnostics };
  }
  return { svg, diagnostics };
}
function checkCancellation(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('La préparation photo a été annulée.', 'AbortError');
}

/** All decoding, sampling, segmentation and tracing belong to this disposable Worker, not the UI. */
export async function preparePhotoInWorker(file: File, requestedSettings: PhotoSettings = DEFAULT_PHOTO_SETTINGS, signal?: AbortSignal): Promise<PhotoTraceResult> {
  checkCancellation(signal);
  const mime = validateImageFile(file);
  if (mime === 'image/svg+xml') throw new Error('Elegí una foto PNG, JPEG o WebP, no un SVG.');
  const settings = parsePhotoSettings(requestedSettings);
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
    // No fallback full-size DOM canvas: it would put CPU processing back on the UI thread.
    throw new Error('Este navegador no permite decodificar fotos fuera de la interfaz. Usá un navegador reciente con OffscreenCanvas e ImageBitmap.');
  }
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('No se puede leer la foto: volvé a exportarla como PNG, JPEG o WebP e intentá de nuevo.'); }
  let canvas: OffscreenCanvas | null = null;
  try {
    checkCancellation(signal);
    const plan = getPhotoRasterPlan(bitmap.width, bitmap.height, settings.crop);
    canvas = new OffscreenCanvas(plan.width, plan.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('No se pudieron leer los píxeles de la foto en el Worker. Usá un navegador reciente.');
    context.imageSmoothingEnabled = false;
    const { x, y, width, height } = plan.source;
    context.drawImage(bitmap, x, y, width, height, 0, 0, plan.width, plan.height);
    const imageData = context.getImageData(0, 0, plan.width, plan.height);
    checkCancellation(signal);
    const processed = processPhotoPixels(imageData, { ...settings, crop: DEFAULT_PHOTO_SETTINGS.crop });
    if (width !== plan.width || height !== plan.height) {
      processed.diagnostics.warnings = [
        `Imagen reducida a ${plan.width} × ${plan.height}: pueden desaparecer detalles muy pequeños. Recortá más cerca para conservarlos.`,
        ...processed.diagnostics.warnings
      ];
    }
    const result = traceProcessedPhoto(processed);
    checkCancellation(signal);
    return result;
  } finally {
    bitmap.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

if (typeof self !== 'undefined') {
  const scope = self as unknown as {
    onmessage: ((event: MessageEvent<PhotoWorkerRequest>) => void) | null;
    postMessage(message: PhotoWorkerResponse): void;
  };
  scope.onmessage = async event => {
    // One job per Worker; the client terminates it on success, error, cancellation or timeout.
    scope.onmessage = null;
    try {
      const request = event.data;
      if (!request || request.type !== 'prepare') throw new Error('Solicitud de foto inválida. Reintentá.');
      const result = await preparePhotoInWorker(request.file, request.settings);
      scope.postMessage({ type: 'success', result });
    } catch (error) {
      scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Falló la preparación de la foto. Reintentá.' });
    }
  };
}
