<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Mesh, Group } from 'three';
  import {
    detectCollisions,
    checkBuildPlateBounds,
    autoFixCollisions,
    createCollisionVisualization,
    type CollisionResult
  } from '../../utils/collisionDetector';

  export let mesh: Mesh | Group | null;
  export let buildPlateSize: number;
  // Canonical project previews must not mutate generated geometry directly.
  export let allowPositionFix = true;

  const dispatch = createEventDispatcher<{
    fixCollisions: void;
    visualizeCollisions: Group;
  }>();

  let showPanel = false;
  let collisionResult: CollisionResult | null = null;
  let minSeparation = 2;
  let autoCheckEnabled = true;
  let showVisualization = false;

  // Check for collisions when mesh changes
  $: if (mesh && autoCheckEnabled) {
    checkCollisions();
  }

  function checkCollisions() {
    if (!mesh) {
      collisionResult = null;
      return;
    }

    const objects: any[] = [];
    mesh.traverse((child) => {
      if ((child as any).isMesh && child !== mesh) {
        objects.push(child);
      }
    });

    if (objects.length < 2) {
      collisionResult = {
        hasCollisions: false,
        collisions: [],
        warnings: ['Se detectó un solo objeto. Agregá más elementos para verificar colisiones.']
      };
      return;
    }

    collisionResult = detectCollisions(objects, minSeparation);

    // Also check build plate bounds
    objects.forEach(obj => {
      const boundsCheck = checkBuildPlateBounds(obj, buildPlateSize);
      if (!boundsCheck.inBounds) {
        collisionResult!.warnings.push(...boundsCheck.warnings);
      }
    });
  }

  function handleAutoFix() {
    if (!allowPositionFix || !mesh || !(mesh as any).isGroup) return;

    const result = autoFixCollisions(mesh as Group, buildPlateSize, minSeparation);

    if (result.fixed) {
      // Re-check collisions after fixing
      setTimeout(() => {
        checkCollisions();
      }, 100);
    }

    dispatch('fixCollisions');
  }

  function toggleVisualization() {
    showVisualization = !showVisualization;

    if (showVisualization && collisionResult && collisionResult.hasCollisions) {
      const objects: any[] = [];
      mesh?.traverse((child) => {
        if ((child as any).isMesh && child !== mesh) {
          objects.push(child);
        }
      });

      const vizGroup = createCollisionVisualization(collisionResult.collisions, objects);
      dispatch('visualizeCollisions', vizGroup);
    }
  }
</script>

<div class="collision-detector">
  <div class="panel-header">
    <h3>⚠️ Detección de colisiones</h3>
    <button class="toggle-btn" on:click={() => showPanel = !showPanel}>
      {showPanel ? '▼' : '▶'}
    </button>
  </div>

  {#if showPanel}
    <div class="panel-content">
      <div class="controls">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={autoCheckEnabled} />
          <span>Verificación automática después de modificar</span>
        </label>

        <label>
          <span>Separación mínima: {minSeparation}mm</span>
          <input
            type="range"
            bind:value={minSeparation}
            min="0"
            max="10"
            step="0.5"
            on:change={checkCollisions}
          />
        </label>
      </div>

      <button class="check-btn" on:click={checkCollisions} disabled={!mesh}>
        🔍 Verificar ahora
      </button>

      {#if collisionResult}
        <div class="results">
          {#if collisionResult.hasCollisions}
            <div class="status error">
              <strong>❌ ¡Se detectaron colisiones!</strong>
              <p>{collisionResult.collisions.length} colisiones detectadas</p>
            </div>

            <div class="collisions-list">
              <h4>Detalle de colisiones:</h4>
              {#each collisionResult.collisions as collision}
                <div class="collision-item">
                  <div class="collision-pair">
                    <strong>{collision.object1}</strong> ↔ <strong>{collision.object2}</strong>
                  </div>
                  {#if collision.overlap > 0}
                    <div class="overlap">Superposición: {collision.overlap.toFixed(2)}mm</div>
                  {:else}
                    <div class="close">Separación: {collision.distance.toFixed(2)}mm (demasiado cerca)</div>
                  {/if}
                </div>
              {/each}
            </div>

            {#if collisionResult.warnings.length > 0}
              <div class="warnings">
                <h4>Advertencias:</h4>
                {#each collisionResult.warnings as warning}
                  <div class="warning-item">⚠️ {warning}</div>
                {/each}
              </div>
            {/if}

            <div class="actions">
              <button class="fix-btn" on:click={handleAutoFix}
                disabled={!allowPositionFix}
                aria-describedby={!allowPositionFix ? 'collision-position-fix-reason' : undefined}>
                🔧 Corregir posiciones automáticamente
              </button>
              <button class="viz-btn" on:click={toggleVisualization}>
                {showVisualization ? '👁️ Ocultar' : '👁️ Mostrar'} la visualización
              </button>
            </div>
            {#if !allowPositionFix}
              <p id="collision-position-fix-reason" role="status">
                Las posiciones de la vista previa son de solo lectura. Modificá la fuente o la disposición del lote.
              </p>
            {/if}
          {:else}
            <div class="status success">
              <strong>✅ Sin colisiones</strong>
              <p>Todos los objetos tienen separación suficiente</p>
            </div>
          {/if}
        </div>
      {:else}
        <div class="no-results">
          <p>Hacé clic en «Verificar ahora» para buscar colisiones</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .collision-detector {
    background: var(--surface-card);
    color: var(--text-primary);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  h3, h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  h4 {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .toggle-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  input[type="range"] {
    width: 100%;
    cursor: pointer;
  }

  .check-btn, .fix-btn, .viz-btn {
    padding: 0.75rem 1rem;
    border: 2px solid var(--color-primary-500);
    border-radius: 6px;
    background: var(--surface-input);
    color: var(--text-link);
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .check-btn:hover:not(:disabled),
  .fix-btn:hover,
  .viz-btn:hover {
    background: var(--color-primary-700);
    color: var(--text-on-brand);
  }

  .check-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .status {
    padding: 1rem;
    border-radius: 6px;
    text-align: center;
  }

  .status.success {
    background: var(--surface-success);
    border: 2px solid var(--color-success);
    color: var(--text-success);
  }

  .status.error {
    background: var(--color-error-light);
    border: 2px solid var(--color-error);
    color: var(--text-error);
  }

  .status p {
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
  }

  .collisions-list {
    background: var(--surface-muted);
    padding: 1rem;
    border-radius: 6px;
  }

  .collision-item {
    background: var(--surface-input);
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    border-left: 4px solid var(--color-error);
  }

  .collision-pair {
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .overlap {
    font-size: 0.85rem;
    color: var(--text-error);
    font-weight: 600;
  }

  .close {
    font-size: 0.85rem;
    color: var(--text-warning);
    font-weight: 600;
  }

  .warnings {
    background: var(--surface-warning);
    padding: 1rem;
    border-radius: 6px;
    border-left: 4px solid var(--color-warning);
  }

  .warning-item {
    font-size: 0.85rem;
    color: var(--text-warning);
    margin-bottom: 0.25rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .fix-btn {
    flex: 1;
    background: var(--color-secondary-700);
    border-color: var(--color-success);
    color: var(--text-on-brand);
  }

  .fix-btn:hover {
    background: var(--color-secondary-800);
    border-color: var(--color-secondary-700);
  }

  .viz-btn {
    flex: 1;
  }

  .no-results {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
</style>
