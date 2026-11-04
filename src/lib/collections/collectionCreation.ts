import type { DesignDocument } from '../domain/designDocument';
import { parseDesignDocument } from '../domain/documentValidation';
import { ACTIVE_COLLECTION_STORAGE_KEY, assignDesign, inheritCollectionDefaults,
  loadCollectionCatalog, saveCollectionCatalog, type CollectionKeyValueStorage } from './designCollections';

export function prepareCollectionDesign(input: unknown, storage: CollectionKeyValueStorage): {
  readonly document: DesignDocument;
  readonly collectionId: string | null;
} {
  const document = parseDesignDocument(input);
  const catalog = loadCollectionCatalog(storage);
  const selected = storage.getItem(ACTIVE_COLLECTION_STORAGE_KEY);
  const collection = catalog.collections.find(item => item.id === selected);
  return collection ? { document: inheritCollectionDefaults(document, collection), collectionId: collection.id }
    : { document, collectionId: null };
}

export function linkPreparedDesign(storage: CollectionKeyValueStorage, designId: string,
  collectionId: string | null): void {
  if (!collectionId) return;
  const catalog = loadCollectionCatalog(storage);
  if (catalog.collections.some(item => item.id === collectionId)) {
    saveCollectionCatalog(storage, assignDesign(catalog, designId, collectionId));
  }
}
