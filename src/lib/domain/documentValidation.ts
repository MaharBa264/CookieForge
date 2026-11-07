import type {
  DesignDocument,
  DesignDocumentV1,
  DesignDocumentV2,
  Bridge,
  DesignSource,
  RasterMimeType,
  SketchDocument,
  ViewportPreferences
} from './designDocument';
import { CUTTER_SERIES_LIMITS } from './cutterSeries';
import { STAMP_IMPRINT_LIMITS } from './stampImprint';
import { isDesignKind } from './designKind';
import type {
  CutterDesignParameters,
  DesignHandleStyleV1,
  DesignSizeModeV1,
  StampDesignParameters
} from './designParameters';
import { validateSafeSvg } from './svgSafety';
import { DesignDocumentValidationError } from './validationError';

export { DesignDocumentValidationError };

type UnknownRecord = Record<string, unknown>;

const DOCUMENT_KEYS = [
  'schemaVersion',
  'id',
  'name',
  'kind',
  'source',
  'sketch',
  'parameters',
  'viewport',
  'createdAt',
  'updatedAt'
] as const;
const SVG_SOURCE_KEYS = ['type', 'fileName', 'svg'] as const;
const RASTER_SOURCE_KEYS = [
  'type',
  'fileName',
  'mimeType',
  'vectorizedSvg'
] as const;
const SKETCH_KEYS = ['svg', 'revision'] as const;
const VIEWPORT_KEYS = ['showGrid', 'showAxes', 'showWallThickness'] as const;
const PARAMETER_KEYS = [
  'wallThickness',
  'cuttingHeight',
  'totalHeight',
  'taperAngle',
  'targetSize',
  'sizeMode',
  'handleStyle',
  'handleHeight',
  'enableHandle',
  'enableEmbossing',
  'embossDepth',
  'buildPlateSize',
  'mode',
  'stampDepth',
  'stampBase'
] as const satisfies readonly (keyof CutterDesignParameters)[];
const SIZE_MODES = [
  'longest',
  'width',
  'height'
] as const satisfies readonly DesignSizeModeV1[];
const HANDLE_STYLES = [
  'round',
  'chamfered',
  'rectangular',
  'flat',
  'none'
] as const satisfies readonly DesignHandleStyleV1[];
const PARAMETER_MODES = ['cutter', 'stamp'] as const;

export const DESIGN_DOCUMENT_V1_LIMITS = Object.freeze({
  wallThickness: Object.freeze({ minimum: 0.4, maximum: 10 }),
  cuttingHeight: Object.freeze({ minimum: 1, maximum: 100 }),
  totalHeight: Object.freeze({ minimum: 1, maximum: 150 }),
  taperAngle: Object.freeze({ minimum: 0, maximum: 30 }),
  targetSize: Object.freeze({ minimum: 10, maximum: 1000 }),
  handleHeight: Object.freeze({ minimum: 0, maximum: 100 }),
  buildPlateSize: Object.freeze({ minimum: 20, maximum: 1000 }),
  embossDepth: Object.freeze({ minimum: 0, maximum: 20 }),
  stampDepth: Object.freeze({ minimum: 0.1, maximum: 50 })
} as const);

const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;

function invalid(path: string, message: string): never {
  throw new DesignDocumentValidationError(path, message);
}

function childPath(parent: string, key: string): string {
  return parent.length === 0 ? key : `${parent}.${key}`;
}

function requireRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(path, 'debe ser un objeto.');
  }

  return value as UnknownRecord;
}

function requireExactKeys(
  record: UnknownRecord,
  path: string,
  expectedKeys: readonly string[]
): void {
  const expected = new Set(expectedKeys);

  for (const key of expectedKeys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      invalid(childPath(path, key), 'es obligatorio.');
    }
  }

  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string') {
      invalid(path.length === 0 ? '$' : path, 'contiene una propiedad de tipo símbolo desconocida.');
    }
    if (!expected.has(key)) {
      invalid(childPath(path, key), "no es un campo reconocido.");
    }
  }
}

function readNonEmptyString(
  record: UnknownRecord,
  key: string,
  parentPath: string
): string {
  const value = record[key];
  const path = childPath(parentPath, key);

  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(path, 'debe ser una cadena no vacía.');
  }

  return value;
}

function readBoolean(
  record: UnknownRecord,
  key: string,
  parentPath: string
): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    invalid(childPath(parentPath, key), 'debe ser un booleano.');
  }
  return value;
}

function readFiniteNumber(
  record: UnknownRecord,
  key: string,
  parentPath: string
): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalid(childPath(parentPath, key), 'debe ser un número finito.');
  }
  return value;
}


function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isValidIsoTimestamp(value: string): boolean {
  const match = ISO_TIMESTAMP_PATTERN.exec(value);
  if (match === null) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[7] === undefined ? 0 : Number(match[7]);
  const offsetMinute = match[8] === undefined ? 0 : Number(match[8]);
  const daysByMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];
  const daysInMonth = daysByMonth[month - 1];

  return (
    month >= 1 &&
    month <= 12 &&
    daysInMonth !== undefined &&
    day >= 1 &&
    day <= daysInMonth &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 14 &&
    offsetMinute <= 59 &&
    (offsetHour < 14 || offsetMinute === 0) &&
    Number.isFinite(Date.parse(value))
  );
}

function readIsoTimestamp(
  record: UnknownRecord,
  key: 'createdAt' | 'updatedAt'
): { value: string; epochMilliseconds: number } {
  const value = record[key];
  if (typeof value !== 'string' || !isValidIsoTimestamp(value)) {
    invalid(key, 'debe ser una marca de tiempo ISO 8601 válida con huso horario.');
  }

  return { value, epochMilliseconds: Date.parse(value) };
}

function readRasterMimeType(record: UnknownRecord): RasterMimeType {
  const value = record.mimeType;
  if (
    value !== 'image/png' &&
    value !== 'image/jpeg' &&
    value !== 'image/webp'
  ) {
    invalid('source.mimeType', 'debe ser image/png, image/jpeg o image/webp.');
  }
  return value;
}

function parseSource(value: unknown): DesignSource {
  const record = requireRecord(value, 'source');
  const type = record.type;

  if (type === 'svg') {
    requireExactKeys(record, 'source', SVG_SOURCE_KEYS);
    return {
      type: 'svg',
      fileName: readNonEmptyString(record, 'fileName', 'source'),
      svg: validateSafeSvg(
        readNonEmptyString(record, 'svg', 'source'),
        'source.svg'
      )
    };
  }

  if (type === 'raster') {
    requireExactKeys(record, 'source', RASTER_SOURCE_KEYS);
    return {
      type: 'raster',
      fileName: readNonEmptyString(record, 'fileName', 'source'),
      mimeType: readRasterMimeType(record),
      vectorizedSvg: validateSafeSvg(
        readNonEmptyString(record, 'vectorizedSvg', 'source'),
        'source.vectorizedSvg'
      )
    };
  }

  invalid('source.type', 'debe ser svg o raster.');
}

function parseSketch(value: unknown): SketchDocument {
  const record = requireRecord(value, 'sketch');
  requireExactKeys(record, 'sketch', SKETCH_KEYS);
  const revision = readFiniteNumber(record, 'revision', 'sketch');

  if (!Number.isSafeInteger(revision) || revision < 0) {
    invalid('sketch.revision', 'debe ser un entero positivo o cero.');
  }

  return {
    svg: validateSafeSvg(readNonEmptyString(record, 'svg', 'sketch'), 'sketch.svg'),
    revision
  };
}

function parseViewport(value: unknown): ViewportPreferences {
  const record = requireRecord(value, 'viewport');
  requireExactKeys(record, 'viewport', VIEWPORT_KEYS);

  return {
    showGrid: readBoolean(record, 'showGrid', 'viewport'),
    showAxes: readBoolean(record, 'showAxes', 'viewport'),
    showWallThickness: readBoolean(record, 'showWallThickness', 'viewport')
  };
}

function readParameterEnum<TValue extends string>(
  record: UnknownRecord,
  key: string,
  allowedValues: readonly TValue[]
): TValue {
  const value = record[key];
  if (
    typeof value !== 'string' ||
    !allowedValues.some((allowedValue) => allowedValue === value)
  ) {
    invalid(
      childPath('parameters', key),
      `debe ser uno de los siguientes valores: ${allowedValues.join(', ')}.`
    );
  }
  return value as TValue;
}

function requireParameterRange(
  key: string,
  value: number,
  limits: Readonly<{ minimum: number; maximum: number }>
): void {
  if (value < limits.minimum || value > limits.maximum) {
    invalid(
      childPath('parameters', key),
      `debe estar entre ${limits.minimum} y ${limits.maximum}, ambos incluidos.`
    );
  }
}

function parseParameters(
  value: unknown
): CutterDesignParameters | StampDesignParameters {
  const record = requireRecord(value, 'parameters');
  requireExactKeys(record, 'parameters', PARAMETER_KEYS);

  const wallThickness = readFiniteNumber(record, 'wallThickness', 'parameters');
  const cuttingHeight = readFiniteNumber(record, 'cuttingHeight', 'parameters');
  const totalHeight = readFiniteNumber(record, 'totalHeight', 'parameters');
  const taperAngle = readFiniteNumber(record, 'taperAngle', 'parameters');
  const targetSize = readFiniteNumber(record, 'targetSize', 'parameters');
  const sizeMode = readParameterEnum(record, 'sizeMode', SIZE_MODES);
  const handleStyle = readParameterEnum(record, 'handleStyle', HANDLE_STYLES);
  const handleHeight = readFiniteNumber(record, 'handleHeight', 'parameters');
  const enableHandle = readBoolean(record, 'enableHandle', 'parameters');
  const enableEmbossing = readBoolean(record, 'enableEmbossing', 'parameters');
  const embossDepth = readFiniteNumber(record, 'embossDepth', 'parameters');
  const buildPlateSize = readFiniteNumber(record, 'buildPlateSize', 'parameters');
  const mode = readParameterEnum(record, 'mode', PARAMETER_MODES);
  const stampDepth = readFiniteNumber(record, 'stampDepth', 'parameters');
  const stampBase = readBoolean(record, 'stampBase', 'parameters');

  requireParameterRange(
    'wallThickness',
    wallThickness,
    DESIGN_DOCUMENT_V1_LIMITS.wallThickness
  );
  requireParameterRange(
    'cuttingHeight',
    cuttingHeight,
    DESIGN_DOCUMENT_V1_LIMITS.cuttingHeight
  );
  requireParameterRange(
    'totalHeight',
    totalHeight,
    DESIGN_DOCUMENT_V1_LIMITS.totalHeight
  );
  requireParameterRange(
    'taperAngle',
    taperAngle,
    DESIGN_DOCUMENT_V1_LIMITS.taperAngle
  );
  requireParameterRange('targetSize', targetSize, DESIGN_DOCUMENT_V1_LIMITS.targetSize);
  requireParameterRange(
    'handleHeight',
    handleHeight,
    DESIGN_DOCUMENT_V1_LIMITS.handleHeight
  );
  requireParameterRange(
    'buildPlateSize',
    buildPlateSize,
    DESIGN_DOCUMENT_V1_LIMITS.buildPlateSize
  );
  requireParameterRange(
    'embossDepth',
    embossDepth,
    DESIGN_DOCUMENT_V1_LIMITS.embossDepth
  );
  requireParameterRange('stampDepth', stampDepth, DESIGN_DOCUMENT_V1_LIMITS.stampDepth);

  const parameters = {
    wallThickness,
    cuttingHeight,
    totalHeight,
    taperAngle,
    targetSize,
    sizeMode,
    handleStyle,
    handleHeight,
    enableHandle,
    enableEmbossing,
    embossDepth,
    buildPlateSize,
    stampDepth,
    stampBase
  };

  return mode === 'cutter'
    ? { ...parameters, mode }
    : { ...parameters, mode };
}

function parseCutterParameters(value: unknown): CutterDesignParameters {
  const parameters = parseParameters(value);
  if (parameters.mode !== 'cutter') {
    invalid('parameters.mode', 'debe ser cutter cuando kind es cutter.');
  }
  if (parameters.totalHeight < parameters.cuttingHeight) {
    invalid(
      'parameters.totalHeight',
      'debe ser mayor o igual que parameters.cuttingHeight en un cortador.'
    );
  }
  if (
    parameters.enableHandle &&
    parameters.handleStyle !== 'none' &&
    parameters.totalHeight <
      parameters.cuttingHeight + parameters.handleHeight
  ) {
    invalid(
      'parameters.totalHeight',
      'debe ser mayor o igual que parameters.cuttingHeight + parameters.handleHeight cuando el asa está activa.'
    );
  }
  return parameters;
}

function parseStampParameters(value: unknown): StampDesignParameters {
  const parameters = parseParameters(value);
  if (parameters.mode !== 'stamp') {
    invalid('parameters.mode', 'debe ser stamp cuando kind es stamp.');
  }
  if (!parameters.stampBase) {
    invalid(
      'parameters.stampBase',
      'debe valer true para unir todas las zonas de relieve en modo Stamp.'
    );
  }
  return parameters;
}


function assertUnreachable(value: never): never {
  invalid('kind', `el tipo (kind) no es compatible: ${String(value)}.`);
}

export function parseDesignDocumentV1(value: unknown): DesignDocumentV1 {
  const record = requireRecord(value, '$');
  requireExactKeys(record, '', DOCUMENT_KEYS);

  if (record.schemaVersion !== 1) {
    invalid('schemaVersion', 'debe ser exactamente 1.');
  }

  const id = readNonEmptyString(record, 'id', '');
  const name = readNonEmptyString(record, 'name', '');
  if (!isDesignKind(record.kind)) {
    invalid('kind', "no es un tipo de diseño reconocido.");
  }
  if (record.kind !== 'cutter' && record.kind !== 'stamp') {
    invalid('kind', 'es un tipo de diseño reconocido pero todavía no implementado.');
  }
  const kind = record.kind;
  const source = parseSource(record.source);
  const sketch = parseSketch(record.sketch);
  const viewport = parseViewport(record.viewport);
  const createdAt = readIsoTimestamp(record, 'createdAt');
  const updatedAt = readIsoTimestamp(record, 'updatedAt');

  if (updatedAt.epochMilliseconds < createdAt.epochMilliseconds) {
    invalid('updatedAt', 'debe ser posterior o igual a createdAt.');
  }

  const base = {
    schemaVersion: 1 as const,
    id,
    name,
    source,
    sketch,
    viewport,
    createdAt: createdAt.value,
    updatedAt: updatedAt.value
  };

  switch (kind) {
    case 'cutter':
      return {
        ...base,
        kind: 'cutter',
        parameters: parseCutterParameters(record.parameters)
      };
    case 'stamp':
      return {
        ...base,
        kind: 'stamp',
        parameters: parseStampParameters(record.parameters)
      };
    default:
      return assertUnreachable(kind);
  }
}

const V2_DOCUMENT_KEYS = [...DOCUMENT_KEYS, 'bridges'] as const;
const BRIDGE_KEYS = ['id', 'from', 'to', 'widthMm'] as const;
const POINT_KEYS = ['x', 'y'] as const;
export const BRIDGE_LIMITS = Object.freeze({ maxCount: 32, minWidthMm: 0.8, maxWidthMm: 10, maxCoordinate: 1_000_000 });

function parseBridgePoint(value: unknown, path: string): Bridge['from'] {
  const record = requireRecord(value, path);
  requireExactKeys(record, path, POINT_KEYS);
  const x = readFiniteNumber(record, 'x', path);
  const y = readFiniteNumber(record, 'y', path);
  if (Math.abs(x) > BRIDGE_LIMITS.maxCoordinate) invalid(`${path}.x`, 'coordonnée hors limite.');
  if (Math.abs(y) > BRIDGE_LIMITS.maxCoordinate) invalid(`${path}.y`, 'coordonnée hors limite.');
  return { x, y };
}

function parseBridges(value: unknown, kind: DesignDocument['kind']): readonly Bridge[] {
  if (!Array.isArray(value)) invalid('bridges', 'debe ser un arreglo.');
  if (value.length > BRIDGE_LIMITS.maxCount) invalid('bridges', 'demasiados puentes.');
  if (kind !== 'cutter' && value.length > 0) invalid('bridges', 'reservado a los cortadores.');
  const ids = new Set<string>();
  return value.map((item: unknown, index: number) => {
    const path = `bridges.${index}`;
    const record = requireRecord(item, path);
    requireExactKeys(record, path, BRIDGE_KEYS);
    const id = readNonEmptyString(record, 'id', path);
    if (ids.has(id)) invalid(`${path}.id`, 'identifiant de pont dupliqué.');
    ids.add(id);
    const from = parseBridgePoint(record.from, `${path}.from`);
    const to = parseBridgePoint(record.to, `${path}.to`);
    if (Math.hypot(from.x - to.x, from.y - to.y) < 0.001) invalid(`${path}.to`, 'los extremos deben ser distintos.');
    const widthMm = readFiniteNumber(record, 'widthMm', path);
    if (widthMm < BRIDGE_LIMITS.minWidthMm || widthMm > BRIDGE_LIMITS.maxWidthMm) {
      invalid(`${path}.widthMm`, 'ancho físico fuera de los límites.');
    }
    return { id, from, to, widthMm };
  });
}

/** V2 is strict, reconstructs every value, and never mutates the input. */
export function parseDesignDocumentV2(value: unknown): DesignDocumentV2 {
  const record = requireRecord(value, '$');
  if (record.schemaVersion !== 2) invalid('schemaVersion', 'debe ser exactamente 2.');
  requireExactKeys(record, '', V2_DOCUMENT_KEYS);
  const { bridges: rawBridges, ...legacyFields } = record;
  const base = parseDesignDocumentV1({ ...legacyFields, schemaVersion: 1 });
  // The V1 parser must never see the V2-only field.
  const bridges = parseBridges(rawBridges, base.kind);
  return { ...base, schemaVersion: 2, bridges } as DesignDocumentV2;
}

/** Strict V3 input; reuse frozen V2 Cutter fields rather than loosening legacy parsers. */
export function parseMultiCutterDocument(value: unknown): import('./designDocument').MultiCutterDocument {
  const record = requireRecord(value, '$');
  if (record.schemaVersion !== 3) invalid('schemaVersion', 'debe ser exactamente 3.');
  if (record.kind !== 'multi-cutter') invalid('kind', 'debe ser multi-cutter en V3.');
  requireExactKeys(record, '', [...V2_DOCUMENT_KEYS, 'layout']);
  const { layout: rawLayout, ...fields } = record;
  const base = parseDesignDocumentV2({ ...fields, schemaVersion: 2, kind: 'cutter' });
  if (base.kind !== 'cutter') invalid('kind', 'Se requiere un cortador.');
  const layout = requireRecord(rawLayout, 'layout');
  requireExactKeys(layout, 'layout', ['copies', 'columns', 'spacingMm']);
  const copies = readFiniteNumber(layout, 'copies', 'layout');
  const columns = readFiniteNumber(layout, 'columns', 'layout');
  const spacingMm = readFiniteNumber(layout, 'spacingMm', 'layout');
  if (!Number.isInteger(copies) || copies < 1 || copies > CUTTER_SERIES_LIMITS.maxCopies) invalid('layout.copies', 'se requiere un entero de 1 a 24.');
  if (!Number.isInteger(columns) || columns < 1 || columns > copies) invalid('layout.columns', 'se requiere un entero de 1 hasta la cantidad de copias.');
  if (spacingMm < CUTTER_SERIES_LIMITS.minSpacingMm || spacingMm > CUTTER_SERIES_LIMITS.maxSpacingMm) invalid('layout.spacingMm', 'se requiere una separación de 0,5 a 40 mm.');
  return { ...base, schemaVersion: 3, kind: 'multi-cutter', layout: { copies, columns, spacingMm } };
}

/** Strict V4 stamp; all historical fields retain the exact V2 validation rules. */
export function parseStampDocumentV4(value: unknown): import('./designDocument').StampDocumentV4 {
  const record = requireRecord(value, '$');
  if (record.schemaVersion !== 4) invalid('schemaVersion', 'debe ser exactamente 4.');
  if (record.kind !== 'stamp') invalid('kind', 'debe ser stamp en V4.');
  requireExactKeys(record, '', [...V2_DOCUMENT_KEYS, 'imprintMode']);
  const { imprintMode, ...fields } = record;
  if (imprintMode !== 'raised' && imprintMode !== 'recessed') {
    invalid('imprintMode', 'debe ser raised o recessed.');
  }
  const base = parseDesignDocumentV2({ ...fields, schemaVersion: 2 });
  if (base.kind !== 'stamp') invalid('kind', 'Se requiere un sello.');
  if (imprintMode === 'recessed' && base.parameters.stampDepth > STAMP_IMPRINT_LIMITS.maximumRecessDepthMm) {
    invalid('parameters.stampDepth', 'El hueco está limitado a 3 mm para conservar al menos 1 mm de la base de 4 mm. Reducí explícitamente la profundidad antes de elegir Hueco.');
  }
  return { ...base, schemaVersion: 4, bridges: [], imprintMode };
}

/** Route by header before checking version-specific fields. V1 remains unchanged. */
export function parseDesignDocument(value: unknown): DesignDocument {
  const record = requireRecord(value, '$');
  if (record.schemaVersion === 1) return parseDesignDocumentV1(value);
  if (record.schemaVersion === 2) return parseDesignDocumentV2(value);
  if (record.schemaVersion === 3) return parseMultiCutterDocument(value);
  if (record.schemaVersion === 4) return parseStampDocumentV4(value);
  invalid('schemaVersion', 'versión de documento no compatible.');
}