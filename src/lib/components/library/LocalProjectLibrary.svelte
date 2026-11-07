<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import type { DesignDocument } from '../../domain/designDocument';
  import type { ProjectWorkflow } from '../../projects/projectWorkflow';

  export let workflow: ProjectWorkflow;
  export let onConfirmDelete: (document: DesignDocument) => Promise<boolean> = async () => false;

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
  onMount(() => { void refresh(); });

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
  <p class="hint">Se guardan solo en este navegador y en este sitio. Conservá un archivo de proyecto exportado como copia de seguridad transferible.</p>
  <button bind:this={refreshButton} type="button" disabled={busy || $workflow.library.loading}
    on:click={() => refresh()}>Actualizar los proyectos locales</button>
  {#if $workflow.library.loading || !$workflow.library.loaded && !$workflow.library.listError}
    <p role="status">Cargando los proyectos locales…</p>
  {/if}
  {#if $workflow.library.listError}
    <p role="alert">No se pudieron cargar los proyectos locales: {$workflow.library.listError.message} Actualizá para reintentar.</p>
  {:else if $workflow.library.loaded && !$workflow.library.loading && !$workflow.library.documents.length}
    <p role="status">Todavía no hay proyectos locales. Guardá un proyecto para encontrarlo acá.</p>
  {/if}
  {#if confirmationError}<p role="alert">{confirmationError}</p>{/if}
  {#if $workflow.error && ($workflow.error.operation === 'open' || $workflow.error.operation === 'delete')}
    <p role="alert">{$workflow.error.message}</p>
  {/if}
  {#if confirmingDelete}<p role="status">Esperando la confirmación de eliminación…</p>{/if}
  {#if $workflow.library.documents.length}
    <ul>
      {#each $workflow.library.documents as document (document.id)}
        <li>
          <h4>{document.name}</h4>
          <p>{document.kind} · Actualizado el <time datetime={document.updatedAt}>{document.updatedAt}</time></p>
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
  ul { list-style: none; padding: 0; margin: 1rem 0 0; }
  li { padding: 1rem 0; border-top: 1px solid var(--border-strong); }
  .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  button { min-height: 44px; padding: 0.65rem; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--surface-muted); color: var(--text-primary); font: inherit; cursor: pointer; }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
  button:focus-visible { outline: 3px solid var(--color-primary-500); outline-offset: 2px; }
  [role='alert'] { color: var(--text-error); }
</style>
