import type { DesignDocument } from '../domain/designDocument';
import type { CutterDesignParameters, StampDesignParameters } from '../domain/designParameters';

/**
 * Collections are independent metadata. Existing .ccd.json documents and the
 * IndexedDB "projects" object store are intentionally left untouched.
 */
export interface CollectionDefaults {
  readonly cutter: Partial<Pick<CutterDesignParameters, 'targetSize' | 'sizeMode' | 'cuttingHeight' | 'wallThickness' | 'enableHandle'>>;
  readonly stamp: Partial<Pick<StampDesignParameters, 'targetSize' | 'sizeMode' | 'stampDepth' | 'wallThickness' | 'stampBase' | 'enableHandle'>>;
}
export interface DesignCollection {
  readonly id: string;
  readonly name: string;
  readonly defaults: CollectionDefaults;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface CollectionCatalog {
  readonly schemaVersion: 1;
  readonly collections: readonly DesignCollection[];
  /** A design can belong to at most one collection. Unassigned designs remain visible. */
  readonly memberships: Readonly<Record<string, string>>;
}

export const COLLECTION_STORAGE_KEY = 'cookieforge-collections-v1';
export const ACTIVE_COLLECTION_STORAGE_KEY = 'cookieforge-active-collection-v1';
export const EMPTY_COLLECTION_CATALOG: CollectionCatalog = Object.freeze({
  schemaVersion: 1, collections: [], memberships: {}
});

export interface CollectionKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const numberIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

function validateDefaults(input: unknown): CollectionDefaults {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Parámetros de colección inválidos.');
  const source = input as Record<string, unknown>;
  const cutter = (source.cutter ?? {}) as Record<string, unknown>;
  const stamp = (source.stamp ?? {}) as Record<string, unknown>;
  if (!cutter || typeof cutter !== 'object' || Array.isArray(cutter) ||
      !stamp || typeof stamp !== 'object' || Array.isArray(stamp)) throw new Error('Parámetros de colección inválidos.');
  const check = (record: Record<string, unknown>, allowed: Record<string, (value: unknown) => boolean>) => {
    for (const [key, value] of Object.entries(record)) {
      if (!(key in allowed) || !allowed[key](value)) throw new Error(`Parámetro de colección inválido: ${key}`);
    }
  };
  const sizeMode = (v: unknown) => v === 'height' || v === 'width' || v === 'longest';
  const yesNo = (v: unknown) => typeof v === 'boolean';
  check(cutter, { targetSize: v => numberIn(v, 5, 500), sizeMode, cuttingHeight: v => numberIn(v, 1, 100),
    wallThickness: v => numberIn(v, 0.2, 10), enableHandle: yesNo });
  check(stamp, { targetSize: v => numberIn(v, 5, 500), sizeMode, stampDepth: v => numberIn(v, 0.2, 20),
    wallThickness: v => numberIn(v, 0.2, 10), stampBase: yesNo, enableHandle: yesNo });
  return { cutter: { ...cutter } as CollectionDefaults['cutter'], stamp: { ...stamp } as CollectionDefaults['stamp'] };
}

export function validateCollectionCatalog(value: unknown): CollectionCatalog {
  if (!value || typeof value !== 'object') throw new Error('Catálogo de colecciones inválido.');
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1 || !Array.isArray(data.collections) ||
      !data.memberships || typeof data.memberships !== 'object' || Array.isArray(data.memberships)) {
    throw new Error('Formato de colecciones incompatible.');
  }
  const ids = new Set<string>();
  const collections: DesignCollection[] = data.collections.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Colección inválida.');
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id) ||
        typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120 ||
        typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)) ||
        typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt))) {
      throw new Error('Identidad de colección inválida.');
    }
    ids.add(item.id);
    return { id: item.id, name: item.name.trim(), defaults: validateDefaults(item.defaults),
      createdAt: item.createdAt, updatedAt: item.updatedAt };
  });
  const memberships: Record<string, string> = Object.create(null);
  for (const [designId, collectionId] of Object.entries(data.memberships as Record<string, unknown>)) {
    if (!designId.trim() || typeof collectionId !== 'string' || !ids.has(collectionId)) {
      throw new Error('Asociación de colección inválida.');
    }
    memberships[designId] = collectionId;
  }
  return { schemaVersion: 1, collections, memberships };
}

export function loadCollectionCatalog(storage: CollectionKeyValueStorage): CollectionCatalog {
  const encoded = storage.getItem(COLLECTION_STORAGE_KEY);
  return encoded === null ? { schemaVersion: 1, collections: [], memberships: {} }
    : validateCollectionCatalog(JSON.parse(encoded));
}

export function saveCollectionCatalog(storage: CollectionKeyValueStorage, catalog: CollectionCatalog): void {
  const checked = validateCollectionCatalog(catalog);
  // Any storage/quota error propagates. Never report success or clear the old catalog.
  storage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(checked));
}

export function addCollection(catalog: CollectionCatalog, name: string, defaults: CollectionDefaults,
  id: string, now: string): CollectionCatalog {
  if (!id.trim() || catalog.collections.some(item => item.id === id)) throw new Error('Identificador duplicado.');
  return validateCollectionCatalog({
    ...catalog, collections: [...catalog.collections,
      { id, name, defaults, createdAt: now, updatedAt: now }]
  });
}

export function assignDesign(catalog: CollectionCatalog, designId: string, collectionId: string | null): CollectionCatalog {
  if (!designId.trim()) throw new Error('Diseño inválido.');
  if (collectionId !== null && !catalog.collections.some(item => item.id === collectionId)) {
    throw new Error('La colección no existe.');
  }
  const memberships = { ...catalog.memberships };
  if (collectionId === null) delete memberships[designId];
  else memberships[designId] = collectionId;
  return validateCollectionCatalog({ ...catalog, memberships });
}

export function removeCollection(catalog: CollectionCatalog, id: string): CollectionCatalog {
  const memberships = Object.fromEntries(Object.entries(catalog.memberships)
    .filter(([, collectionId]) => collectionId !== id));
  return validateCollectionCatalog({
    ...catalog, collections: catalog.collections.filter(item => item.id !== id), memberships
  });
}

/** Apply defaults only on explicit new-design creation, never on reopen or catalog edits. */
export function inheritCollectionDefaults<T extends DesignDocument>(document: T, collection: DesignCollection): T {
  if (document.kind !== 'cutter' && document.kind !== 'stamp') return document;
  const defaults = document.kind === 'cutter' ? collection.defaults.cutter : collection.defaults.stamp;
  return { ...document, parameters: { ...document.parameters, ...defaults } } as T;
}

/** Update only the collection template. Existing design documents remain unchanged. */
export function updateCollectionDefaults(
  catalog: CollectionCatalog, id: string, defaults: CollectionDefaults, now: string
): CollectionCatalog {
  if (!catalog.collections.some(item => item.id === id)) throw new Error('La colección no existe.');
  return validateCollectionCatalog({
    ...catalog,
    collections: catalog.collections.map(item => item.id === id
      ? { ...item, defaults, updatedAt: now } : item)
  });
}

export type CollectionFilter = 'all' | 'unassigned' | string;

export function filterDesignsByCollection<T extends { readonly id: string }>(
  designs: readonly T[], catalog: CollectionCatalog, selection: CollectionFilter
): readonly T[] {
  if (selection === 'all') return designs;
  if (selection === 'unassigned') return designs.filter(item => !catalog.memberships[item.id]);
  if (!catalog.collections.some(item => item.id === selection)) return [];
  return designs.filter(item => catalog.memberships[item.id] === selection);
}
