# Plan de implementación Codex — Refactorización del producto

> **Plan histórico del proyecto original.** Las autorizaciones y prioridades que aparecen aquí no son órdenes vigentes para CookieForge. Verificar la situación actual antes de retomar tareas.

**Objetivo:** convertir la aplicación monolítica Cortante/Sello en una plataforma extensible de recetas de generación, sin regresiones en las garantías de impresión.

**Arquitectura:** un documento versionado contiene fuente, boceto y parámetros. Un registro resuelve la receta de generación. Un orquestador cancelable produce artefactos validados que utilizan el visor y los exportadores.

**Tecnologías:** Svelte 5, TypeScript estricto, Three.js, Vitest, Web Workers y pnpm.

---

## Reglas de ejecución

### Sincronización verificada con REA — 11/10/2026

La hoja de ruta REA (`.hermes/plans/2026-10-09_214154-rea-product-improvements.md`, desde la raíz del repositorio) distinguía lotes entregados y ampliaciones. Integración en `main`: `bafc4246d5c5789a385f844ea5ff3a1d2d7e99dd`; última PR #71 fusionada y Pages verificado. Ya se habían integrado los fundamentos de documentos/códec/registro/orquestación, proyectos locales, recuperación, importación unificada, taller mínimo, perfiles de vectorización/foto guiada, puentes y perfiles sencillos. La receta de cortantes múltiples se entregó **solo para copias homogéneas separadas**, con documento V3, distribución, historial y recuperación.

Evidencias: `../SKETCH_WORKSPACE_VALIDATION.md`, `../PHOTO_IMPORT_VALIDATION.md`, `../MANUAL_ISLAND_BRIDGES_VALIDATION.md`, `../WALL_PROFILES_VALIDATION.md` y `../CUTTER_SERIES_VALIDATION.md`. Invariantes: `../PROJECT_INVARIANTS.md`.

**No considerar terminadas todas las fases de este plan.** Las recetas ampliadas, catálogo/búsqueda, perfiles funcionales versionados, taller avanzado, PWA y exportaciones de múltiples artefactos seguían siendo propuestas pendientes de auditoría y definición, no ausencias completamente verificadas en aquella revisión. No estaban entregados los cortantes unidos/monobloque ni las paredes con zonas independientes. La biblioteca de proyectos entregada no cerraba automáticamente la fase de perfiles funcionales.

Las tareas detalladas abajo son la especificación original: comprobar el alcance ya implementado antes de retomarlas. Las PR antiguas encadenadas habían quedado sustituidas. La autorización de aquel momento alcanzaba solo actualización documental, commit y push, sin PR, fusión, despliegue ni función nueva; permisos anteriores no se extendían a ese lote.

- Trabajar en una rama específica, nunca directamente en `main`.
- Un commit local coherente por tarea o grupo pequeño.
- No publicar cambios sin validación humana.
- Desarrollo guiado por pruebas (TDD) para migraciones, recetas y controles.
- No borrar pruebas históricas para hacer pasar una migración.
- No relajar umbrales geométricos para ocultar regresiones.
- Conservar importaciones dinámicas de funciones pesadas.
- No crear cuentas, suscripciones, pagos, muros de pago, backend de negocio ni almacenamiento en nube.
- Proyectos, perfiles y biblioteca exclusivamente locales, con importación/exportación manual.

## Fase 0 — Versión de referencia

### Tarea 0.1 — Registrar el estado inicial

**Archivos:** ninguno.

Ejecutar:

```sh
pnpm install --frozen-lockfile
pnpm exec vitest run --maxWorkers=1
pnpm run check
pnpm run test:smoke
pnpm run build
```

**Esperado:** versión de referencia documentada. Si ya hay fallas, detener los cambios y registrarlas antes de modificar nada.

### Tarea 0.2 — Agregar casos de compatibilidad

**Crear:**

```text
src/lib/domain/__tests__/fixtures/legacy-cutter.json
src/lib/domain/__tests__/fixtures/legacy-stamp.json
```

Guardar únicamente parámetros no sensibles y resultados deterministas medibles: dimensiones, número de envolventes, volumen con signo y hash lógico de triángulos normalizados cuando sea estable.

## Fase 1 — Dominio versionado

### Tarea 1.1 — Definir tipos de documento

**Crear:**

```text
src/lib/domain/designKind.ts
src/lib/domain/designDocument.ts
src/lib/domain/designParameters.ts
src/lib/domain/generatedArtifact.ts
```

**Modificar:** `src/lib/types/CookieCutter.ts`.

Acciones:

1. Incorporar `DesignKind` con todas las recetas del documento de requisitos.
2. Agregar `DesignDocumentV1`.
3. Separar parámetros comunes, de Cortante y de Sello.
4. Mantener temporalmente `CookieCutterParams` como tipo heredado.
5. Prohibir `any` y uniones sin discriminante.

**Pruebas:** `src/lib/domain/__tests__/designDocument.test.ts`.

Comprobar discriminantes, valores predeterminados e imposibilidad de mezclar parámetros de Sello y Cortante.

### Tarea 1.2 — Agregar validación y migración

**Crear:**

```text
src/lib/domain/documentValidation.ts
src/lib/domain/migrations/index.ts
src/lib/domain/migrations/v0ToV1.ts
src/lib/domain/__tests__/documentValidation.test.ts
src/lib/domain/__tests__/migrations.test.ts
```

La migración `v0 → v1` convierte:

```ts
mode: 'cutter' -> kind: 'cutter'
mode: 'stamp' -> kind: 'stamp'
scale: 1 -> targetSize: 75 // Solo para el formato antiguo conocido
```

Rechazar versiones futuras desconocidas sin modificar el documento de origen.

### Tarea 1.3 — Crear formato de proyecto portable

**Crear:**

```text
src/lib/projects/projectCodec.ts
src/lib/projects/projectStorage.ts
src/lib/projects/__tests__/projectCodec.test.ts
```

Reglas:

- JSON versionado;
- sin objetos de Three.js;
- SVG de origen saneado;
- ida y vuelta de exportar/importar;
- suma de comprobación opcional de datos raster;
- IndexedDB detrás de una interfaz comprobable.

## Fase 2 — Registro y orquestación

### Tarea 2.1 — Definir el contrato de receta

**Crear:**

```text
src/lib/generation/generationRecipe.ts
src/lib/generation/recipeRegistry.ts
src/lib/generation/__tests__/recipeRegistry.test.ts
```

El registro:

- rechaza duplicados;
- devuelve un error estructurado para recetas desconocidas;
- expone valores predeterminados, validación y generación;
- admite importación dinámica.

### Tarea 2.2 — Adaptar Cortante

**Crear:**

```text
src/lib/generation/recipes/cutterRecipe.ts
src/lib/generation/recipes/__tests__/cutterRecipe.test.ts
```

**Reutilizar sin duplicar:**

```text
src/lib/utils/cookieCutterGenerator.ts
src/lib/utils/cutterGeometry.ts
src/lib/utils/geometryValidation.ts
```

La prueba compara la receta con el caso heredado: dimensiones, topología y orientación de fabricación.

### Tarea 2.3 — Adaptar Sello

**Crear:**

```text
src/lib/generation/recipes/stampRecipe.ts
src/lib/generation/recipes/__tests__/stampRecipe.test.ts
```

Conservar importación dinámica de JSCAD y reparación local estrictamente acotada de la figura Corazón.

### Tarea 2.4 — Extraer el orquestador

**Crear:**

```text
src/lib/generation/generationOrchestrator.ts
src/lib/generation/generationState.ts
src/lib/generation/__tests__/generationOrchestrator.test.ts
```

**Modificar:**

```text
src/App.svelte
src/lib/stores/cookieCutterStore.ts
```

El orquestador administra:

- agrupación temporal de cambios (*debounce*);
- revisión;
- `AbortController`;
- generación;
- validación;
- publicación atómica;
- conservación del último resultado válido;
- liberación del resultado reemplazado.

Pruebas obligatorias: respuestas obsoletas, cancelación, error, publicación atómica y liberación única.

## Fase 3 — Interfaz dirigida por esquemas

### Tarea 3.1 — Crear el almacén de documentos

**Crear:**

```text
src/lib/stores/designDocumentStore.ts
src/lib/stores/__tests__/designDocumentStore.test.ts
```

**Dejar obsoleto gradualmente:** `src/lib/stores/cookieCutterStore.ts`.

El almacén ofrece modificaciones tipadas, nunca alteraciones anidadas directas.

### Tarea 3.2 — Dividir el panel de parámetros

**Crear:**

```text
src/lib/components/parameters/CommonSizeSection.svelte
src/lib/components/parameters/CutterSection.svelte
src/lib/components/parameters/StampSection.svelte
src/lib/components/parameters/HandleSection.svelte
src/lib/components/parameters/AdvancedSection.svelte
src/lib/components/parameters/ParameterAccordion.svelte
```

**Modificar:** `src/lib/components/ui/ParameterPanel.svelte`.

Cada campo debe tener etiqueta, unidad, mínimo/máximo, explicación y error. Los controles táctiles mantienen 44 px.

### Tarea 3.3 — Incorporar catálogo y búsqueda

**Crear:**

```text
src/lib/components/design/DesignKindPicker.svelte
src/lib/components/parameters/ParameterSearch.svelte
src/lib/domain/designKindMetadata.ts
```

No mostrar como estable una receta sin implementación registrada. Las recetas futuras pueden aparecer con una etiqueta «planificada» únicamente en una vista de hoja de ruta no interactiva.

## Fase 4 — Importación y edición 2D

### Tarea 4.1 — Incorporar WebP y pegado

**Modificar:**

```text
src/lib/components/ui/FileUpload.svelte
src/lib/utils/imageProcessor.ts
src/App.svelte
```

**Pruebas:**

```text
src/lib/utils/__tests__/imageProcessor.test.ts
src/lib/components/ui/__tests__/FileUpload.test.ts
```

Comprobar MIME, extensión, portapapeles sin archivo, imágenes demasiado grandes y cancelación.

### Tarea 4.2 — Unificar el documento de boceto

**Crear:**

```text
src/lib/sketch/sketchDocument.ts
src/lib/sketch/sketchOperations.ts
src/lib/sketch/sketchValidation.ts
src/lib/sketch/__tests__/sketchOperations.test.ts
```

**Adaptar:**

```text
src/lib/components/ui/PathEditor.svelte
src/lib/components/ui/BezierEditor.svelte
src/lib/components/ui/BooleanOperations.svelte
src/lib/utils/pathOperations.ts
src/lib/utils/booleanOperations.ts
```

Un solo documento debe alimentar vista previa 2D, historial y generación.

### Tarea 4.3 — Integrar el editor

**Crear:**

```text
src/lib/components/editor/SketchEditor.svelte
src/lib/components/editor/EditorToolbar.svelte
```

Funciones P1: seleccionar, mover, duplicar, borrar, editar puntos/Bézier, deshacer/rehacer y restaurar original.

### Tarea 4.4 — Agregar primitivas, grilla y transformaciones

**Crear:**

```text
src/lib/sketch/primitives.ts
src/lib/sketch/snapping.ts
src/lib/sketch/transforms.ts
src/lib/components/editor/GridSettings.svelte
src/lib/components/editor/TransformPanel.svelte
src/lib/sketch/__tests__/primitives.test.ts
src/lib/sketch/__tests__/snapping.test.ts
src/lib/sketch/__tests__/transforms.test.ts
```

Implementar rectángulo, elipse, polígono regular y estrella. El ajuste magnético debe ser una función pura que reciba puntos candidatos, umbral en píxeles convertido a coordenadas del documento y preferencias activas. Probar zoom, valores negativos, empate entre candidatos y desactivación.

### Tarea 4.5 — Completar las capas

**Adaptar:**

```text
src/lib/components/ui/LayerManager.svelte
src/lib/types/Layer.ts
```

Incorporar visibilidad, bloqueo, cambio de nombre y orden. La generación ignora capas invisibles conforme a una regla documentada y rechaza documentos sin contornos generables.

## Fase 5 — Recetas P1

### Tarea 5.1 — Cortante con impresión interior

**Crear:**

```text
src/lib/generation/recipes/imprintCutterRecipe.ts
src/lib/generation/recipes/__tests__/imprintCutterRecipe.test.ts
src/lib/components/parameters/ImprintSection.svelte
```

Casos de prueba: hueco, isla, profundidad cero, relieve desconectado y dibujo cóncavo.

### Tarea 5.2 — Cortante + sello

**Crear:**

```text
src/lib/generation/recipes/cutterAndStampRecipe.ts
src/lib/generation/recipes/__tests__/cutterAndStampRecipe.test.ts
src/lib/components/parameters/CutterAndStampSection.svelte
```

La receta compone Cortante y Sello sin fusionar sus artefactos. Probar tolerancia, espejado, nombres y exportación 3MF con varios objetos.

### Tarea 5.3 — Múltiples cortantes

**Crear:**

```text
src/lib/generation/recipes/multiCutterRecipe.ts
src/lib/generation/layout/gridLayout.ts
src/lib/generation/recipes/__tests__/multiCutterRecipe.test.ts
```

Reutilizar la reversión atómica de `src/lib/utils/batchProcessor.ts`.

Probar grilla, rechazo de espaciados negativos cuando generen colisión, plataforma pequeña, cancelación y reversión total.

### Tarea 5.4 — Plantilla (Stencil)

**Crear:**

```text
src/lib/generation/recipes/stencilRecipe.ts
src/lib/generation/recipes/__tests__/stencilRecipe.test.ts
src/lib/components/parameters/StencilSection.svelte
```

**Reutilizar tras auditar:**

```text
src/lib/utils/patternGenerator.ts
src/lib/components/ui/PatternGenerator.svelte
```

Probar detalles flotantes, puentes, grilla diagonal, dimensiones exteriores y topología final.

## Fase 6 — Perfiles y biblioteca local

### Tarea 6.1 — Perfiles versionados

**Crear:**

```text
src/lib/presets/presetStore.ts
src/lib/presets/presetCodec.ts
src/lib/components/presets/PresetPicker.svelte
src/lib/presets/__tests__/presetStore.test.ts
```

Un perfil se vincula con una receta y una versión de esquema.

### Tarea 6.2 — Biblioteca local

**Adaptar o reemplazar:**

```text
src/lib/utils/projectManager.ts
src/lib/components/ui/ProjectManager.svelte
src/lib/components/ui/CloudGallery.svelte
```

**Crear:**

```text
src/lib/components/library/LocalProjectLibrary.svelte
src/lib/projects/__tests__/projectStorage.test.ts
```

Abandonar gradualmente `CloudGallery` y trasladar cualquier lógica reutilizable a `LocalProjectLibrary`. No se prevé backend.

## Fase 7 — Recetas P2

Cada receta sigue el mismo ciclo: tipos → validación de parámetros → pruebas que fallan → generación → validación geométrica → interfaz → exportaciones → documentación.

Orden propuesto:

1. perfiles de filo y segundo filo;
2. barras centrales;
3. texto en paredes y placas con nombre;
4. agarre/encastre;
5. cortante de sándwich;
6. adorno para torta;
7. conjunto de cortantes;
8. contorno PDF/SVG.

Rutas sugeridas:

```text
src/lib/generation/profiles/
src/lib/generation/recipes/sandwichCutterRecipe.ts
src/lib/generation/recipes/cakeTopperRecipe.ts
src/lib/generation/recipes/cutterSetRecipe.ts
src/lib/text/
src/lib/export/pdfOutlineExporter.ts
```

No empezar el molde de cake pops sin pruebas físicas de holguras.

## Fase 8 — Exportaciones de múltiples artefactos

### Tarea 8.1 — Normalizar exportaciones

**Crear:**

```text
src/lib/export/exportRequest.ts
src/lib/export/exportService.ts
src/lib/export/fileNaming.ts
src/lib/export/__tests__/exportService.test.ts
```

**Adaptar:**

```text
src/lib/utils/stlExporter.ts
src/lib/utils/advancedExporter.ts
src/lib/utils/manufacturingCoordinates.ts
```

Probar:

- artefacto único;
- varios STL;
- OBJ;
- 3MF de múltiples objetos;
- nombres deterministas;
- eje Z vertical;
- `Z = 0`;
- bloqueo si alguna pieza es inválida.

## Fase 9 — Seguridad y rendimiento

### Tarea 9.1 — Endurecer el tratamiento SVG

**Modificar:**

```text
src/lib/utils/imageProcessor.ts
src/lib/utils/contourExtraction.ts
```

Agregar casos de prueba con scripts, eventos, `foreignObject`, URL externa, entidades y SVG excesivamente grandes.

### Tarea 9.2 — Generalizar los Workers

Perfilar antes de mover operaciones. Trasladar solo las tareas que realmente bloqueen según mediciones. Definir protocolos con `requestId`, cancelación y errores estructurados.

### Tarea 9.3 — Presupuestos de memoria y JavaScript

Agregar prueba o script acotado:

```text
scripts/check-bundle-budget.mjs
src/lib/utils/__tests__/generationLifecycle.test.ts
```

Escenario de memoria: 20 generaciones, alternancia del mapa térmico y reemplazo de modelos sin crecimiento descontrolado de geometrías activas.

### Tarea 9.4 — Prueba de rendimiento del editor 2D

**Crear:**

```text
src/lib/sketch/__tests__/editorPerformance.benchmark.test.ts
```

Generar un caso determinista de 10.000 puntos. Medir por separado selección, transformación y ajuste magnético. Registrar equipo y duraciones. Usar el resultado para detectar regresiones, no como promesa universal de cuadros por segundo.

## Fase 9 bis — PWA local opcional

### Tarea 9.5 — Agregar modo sin conexión

Solo después de estabilizar el formato de proyecto.

**Crear:**

```text
public/manifest.webmanifest
src/lib/pwa/updateManager.ts
src/lib/pwa/__tests__/updateManager.test.ts
```

Agregar un service worker mediante un plugin Vite mantenido, únicamente después de validar su costo y política de actualizaciones. Nunca almacenar en caché solicitudes de IA. Probar instalación, versión nueva, caché obsoleta e inicio sin red.

## Fase 10 — Validación final

Ejecutar:

```sh
pnpm exec vitest run --maxWorkers=1
pnpm run check
pnpm run test:smoke
pnpm run benchmark
pnpm run build
pnpm audit --audit-level=moderate
git diff --check
```

Validación manual mínima:

- SVG con hueco;
- imagen raster;
- Cortante;
- Sello;
- Cortante con impresión interior;
- Cortante + Sello;
- Múltiples cortantes;
- Plantilla;
- temas claro/oscuro;
- pantalla móvil;
- STL/OBJ/3MF abierto en un laminador.

## Criterios de entrega

- Sin regresiones respecto del conjunto histórico.
- Migraciones probadas.
- Ninguna funcionalidad ficticia visible.
- Cada receta devuelve artefactos validados.
- Interfaz sin bloqueos, resultados obsoletos descartados.
- Documentación sincronizada.
- Diferencias sin secretos.
- Rama lista para revisión, sin publicación implícita.
