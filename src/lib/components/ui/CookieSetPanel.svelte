<script lang="ts">
  import { onDestroy } from 'svelte';
  import type * as THREE from 'three';
  import type { CookieCutterParams, HandleStyle } from '../../types/CookieCutter';
  import {
    COOKIE_SET_LIMITS,
    generateCookieSet,
    type CookieSetImprint,
    type CookieSetLayout,
    type CookieSetResult
  } from '../../utils/cookieSetGenerator';
  import { disposeObject3D } from '../../utils/disposeThree';
  import { exportTo3MF } from '../../utils/advancedExporter';
  import { exportToSTL } from '../../utils/stlExporter';

  /** SVG de la ilustración actual (o null si todavía no se importó nada). */
  export let svg: string | null;
  /** Parámetros actuales del diseño: se usan como punto de partida. */
  export let baseParams: CookieCutterParams;
  /** Nombre base para los archivos descargados. */
  export let fileBase = 'galleta';
  /** Recibe el grupo que debe mostrar el visor 3D (null = volver al modelo normal). */
  export let onPreview: (group: THREE.Group | null) => void;

  const DEBOUNCE_MS = 450;

  let layout: CookieSetLayout = 'separate';
  let imprint: CookieSetImprint = 'raised';
  let clearanceMm = 0.5;
  let targetSize = baseParams.targetSize;
  let wallThickness = baseParams.wallThickness;
  let cuttingHeight = baseParams.cuttingHeight;
  let stampDepth = Math.min(baseParams.stampDepth, 2);
  let enableHandle = baseParams.enableHandle && baseParams.handleStyle !== 'none';
  let handleStyle: Exclude<HandleStyle, 'none'> =
    baseParams.handleStyle === 'none' ? 'round' : baseParams.handleStyle;
  let handleHeight = baseParams.handleHeight;

  let result: CookieSetResult | null = null;
  let generating = false;
  let errorMessage: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let alive = true;

  const HANDLE_LABELS: Record<Exclude<HandleStyle, 'none'>, string> = {
    round: 'Redondo',
    chamfered: 'Facetado',
    rectangular: 'Rectangular',
    flat: 'Plano'
  };

  function currentParams(): CookieCutterParams {
    return {
      ...baseParams,
      targetSize,
      wallThickness,
      cuttingHeight,
      stampDepth,
      enableHandle,
      handleStyle: enableHandle ? handleStyle : 'none',
      handleHeight,
      totalHeight: cuttingHeight + (enableHandle ? handleHeight : 0),
      mode: 'stamp',
      stampBase: true
    };
  }

  function allNumbersValid(): boolean {
    return [targetSize, wallThickness, cuttingHeight, stampDepth, clearanceMm, handleHeight].every(
      (value) => typeof value === 'number' && Number.isFinite(value)
    );
  }

  async function regenerate(): Promise<void> {
    const ticket = ++generation;
    if (!svg) {
      replaceResult(null);
      errorMessage = null;
      return;
    }
    if (!allNumbersValid()) {
      errorMessage = 'Completá todos los valores numéricos.';
      return;
    }

    generating = true;
    try {
      const next = await generateCookieSet(svg, currentParams(), { layout, imprint, clearanceMm });
      if (!alive || ticket !== generation) {
        disposeObject3D(next.plate);
        return;
      }
      replaceResult(next);
      errorMessage = null;
    } catch (cause) {
      if (!alive || ticket !== generation) return;
      replaceResult(null);
      errorMessage = cause instanceof Error ? cause.message : 'No se pudo generar el juego.';
    } finally {
      if (ticket === generation) generating = false;
    }
  }

  function replaceResult(next: CookieSetResult | null): void {
    const previous = result;
    result = next;
    onPreview(next ? next.plate : null);
    if (previous) disposeObject3D(previous.plate);
  }

  function schedule(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void regenerate(), DEBOUNCE_MS);
  }

  // Cualquier cambio de ajuste o de ilustración vuelve a generar el juego.
  $: svg, layout, imprint, clearanceMm, targetSize, wallThickness, cuttingHeight, stampDepth,
    enableHandle, handleStyle, handleHeight, schedule();

  onDestroy(() => {
    alive = false;
    generation += 1;
    if (timer) clearTimeout(timer);
    const previous = result;
    result = null;
    onPreview(null);
    if (previous) disposeObject3D(previous.plate);
  });

  function download(action: () => void): void {
    try {
      action();
      errorMessage = null;
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : 'No se pudo exportar el archivo.';
    }
  }

  function stl(object: THREE.Object3D | null, suffix: string): void {
    if (!object) return;
    download(() => exportToSTL(object, `${fileBase}-${suffix}.stl`, { binary: true }));
  }

  function threeMf(object: THREE.Object3D | null, suffix: string): void {
    if (!object) return;
    download(() => exportTo3MF(object, `${fileBase}-${suffix}.3mf`, currentParams()));
  }
</script>

<section class="cookie-set" aria-labelledby="cookie-set-title">
  <h3 id="cookie-set-title">Juego: cortador + sello</h3>
  <p class="help">
    A partir de la misma imagen se genera el <strong>cortador</strong> con la silueta exterior y un
    <strong>sello</strong> con el detalle interior que entra dentro del cortador. Podés imprimirlos como dos
    piezas separadas o como una sola pieza unida.
  </p>

  {#if !svg}
    <p role="status" class="status">Importá una imagen (JPG, PNG o SVG) o elegí una forma para generar el juego.</p>
  {:else}
    <fieldset class="group">
      <legend>Disposición</legend>
      <label class="choice">
        <input type="radio" name="set-layout" value="separate" bind:group={layout} />
        <span><strong>Dos piezas</strong> — cortador y sello separados. El sello entra en el cortador y se usa para marcar la masa ya cortada.</span>
      </label>
      <label class="choice">
        <input type="radio" name="set-layout" value="single" bind:group={layout} />
        <span><strong>Una sola pieza</strong> — placa con la pared cortante y el relieve juntos. Corta y marca de un solo golpe.</span>
      </label>
    </fieldset>

    <fieldset class="group">
      <legend>Medidas</legend>
      <div class="fields">
        <label>Tamaño de la galleta (mm)
          <input type="number" min="20" max="200" step="1" bind:value={targetSize} />
        </label>
        <label>Grosor de pared (mm)
          <input type="number" min="0.4" max="3" step="0.1" bind:value={wallThickness} />
        </label>
        <label>Altura de la pared cortante (mm)
          <input type="number" min="4" max="40" step="1" bind:value={cuttingHeight} />
        </label>
        <label>Relieve del sello (mm)
          <input type="number" min="0.4" max="6" step="0.1" bind:value={stampDepth} />
        </label>
        <label>Holgura sello–cortador (mm)
          <input
            type="number"
            min={COOKIE_SET_LIMITS.minClearanceMm}
            max={COOKIE_SET_LIMITS.maxClearanceMm}
            step="0.1"
            bind:value={clearanceMm}
          />
        </label>
        <label>Tipo de relieve
          <select bind:value={imprint}>
            <option value="raised">En alto (las líneas sobresalen)</option>
            <option value="recessed">Hundido (las líneas se graban, máx. 3 mm)</option>
          </select>
        </label>
      </div>
    </fieldset>

    <fieldset class="group">
      <legend>Mango</legend>
      <label class="inline">
        <input type="checkbox" bind:checked={enableHandle} />
        Agregar mango para sostener la pieza
      </label>
      {#if enableHandle}
        <div class="fields">
          <label>Forma del mango
            <select bind:value={handleStyle}>
              {#each Object.entries(HANDLE_LABELS) as [value, label]}
                <option {value}>{label}</option>
              {/each}
            </select>
          </label>
          <label>Altura del mango (mm)
            <input type="number" min="3" max="30" step="1" bind:value={handleHeight} />
          </label>
        </div>
      {/if}
    </fieldset>

    {#if generating}
      <p role="status" class="status">Generando el juego…</p>
    {/if}
    {#if errorMessage}
      <p role="alert" class="error">{errorMessage}</p>
    {/if}
    {#if result}
      {#each result.notes as note}
        <p role="status" class="note">{note}</p>
      {/each}

      <div class="downloads" aria-label="Descargas">
        <h4>Descargar</h4>
        {#if result.layout === 'separate'}
          <button type="button" on:click={() => stl(result?.cutter ?? null, 'cortador')}>Cortador (STL)</button>
          <button type="button" on:click={() => stl(result?.stamp ?? null, 'sello')}>Sello (STL)</button>
          <button type="button" on:click={() => stl(result?.plate ?? null, 'juego')}>Ambos en una placa (STL)</button>
          <button type="button" on:click={() => threeMf(result?.plate ?? null, 'juego')}>Ambos en una placa (3MF)</button>
        {:else}
          <button type="button" on:click={() => stl(result?.single ?? null, 'pieza-unica')}>Pieza única (STL)</button>
          <button type="button" on:click={() => threeMf(result?.single ?? null, 'pieza-unica')}>Pieza única (3MF)</button>
        {/if}
      </div>

      <details class="tips">
        <summary>Cómo imprimir y usar</summary>
        {#if result.layout === 'separate'}
          <p>Imprimí el cortador con el mango hacia la cama y el sello con el mango (o la cara lisa) hacia la cama; el relieve queda arriba, sin soportes. Cortá la masa con el cortador y, sin retirarlo, apoyá el sello dentro y presioná para marcar el dibujo.</p>
        {:else}
          <p>Imprimí la pieza con la placa hacia la cama y la pared cortante hacia arriba, sin soportes. Para usarla, dala vuelta y presioná contra la masa: la pared corta y el relieve marca el dibujo.</p>
        {/if}
        <p>El dibujo del sello está en espejo respecto de la vista 3D a propósito: al apoyarlo contra la masa sale derecho.</p>
        <p><strong>Importante:</strong> que un modelo sea imprimible no significa que sea apto para contacto con alimentos. Verificá el material, el proceso y la limpieza antes de usarlo con comida.</p>
      </details>
    {/if}
  {/if}
</section>

<style>
  .cookie-set {
    min-width: 0;
    padding: var(--spacing-4);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    background: var(--surface-primary, transparent);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  h3, h4 { margin: 0; }
  p { margin: 0; font-size: var(--font-size-sm); line-height: 1.5; }
  .group { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: var(--spacing-3); display: flex; flex-direction: column; gap: var(--spacing-2); min-width: 0; }
  legend { padding: 0 var(--spacing-2); font-weight: 600; font-size: var(--font-size-sm); }
  .choice { display: flex; gap: var(--spacing-2); align-items: flex-start; font-size: var(--font-size-sm); line-height: 1.4; cursor: pointer; }
  .choice input { margin-top: 0.25rem; min-width: 1rem; min-height: 1rem; }
  .inline { display: flex; gap: var(--spacing-2); align-items: center; font-size: var(--font-size-sm); }
  .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: var(--spacing-3); }
  .fields label { display: flex; flex-direction: column; gap: var(--spacing-2); min-width: 0; color: var(--text-secondary); font-size: var(--font-size-sm); }
  input[type='number'], select { width: 100%; min-width: 0; box-sizing: border-box; min-height: 44px; padding: var(--spacing-2); border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--surface-primary, #fff); color: var(--text-primary); }
  .downloads { display: flex; flex-wrap: wrap; gap: var(--spacing-2); align-items: center; }
  .downloads h4 { flex-basis: 100%; font-size: var(--font-size-sm); }
  button { min-height: 44px; padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--surface-secondary, #f1f5f9); color: var(--text-primary); cursor: pointer; font: inherit; }
  button:hover { border-color: var(--color-primary-500); }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--color-primary-500); outline-offset: 2px; }
  .error { color: var(--color-error); }
  .note { color: var(--color-warning); }
  .status { color: var(--text-secondary); }
  .tips summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; font-size: var(--font-size-sm); }
  .tips p + p { margin-top: var(--spacing-2); }
</style>
