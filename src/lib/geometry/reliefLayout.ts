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
  const detailAssignments = document.contourOperations.filter(a => a.operation === 'emboss');
  if (document.contourOperations.some(a => a.operation === 'engrave')) {
    return failed('El grabado requiere una operación geométrica diferente.');
  }
  if (detailAssignments.length !== 1) {
    return failed('Esta primera configuración admite exactamente un contorno de Relieve.');
  }

  const parsed = new DOMParser().parseFromString(document.sketch.svg, 'image/svg+xml');
  const root = parsed.documentElement;
  if (root.localName.toLowerCase() !== 'svg' || root.hasAttribute('transform')) {
    return failed('Se requiere un SVG sin transformaciones en el elemento raíz.');
  }
  const paths = [...root.children];
  if (paths.length !== 2 || paths.some(element => element.localName.toLowerCase() !== 'path'
    || element.hasAttribute('transform')
    || (element.getAttribute('d')?.match(/[Mm]/g)?.length ?? 0) !== 1)) {
    return failed('Esta primera configuración requiere exactamente dos paths directos y simples.');
  }
  if (document.contourOperations.some(a => a.operation === 'ignore')) {
    return failed('No se admiten contornos ignorados en esta configuración inicial.');
  }

  const detailPathIndex = detailAssignments[0].pathIndex;
  const outerPathIndex = 1 - detailPathIndex;
  const outerAssignment = document.contourOperations.find(a => a.pathIndex === outerPathIndex);
  if (outerAssignment && outerAssignment.operation !== 'cut') {
    return failed('El contorno exterior debe ser de Corte o estar sin asignar.');
  }

  let contours: ReadonlyArray<NormalizedContour>;
  try { contours = extractClosedContours(document.sketch.svg); }
  catch { return failed('Los dos trazados deben ser contornos cerrados válidos.'); }
  if (contours.length !== 2) return failed('Cada path debe producir exactamente un contorno cerrado.');
  const outer = contours[outerPathIndex], detail = contours[detailPathIndex];
  if (!isConvex(outer) || Math.abs(signedArea(outer)) <= Math.abs(signedArea(detail))
    || !detail.every(point => isInside(point, outer))) {
    return failed('El corte exterior debe ser convexo y contener por completo al relieve.');
  }

  const allPoints = outer.concat(detail);
  const minX = Math.min(...allPoints.map(p => p.x)), maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y)), maxY = Math.max(...allPoints.map(p => p.y));
  const sourceDimension = document.parameters.sizeMode === 'width' ? maxX - minX
    : document.parameters.sizeMode === 'height' ? maxY - minY : Math.max(maxX - minX, maxY - minY);
  if (!Number.isFinite(sourceDimension) || sourceDimension <= 0) {
    return failed('El dibujo no tiene dimensiones válidas.');
  }
  const scale = document.parameters.targetSize / sourceDimension;
  if (document.bridges.length !== 1) {
    return failed('Hace falta exactamente un puente explícito entre el corte y el relieve.');
  }
  const bridge: Bridge = document.bridges[0];
  try { validateConnectorLayout([outer, detail], [bridge], scale, document.parameters.wallThickness); }
  catch { return failed('El puente debe unir los dos contornos y respetar las distancias de seguridad.'); }

  const markingClearanceMm = detailAssignments[0].depthMm ?? 1.2;
  return Object.freeze({
    topologyReady: true,
    reason: 'Contornos contenidos y puente válido para el primer relieve conectado.',
    outerPathIndex, detailPathIndex, markingClearanceMm, bridgeId: bridge.id
  });
}
