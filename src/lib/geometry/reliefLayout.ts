import type { Bridge, CutterDocumentV5 } from '../domain/designDocument';
import { extractClosedContours, signedArea, type NormalizedContour } from '../utils/contourExtraction';
import { validateConnectorLayout } from './connectors';

export interface ReliefLayoutAssessment {
  /** Apto para solicitar la primera malla V5; la validación del STL se hace después. */
  readonly topologyReady: boolean;
  readonly reason: string;
  readonly outerPathIndex?: number;
  readonly detailPathIndex?: number;
  readonly markingClearanceMm?: number;
  readonly bridgeId?: string;
  /** Para la generación 3D con varios detalles conectados. */
  readonly detailProfiles?: readonly Readonly<{ pathIndex: number; clearanceMm: number; bridgeId: string }>[];
}

function failed(reason: string): ReliefLayoutAssessment {
  return Object.freeze({ topologyReady: false, reason });
}

function isInside(point: Readonly<{ x: number; y: number }>, polygon: NormalizedContour): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function isConvex(polygon: NormalizedContour): boolean {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], c = polygon[(i + 2) % polygon.length];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-8) continue;
    const next = Math.sign(cross);
    if (sign && sign !== next) return false;
    sign = next;
  }
  return sign !== 0;
}

/**
 * Primera calificación topológica de detalle unido: un corte exterior convexo,
 * un relieve interior y un puente explícito entre ambos.
 * Califica la topología. El generador aplica además restricciones físicas y validación de malla.
 */
export function assessFirstReliefLayout(document: CutterDocumentV5): ReliefLayoutAssessment {
  const details = document.contourOperations.filter(a => a.operation === 'emboss');
  if (document.contourOperations.some(a => a.operation === 'engrave' || a.operation === 'ignore')) {
    return failed('Este relieve inicial no admite Grabado ni Ignorar junto con Relieve.');
  }
  if (details.length < 1 || details.length > 3) {
    return failed('Se admiten de uno a tres detalles de Relieve independientes.');
  }
  const parsed = new DOMParser().parseFromString(document.sketch.svg, 'image/svg+xml');
  const root = parsed.documentElement;
  if (root.localName.toLowerCase() !== 'svg' || root.hasAttribute('transform')) {
    return failed('Se requiere un SVG sin transformaciones en el elemento raíz.');
  }
  const paths = [...root.children];
  if (paths.length !== details.length + 1 || paths.some(element =>
    element.localName.toLowerCase() !== 'path' || element.hasAttribute('transform') ||
    (element.getAttribute('d')?.match(/[Mm]/g)?.length ?? 0) !== 1 ||
    !/^[\s\d.,+\-eE MmLlHhVvZz]+$/.test(element.getAttribute('d') ?? '') ||
    !/[Zz]\s*$/.test(element.getAttribute('d') ?? '')
  )) {
    return failed('Se requiere un path lineal, simple y cerrado por cada contorno, sin grupos ni transformaciones.');
  }
  const detailIndices = new Set(details.map(d => d.pathIndex));
  const outerIndices = paths.map((_, i) => i).filter(i => !detailIndices.has(i));
  if (outerIndices.length !== 1) return failed('Debe quedar exactamente un contorno exterior.');
  const outerPathIndex = outerIndices[0];
  const outerOperation = document.contourOperations.find(a => a.pathIndex === outerPathIndex)?.operation;
  if (outerOperation && outerOperation !== 'cut') {
    return failed('El contorno exterior debe ser Corte o estar sin asignar.');
  }

  let contours: ReadonlyArray<NormalizedContour>;
  try { contours = extractClosedContours(document.sketch.svg); }
  catch { return failed('Todos los trazados deben ser contornos cerrados válidos.'); }
  if (contours.length !== paths.length) return failed('Cada path debe producir un único contorno válido.');
  const outer = contours[outerPathIndex];
  if (!isConvex(outer)) return failed('El borde exterior debe ser convexo.');
  for (const detail of details) {
    const polygon = contours[detail.pathIndex];
    if (Math.abs(signedArea(polygon)) >= Math.abs(signedArea(outer)) ||
        !polygon.every(point => isInside(point, outer))) {
      return failed('Cada relieve debe estar completamente dentro del borde exterior.');
    }
  }
  // No se admiten detalles anidados ni superpuestos, aunque los puntos extremos estén dentro.
  for (let i = 0; i < details.length; i++) for (let j = i + 1; j < details.length; j++) {
    const a = contours[details[i].pathIndex], b = contours[details[j].pathIndex];
    if (a.some(point => isInside(point, b)) || b.some(point => isInside(point, a)) || polygonsCross(a, b)) {
      return failed('Los detalles interiores deben estar separados y sin intersecciones.');
    }
  }

  const xs = outer.map(p => p.x), ys = outer.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
  const dimension = document.parameters.sizeMode === 'width' ? width
    : document.parameters.sizeMode === 'height' ? height : Math.max(width, height);
  if (!Number.isFinite(dimension) || dimension <= 0) return failed('Dimensiones del SVG inválidas.');
  const scale = document.parameters.targetSize / dimension;
  if (document.bridges.length !== details.length) {
    return failed('Cada detalle requiere un puente explícito hacia el contorno exterior.');
  }
  try {
    validateConnectorLayout(contours, document.bridges, scale, document.parameters.wallThickness);
  } catch { return failed('Los puentes deben conectar contornos distintos, sin cruzarse ni ser demasiado cortos.'); }

  // La asociación se verifica por extremos; no basta con contar puentes.
  const tolerance = Math.max(0.001, Math.min(document.parameters.wallThickness, 1) / scale);
  const detailProfiles: Array<{ pathIndex: number; clearanceMm: number; bridgeId: string }> = [];
  for (const detail of details) {
    const matching = document.bridges.filter(bridge =>
      (nearContour(bridge.from, outer, tolerance) && nearContour(bridge.to, contours[detail.pathIndex], tolerance)) ||
      (nearContour(bridge.to, outer, tolerance) && nearContour(bridge.from, contours[detail.pathIndex], tolerance))
    );
    if (matching.length !== 1) {
      return failed('Cada puente debe unir directamente el exterior con un único relieve.');
    }
    const clearanceMm = detail.depthMm ?? 1.2;
    if (!Number.isFinite(clearanceMm) || clearanceMm <= 0 ||
        clearanceMm >= document.parameters.cuttingHeight) {
      return failed('La altura interior debe ser menor que la altura del cuerpo cortante.');
    }
    detailProfiles.push({ pathIndex: detail.pathIndex, clearanceMm, bridgeId: matching[0].id });
  }
  if (new Set(detailProfiles.map(p => p.bridgeId)).size !== details.length) {
    return failed('Cada relieve debe utilizar su propio puente.');
  }
  const first = detailProfiles[0];
  return Object.freeze({
    topologyReady: true,
    reason: `Exterior unido a ${details.length} detalle(s) mediante puentes independientes.`,
    outerPathIndex,
    detailPathIndex: first.pathIndex,
    markingClearanceMm: first.clearanceMm,
    bridgeId: first.bridgeId,
    detailProfiles: Object.freeze(detailProfiles.map(p => Object.freeze(p)))
  });
}

function nearContour(point: Readonly<{ x: number; y: number }>, contour: NormalizedContour, tolerance: number): boolean {
  return contour.some((a, i) => {
    const b = contour[(i + 1) % contour.length];
    const dx = b.x - a.x, dy = b.y - a.y, distanceSq = dx * dx + dy * dy;
    if (distanceSq < 1e-12) return false;
    const t = Math.max(0, Math.min(1, ((point.x-a.x)*dx + (point.y-a.y)*dy)/distanceSq));
    return Math.hypot(point.x-a.x-t*dx, point.y-a.y-t*dy) <= tolerance;
  });
}
function polygonsCross(a: NormalizedContour, b: NormalizedContour): boolean {
  const cross = (p: Readonly<{ x:number;y:number }>, q: Readonly<{ x:number;y:number }>, r: Readonly<{ x:number;y:number }>) =>
    (q.x-p.x)*(r.y-p.y) - (q.y-p.y)*(r.x-p.x);
  for (let i=0;i<a.length;i++) for (let j=0;j<b.length;j++) {
    const p=a[i], q=a[(i+1)%a.length], r=b[j], t=b[(j+1)%b.length];
    if (cross(p,q,r)*cross(p,q,t)<0 && cross(r,t,p)*cross(r,t,q)<0) return true;
  }
  return false;
}
