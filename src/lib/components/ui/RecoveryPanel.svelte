<script lang="ts">
  import type { Readable } from 'svelte/store';
  import type { ProjectRecoveryState } from '../../projects/projectRecovery';
  import type { ProjectRecoveryEnvelope } from '../../projects/projectRecoveryStorage';
  export let recovery: Readable<ProjectRecoveryState>;
  export let busy = false;
  export let actionError: string | null = null;
  export let onRefresh: () => void;
  export let onFlush: () => void;
  export let onResume: (draft: ProjectRecoveryEnvelope) => void;
  export let onDelete: (draft: ProjectRecoveryEnvelope) => void;
</script>

<section class="recovery-panel" aria-label="Borradores de recuperación">
  <h3>Borradores de recuperación</h3>
  <p role="status">
    {#if $recovery.saving}Guardando el borrador de recuperación…
    {:else if $recovery.pending}Recuperación pendiente…
    {:else if $recovery.error}Recuperación sin guardar
    {:else if $recovery.savedAt}Recuperación guardada el {$recovery.savedAt}
    {:else}No hay una copia de recuperación confirmada en esta sesión{/if}
  </p>
  {#if $recovery.error}<p role="alert">No se pudo guardar la recuperación: {$recovery.error.message} Volvé a intentarlo o exportá una copia del proyecto.</p>{/if}
  {#if actionError}<p role="alert">{actionError}</p>{/if}
  <div class="actions">
    <button type="button" data-recovery-refresh aria-label="Actualizar borradores de recuperación" disabled={busy || $recovery.loading} on:click={onRefresh}>Actualizar borradores de recuperación</button>
    <button type="button" disabled={$recovery.disposed || $recovery.saving} on:click={onFlush}>Reintentar guardado de recuperación</button>
  </div>
  {#if $recovery.loading}<p role="status">Cargando borradores de recuperación…</p>{/if}
  {#if $recovery.listError}<p role="alert">No se pudieron cargar los borradores de recuperación: {$recovery.listError.message}</p><button type="button" disabled={busy || $recovery.loading} on:click={onRefresh}>Reintentar carga de borradores de recuperación</button>{/if}
  {#if $recovery.loaded && !$recovery.drafts.length}<p>No hay borradores de recuperación en este navegador.</p>{/if}
  <ul>
    {#each $recovery.drafts as draft (draft.draftId)}
      <li data-draft-id={draft.draftId}>
        <strong>{draft.document.name}</strong>
        <time datetime={draft.savedAt}>{draft.savedAt}</time>
        <div class="actions">
          <button type="button" data-recovery-resume aria-label={`Continuar borrador ${draft.document.name}, ${draft.savedAt}`} disabled={busy || $recovery.disposed} on:click={() => onResume(draft)}>Continuar borrador</button>
          <button type="button" data-recovery-delete aria-label={`Eliminar borrador ${draft.document.name}, ${draft.savedAt}`} disabled={busy || $recovery.disposed} on:click={() => onDelete(draft)}>Eliminar borrador</button>
        </div>
      </li>
    {/each}
  </ul>
  <p class="hint">Los borradores de recuperación son independientes de los proyectos guardados y siguen disponibles después de guardar el proyecto. Permanecen en este navegador y en este sitio. Exportá un archivo .ccd.json para conservar una copia transferible. Cerrar el navegador o forzar su cierre puede interrumpir un guardado pendiente.</p>
</section>

<style>
  .recovery-panel { background: var(--surface-card); color: var(--text-primary); padding: 1rem; margin-bottom: 1rem; border-radius: 8px; box-shadow: var(--shadow-sm); }
  h3 { margin: 0 0 1rem; font-size: 1rem; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  button { flex: 1 1 9rem; min-width: 0; min-height: 44px; padding: 0.65rem; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--surface-muted); color: var(--text-primary); font: inherit; cursor: pointer; }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
  button:focus-visible { outline: 3px solid var(--color-primary-500); outline-offset: 2px; }
  ul { padding: 0; list-style: none; }
  li { border-top: 1px solid var(--border-strong); padding: 0.75rem 0; }
  strong, time { display: block; overflow-wrap: anywhere; margin-bottom: 0.5rem; }
  [role='alert'] { color: var(--text-error); overflow-wrap: anywhere; }
  .hint { font-size: 0.85rem; line-height: 1.6; }
</style>
