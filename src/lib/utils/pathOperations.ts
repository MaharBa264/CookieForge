import type {
  ClipperLibWrapper,
  Path,
  ReadonlyPath,
  ReadonlyPaths
} from 'js-angusj-clipper/web/index.js';
import type { Point2D } from '../types/CookieCutter';
import {
  normalizeContourPoints,
  signedArea,
  type NormalizedContour
} from './contourExtraction';
import {
  CutterGenerationError,
  GENERATION_LIMITS
} from './generationValidation';

export type JoinStyle = 'miter' | 'round' | 'square';
export type FillRule = 'evenodd' | 'nonzero' | 'positive' | 'negative';

export interface CutterWallPaths {
  readonly outer: ReadonlyArray<NormalizedContour>;
  readonly inner: ReadonlyArray<NormalizedContour>;
}

const CLIPPER_SCALE = 1000;
const MAX_INPUT_COORDINATE = 1_000_000;
const OFFSET_ARC_TOLERANCE = 0.05 * CLIPPER_SCALE;
const CLEAN_DISTANCE = 0.001 * CLIPPER_SCALE;

type ClipperModule = typeof import('js-angusj-clipper/web/index.js');

interface ClipperRuntime {
  readonly api: ClipperModule;
  readonly lib: ClipperLibWrapper;
}

const JOIN_STYLES: readonly JoinStyle[] = ['miter', 'round', 'square'];
const FILL_RULES: readonly FillRule[] = ['evenodd', 'nonzero', 'positive', 'negative'];
let clipperRuntimePromise: Promise<ClipperRuntime> | null = null;

function initClipper(): Promise<ClipperRuntime> {
  if (!clipperRuntimePromise) {
    clipperRuntimePromise = import('js-angusj-clipper/web/index.js').then(async (api) => ({
      api,
      lib: await api.loadNativeClipperLibInstanceAsync(
        api.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
      )
    }));
  }

  return clipperRuntimePromise;
}

function resolveJoinType(api: ClipperModule, style: JoinStyle) {
  switch (style) {
    case 'miter':
      return api.JoinType.Miter;
    case 'square':
      return api.JoinType.Square;
    default:
      return api.JoinType.Round;
  }
}

function resolveFillType(api: ClipperModule, rule: FillRule) {
  switch (rule) {
    case 'evenodd':
      return api.PolyFillType.EvenOdd;
    case 'positive':
      return api.PolyFillType.Positive;
    case 'negative':
      return api.PolyFillType.Negative;
    default:
      return api.PolyFillType.NonZero;
  }
}

function invalidGeometry(message: string, details: Readonly<Record<string, unknown>>): never {
  throw new CutterGenerationError('INVALID_GEOMETRY', message, details);
}

function validateAndNormalizeInput(
  points: ReadonlyArray<Readonly<Point2D>>
): NormalizedContour {
  if (points.length > GENERATION_LIMITS.maxPointsPerContour) {
    throw new CutterGenerationError(
      'CONTOUR_TOO_COMPLEX',
      'El contorno tiene demasiados puntos para un desplazamiento seguro.',
      {
        field: 'pointsPerContour',
        actual: points.length,
        max: GENERATION_LIMITS.maxPointsPerContour
      }
    );
  }

  if (points.length < 3) {
    invalidGeometry('Un contorno cerrado necesita al menos tres puntos.', {
      field: 'points',
      actual: points.length,
      min: 3
    });
  }

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      Math.abs(point.x) > MAX_INPUT_COORDINATE ||
      Math.abs(point.y) > MAX_INPUT_COORDINATE
    ) {
      invalidGeometry('El contorno contiene una coordenada no segura.', {
        field: 'points',
        index,
        maxAbsoluteCoordinate: MAX_INPUT_COORDINATE
      });
    }
  }

  const normalized = normalizeContourPoints(points);
  if (!normalized) {
    invalidGeometry('El contorno es degenerado tras la normalización.', {
      field: 'points'
    });
  }

  return normalized;
}

function svgToClipperPath(points: ReadonlyArray<Readonly<Point2D>>): Path {
  const normalized = validateAndNormalizeInput(points);
  const scaled = normalized.map(({ x, y }) => ({
    x: Math.round(x * CLIPPER_SCALE),
    y: Math.round(y * CLIPPER_SCALE)
  }));

  const uniqueScaledPoints = new Set(scaled.map(({ x, y }) => `${x}:${y}`));
  if (uniqueScaledPoints.size < 3 || Math.abs(signedArea(scaled)) < 1) {
    invalidGeometry('El contorno colapsa a la precisión de Clipper.', {
      field: 'points',
      scale: CLIPPER_SCALE
    });
  }

  return scaled;
}

function svgToClipperPaths(
  paths: ReadonlyArray<ReadonlyArray<Readonly<Point2D>>>
): Path[] {
  if (paths.length > GENERATION_LIMITS.maxContours) {
    throw new CutterGenerationError(
      'CONTOUR_TOO_COMPLEX',
      'La operación contiene demasiados contornos.',
      {
        field: 'contours',
        actual: paths.length,
        max: GENERATION_LIMITS.maxContours
      }
    );
  }

  return paths.map(svgToClipperPath);
}

function clipperToSvgPath(path: ReadonlyPath): Array<{ x: number; y: number }> {
  return path.map(({ x, y }) => ({
    x: x / CLIPPER_SCALE,
    y: y / CLIPPER_SCALE
  }));
}

function normalizeOutputPaths(
  paths: ReadonlyPaths | null | undefined
): ReadonlyArray<NormalizedContour> {
  if (!paths || paths.length === 0) {
    return Object.freeze([]);
  }

  if (paths.length > GENERATION_LIMITS.maxContours) {
    throw new CutterGenerationError(
      'CONTOUR_TOO_COMPLEX',
      'El desplazamiento produjo demasiados contornos.',
      {
        field: 'contours',
        actual: paths.length,
        max: GENERATION_LIMITS.maxContours
      }
    );
  }

  const normalized: NormalizedContour[] = [];
  let totalPoints = 0;

  for (const path of paths) {
    if (path.length > GENERATION_LIMITS.maxPointsPerContour) {
      throw new CutterGenerationError(
        'CONTOUR_TOO_COMPLEX',
        'Un contorno desplazado contiene demasiados puntos.',
        {
          field: 'pointsPerContour',
          actual: path.length,
          max: GENERATION_LIMITS.maxPointsPerContour
        }
      );
    }

    totalPoints += path.length;
    if (totalPoints > GENERATION_LIMITS.maxTotalPoints) {
      throw new CutterGenerationError(
        'CONTOUR_TOO_COMPLEX',
        'Los desplazamientos contienen demasiados puntos en total.',
        {
          field: 'totalPoints',
          actual: totalPoints,
          max: GENERATION_LIMITS.maxTotalPoints
        }
      );
    }

    const contour = normalizeContourPoints(clipperToSvgPath(path));
    if (contour) {
      normalized.push(contour);
    }
  }

  normalized.sort((first, second) => {
    const byArea = Math.abs(signedArea(second)) - Math.abs(signedArea(first));
    if (byArea !== 0) return byArea;
    if (first[0].x !== second[0].x) return first[0].x - second[0].x;
    return first[0].y - second[0].y;
  });

  return Object.freeze(normalized);
}

function throwOffsetFailure(operation: string): never {
  throw new CutterGenerationError(
    'OFFSET_FAILED',
    'Clipper no pudo calcular un desplazamiento de polígono seguro.',
    { operation }
  );
}

/**
 * Offset one closed contour while preserving every output component.
 * An empty array means a valid inward offset collapsed completely.
 */
export async function offsetPath(
  points: ReadonlyArray<Readonly<Point2D>>,
  offsetDistance: number,
  joinType: JoinStyle = 'round'
): Promise<ReadonlyArray<NormalizedContour>> {
  if (!Number.isFinite(offsetDistance)) {
    invalidGeometry('La distancia de desplazamiento debe ser finita.', {
      field: 'offsetDistance'
    });
  }

  if (!JOIN_STYLES.includes(joinType)) {
    invalidGeometry('El tipo de unión del desplazamiento es inválido.', {
      field: 'joinType'
    });
  }

  const input = svgToClipperPath(points);

  try {
    const { api, lib } = await initClipper();
    const result = lib.offsetToPaths({
      delta: offsetDistance * CLIPPER_SCALE,
      offsetInputs: [
        {
          data: input,
          joinType: resolveJoinType(api, joinType),
          endType: api.EndType.ClosedPolygon
        }
      ],
      arcTolerance: OFFSET_ARC_TOLERANCE,
      cleanDistance: CLEAN_DISTANCE,
      miterLimit: 2
    });

    return normalizeOutputPaths(result);
  } catch (error) {
    if (error instanceof CutterGenerationError) throw error;
    throwOffsetFailure('offset');
  }
}

export async function unionPaths(
  paths: ReadonlyArray<ReadonlyArray<Readonly<Point2D>>>
): Promise<ReadonlyArray<NormalizedContour>> {
  if (paths.length === 0) return Object.freeze([]);

  const { api, lib } = await initClipper();
  const result = lib.clipToPaths({
    clipType: api.ClipType.Union,
    subjectFillType: api.PolyFillType.NonZero,
    subjectInputs: [{ data: svgToClipperPaths(paths), closed: true }]
  });

  return normalizeOutputPaths(result);
}

/**
 * Región definida por la regla par-impar: una zona está rellena si está dentro de un número
 * impar de contornos. Equivale a «regiones de profundidad par menos sus huecos» y no depende
 * del sentido de giro de cada contorno.
 */
export async function evenOddRegionPaths(
  paths: ReadonlyArray<ReadonlyArray<Readonly<Point2D>>>
): Promise<ReadonlyArray<NormalizedContour>> {
  if (paths.length === 0) return Object.freeze([]);

  const { api, lib } = await initClipper();
  const result = lib.clipToPaths({
    clipType: api.ClipType.Union,
    subjectFillType: api.PolyFillType.EvenOdd,
    subjectInputs: [{ data: svgToClipperPaths(paths), closed: true }]
  });

  return normalizeOutputPaths(result);
}

export async function differencePaths(
  subjectPaths: ReadonlyArray<ReadonlyArray<Readonly<Point2D>>>,
  clipPaths: ReadonlyArray<ReadonlyArray<Readonly<Point2D>>>
): Promise<ReadonlyArray<NormalizedContour>> {
  if (subjectPaths.length === 0) return Object.freeze([]);
  if (clipPaths.length === 0) {
    return Object.freeze(subjectPaths.map(validateAndNormalizeInput));
  }

  const { api, lib } = await initClipper();
  const result = lib.clipToPaths({
    clipType: api.ClipType.Difference,
    subjectFillType: api.PolyFillType.NonZero,
    clipFillType: api.PolyFillType.NonZero,
    subjectInputs: [{ data: svgToClipperPaths(subjectPaths), closed: true }],
    clipInputs: [{ data: svgToClipperPaths(clipPaths) }]
  });

  return normalizeOutputPaths(result);
}

export async function intersectPaths(
  pathsA: ReadonlyArray<ReadonlyArray<Readonly<Point2D>>>,
  pathsB: ReadonlyArray<ReadonlyArray<Readonly<Point2D>>>
): Promise<ReadonlyArray<NormalizedContour>> {
  if (pathsA.length === 0 || pathsB.length === 0) return Object.freeze([]);

  const { api, lib } = await initClipper();
  const result = lib.clipToPaths({
    clipType: api.ClipType.Intersection,
    subjectFillType: api.PolyFillType.NonZero,
    clipFillType: api.PolyFillType.NonZero,
    subjectInputs: [{ data: svgToClipperPaths(pathsA), closed: true }],
    clipInputs: [{ data: svgToClipperPaths(pathsB) }]
  });

  return normalizeOutputPaths(result);
}

export async function simplifyPath(
  points: ReadonlyArray<Readonly<Point2D>>,
  fillType: FillRule = 'nonzero'
): Promise<ReadonlyArray<NormalizedContour>> {
  if (!FILL_RULES.includes(fillType)) {
    invalidGeometry('La regla de relleno del polígono es inválida.', { field: 'fillType' });
  }

  const { api, lib } = await initClipper();
  const result = lib.simplifyPolygon(
    svgToClipperPath(points),
    resolveFillType(api, fillType)
  );

  return normalizeOutputPaths(result);
}

/**
 * Build both sides of a cutter wall without substituting the source contour
 * when an offset collapses or changes topology.
 */
export async function createCutterWalls(
  points: ReadonlyArray<Readonly<Point2D>>,
  wallThickness: number
): Promise<Readonly<CutterWallPaths>> {
  if (!Number.isFinite(wallThickness) || wallThickness <= 0) {
    invalidGeometry('El espesor de pared debe ser un número finito positivo.', {
      field: 'wallThickness',
      value: wallThickness
    });
  }

  const [outer, inner] = await Promise.all([
    offsetPath(points, wallThickness / 2, 'round'),
    offsetPath(points, -wallThickness / 2, 'round')
  ]);

  if (outer.length === 0) {
    throw new CutterGenerationError(
      'OFFSET_FAILED',
      'No se pudo generar la pared exterior del cortador.',
      { side: 'outer', wallThickness }
    );
  }

  if (inner.length === 0) {
    throw new CutterGenerationError(
      'OFFSET_FAILED',
      'El contorno es demasiado pequeño para el espesor de pared pedido.',
      { side: 'inner', wallThickness }
    );
  }

  return Object.freeze({ outer, inner });
}
