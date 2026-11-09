import type { DesignDocument, DesignDocumentV1, DesignDocumentV2, MultiCutterDocument, StampDocumentV4 } from '../domain/designDocument';
import { parseDesignDocument } from '../domain/documentValidation';
import {
  migrateV0ToV1,
  type MigrationV0ToV1Options
} from '../domain/migrations/v0ToV1';

export const PROJECT_FORMAT = 'cookie-cutter-designer-project' as const;
export const PROJECT_VERSION = 1 as const; // Historical V1 envelope; never change its meaning.
export const PROJECT_VERSION_V2 = 2 as const;
export const PROJECT_VERSION_V4 = 4 as const;

export interface ProjectEnvelopeV1 {
  readonly format: typeof PROJECT_FORMAT;
  readonly version: typeof PROJECT_VERSION;
  readonly document: DesignDocumentV1;
}
export interface ProjectEnvelopeV2 {
  readonly format: typeof PROJECT_FORMAT;
  readonly version: typeof PROJECT_VERSION_V2;
  readonly document: DesignDocumentV2;
}

export interface ProjectEnvelopeV3 {
  readonly format: typeof PROJECT_FORMAT;
  readonly version: 3;
  readonly document: MultiCutterDocument;
}

export interface ProjectEnvelopeV4 {
  readonly format: typeof PROJECT_FORMAT;
  readonly version: typeof PROJECT_VERSION_V4;
  readonly document: StampDocumentV4;
}
export type ProjectEnvelope = ProjectEnvelopeV1 | ProjectEnvelopeV2 | ProjectEnvelopeV3 | ProjectEnvelopeV4;

export interface DecodedProject {
  readonly document: DesignDocument;
  readonly warnings: readonly string[];
}

export class ProjectCodecError extends Error {
  declare readonly message: string;
  readonly path: string;
  readonly cause: unknown;

  constructor(path: string, message: string, cause?: unknown) {
    super(`${path}: ${message}`);
    this.name = 'ProjectCodecError';
    this.path = path;
    this.cause = cause;
  }
}

type UnknownRecord = Record<string, unknown>;

const ENVELOPE_KEYS = ['format', 'version', 'document'] as const;
const ENVELOPE_HEADER_KEYS = ['format', 'version'] as const;
const EMPTY_WARNINGS: readonly string[] = Object.freeze([]);

function invalid(path: string, message: string, cause?: unknown): never {
  throw new ProjectCodecError(path, message, cause);
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function requireRecord(value: unknown): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid('$', 'la envoltura del proyecto debe ser un objeto.');
  }
  return value as UnknownRecord;
}

function requireEnvelopeHeaderKeys(record: UnknownRecord): void {
  for (const key of ENVELOPE_HEADER_KEYS) {
    if (!hasOwn(record, key)) {
      invalid(key, 'es obligatorio en la envoltura del proyecto.');
    }
  }
}

function requireExactEnvelopeKeys(record: UnknownRecord): void {
  const expected = new Set<string>(ENVELOPE_KEYS);

  for (const key of ENVELOPE_KEYS) {
    if (!hasOwn(record, key)) {
      invalid(key, 'es obligatorio en la envoltura del proyecto.');
    }
  }

  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string') {
      invalid('$', 'contiene una propiedad de tipo símbolo desconocida.');
    }
    if (!expected.has(key)) {
      invalid(key, 'no es un campo de envoltura reconocido.');
    }
  }
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch (cause: unknown) {
    invalid('$', 'JSON inválido.', cause);
  }
}

function isLegacyProjectV0(record: UnknownRecord): boolean {
  return !hasOwn(record, 'format') && record.version === '1.0.0';
}

function validateEnvelopeHeader(record: UnknownRecord): void {
  if (record.format !== PROJECT_FORMAT) {
    invalid(
      'format',
      `debe ser exactamente «${PROJECT_FORMAT}».`
    );
  }

  if (record.version !== PROJECT_VERSION && record.version !== PROJECT_VERSION_V2 && record.version !== 3 && record.version !== PROJECT_VERSION_V4) {
    if (
      typeof record.version === 'number' &&
      Number.isFinite(record.version) &&
      record.version > PROJECT_VERSION_V4
    ) {
      invalid(
        'version',
        `la versión futura ${record.version} no es compatible.`
      );
    }
    invalid('version', 'versión desconocida; solo se admiten las versiones 1, 2, 3 y 4.');
  }
}

/**
 * Limite du format V1 : une DesignSource raster ne conserve pas le blob raster
 * d’origine, seulement son nom, son type MIME et le SVG vectorisé. Le codec ne
 * peut donc calculer aucun checksum du raster et n’invente aucun champ pour lui.
 */
export function encodeProject(document: unknown): string {
  const parsedDocument = parseDesignDocument(document);
  const envelope: ProjectEnvelope = parsedDocument.schemaVersion === 1
    ? { format: PROJECT_FORMAT, version: PROJECT_VERSION, document: parsedDocument }
    : parsedDocument.schemaVersion === 2
      ? { format: PROJECT_FORMAT, version: PROJECT_VERSION_V2, document: parsedDocument }
      : parsedDocument.schemaVersion === 3
        ? { format: PROJECT_FORMAT, version: 3, document: parsedDocument }
        : { format: PROJECT_FORMAT, version: PROJECT_VERSION_V4, document: parsedDocument };
  return JSON.stringify(envelope, null, 2);
}

export function decodeProject(
  json: string,
  options: MigrationV0ToV1Options = {}
): DecodedProject {
  const record = requireRecord(parseJson(json));

  if (isLegacyProjectV0(record)) {
    return migrateV0ToV1(record, options);
  }

  requireEnvelopeHeaderKeys(record);
  validateEnvelopeHeader(record);
  requireExactEnvelopeKeys(record);

  const document = parseDesignDocument(record.document);
  if (record.version !== document.schemaVersion) invalid('document.schemaVersion', 'debe coincidir con la versión de la envoltura.');
  return { document, warnings: EMPTY_WARNINGS };
}
