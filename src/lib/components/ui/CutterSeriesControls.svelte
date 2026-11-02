<script lang="ts">
  import type { DesignDocument, CutterSeriesLayout } from '../../domain/designDocument';
  import { parseMultiCutterDocument } from '../../domain/documentValidation';
  import { DEFAULT_CUTTER_SERIES_LAYOUT } from '../../domain/cutterSeries';
  export let currentDocument: DesignDocument | null;
  export let onUpdateSeries: (layout: CutterSeriesLayout) => void;
  export let onSingleCutter: (() => void) | undefined;
  let copies = 4, columns = 2, spacingMm = 5;
  let seriesError: string | null = null;
  let layoutDocument: DesignDocument | null = null;
  $: if (currentDocument !== layoutDocument) {
    const layout = currentDocument?.schemaVersion === 3 ? currentDocument.layout : DEFAULT_CUTTER_SERIES_LAYOUT;
    copies = layout.copies; columns = layout.columns; spacingMm = layout.spacingMm;
    layoutDocument = currentDocument; seriesError = null;
  }
  function applySeries(): void {
    const current = currentDocument;
    if (!current || (current.kind !== 'cutter' && current.kind !== 'multi-cutter')) return;
    try {
      const parsed = parseMultiCutterDocument({ ...current, schemaVersion: 3, kind: 'multi-cutter',
        bridges: current.schemaVersion === 1 ? [] : current.bridges, layout: { copies, columns, spacingMm } });
      onUpdateSeries(parsed.layout); seriesError = null;
    } catch (cause) { seriesError = cause instanceof Error ? cause.message : 'Configuración de serie inválida.'; }
  }
</script>
<section class="cutter-series" aria-labelledby="series-title">
  <h3 id="series-title">Serie que se puede guardar</h3>
  <p id="series-help">Copias separadas del mismo cortante, sin uniones entre ellas. Se conservan el dibujo, las paredes, el agarre y los puentes. Ajustá y aplicá: abrir este panel no cambia nada.</p>
  {#if currentDocument?.kind === 'cutter' || currentDocument?.kind === 'multi-cutter'}
    <div class="series-fields">
      <label for="series-copies">Copies (1–24)<input id="series-copies" type="number" min="1" max="24" step="1" bind:value={copies} aria-invalid={seriesError !== null} aria-describedby="series-help series-error" /></label>
      <label for="series-columns">Columnas<input id="series-columns" type="number" min="1" max={copies} step="1" bind:value={columns} aria-invalid={seriesError !== null} aria-describedby="series-help series-error" /></label>
      <label for="series-spacing">Separación (mm)<input id="series-spacing" type="number" min="0.5" max="40" step="0.5" bind:value={spacingMm} aria-invalid={seriesError !== null} aria-describedby="series-help series-error" /></label>
    </div>
    <p>Filas calculadas : {Number.isFinite(copies / columns) ? Math.ceil(copies / columns) : '—'}. Base de impresión: {currentDocument.parameters.buildPlateSize} × {currentDocument.parameters.buildPlateSize} mm.</p>
    <p id="series-error" role={seriesError ? 'alert' : undefined}>{seriesError ?? ''}</p>
    <button type="button" data-apply-series on:click={applySeries}>{currentDocument.kind === 'multi-cutter' ? 'Aplicar serie' : 'Crear serie'}</button>
    {#if currentDocument.kind === 'multi-cutter'}
      <p role="status" data-series-active>{currentDocument.layout.copies} copias activas · {currentDocument.layout.columns} columnas · {currentDocument.layout.spacingMm} mm. Guardá en Proyectos locales; exportá la geometría cuando la generación sea válida.</p>
      <button type="button" data-single-cutter on:click={() => onSingleCutter?.()}>Volver al cortante individual</button>
    {/if}
    <p>Límite: 500.000 triángulos. Si la base de impresión es demasiado pequeña o el cortante está incompleto, se bloquea la exportación sin reparaciones automáticas.</p>
  {:else}<p role="status">Abrí o creá un cortante para preparar una serie. Esta función todavía no admite sellos.</p>{/if}
</section>
<style>
  .cutter-series { min-width: 0; padding: var(--spacing-4); border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--surface-card); color: var(--text-primary); }
  h3 { margin: 0 0 var(--spacing-3); }
  p { font-size: var(--font-size-sm); line-height: 1.5; }
  .series-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr)); gap: var(--spacing-3); }
  label { display: flex; flex-direction: column; min-width: 0; gap: var(--spacing-2); color: var(--text-secondary); font-size: var(--font-size-sm); }
  input { width: 100%; min-width: 0; box-sizing: border-box; min-height: 44px; padding: var(--spacing-2); border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--surface-input); color: var(--text-primary); }
  button { min-height: 44px; padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--surface-input); color: var(--text-primary); margin: var(--spacing-2) 0; }
  button:focus-visible, input:focus-visible { outline: 3px solid var(--color-primary-500); outline-offset: 2px; }
  #series-error { color: var(--color-error); }
</style>
