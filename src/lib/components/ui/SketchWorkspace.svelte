<script lang="ts">
  import type { DesignSessionStore } from '../../stores/designSessionStore';
  import { CONTOUR_DETAIL_DEPTH, type DesignDocument, type ContourOperation } from '../../domain/designDocument';
  import { inspectSketch, editSketch, commitSketch, type SketchCommand } from '../../sketch/sketchCommands';
  import { assessFirstReliefLayout } from '../../geometry/reliefLayout';
  export let session: DesignSessionStore;
  let pathIndex = 0;
  let pointIndex = 0;
  let draft: string | null = null;
  let gesture: { baseline: DesignDocument; epoch: number; pointer: number } | null = null;
  let message = '';
  type OperationChoice = ContourOperation | 'unassigned';
  const operationLabels: Record<OperationChoice, string> = {
    unassigned: 'Sin asignar', cut: 'Corte', emboss: 'Relieve', engrave: 'Grabado', ignore: 'Ignorar'
  };
  let operations: Record<number, ContourOperation> = {};
  let canvas: SVGSVGElement;
  let x = 0, y = 0;
  $: document = $session;
  // Se deriva del documento canónico: guardar, recargar y Deshacer/Rehacer mantienen las asignaciones.
  $: operations = document?.schemaVersion === 5
    ? Object.fromEntries(document.contourOperations.map(item => [item.pathIndex, item.operation])) as Record<number, ContourOperation>
    : {};
  $: selectedAssignment = document?.schemaVersion === 5
    ? document.contourOperations.find(item => item.pathIndex === pathIndex)
    : undefined;
  $: detailMode = selectedAssignment?.operation === 'emboss' || selectedAssignment?.operation === 'engrave';
  $: reliefLayout = document?.schemaVersion === 5 && document.contourOperations.some(item => item.operation === 'emboss')
    ? assessFirstReliefLayout(document) : null;
  $: if (document && gesture && (document !== gesture.baseline || session.getSessionEpoch() !== gesture.epoch)) cancel();
  $: svg = draft ?? document?.sketch.svg ?? '';
  $: model = svg ? inspectSketch(svg) : null;
  $: path = model?.paths[pathIndex];
  $: selected = path?.points[pointIndex];
  $: if (model && pathIndex >= model.paths.length) { pathIndex = 0; pointIndex = 0; cancel(); }
  function setOperation(value: OperationChoice): void {
    if (!document || !path || path.reason || document.kind !== 'cutter') return;
    message = '';
    try { session.updateContourOperation(pathIndex, value); }
    catch (cause) { message = cause instanceof Error ? cause.message : 'No se pudo guardar la operación.'; }
  }
  function setDepth(value: number): void {
    message = '';
    try { session.updateContourDepth(pathIndex, value); }
    catch (cause) { message = cause instanceof Error ? cause.message : 'No se pudo modificar la profundidad.'; }
  }
  function chooseContour(index: number): void {
    if (index === pathIndex) return;
    cancel(); pathIndex = index; pointIndex = 0; message = '';
  }
  function contourKey(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseContour(index); }
  }
  $: if (selected) { x = selected.x; y = selected.y; }
  $: box = model?.viewBox.split(' ').map(Number) ?? [0, 0, 100, 100];
  $: radius = Math.max(box[2], box[3]) / 45;
  $: hitRadius = Math.max(box[2], box[3]) / 13;
  $: topology = path && !path.reason && path.linear && path.segments.filter(s => s.command === 'M').length === 1;
  function cancel(): void { gesture = null; draft = null; }
  function apply(command: SketchCommand): void {
    cancel(); message = '';
    const baseline = session.getDocument(); if (!baseline) return;
    try { commitSketch(session, baseline, session.getSessionEpoch(), editSketch(baseline.sketch.svg, command)); }
    catch (cause) { message = cause instanceof Error ? cause.message : 'No se pudo modificar este trazado.'; }
  }
  function begin(event: PointerEvent, index: number): void {
    if (event.button !== 0 || !document || path?.reason) return;
    event.preventDefault(); pointIndex = index; message = '';
    gesture = { baseline: document, epoch: session.getSessionEpoch(), pointer: event.pointerId };
    draft = document.sketch.svg; canvas.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent): void {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const matrix = canvas.getScreenCTM(); if (!matrix) return;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    try { draft = editSketch(gesture.baseline.sketch.svg, { type: 'move', path: pathIndex, point: pointIndex, x: local.x, y: local.y }); }
    catch (cause) { message = String(cause); cancel(); }
  }
  function finish(event: PointerEvent): void {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const current = gesture, next = draft; cancel();
    if (next) commitSketch(session, current.baseline, current.epoch, next);
  }
  function key(event: KeyboardEvent, index: number): void {
    if (event.key === 'Escape') { cancel(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); pointIndex = index;
    const point = path?.points[index]; if (!point) return;
    const step = event.shiftKey ? 10 : 1;
    apply({ type: 'move', path: pathIndex, point: index, x: point.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), y: point.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0) });
  }
</script>

<svelte:window on:keydown={event => { if (event.key === 'Escape') cancel(); }} on:blur={cancel} />
<section class="sketch-workspace" aria-label="Editor de dibujo 2D">
  <h2>Editor de dibujo 2D</h2>
  <p>Modificá el dibujo sin alterar el archivo original. Arrastrá un punto, usá las flechas o ingresá sus coordenadas. Escape cancela el desplazamiento.</p>
  {#if model && document}
    <label>Contorno
      <select value={pathIndex} on:change={event => chooseContour(Number(event.currentTarget.value))}>
        {#each model.paths as candidate, index}<option value={index}>Trazado {index + 1}{candidate.reason ? ' — conservado (solo lectura)' : ''}</option>{/each}
      </select>
    </label>
    <svg bind:this={canvas} class="canvas" viewBox={model.viewBox} role="group" aria-label="Dibujo actual y puntos editables"
      on:pointermove={move} on:pointerup={finish} on:pointercancel={cancel} on:lostpointercapture={cancel}>
      <image href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)} x={box[0]} y={box[1]} width={box[2]} height={box[3]} />
      {#each model.paths as candidate, index}
        {#if !candidate.reason && candidate.segments.length}
          <path d={candidate.segments.map(segment => segment.command + segment.values.join(' ')).join(' ')}
            class="contour-target" class:active={pathIndex === index}
            class:cut={operations[index] === 'cut'}
            class:emboss={operations[index] === 'emboss'}
            class:engrave={operations[index] === 'engrave'}
            class:ignored={operations[index] === 'ignore'}
            fill="none" vector-effect="non-scaling-stroke"
            role="button" tabindex="0" aria-label={`Seleccionar contorno ${index + 1}: ${operationLabels[operations[index] ?? 'unassigned']}`}
            aria-pressed={pathIndex === index}
            on:click={() => chooseContour(index)} on:keydown={event => contourKey(event, index)} />
        {/if}
      {/each}
      {#if path && !path.reason}
        {#each path.points as point, index}
          <circle cx={point.x} cy={point.y} r={hitRadius} class="point-hit"
            role="button" tabindex="0" aria-label={`${point.control ? 'Control' : 'Anclaje'} ${index + 1}`}
            on:focus={() => pointIndex = index} on:keydown={event => key(event, index)} on:pointerdown={event => begin(event, index)} />
          <circle cx={point.x} cy={point.y} r={radius} class:control={point.control} class:selected={pointIndex === index}
            aria-hidden="true" pointer-events="none" />
        {/each}
      {/if}
    </svg>
    <p class="notice">Seleccioná un contorno haciendo clic en su línea o desde la lista. La selección no modifica el diseño.</p>
    {#if document.kind === 'cutter'}
      <div class="contour-legend" aria-label="Vista de operaciones por contorno">
        <span><i class="legend-cut" aria-hidden="true"></i>Corte</span>
        <span><i class="legend-emboss" aria-hidden="true"></i>Relieve</span>
        <span><i class="legend-engrave" aria-hidden="true"></i>Grabado</span>
        <span><i class="legend-ignored" aria-hidden="true"></i>Ignorar</span>
      </div>
      <p class="notice">Vista 2D de las asignaciones; los colores no garantizan que los relieves sean imprimibles.</p>
      {#if reliefLayout}
        <div class="layout-status" role="status">
          <strong>Comprobación topológica del relieve: {reliefLayout.topologyReady ? 'configuración compatible' : 'pendiente'}</strong>
          <p>{reliefLayout.reason}</p>
          {#if reliefLayout.topologyReady}
            <p>Altura de separación de la punta de corte: {reliefLayout.markingClearanceMm} mm.
            Para generar el primer relieve 3D, configurá ángulo de pared 0° y desactivá el mango. La generación verifica que el STL sea una sola pieza estanca.</p>
          {/if}
        </div>
      {/if}
    {/if}
    {#if path && !path.reason && document.kind === 'cutter'}
      <div class="operation-draft" aria-label="Operación del contorno">
        <label>Operación del contorno {pathIndex + 1}
          <select aria-label="Operación del contorno" value={operations[pathIndex] ?? 'unassigned'}
            on:change={event => setOperation(event.currentTarget.value as OperationChoice)}>
            {#each Object.entries(operationLabels) as [value, label]}
              <option {value}>{label}</option>
            {/each}
          </select>
        </label>
        <p role="status">Operación asignada: {operationLabels[operations[pathIndex] ?? 'unassigned']}.</p>
        {#if detailMode}
          <label>Profundidad de marcado (mm)
            <input type="number" aria-label="Profundidad de marcado (mm)"
              min={CONTOUR_DETAIL_DEPTH.minMm}
              max={Math.min(CONTOUR_DETAIL_DEPTH.maxMm, document.parameters.cuttingHeight)}
              step="0.1"
              value={selectedAssignment?.depthMm ?? CONTOUR_DETAIL_DEPTH.defaultMm}
              on:change={event => setDepth(Number(event.currentTarget.value))} />
          </label>
          <p class="notice">El valor representa cuánto se eleva la punta interior respecto del filo exterior (0,4 a 3 mm). Cada contorno conserva su ajuste. El primer Relieve conectado puede generarse en 3D; Grabado sigue pendiente. Según la inclinación del puente, la impresión puede necesitar soportes.</p>
        {/if}

        <p class="notice">La operación forma parte del documento y participa de Deshacer/Rehacer. Usá Guardar proyecto o Exportar proyecto para conservarla después de cerrar. Corte conserva el contorno e Ignorar lo excluye del STL solamente en SVG simples con trazados independientes. Relieve ya genera geometría 3D para un borde exterior convexo, un detalle interior y un puente válido, sin mango y con paredes rectas. Grabado aún bloquea la exportación. Si editás el SVG, se limpian las asignaciones para evitar índices incorrectos.</p>
      </div>
    {/if}
    {#if path?.reason}<p role="status">{path.reason}</p>{/if}
    {#if !model.paths.length}<p role="status">No hay trazados editables. Las formas SVG originales se conservan sin convertir.</p>{/if}
    {#each model.notices as notice}<p class="notice">{notice}</p>{/each}
    {#if selected && path && !path.reason}
      <label>Punto <select bind:value={pointIndex} on:change={cancel}>{#each path.points as point, index}<option value={index}>{point.control ? 'Control' : 'Anclaje'} {index + 1}</option>{/each}</select></label>
      <div class="coordinates">
        <label>X <input type="number" step="any" bind:value={x} /></label>
        <label>Y <input type="number" step="any" bind:value={y} /></label>
        <button on:click={() => apply({ type: 'move', path: pathIndex, point: pointIndex, x, y })}>Mover punto</button>
      </div>
    {/if}
    <div class="tools">
      <button disabled={!topology || !selected} on:click={() => apply({ type: 'add', path: pathIndex, point: pointIndex })}>Agregar punto intermedio</button>
      <button disabled={!topology || !selected || (path?.points.length ?? 0) <= 3} on:click={() => { apply({ type: 'delete', path: pathIndex, point: pointIndex }); pointIndex = 0; }}>Eliminar punto</button>
      <button disabled={!topology || !!path?.closed} on:click={() => apply({ type: 'close', path: pathIndex })}>Cerrar contorno</button>
      <button disabled={!path || !!path.reason} on:click={() => apply({ type: 'mirror', path: pathIndex })}>Reflejar trazado</button>
      <button disabled={!path || !!path.reason} on:click={() => apply({ type: 'rotate', path: pathIndex })}>Rotar trazado 90°</button>
    </div>
    <p class="notice">Agregar, eliminar y cerrar puntos solo está disponible para contornos lineales simples. La simetría y la rotación utilizan el centro del área de dibujo. Las curvas conservan sus puntos de control y los elementos SVG no compatibles permanecen intactos.</p>
  {:else}<p>Importá o abrí un proyecto para editar su dibujo.</p>{/if}
  {#if message}<p role="alert">{message}</p>{/if}
</section>

<style>
  .sketch-workspace { display: grid; gap: .75rem; min-width: 0; }
  h2, p { margin: 0; } p { font-size: .875rem; line-height: 1.5; }
  label { display: grid; gap: .25rem; min-width: 0; }
  select, input, button { font: inherit; min-height: 44px; max-width: 100%; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; padding: .5rem; }
  button { cursor: pointer; } button:disabled { opacity: .5; cursor: not-allowed; }
  .canvas { width: 100%; aspect-ratio: 1; background: #fff; border: 1px solid #64748b; touch-action: none; }
  .contour-target { fill: none; stroke: transparent; stroke-width: 12px; pointer-events: stroke; cursor: pointer; }
  .contour-target.active { stroke: #2563eb; stroke-opacity: .4; }
  .contour-target.cut { stroke: #147d51; stroke-opacity: .66; }
  .contour-target.emboss { stroke: #bf6b17; stroke-opacity: .75; }
  .contour-target.engrave { stroke: #7a42b6; stroke-opacity: .7; }
  .contour-target.ignored { stroke: #9ca3af; stroke-opacity: .6; stroke-dasharray: 6 5; }
  .contour-target.active { stroke-width: 15px; }
  .contour-legend { display: flex; flex-wrap: wrap; gap: .75rem; font-size: .8rem; }
  .contour-legend span { display: inline-flex; gap: .3rem; align-items: center; }
  .contour-legend i { width: 14px; height: 5px; display: inline-block; border-radius: 3px; }
  .legend-cut { background: #147d51; }
  .legend-emboss { background: #bf6b17; }
  .legend-engrave { background: #7a42b6; }
  .legend-ignored { background: repeating-linear-gradient(90deg, #9ca3af 0 4px, transparent 4px 7px); }
  .contour-target:focus-visible { stroke: #2563eb; stroke-opacity: .65; outline: 2px solid #2563eb; }
  circle { fill: #fff; stroke: #2563eb; stroke-width: 1; cursor: grab; }
  circle.point-hit { fill: transparent; stroke: transparent; }
  circle.control { fill: #fef3c7; } circle.selected { fill: #60a5fa; }
  circle:focus { outline: none; stroke: #111827; stroke-width: 2; }
  .layout-status { display: grid; gap: .375rem; padding: .65rem; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; }
  .operation-draft { display: grid; gap: .375rem; padding: .75rem; border: 1px dashed var(--border-color, #cbd5e1); border-radius: 6px; }
  .coordinates, .tools { display: flex; flex-wrap: wrap; gap: .5rem; }
  .coordinates label { flex: 1; width: 80px; } .coordinates input { width: 100%; box-sizing: border-box; }
  .notice { font-size: .8rem; } :focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
</style>
