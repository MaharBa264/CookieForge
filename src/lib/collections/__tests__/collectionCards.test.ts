import { describe, expect, it } from 'vitest';
import { addCollection, assignDesign } from '../designCollections';
import { assignCardPiece, createCollectionCard, removeCollectionCard, parseCollectionCards,
  loadCollectionCards, saveCollectionCards } from '../collectionCards';
import { createDesignDocument } from '../../projects/createDesignDocument';

const now = '2026-11-04T00:00:00Z';
const source = { type: 'svg' as const, fileName: 'card.svg', svg: '<svg xmlns="http://www.w3.org/2000/svg"/>' };
const base = addCollection({ schemaVersion: 1, collections: [], memberships: {} }, 'Tarot', {
  cutter: { targetSize: 125 }, stamp: { targetSize: 106 }
}, 'tarot', now);
const cutter = createDesignDocument({ name: 'Cortante II', kind: 'cutter', source },
  { createId: () => 'c', now: () => now });
const stamp = createDesignDocument({ name: 'Sello II', kind: 'stamp', source },
  { createId: () => 's', now: () => now });
const membership = assignDesign(assignDesign(base, cutter.id, 'tarot'), stamp.id, 'tarot');

describe('tarjetas independientes de las mallas y los archivos del usuario', () => {
  it('agrupa cortante y sello de la misma colección conservando sus documentos', () => {
    const created = createCollectionCard({ schemaVersion: 1, cards: [] }, membership, 'tarot', 'La Sacerdotisa II', 'ii');
    const withCutter = assignCardPiece(created, membership, [cutter, stamp], 'ii', 'cutter', 'c');
    const complete = assignCardPiece(withCutter, membership, [cutter, stamp], 'ii', 'stamp', 's');
    expect(complete.cards[0]).toMatchObject({ name: 'La Sacerdotisa II', cutterId: 'c', stampId: 's' });
    expect(removeCollectionCard(complete, 'ii').cards).toEqual([]);
    expect(cutter.parameters.targetSize).toBe(75);
    expect(stamp.parameters.targetSize).toBe(75);
  });
  it('rechaza asignaciones equivocadas y duplicados entre tarjetas', () => {
    const first = createCollectionCard({ schemaVersion: 1, cards: [] }, membership, 'tarot', 'II', 'ii');
    const two = createCollectionCard(first, membership, 'tarot', 'XVII', 'xvii');
    expect(() => assignCardPiece(two, membership, [cutter, stamp], 'ii', 'stamp', 'c')).toThrow();
    expect(() => assignCardPiece(two, base, [cutter, stamp], 'ii', 'cutter', 'c')).toThrow();
    const assigned = assignCardPiece(two, membership, [cutter, stamp], 'ii', 'cutter', 'c');
    expect(() => assignCardPiece(assigned, membership, [cutter, stamp], 'xvii', 'cutter', 'c')).toThrow();
    expect(() => createCollectionCard(first, membership, 'tarot', 'Duplicado', 'ii')).toThrow();
  });
  it('conserva tarjetas en almacenamiento aparte con validación', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    const catalog = createCollectionCard({ schemaVersion: 1, cards: [] }, membership, 'tarot', 'II', 'ii');
    saveCollectionCards(storage, catalog);
    expect(loadCollectionCards(storage)).toEqual(catalog);
    expect(() => parseCollectionCards({ schemaVersion: 1, cards: [{ id: '', name: 'X', collectionId: 'tarot' }] })).toThrow();
  });
});
