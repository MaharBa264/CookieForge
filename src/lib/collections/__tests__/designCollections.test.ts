import { describe, expect, it } from 'vitest';
import {
  addCollection, assignDesign, inheritCollectionDefaults, loadCollectionCatalog,
  removeCollection, saveCollectionCatalog, COLLECTION_STORAGE_KEY
} from '../designCollections';
import { createDesignDocument } from '../../projects/createDesignDocument';

const source = { type: 'svg' as const, fileName: 'carta.svg', svg: '<svg xmlns="http://www.w3.org/2000/svg"/>' };
const defaults = {
  cutter: { targetSize: 125, sizeMode: 'height' as const, cuttingHeight: 12 },
  stamp: { targetSize: 106, sizeMode: 'height' as const, stampDepth: 1.2, stampBase: true }
};
const now = '2026-11-04T00:00:00.000Z';
const empty = { schemaVersion: 1 as const, collections: [], memberships: {} };

describe('colecciones independientes de documentos V1-V5', () => {
  it('asigna, desasigna y elimina colecciones sin borrar diseños', () => {
    const created = addCollection(empty, 'Tarot Celestial', defaults, 'tarot', now);
    const assigned = assignDesign(created, 'sacerdotisa', 'tarot');
    expect(assigned.memberships).toEqual({ sacerdotisa: 'tarot' });
    expect(assignDesign(assigned, 'sacerdotisa', null).memberships).toEqual({});
    expect(removeCollection(assigned, 'tarot').memberships).toEqual({});
    expect(removeCollection(assigned, 'tarot').collections).toEqual([]);
  });

  it('solo aplica las medidas al crear, sin mutar el diseño ni sus ajustes posteriores', () => {
    const collection = addCollection(empty, 'Tarot', defaults, 'tarot', now).collections[0];
    const original = createDesignDocument({ name: 'II', kind: 'cutter', source }, {
      now: () => now, createId: () => 'ii'
    });
    const inherited = inheritCollectionDefaults(original, collection);
    expect(inherited.parameters.targetSize).toBe(125);
    expect(inherited.parameters.sizeMode).toBe('height');
    expect(original.parameters.targetSize).toBe(75);
    const modified = { ...inherited, parameters: { ...inherited.parameters, targetSize: 95 } };
    expect(modified.parameters.targetSize).toBe(95);
    expect(inheritCollectionDefaults(modified, collection).parameters.targetSize).toBe(125);
    // No implicit re-inheritance during opening or editing: it is a caller-only factory.
    expect(modified.parameters.targetSize).toBe(95);
  });

  it('mantiene parámetros independientes de sello y cortante', () => {
    const collection = addCollection(empty, 'Tarot', defaults, 'tarot', now).collections[0];
    const original = createDesignDocument({ name: 'Sello II', kind: 'stamp', source }, {
      now: () => now, createId: () => 'ii-stamp'
    });
    const stamp = inheritCollectionDefaults(original, collection);
    expect(stamp.parameters.targetSize).toBe(106);
    expect(stamp.parameters.stampDepth).toBe(1.2);
    expect(stamp.parameters.stampBase).toBe(true);
    expect(original.parameters.targetSize).toBe(75);
  });

  it('persiste el catálogo de forma aislada de los archivos de proyecto', () => {
    const backing = new Map<string, string>();
    const storage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => { backing.set(key, value); }
    };
    expect(loadCollectionCatalog(storage).collections).toEqual([]);
    const catalog = addCollection(empty, 'Tarot', defaults, 'tarot', now);
    saveCollectionCatalog(storage, catalog);
    expect(backing.has(COLLECTION_STORAGE_KEY)).toBe(true);
    expect(loadCollectionCatalog(storage)).toEqual(catalog);
    expect(() => assignDesign(catalog, 'a', 'inexistente')).toThrow();
    backing.set(COLLECTION_STORAGE_KEY, '{roto');
    expect(() => loadCollectionCatalog(storage)).toThrow();
  });
});
