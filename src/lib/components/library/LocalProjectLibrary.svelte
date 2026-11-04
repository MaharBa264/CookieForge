<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import type { DesignDocument } from '../../domain/designDocument';
  import type { ProjectWorkflow } from '../../projects/projectWorkflow';
  import {
    addCollection, assignDesign, loadCollectionCatalog, saveCollectionCatalog,
    type CollectionCatalog
  } from '../../collections/designCollections';

  export let workflow: ProjectWorkflow;
  export let onConfirmDelete: (document: DesignDocument) => Promise<boolean> = async () => false;

  let catalog: CollectionCatalog = { schemaVersion: 1, collections: [], memberships: {} };
  let collectionName = '';
  let cutterHeight = 125;
  let stampHeight = 106;
  let collectionError: string | null = null;
  let collectionReady = false;
  function readCollections(): void {
    try {
      catalog = loadCollectionCatalog(localStorage);
      collectionReady = true;
      collectionError = null;
    } catch (cause) {
      collectionError = `No se pudieron leer las colecciones: ${cause instanceof Error ? cause.message : String(cause)}`;
      collectionReady = false;
    }
  }
  function commitCatalog(next: CollectionCatalog): void {
    try {
      saveCollectionCatalog(localStorage, next);
      catalog = next;
      collectionError = null;
    } catch (cause) {
      collectionError = `No se guardaron las colecciones: ${cause instanceof Error ? cause.message : String(cause)}`;
    }
  }
  function createCollection(): void {
    if (!collectionReady) return;
    try {
      const next = addCollection(catalog, collectionName, {
        cutter: { targetSize: cutterHeight, sizeMode: 'height' },
        stamp: { targetSize: stampHeight, sizeMode: 'height' }
      }, crypto.randomUUID(), new Date().toISOString());
      commitCatalog(next);
      if (catalog === next) collectionName = '';
    } catch (cause) {
      collectionError = cause instanceof Error ? cause.message : String(cause);
    }
  }
  function moveToCollection(documentId: string, collectionId: string): void {
    if (!collectionReady) return;
    try { commitCatalog(assignDesign(catalog, documentId, collectionId || null)); }
    catch (cause) { collectionError = cause instanceof Error ? cause.message : String(cause); }
  }
  let confirmingDelete = false;
  let confirmationError: string | null = null;
  let refreshButton: HTMLButtonElement;
  let alive = true;
  let deletionRevision = 0;
  let observedWorkflow = workflow;
  $: if (workflow !== observedWorkflow) {
    observedWorkflow = workflow;
    deletionRevision += 1;
    confirmingDelete = false;
    confirmationError = null;
  }
  onDestroy(() => { alive = false; deletionRevision += 1; });
  $: busy = confirmingDelete || $workflow.disposed || $workflow.saving || $workflow.pending !== null;

  // Explicit refresh contract: ProjectManager refreshes after successful saves.
  // Parents saving elsewhere can call refresh() or workflow.list(). No subscription loop.
  export function refresh(): Promise<boolean> { return workflow.list(); }
  onMount(() => { readCollections(); void refresh(); });

  async function remove(document: DesignDocument, event: MouseEvent): Promise<void> {
    if (confirmingDelete || busy || $workflow.library.loading) return;
    const trigger = event.currentTarget as HTMLButtonElement;
    const owner = workflow;
    const revision = ++deletionRevision;
    const current = () => alive && revision === deletionRevision
      && owner === workflow && !owner.getState().disposed;
    confirmingDelete = true;
    confirmationError = null;
    let deleted = false;
    try {
      const confirmed = await onConfirmDelete(document);
      if (!current()) return;
      deleted = await owner.delete(document.id, confirmed);
      if (!current()) return;
      if (deleted) await owner.list();
    } catch (cause) {
      if (current()) confirmationError = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (current()) {
        confirmingDelete = false;
        await tick();
        if (current()) {
          if (deleted) refreshButton?.focus();
          else if (trigger.isConnected) trigger.focus();
        }
      }
    }
  }
</script>

<section class="local-library" aria-label="Proyectos locales" aria-busy={$workflow.library.loading || confirmingDelete}>
  <h3>Proyectos locales</h3>
  <fieldset class="collection-editor">
    <legend>Colecciones de diseños</legend>
    <p class="hint">Agrupá diseños existentes. Los tamaños de la colección serán valores iniciales para los diseños nuevos; no cambian proyectos guardados.</p>
    <label for="collection-name">Nombre de la colección</label>
    <input id="collection-name" type="text" bind:value={collectionName} placeholder="Ej.: Tarot Celestial" disabled={!collectionReady || busy} />
    <div class="collection-sizes">
      <label for="collection-cutter-size">Cortante (alto, mm)
        <input id="collection-cutter-size" type="number" min="5" max="500" bind:value={cutterHeight} disabled={!collectionReady || busy} />
      </label>
      <label for="collection-stamp-size">Sello (alto, mm)
        <input id="collection-stamp-size" type="number" min="5" max="500" bind:value={stampHeight} disabled={!collectionReady || busy} />
      </label>
    </div>
    <button type="button" disabled={!collectionReady || busy || !collectionName.trim()} on:click={createCollection}>Crear colección</button>
    {#if catalog.collections.length}
      <ul>{#each catalog.collections as collection (collection.id)}
        <li><strong>{collection.name}</strong> · Cortante {collection.defaults.cutter.targetSize} mm · Sello {collection.defaults.stamp.targetSize} mm</li>
      {/each}</ul>
    {/if}
    {#if collectionError}<p role="alert">{collectionError} Los diseños originales no se modificaron.</p>{/if}
  </fieldset>
  <p class="hint">Guardados únicamente en este navegador y en este sitio. Conservá un archivo de proyecto exportado como copia de seguridad transferible.</p>
  <button bind:this={refreshButton} type="button" disabled={busy || $workflow.library.loading}
    on:click={() => refresh()}>Actualizar proyectos locales</button>
  {#if $workflow.library.loading || !$workflow.library.loaded && !$workflow.library.listError}
    <p role="status">Cargando proyectos locales…</p>
  {/if}
  {#if $workflow.library.listError}
    <p role="alert">No se pudieron cargar los proyectos locales: {$workflow.library.listError.message} Actualizá para volver a intentar.</p>
  {:else if $workflow.library.loaded && !$workflow.library.loading && !$workflow.library.documents.length}
    <p role="status">Todavía no hay proyectos locales. Guardá uno para encontrarlo acá.</p>
  {/if}
  {#if confirmationError}<p role="alert">{confirmationError}</p>{/if}
  {#if $workflow.error && ($workflow.error.operation === 'open' || $workflow.error.operation === 'delete')}
    <p role="alert">{$workflow.error.message}</p>
  {/if}
  {#if confirmingDelete}<p role="status">Esperando confirmación para eliminar…</p>{/if}
  {#if $workflow.library.documents.length}
    <ul>
      {#each $workflow.library.documents as document (document.id)}
        <li>
          <h4>{document.name}</h4>
          <p>{document.kind} · Actualizado el <time datetime={document.updatedAt}>{document.updatedAt}</time></p>
          <label for={`collection-${document.id}`}>Colección</label>
          <select id={`collection-${document.id}`} value={catalog.memberships[document.id] ?? ''}
            disabled={!collectionReady || busy} on:change={(event) => moveToCollection(document.id, event.currentTarget.value)}>
            <option value="">Sin colección</option>
            {#each catalog.collections as collection (collection.id)}
              <option value={collection.id}>{collection.name}</option>
            {/each}
          </select>
          <div class="actions">
            <button type="button" aria-label={`Abrir ${document.name}`} disabled={busy || $workflow.library.loading}
              on:click={() => workflow.open(document.id)}>Abrir</button>
            <button type="button" aria-label={`Eliminar ${document.name}`} disabled={busy || $workflow.library.loading}
              on:click={(event) => remove(document, event)}>Eliminar</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .local-library { background: var(--surface-card); color: var(--text-primary); padding: 1rem; border-radius: 8px; box-shadow: var(--shadow-sm); }
  h3 { margin: 0 0 1rem; font-size: 1rem; }
  h4 { margin: 0; overflow-wrap: anywhere; }
  p { line-height: 1.5; overflow-wrap: anywhere; }
  .hint, li p { font-size: 0.85rem; }
  .collection-editor { border: 1px solid var(--border-strong); border-radius: 8px; padding: 1rem; margin: 0 0 1rem; }
  .collection-editor legend { font-weight: 600; }
  .collection-editor label { display: block; margin: .5rem 0; }
  .collection-editor input, select { box-sizing: border-box; max-width: 100%; min-height: 40px; padding: .4rem; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--surface-input); color: var(--text-primary); }
  .collection-sizes { display: flex; flex-wrap: wrap; gap: 1rem; }
  .collection-sizes input { display: block; width: 8rem; }
  ul { list-style: none; padding: 0; margin: 1rem 0 0; }
  li { padding: 1rem 0; border-top: 1px solid var(--border-strong); }
  .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  button { min-height: 44px; padding: 0.65rem; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--surface-muted); color: var(--text-primary); font: inherit; cursor: pointer; }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
  button:focus-visible { outline: 3px solid var(--color-primary-500); outline-offset: 2px; }
  [role='alert'] { color: var(--text-error); }
</style>
