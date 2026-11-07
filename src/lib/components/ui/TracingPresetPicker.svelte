<script lang="ts">
  import { DEFAULT_TRACING_PRESET, TRACING_PRESETS, type TracingPresetId } from '../../import/tracingPresets';
  export let preset: TracingPresetId = DEFAULT_TRACING_PRESET;
  export let disabled = false;
</script>
<section aria-label="Ajustes de vectorización">
  <label>Perfil de vectorización
    <select aria-label="Perfil de vectorización" value={preset} on:change={event => preset = event.currentTarget.value as TracingPresetId} {disabled}>
      {#each TRACING_PRESETS as option}<option value={option.id}>{option.label}</option>{/each}
    </select>
  </label>
  <div class="desktop-help">
    <p>{TRACING_PRESETS.find(option => option.id === preset)?.description}</p>
    <p>Solo imágenes de trama (raster). El SVG importado no cambia. La elección no modifica el dibujo existente sin una acción explícita.</p>
  </div>
  <details class="mobile-help">
    <summary>Entender este perfil</summary>
    <p>{TRACING_PRESETS.find(option => option.id === preset)?.description}</p>
    <p>Solo imágenes de trama (raster). El SVG importado no cambia. La elección no modifica el dibujo existente sin una acción explícita.</p>
  </details>
</section>
<style>
  section { margin-bottom: var(--spacing-4); }
  label { display: grid; gap: var(--spacing-2); }
  select { width: 100%; min-height: 44px; color: var(--text-primary); background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; }
  p { color: var(--text-muted); font-size: var(--font-size-sm); }
  .mobile-help { display: none; }
  @media (max-width: 768px) {
    .desktop-help { display: none; }
    .mobile-help { display: block; color: var(--text-muted); }
    summary { display: flex; align-items: center; min-height: 44px; cursor: pointer; }
    summary::after { content: '▾'; margin-left: auto; padding: 0 var(--spacing-2); }
    details[open] summary::after { content: '▴'; }
    .mobile-help p { margin: var(--spacing-2) 0; line-height: 1.4; }
  }
</style>
