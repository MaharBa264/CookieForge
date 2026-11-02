<script lang="ts">
  import {
    parameterError,
    parameterErrorField,
    params,
    updateParam
  } from '../../stores/cookieCutterStore';
  import type { SizeMode } from '../../types/CookieCutter';

  const sizeModes: { value: SizeMode; label: string }[] = [
    { value: 'longest', label: 'Lado más largo' },
    { value: 'width', label: 'Ancho' },
    { value: 'height', label: 'Alto' }
  ];

  const describedBy = (field: string) =>
    $parameterErrorField === field ? `${field}-hint ${field}-error` : `${field}-hint`;
</script>

<div class="param-control">
  <label for="targetSize">Dimensión final : {$params.targetSize.toFixed(0)} mm</label>
  <input
    id="targetSize"
    data-field="targetSize"
    type="number"
    min="10"
    max={$params.buildPlateSize}
    step="1"
    value={$params.targetSize}
    aria-invalid={$parameterErrorField === 'targetSize'}
    aria-describedby={describedBy('targetSize')}
    on:change={(event) => updateParam('targetSize', event.currentTarget.valueAsNumber)}
  />
  <p id="targetSize-hint" class="param-hint">10–{$params.buildPlateSize} mm · Dimensión exterior medida.</p>
  {#if $parameterErrorField === 'targetSize' && $parameterError}
    <p id="targetSize-error" class="param-error" role="alert">{$parameterError}</p>
  {/if}
</div>

<div class="param-control">
  <label for="sizeMode">Dimensión de referencia</label>
  <select
    id="sizeMode"
    data-field="sizeMode"
    value={$params.sizeMode}
    aria-invalid={$parameterErrorField === 'sizeMode'}
    aria-describedby={describedBy('sizeMode')}
    on:change={(event) => updateParam('sizeMode', event.currentTarget.value as SizeMode)}
  >
    {#each sizeModes as mode}
      <option value={mode.value}>{mode.label}</option>
    {/each}
  </select>
  <p id="sizeMode-hint" class="param-hint">Determina qué dimensión exterior se ajusta al valor elegido.</p>
  {#if $parameterErrorField === 'sizeMode' && $parameterError}
    <p id="sizeMode-error" class="param-error" role="alert">{$parameterError}</p>
  {/if}
</div>

<div class="param-control">
  <label for="buildPlateSize">Base de impresión : {$params.buildPlateSize.toFixed(0)} mm</label>
  <input
    id="buildPlateSize"
    data-field="buildPlateSize"
    type="range"
    min="100"
    max="300"
    step="10"
    value={$params.buildPlateSize}
    aria-valuetext={`${$params.buildPlateSize.toFixed(0)} milímetros`}
    aria-invalid={$parameterErrorField === 'buildPlateSize'}
    aria-describedby={describedBy('buildPlateSize')}
    on:input={(event) => updateParam('buildPlateSize', Number(event.currentTarget.value))}
  />
  <p id="buildPlateSize-hint" class="param-hint">100–300 mm · Adaptala al área útil de tu impresora.</p>
  {#if $parameterErrorField === 'buildPlateSize' && $parameterError}
    <p id="buildPlateSize-error" class="param-error" role="alert">{$parameterError}</p>
  {/if}
</div>
