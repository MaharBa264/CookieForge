import { parsePhotoCrop, parsePhotoSettings, type PhotoSettings } from './photoSettings';

/** Hard processing budgets, independent of the unchanged legacy 16 MP / 8192 px decoder limits. */
export const MAX_PHOTO_DIMENSION = 1024;
export const MAX_PHOTO_PIXELS = 1_000_000;
export const MAX_PHOTO_COMPONENTS = 256;
export const MAX_PHOTO_HOLES = 256;
export const MAX_PHOTO_BOUNDARY_EDGES = 32_768;

export type PhotoDiagnostics = {
  width: number; height: number; threshold: number; components: number; holes: number;
  removedComponents: number; filledHoles: number; warnings: readonly string[]; canApply: boolean;
};
export type PhotoPixels = Readonly<{ width: number; height: number; data: Uint8ClampedArray }>;
export type ProcessedPhoto = { imageData: PhotoPixels; mask: Uint8Array; diagnostics: PhotoDiagnostics; traceable: boolean };
export type PhotoRasterPlan = Readonly<{
  width: number; height: number;
  source: Readonly<{ x: number; y: number; width: number; height: number }>;
}>;

/** Crop first, then reduce; never enlarge, allocate the original-size canvas or select an object. */
export function getPhotoRasterPlan(width: number, height: number, requestedCrop: PhotoSettings['crop']): PhotoRasterPlan {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new Error('La imagen de trama (raster) tiene dimensiones inválidas.');
  if (width > 8192 || height > 8192) throw new Error('Las dimensiones de la imagen no deben superar los 8192 px por lado.');
  if (width * height > 16_000_000) throw new Error('Las imágenes de trama están limitadas a 16 megapíxeles.');
  const crop = parsePhotoCrop(requestedCrop);
  const x = Math.floor(crop.x * width), y = Math.floor(crop.y * height);
  // Outward rounding includes the entire explicitly requested crop, within one source pixel.
  const sourceWidth = Math.min(width, Math.ceil((crop.x + crop.width) * width)) - x;
  const sourceHeight = Math.min(height, Math.ceil((crop.y + crop.height) * height)) - y;
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / sourceWidth, MAX_PHOTO_DIMENSION / sourceHeight, Math.sqrt(MAX_PHOTO_PIXELS / (sourceWidth * sourceHeight)));
  return {
    width: Math.max(1, Math.floor(sourceWidth * scale)), height: Math.max(1, Math.floor(sourceHeight * scale)),
    source: { x, y, width: sourceWidth, height: sourceHeight }
  };
}

/** Otsu's first maximizing integer threshold makes ties reproducible (dark <= t, light > t). */
function otsu(histogram: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let weight = 0, partialSum = 0, best = -1, threshold = 0;
  for (let i = 0; i < 256; i++) {
    weight += histogram[i]; partialSum += i * histogram[i];
    if (!weight) continue;
    if (weight === total) break;
    const delta = partialSum / weight - (sum - partialSum) / (total - weight);
    const variance = weight * (total - weight) * delta * delta;
    if (variance > best) { best = variance; threshold = i; }
  }
  return threshold;
}

/** Reusable O(N) flood-fill storage: each processing pixel is enqueued at most once per pass. */
function scanRegions(mask: Uint8Array, width: number, height: number, value: 0 | 1, visited: Uint8Array, queue: Uint32Array, visit: (size: number, boundary: boolean, queue: Uint32Array) => void): void {
  visited.fill(0);
  for (let seed = 0; seed < mask.length; seed++) {
    if (visited[seed] || mask[seed] !== value) continue;
    let head = 0, tail = 1, boundary = false;
    queue[0] = seed; visited[seed] = 1;
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) boundary = true;
      // Both masks use cardinal connectivity; diagonal-only contacts are diagnosed below.
      if (x > 0 && !visited[index - 1] && mask[index - 1] === value) { visited[index - 1] = 1; queue[tail++] = index - 1; }
      if (x + 1 < width && !visited[index + 1] && mask[index + 1] === value) { visited[index + 1] = 1; queue[tail++] = index + 1; }
      if (y > 0 && !visited[index - width] && mask[index - width] === value) { visited[index - width] = 1; queue[tail++] = index - width; }
      if (y + 1 < height && !visited[index + width] && mask[index + width] === value) { visited[index + width] = 1; queue[tail++] = index + width; }
    }
    visit(tail, boundary, queue);
  }
}

/** Pure test hook. The production caller runs this only inside the dedicated photo Worker. */
export function processPhotoPixels(source: PhotoPixels, requestedSettings: PhotoSettings): ProcessedPhoto {
  const settings = parsePhotoSettings(requestedSettings);
  const plan = getPhotoRasterPlan(source.width, source.height, settings.crop);
  if (!(source.data instanceof Uint8ClampedArray) || source.data.length !== source.width * source.height * 4) {
    throw new Error('El búfer de píxeles RGBA no coincide con las dimensiones de la foto.');
  }
  const { width, height } = plan, count = width * height;
  const luminance = new Uint8Array(count), histogram = new Uint32Array(256);
  let min = 255, max = 0;
  for (let y = 0; y < height; y++) {
    const sy = plan.source.y + Math.min(plan.source.height - 1, Math.floor((y + 0.5) * plan.source.height / height));
    for (let x = 0; x < width; x++) {
      const sx = plan.source.x + Math.min(plan.source.width - 1, Math.floor((x + 0.5) * plan.source.width / width));
      const offset = (sy * source.width + sx) * 4, alpha = source.data[offset + 3];
      const r = Math.floor((source.data[offset] * alpha + 255 * (255 - alpha) + 127) / 255);
      const g = Math.floor((source.data[offset + 1] * alpha + 255 * (255 - alpha) + 127) / 255);
      const b = Math.floor((source.data[offset + 2] * alpha + 255 * (255 - alpha) + 127) / 255);
      const gray = (77 * r + 150 * g + 29 * b + 128) >> 8;
      luminance[y * width + x] = gray; histogram[gray]++;
      min = Math.min(min, gray); max = Math.max(max, gray);
    }
  }
  const threshold = settings.threshold ?? otsu(histogram, count), mask = new Uint8Array(count);
  for (let i = 0; i < count; i++) mask[i] = Number(settings.foreground === 'dark' ? luminance[i] <= threshold : luminance[i] > threshold);
  const queue = new Uint32Array(count), visited = new Uint8Array(count);
  let removedComponents = 0, holes = 0, filledHoles = 0;
  if (settings.minComponentArea > 0) {
    scanRegions(mask, width, height, 1, visited, queue, (size, _boundary, region) => {
      if (size <= settings.minComponentArea) {
        for (let i = 0; i < size; i++) mask[region[i]] = 0;
        removedComponents++;
      }
    });
  }
  scanRegions(mask, width, height, 0, visited, queue, (size, boundary, region) => {
    if (boundary) return;
    if (settings.fillHoles) {
      for (let i = 0; i < size; i++) mask[region[i]] = 1;
      filledHoles++;
    } else holes++;
  });
  // Filling a hole can join formerly separate islands. Recount the actual final mask.
  let components = 0, foregroundPixels = 0, boundaryComponents = 0;
  scanRegions(mask, width, height, 1, visited, queue, (size, boundary) => {
    components++; foregroundPixels += size; if (boundary) boundaryComponents++;
  });
  let boundaryEdges = 0, diagonalContacts = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x, value = mask[index];
    if (x + 1 < width && value !== mask[index + 1]) boundaryEdges++;
    if (y + 1 < height && value !== mask[index + width]) boundaryEdges++;
    if (value && (x === 0 || x === width - 1)) boundaryEdges++;
    if (value && (y === 0 || y === height - 1)) boundaryEdges++;
    if (x + 1 < width && y + 1 < height && value === mask[index + width + 1] && mask[index + 1] === mask[index + width] && value !== mask[index + 1]) diagonalContacts++;
  }
  const warnings: string[] = [];
  let canApply = true;
  const block = (warning: string) => { warnings.push(warning); canApply = false; };
  if (plan.source.width !== width || plan.source.height !== height) warnings.push(`Imagen reducida a ${width} × ${height}: pueden desaparecer detalles muy pequeños. Recortá más cerca para conservarlos.`);
  if (removedComponents) warnings.push(`${removedComponents} componente(s) eliminado(s) según tu limpieza ≤ ${settings.minComponentArea} píxeles; esta limpieza no rellenó ningún agujero.`);
  if (settings.fillHoles) warnings.push(`Silueta exterior: relleno de agujeros activado, ${filledHoles} agujero(s) rellenado(s) a pedido tuyo. Desactivá esta opción para conservar los detalles interiores.`);
  if (max - min < 12) block('Contraste insuficiente o foto uniforme: mejorá la iluminación o elegí otra foto.');
  if (!foregroundPixels) block('Masque vide : ajustez le seuil, inversez le premier plan ou réduisez le nettoyage.');
  else if (foregroundPixels === count) block('Todo el recorte es primer plano: ajustá el umbral o invertí oscuro/claro.');
  if (components > 1) block(`${components} componentes distintos: no se eligió ningún objeto automáticamente. Recortá el sujeto o elegí explícitamente una limpieza adecuada.`);
  if (boundaryComponents) block('El primer plano toca el borde del recorte: el contorno podría quedar cortado. Ampliá el recorte, ajustá el umbral o invertí oscuro/claro.');
  if (diagonalContacts) block('Contactos diagonales ambiguos: ajustá el umbral o usá una foto con mejor contraste para obtener contornos separables.');
  const traceable = components > 0 && components <= MAX_PHOTO_COMPONENTS && holes <= MAX_PHOTO_HOLES && boundaryEdges <= MAX_PHOTO_BOUNDARY_EDGES;
  if (!traceable && components > 0) block(`Máscara demasiado compleja o ruidosa para un trazado seguro (límites: ${MAX_PHOTO_COMPONENTS} componentes, ${MAX_PHOTO_HOLES} agujeros, ${MAX_PHOTO_BOUNDARY_EDGES} aristas). Recadrez, ajustez le seuil ou choisissez un nettoyage explicite.`);
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) { const gray = mask[i] ? 0 : 255; data.set([gray, gray, gray, 255], i * 4); }
  return { imageData: { width, height, data }, mask, traceable, diagnostics: { width, height, threshold, components, holes, removedComponents, filledHoles, warnings, canApply } };
}
