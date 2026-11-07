import * as modelingModule from '@jscad/modeling';
import * as THREE from 'three';
import { STAMP_IMPRINT_LIMITS } from '../domain/stampImprint';
import { keepInkOnly } from '../import/inkOnlySvg';
import type { CookieCutterParams } from '../types/CookieCutter';
import {
  extractClosedContours,
  signedArea,
  type NormalizedContour
} from './contourExtraction';
import { generateCookieCutter } from './cookieCutterGenerator';
import { disposeObject3D } from './disposeThree';
import { CutterGenerationError, validateCookieCutterParams } from './generationValidation';
import { validatePrintableObject } from './geometryValidation';
import { offsetPath } from './pathOperations';
import { contourBounds, contourDepths, createReliefRegion } from './stampGenerator';
import {
  LayeredSolidBuilder,
  loopDepths,
  pointInLoop,
  type Loop
} from './layeredSolid';

const modeling = (
  modelingModule as unknown as { readonly default?: typeof modelingModule }
).default ?? modelingModule;
const { booleans, geometries } = modeling;
const { subtract, union } = booleans;
const { geom2 } = geometries;

type Geom2 = ReturnType<typeof geom2.create>;
type Pt = Readonly<{ x: number; y: number }>;

/** Disposición del juego: dos piezas separadas o una sola pieza unida. */
export type CookieSetLayout = 'separate' | 'single';
/** Relieve del sello: en alto (las líneas sobresalen) o hundido (las líneas se graban). */
export type CookieSetImprint = 'raised' | 'recessed';

export interface CookieSetOptions {
  readonly layout: CookieSetLayout;
  /** Holgura en mm entre la pared del cortador y el sello (0,1 a 3). */
  readonly clearanceMm: number;
  readonly imprint: CookieSetImprint;
}

export const DEFAULT_COOKIE_SET_OPTIONS: CookieSetOptions = Object.freeze({
  layout: 'separate',
  clearanceMm: 0.5,
  imprint: 'raised'
});

export const COOKIE_SET_LIMITS = Object.freeze({
  minClearanceMm: 0.1,
  maxClearanceMm: 3,
  /** Separación entre piezas en la vista previa y en la placa de impresión. */
  layoutGapMm: 10
});

export interface CookieSetResult {
  readonly layout: CookieSetLayout;
  /** Solo en dos piezas. */
  readonly cutter: THREE.Group | null;
  /** Solo en dos piezas. */
  readonly stamp: THREE.Group | null;
  /** Solo en una pieza. */
  readonly single: THREE.Group | null;
  /** Contiene todas las piezas dispuestas lado a lado sobre la placa. */
  readonly plate: THREE.Group;
  /** Avisos para mostrar al usuario (siempre en español). */
  readonly notes: readonly string[];
}

const BASE_THICKNESS = STAMP_IMPRINT_LIMITS.baseThicknessMm;
/** Margen entre el borde de la placa y el relieve: el relieve nunca toca el borde. */
const RELIEF_RIM_MM = 0.6;
/** Tolerancia (mm) al simplificar las regiones 2D antes de extruirlas. */
const REGION_SIMPLIFY_MM = 0.02;
/** Tolerancia de simplificación de contornos, relativa al lado mayor (0,05 % ≈ 0,04 mm en 75 mm). */
const SIMPLIFY_RELATIVE_TOLERANCE = 0.0005;

const CUTTER_COLOR = 0xffa726;
const STAMP_COLOR = 0x4fc3f7;
const SINGLE_COLOR = 0x81c784;

function fail(
  code: ConstructorParameters<typeof CutterGenerationError>[0],
  message: string,
  details: Readonly<Record<string, unknown>> = {}
): never {
  throw new CutterGenerationError(code, message, details);
}

function selectedDimension(width: number, height: number, mode: CookieCutterParams['sizeMode']): number {
  if (mode === 'width') return width;
  if (mode === 'height') return height;
  return Math.max(width, height);
}

function pointsBounds(contours: ReadonlyArray<ReadonlyArray<Pt>>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const contour of contours) {
    for (const p of contour) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Redondea a 1 µm y simplifica: evita aristas minúsculas que degeneran las operaciones booleanas 3D. */
function cleanedPoints(contour: ReadonlyArray<Pt>): Pt[] {
  const rounded = contour.map(({ x, y }) => ({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }));
  const unique = rounded.filter((p, i) => {
    const q = rounded[(i + rounded.length - 1) % rounded.length];
    return p.x !== q.x || p.y !== q.y;
  });
  return [...simplifyContour(unique, REGION_SIMPLIFY_MM)];
}

function regionFromContours(contours: ReadonlyArray<ReadonlyArray<Pt>>): Geom2 | null {
  const regions: Geom2[] = [];
  for (const contour of contours) {
    const cleaned = cleanedPoints(contour);
    if (cleaned.length < 3) continue;
    const ordered = signedArea(cleaned) < 0 ? [...cleaned].reverse() : [...cleaned];
    regions.push(geom2.fromPoints(ordered.map(({ x, y }) => [x, y] as [number, number])));
  }
  if (regions.length === 0) return null;
  const region = regions.length === 1 ? regions[0] : (union(...regions) as Geom2);
  return isEmpty(region) ? null : region;
}

function isEmpty(region: Geom2): boolean {
  return geom2.toSides(region).length === 0;
}


/** Distancia de un punto al segmento AB. */
function distanceToSegment(point: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function simplifyOpen(points: readonly Pt[], tolerance: number): Pt[] {
  if (points.length <= 2) return [...points];
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let farthest = -1;
    let farthestDistance = tolerance;
    for (let index = first + 1; index < last; index += 1) {
      const distance = distanceToSegment(points[index], points[first], points[last]);
      if (distance > farthestDistance) {
        farthest = index;
        farthestDistance = distance;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = true;
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

/**
 * Douglas–Peucker sobre un contorno cerrado. Elimina el "escalón" de píxeles del vectorizado,
 * que solo agrega vértices casi colineales y vuelve frágiles las operaciones booleanas 3D.
 */
export function simplifyContour(contour: NormalizedContour, tolerance: number): NormalizedContour {
  if (contour.length <= 8 || !(tolerance > 0)) return contour;
  // Se parte el anillo en dos mitades por los puntos más alejados entre sí.
  let anchor = 0;
  let opposite = 0;
  let best = -1;
  for (let index = 0; index < contour.length; index += 1) {
    const distance = Math.hypot(contour[index].x - contour[0].x, contour[index].y - contour[0].y);
    if (distance > best) {
      best = distance;
      opposite = index;
    }
  }
  const first = simplifyOpen(contour.slice(anchor, opposite + 1), tolerance);
  const second = simplifyOpen([...contour.slice(opposite), contour[0]], tolerance);
  const merged = [...first.slice(0, -1), ...second.slice(0, -1)];
  return merged.length >= 3 ? merged : contour;
}

function scaleAbout(
  contour: NormalizedContour,
  centerX: number,
  centerY: number,
  scale: number
): Pt[] {
  return contour.map(({ x, y }) => ({ x: (x - centerX) * scale, y: (y - centerY) * scale }));
}

async function offsetAll(contours: ReadonlyArray<ReadonlyArray<Pt>>, distance: number): Promise<Pt[][]> {
  const output: Pt[][] = [];
  for (const contour of contours) {
    const result = await offsetPath(contour, distance, 'miter');
    for (const path of result) output.push([...path]);
  }
  return output;
}

function contoursToSvg(contours: ReadonlyArray<NormalizedContour>, mirrorY: boolean): string {
  const format = (value: number) => value.toFixed(4);
  const transformed = contours.map((contour) =>
    contour.map(({ x, y }) => ({ x, y: mirrorY ? -y : y }))
  );
  const bounds = pointsBounds(transformed);
  const path = transformed
    .map(
      (contour) =>
        `M ${contour.map(({ x, y }) => `${format(x)} ${format(y)}`).join(' L ')} Z`
    )
    .join(' ');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${format(bounds.minX)} ${format(bounds.minY)} ` +
    `${format(bounds.width)} ${format(bounds.height)}"><path d="${path}" fill="#000000" fill-rule="evenodd"/></svg>`
  );
}

function groupFromBuilder(
  builder: LayeredSolidBuilder,
  name: string,
  color: number,
  piece: string,
  requireSingleShell: boolean
): THREE.Group {
  const geometry = builder.toGeometry();
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `${name}-solid`;
  const group = new THREE.Group();
  group.name = name;
  group.add(mesh);
  placeOnBed(group);

  const report = validatePrintableObject(group, { requireSingleShell });
  if (!report.valid) {
    disposeObject3D(group);
    return fail(
      'INVALID_GEOMETRY',
      `${piece[0].toUpperCase()}${piece.slice(1)} no resultó un sólido imprimible. ` +
        'Probá con una silueta más simple, otro tamaño o sin mango.',
      { stage: name, errors: report.errors }
    );
  }
  return group;
}

/** Centra el grupo en X/Z y apoya su base en Y = 0. */
function placeOnBed(group: THREE.Group): void {
  group.position.set(0, 0, 0);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.set(-center.x, -bounds.min.y, -center.z);
  group.updateMatrixWorld(true);
}

function groupSize(group: THREE.Group): THREE.Vector3 {
  return new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
}

/** Ajusta la escala para que la dimensión elegida (con la pared exterior) valga `targetSize`. */
async function fitSingleScale(
  silhouette: ReadonlyArray<NormalizedContour>,
  centerX: number,
  centerY: number,
  wall: number,
  params: CookieCutterParams
): Promise<number> {
  const source = pointsBounds(silhouette);
  const sourceDimension = selectedDimension(source.width, source.height, params.sizeMode);
  let scale = (params.targetSize - wall) / sourceDimension;
  const tolerance = Math.max(0.02, params.targetSize * 0.0005);

  for (let iteration = 0; iteration < 6; iteration += 1) {
    if (!Number.isFinite(scale) || scale <= 0) break;
    const outer = await offsetAll(
      silhouette.map((contour) => scaleAbout(contour, centerX, centerY, scale)),
      wall / 2
    );
    const measured = pointsBounds(outer);
    const dimension = selectedDimension(measured.width, measured.height, params.sizeMode);
    if (Math.abs(dimension - params.targetSize) <= tolerance) return scale;
    if (dimension - wall <= 0) break;
    scale *= (params.targetSize - wall) / (dimension - wall);
  }
  return fail(
    'INVALID_PARAMS',
    'El tamaño pedido es demasiado pequeño para el grosor de pared elegido.',
    { field: 'targetSize', targetSize: params.targetSize }
  );
}

interface ReliefInputs {
  readonly contours: ReadonlyArray<NormalizedContour>;
  readonly depths: readonly number[];
  readonly silhouette: ReadonlyArray<NormalizedContour>;
  readonly centerX: number;
  readonly centerY: number;
  readonly scale: number;
}

/**
 * Relieve del sello: la ilustración completa, reducida uniformemente hasta que quepa
 * estrictamente dentro de `fitRegion`. No se recorta con una intersección booleana: un
 * borde casi tangente generaría triángulos degenerados en el sólido final.
 */
function buildRelief(inputs: ReliefInputs, fitRegion: Geom2): Geom2 {
  const { contours, depths, silhouette, centerX, centerY, scale } = inputs;
  const sourceBounds = pointsBounds(silhouette);
  const bounds = {
    minX: sourceBounds.minX,
    minY: sourceBounds.minY,
    maxX: sourceBounds.maxX,
    maxY: sourceBounds.maxY,
    width: sourceBounds.width,
    height: sourceBounds.height
  };
  const reliefAt = (factor: number): Geom2 =>
    createReliefRegion(contours, depths, bounds, scale * factor);
  const fits = (factor: number): boolean =>
    isEmpty(subtract(reliefAt(factor), fitRegion) as Geom2);

  // El centro del relieve coincide con el de la silueta, que es el de la región de ajuste.
  void centerX;
  void centerY;

  const minimumFactor = 0.2;
  if (!fits(minimumFactor)) {
    fail('NO_VALID_CONTOURS', 'El relieve del sello no entra dentro del cortador.', {
      field: 'contours'
    });
  }
  let low = minimumFactor;
  let high = 1;
  if (fits(high)) return reliefAt(high);
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return reliefAt(low * 0.995);
}

function loopsOf(region: Geom2): Loop[] {
  return geom2.toOutlines(region).map((outline) => {
    const points: Pt[] = [];
    for (const [x, y] of outline) {
      const previous = points[points.length - 1];
      if (!previous || previous.x !== x || previous.y !== y) points.push({ x, y });
    }
    const first = points[0];
    const last = points[points.length - 1];
    if (points.length > 1 && first.x === last.x && first.y === last.y) points.pop();
    return points;
  });
}

type HandleStyleName = CookieCutterParams['handleStyle'];

function regularLoop(radius: number, segments: number, cx: number, cy: number): Pt[] {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

function rectangleLoop(width: number, depth: number, cx: number, cy: number): Pt[] {
  return [
    { x: cx - width / 2, y: cy - depth / 2 },
    { x: cx + width / 2, y: cy - depth / 2 },
    { x: cx + width / 2, y: cy + depth / 2 },
    { x: cx - width / 2, y: cy + depth / 2 }
  ];
}

/** Huella del mango, con las mismas proporciones que el generador de sellos. */
function handleFootprint(
  style: HandleStyleName,
  baseWidth: number,
  baseDepth: number,
  cx: number,
  cy: number
): Pt[] | null {
  const minimum = Math.min(baseWidth, baseDepth);
  const radius = Math.max(2, Math.min(10, minimum * 0.25));
  switch (style) {
    case 'round':
      return regularLoop(radius, 32, cx, cy);
    case 'chamfered':
      return regularLoop(radius, 8, cx, cy);
    case 'rectangular':
      return rectangleLoop(
        Math.max(4, Math.min(20, baseWidth * 0.5)),
        Math.max(4, Math.min(20, baseDepth * 0.5)),
        cx,
        cy
      );
    case 'flat':
      return rectangleLoop(
        Math.max(6, Math.min(30, baseWidth * 0.65)),
        Math.max(3, Math.min(8, baseDepth * 0.3)),
        cx,
        cy
      );
    default:
      return null;
  }
}

/** Busca un centro donde el mango quede completamente apoyado sobre la base. */
function placeHandle(
  params: CookieCutterParams,
  baseLoops: ReadonlyArray<Loop>
): Pt[] | null {
  if (!params.enableHandle || params.handleStyle === 'none') return null;
  const bounds = pointsBounds(baseLoops);
  const candidates: Array<[number, number]> = [
    [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2],
    [0, 0]
  ];
  const depths = loopDepths(baseLoops);
  for (const [cx, cy] of candidates) {
    const footprint = handleFootprint(params.handleStyle, bounds.width, bounds.height, cx, cy);
    if (!footprint) return null;
    const supported = footprint.every((point) => {
      const containing = baseLoops.filter((loop) => pointInLoop(point, loop)).length;
      return containing % 2 === 1 && depths.length > 0;
    });
    if (supported) return footprint;
  }
  return fail(
    'INVALID_GEOMETRY',
    'El mango no entra sobre la base de esta forma. Desactivá el mango o elegí otra forma de mango.',
    { field: 'handleStyle' }
  );
}

interface PieceSpec {
  /** Contorno exterior de la pieza. */
  readonly outer: ReadonlyArray<Loop>;
  /** Cavidad interior de la copa (solo pieza única). */
  readonly cavity: ReadonlyArray<Loop> | null;
  readonly relief: ReadonlyArray<Loop>;
  readonly params: CookieCutterParams;
  readonly imprint: CookieSetImprint;
}

/**
 * Sólido por capas: [mango] + placa (+ pared cortante) + relieve.
 *
 * - Sello:        placa de 4 mm con el relieve encima o grabado.
 * - Pieza única:  placa de 4 mm bajo una "taza" de pared cortante; el relieve va en el fondo.
 */
function buildPieceSolid(spec: PieceSpec): LayeredSolidBuilder {
  const { outer, cavity, relief, params, imprint } = spec;
  const builder = new LayeredSolidBuilder();
  const handle = placeHandle(params, outer);
  const lift = handle ? params.handleHeight : 0;
  const floorZ = lift + BASE_THICKNESS;
  const topZ = cavity ? floorZ + params.cuttingHeight : floorZ;
  const outerDepths = loopDepths(outer);

  // Cara inferior y mango.
  if (handle) {
    builder.addCap([...outer, handle], lift, false);
    builder.addCap([handle], 0, false);
    builder.addWall(handle, 0, lift, true);
  } else {
    builder.addCap(outer, 0, false);
  }

  // Paredes exteriores.
  outer.forEach((loop, index) => builder.addWall(loop, lift, topZ, outerDepths[index] % 2 === 0));

  const reliefDepths = loopDepths(relief);
  if (cavity) {
    const cavityDepths = loopDepths(cavity);
    builder.addCap([...outer, ...cavity], topZ, true); // borde superior de la pared
    cavity.forEach((loop, index) => builder.addWall(loop, floorZ, topZ, cavityDepths[index] % 2 === 1));
    builder.addCap([...cavity, ...relief], floorZ, true); // fondo de la taza
  } else {
    builder.addCap([...outer, ...relief], floorZ, true); // cara superior de la placa
  }

  if (imprint === 'raised') {
    relief.forEach((loop, index) =>
      builder.addWall(loop, floorZ, floorZ + params.stampDepth, reliefDepths[index] % 2 === 0)
    );
    builder.addCap(relief, floorZ + params.stampDepth, true);
  } else {
    relief.forEach((loop, index) =>
      builder.addWall(loop, floorZ - params.stampDepth, floorZ, reliefDepths[index] % 2 === 1)
    );
    builder.addCap(relief, floorZ - params.stampDepth, true);
  }
  return builder;
}

function assertImprintDepth(params: CookieCutterParams, imprint: CookieSetImprint): void {
  if (imprint === 'recessed' && params.stampDepth > STAMP_IMPRINT_LIMITS.maximumRecessDepthMm) {
    fail(
      'INVALID_PARAMS',
      'La profundidad del sello hundido no puede superar 3 mm: debe quedar al menos 1 mm de base.',
      { field: 'stampDepth', value: params.stampDepth }
    );
  }
}

function layoutPlate(pieces: readonly THREE.Group[]): THREE.Group {
  const plate = new THREE.Group();
  plate.name = 'juego';
  const gap = COOKIE_SET_LIMITS.layoutGapMm;
  const widths = pieces.map((piece) => groupSize(piece).x);
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (pieces.length - 1);
  let cursor = -total / 2;
  pieces.forEach((piece, index) => {
    piece.position.x += cursor + widths[index] / 2;
    plate.add(piece);
    cursor += widths[index] + gap;
  });
  plate.updateMatrixWorld(true);
  return plate;
}

function checkPlate(group: THREE.Group, params: CookieCutterParams, label: string): void {
  const size = groupSize(group);
  if (size.x > params.buildPlateSize || size.z > params.buildPlateSize) {
    fail(
      'INVALID_GEOMETRY',
      `${label} no entra en la placa de impresión de ${params.buildPlateSize} mm. ` +
        'Reducí el tamaño o elegí una placa más grande.',
      { field: 'buildPlateSize', width: size.x, depth: size.z, max: params.buildPlateSize }
    );
  }
}

function validateOptions(options: CookieSetOptions): void {
  if (options.layout !== 'separate' && options.layout !== 'single') {
    fail('INVALID_PARAMS', 'La disposición del juego no es válida.', { field: 'layout' });
  }
  if (options.imprint !== 'raised' && options.imprint !== 'recessed') {
    fail('INVALID_PARAMS', 'El tipo de relieve del sello no es válido.', { field: 'imprint' });
  }
  if (
    !Number.isFinite(options.clearanceMm) ||
    options.clearanceMm < COOKIE_SET_LIMITS.minClearanceMm ||
    options.clearanceMm > COOKIE_SET_LIMITS.maxClearanceMm
  ) {
    fail(
      'INVALID_PARAMS',
      `La holgura debe estar entre ${COOKIE_SET_LIMITS.minClearanceMm} y ${COOKIE_SET_LIMITS.maxClearanceMm} mm.`,
      { field: 'clearanceMm', value: options.clearanceMm }
    );
  }
}

/**
 * Genera un juego de cortador + sello a partir de una sola ilustración.
 *
 * - El cortador usa únicamente la silueta exterior de la imagen.
 * - El sello lleva todo el detalle y entra dentro del cortador (con holgura).
 * - `layout: 'single'` los une en una sola pieza: placa, pared cortante y relieve.
 *
 * Convención de coordenadas: el sello y la pieza única comparten el sistema del
 * generador de sellos (vista superior en espejo), y el cortador se espeja igual,
 * de modo que al dar vuelta las piezas contra la masa el dibujo sale derecho y
 * el contorno coincide con el relieve.
 */
export async function generateCookieSet(
  svgString: string,
  paramsValue: Readonly<CookieCutterParams>,
  optionsValue: Readonly<CookieSetOptions> = DEFAULT_COOKIE_SET_OPTIONS
): Promise<CookieSetResult> {
  const options: CookieSetOptions = { ...DEFAULT_COOKIE_SET_OPTIONS, ...optionsValue };
  validateOptions(options);
  const params = validateCookieCutterParams({ ...paramsValue, mode: 'stamp', stampBase: true });
  assertImprintDepth(params, options.imprint);

  // Un JPG/PNG vectorizado trae capas blancas (fondo y detalles) que no son geometría.
  const extracted = extractClosedContours(keepInkOnly(svgString), 48);
  const extractedBounds = pointsBounds(extracted);
  const simplifyTolerance =
    Math.max(extractedBounds.width, extractedBounds.height) * SIMPLIFY_RELATIVE_TOLERANCE;
  const contours = extracted.map((contour) => simplifyContour(contour, simplifyTolerance));
  const depths = contourDepths(contours);
  const silhouette = contours.filter((_, index) => depths[index] === 0);
  if (silhouette.length === 0) {
    fail('NO_VALID_CONTOURS', 'La imagen no tiene una silueta cerrada utilizable.', { field: 'contours' });
  }

  const notes: string[] = [];
  if (contours.length === silhouette.length) {
    notes.push(
      'La imagen no tiene detalle interior: el sello será liso. ' +
        'Usá una imagen con líneas o formas internas para obtener relieve.'
    );
  }
  if (silhouette.length > 1 && options.layout === 'single') {
    notes.push('La silueta tiene varias partes separadas; la pieza única necesita una silueta continua.');
  }

  const sourceBounds = contourBounds(silhouette);
  const centerX = (sourceBounds.minX + sourceBounds.maxX) / 2;
  const centerY = (sourceBounds.minY + sourceBounds.maxY) / 2;
  const wall = params.wallThickness;
  const clearance = options.clearanceMm;
  const created: THREE.Group[] = [];

  try {
    if (options.layout === 'separate') {
      // Cortador: solo la silueta exterior, espejada para coincidir con el sello.
      const cutterParams = { ...params, mode: 'cutter' as const };
      const cutter = await generateCookieCutter(contoursToSvg(silhouette, true), cutterParams);
      created.push(cutter);
      const scale = Number(cutter.userData.effectiveScale);
      if (!Number.isFinite(scale) || scale <= 0) {
        fail('INVALID_GEOMETRY', 'No se pudo medir la escala del cortador.', { stage: 'cutter' });
      }

      // La abertura útil del cortador es la más angosta: la de la boca superior.
      const taperOffset = Math.tan((params.taperAngle * Math.PI) / 180) * params.cuttingHeight;
      const insetMm = wall / 2 + taperOffset + clearance;
      const scaled = silhouette.map((contour) => scaleAbout(contour, centerX, centerY, scale));
      const plateRegion = regionFromContours(await offsetAll(scaled, -insetMm));
      if (!plateRegion) {
        fail(
          'INVALID_GEOMETRY',
          'La forma es demasiado pequeña para alojar el sello dentro del cortador. ' +
            'Aumentá el tamaño o reducí el grosor de pared, el ángulo o la holgura.',
          { field: 'targetSize' }
        );
      }

      const reliefFit = regionFromContours(await offsetAll(scaled, -(insetMm + RELIEF_RIM_MM)));
      if (!reliefFit) {
        fail(
          'INVALID_GEOMETRY',
          'La forma es demasiado pequeña para alojar el relieve del sello dentro del cortador.',
          { field: 'targetSize' }
        );
      }
      const relief = buildRelief(
        { contours, depths, silhouette, centerX, centerY, scale },
        reliefFit
      );
      const stampBuilder = buildPieceSolid({
        outer: loopsOf(plateRegion),
        cavity: null,
        relief: loopsOf(relief),
        params,
        imprint: options.imprint
      });
      const stamp = groupFromBuilder(stampBuilder, 'sello', STAMP_COLOR, 'el sello', silhouette.length === 1);
      created.push(stamp);

      checkPlate(cutter, params, 'El cortador');
      checkPlate(stamp, params, 'El sello');
      const plate = layoutPlate([cutter, stamp]);
      return Object.freeze({ layout: 'separate', cutter, stamp, single: null, plate, notes });
    }

    // Una sola pieza: [mango] + placa + pared cortante + relieve.
    const scale = await fitSingleScale(silhouette, centerX, centerY, wall, params);
    const scaled = silhouette.map((contour) => scaleAbout(contour, centerX, centerY, scale));
    const wallOuter = regionFromContours(await offsetAll(scaled, wall / 2));
    const innerRegion = regionFromContours(await offsetAll(scaled, -wall / 2));
    const reliefFit = regionFromContours(await offsetAll(scaled, -(wall / 2 + clearance)));
    if (!wallOuter || !innerRegion || !reliefFit) {
      fail(
        'INVALID_GEOMETRY',
        'La forma es demasiado pequeña para el grosor de pared y la holgura elegidos.',
        { field: 'wallThickness' }
      );
    }

    const maxRelief = Math.max(0.4, params.cuttingHeight - 1);
    if (params.stampDepth > maxRelief) {
      fail(
        'INVALID_PARAMS',
        'El relieve debe ser al menos 1 mm más bajo que la pared cortante para que corte antes de marcar.',
        { field: 'stampDepth', value: params.stampDepth, max: maxRelief }
      );
    }

    const relief = buildRelief({ contours, depths, silhouette, centerX, centerY, scale }, reliefFit);
    const singleBuilder = buildPieceSolid({
      outer: loopsOf(wallOuter),
      cavity: loopsOf(innerRegion),
      relief: loopsOf(relief),
      params,
      imprint: options.imprint
    });
    const single = groupFromBuilder(
      singleBuilder,
      'cortador-sello',
      SINGLE_COLOR,
      'la pieza única',
      silhouette.length === 1
    );
    created.push(single);
    checkPlate(single, params, 'La pieza única');
    const plate = layoutPlate([single]);
    return Object.freeze({ layout: 'single', cutter: null, stamp: null, single, plate, notes });
  } catch (error) {
    for (const group of created) disposeObject3D(group);
    if (error instanceof CutterGenerationError) throw error;
    const reason = error instanceof Error ? error.message : 'error desconocido';
    throw new CutterGenerationError(
      'INVALID_GEOMETRY',
      `No se pudo generar el juego de forma segura: ${reason}`,
      { stage: 'cookie-set', reason }
    );
  }
}

/** Solo para pruebas y diagnóstico. */
export const __testing = { regionFromContours, offsetAll, buildRelief, pointsBounds, scaleAbout, fitSingleScale, simplifyContour };
