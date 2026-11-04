import type { CollectionCatalog } from './designCollections';
import type { DesignDocument } from '../domain/designDocument';

export const COLLECTION_CARDS_STORAGE_KEY = 'cookieforge-collection-cards-v1';
export type CardSlot = 'cutter' | 'stamp';

export interface CollectionCard {
  readonly id: string;
  readonly collectionId: string;
  readonly name: string;
  readonly cutterId?: string;
  readonly stampId?: string;
}
export interface CollectionCardCatalog {
  readonly schemaVersion: 1;
  readonly cards: readonly CollectionCard[];
}
export const EMPTY_CARD_CATALOG: CollectionCardCatalog = { schemaVersion: 1, cards: [] };

export function parseCollectionCards(value: unknown): CollectionCardCatalog {
  if (!value || typeof value !== 'object') throw new Error('Catálogo de diseños inválido.');
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== 1 || !Array.isArray(source.cards)) throw new Error('Versión de tarjetas incompatible.');
  const ids = new Set<string>();
  const slots = new Set<string>();
  const cards: CollectionCard[] = source.cards.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Tarjeta inválida.');
    const card = item as Record<string, unknown>;
    if (typeof card.id !== 'string' || !card.id.trim() || ids.has(card.id) ||
        typeof card.collectionId !== 'string' || !card.collectionId.trim() ||
        typeof card.name !== 'string' || !card.name.trim() || card.name.length > 120) {
      throw new Error('Identidad de tarjeta inválida.');
    }
    ids.add(card.id);
    for (const slot of ['cutterId', 'stampId'] as const) {
      if (card[slot] === undefined) continue;
      if (typeof card[slot] !== 'string' || !(card[slot] as string).trim() ||
          slots.has(card[slot] as string)) throw new Error('Una pieza solo puede estar en una tarjeta.');
      slots.add(card[slot] as string);
    }
    return { id: card.id, collectionId: card.collectionId, name: card.name.trim(),
      ...(card.cutterId === undefined ? {} : { cutterId: card.cutterId as string }),
      ...(card.stampId === undefined ? {} : { stampId: card.stampId as string }) };
  });
  return { schemaVersion: 1, cards };
}
export interface CardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function loadCollectionCards(storage: CardStorage): CollectionCardCatalog {
  const raw = storage.getItem(COLLECTION_CARDS_STORAGE_KEY);
  return raw === null ? { schemaVersion: 1, cards: [] } : parseCollectionCards(JSON.parse(raw));
}
export function saveCollectionCards(storage: CardStorage, catalog: CollectionCardCatalog): void {
  storage.setItem(COLLECTION_CARDS_STORAGE_KEY, JSON.stringify(parseCollectionCards(catalog)));
}
export function createCollectionCard(catalog: CollectionCardCatalog, collections: CollectionCatalog,
  collectionId: string, name: string, id: string): CollectionCardCatalog {
  if (!collections.collections.some(item => item.id === collectionId)) throw new Error('Colección inexistente.');
  return parseCollectionCards({ schemaVersion: 1, cards: [...catalog.cards,
    { id, name, collectionId }] });
}
export function assignCardPiece(catalog: CollectionCardCatalog, collections: CollectionCatalog,
  documents: readonly DesignDocument[], cardId: string, slot: CardSlot, documentId: string | null): CollectionCardCatalog {
  const card = catalog.cards.find(item => item.id === cardId);
  if (!card) throw new Error('Tarjeta inexistente.');
  if (documentId !== null) {
    const document = documents.find(item => item.id === documentId);
    if (!document || document.kind !== slot || collections.memberships[documentId] !== card.collectionId) {
      throw new Error('La pieza debe pertenecer a esta colección y ser del tipo correcto.');
    }
    if (catalog.cards.some(other => other.id !== cardId &&
      (other.cutterId === documentId || other.stampId === documentId))) {
      throw new Error('La pieza ya pertenece a otra tarjeta.');
    }
  }
  const key = slot === 'cutter' ? 'cutterId' : 'stampId';
  return parseCollectionCards({ schemaVersion: 1, cards: catalog.cards.map(item => item.id === cardId
    ? { ...item, [key]: documentId ?? undefined } : item) });
}
export function removeCollectionCard(catalog: CollectionCardCatalog, cardId: string): CollectionCardCatalog {
  return parseCollectionCards({ schemaVersion: 1, cards: catalog.cards.filter(item => item.id !== cardId) });
}
