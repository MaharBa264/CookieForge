# Taller 2D — Validación local del lote 3

## Estado y alcance

Validación del 10/10/2026 en `/workspace/cookie-cutter-designer`, rama original `feature/sketch-workspace`, base `8037df81f73e4c4aa6a824e8f75e26b3d80c547c` (#65). El código del taller estaba **sin commit ni publicación**. No se realizaron operaciones de commit, push, solicitud de incorporación, fusión ni despliegue durante esta validación. La compilación servida corresponde a las diferencias locales, no únicamente al SHA de base.

`Advanced Creation` ahora carga `SketchWorkspace` desde la sesión canónica y ofrece el historial existente. El antiguo generador Bézier de formas independientes deja de ser el taller principal. Este lote no declara migradas las demás herramientas avanzadas heredadas.

Funciones entregadas: seleccionar un trazado y un punto, mover mediante mouse/tacto/teclado (flechas, Shift para pasos de 10 unidades SVG), ingresar X/Y, agregar un punto medio, eliminar un punto, cerrar, reflejar horizontalmente y rotar 90° alrededor del centro del `viewBox`. Las coordenadas están en **unidades SVG, no milímetros**. La generación física conserva los parámetros del proyecto.

## Contratos y revisión del código

- Lectura y edición de `document.sketch.svg`; `session.updateSketch` es el único comando canónico. No se reconstruyen identidad, nombre, fuente original ni parámetros.
- Gramática deliberadamente limitada a M/L/C/Q/Z, absolutos o relativos; se conservan los controles Bézier. El trazado editado puede reescribirse en coordenadas absolutas, pero no se muestrea como polígono. Los trazados vecinos y atributos SVG se conservan semánticamente; la serialización XML no garantiza que el boceto permanezca idéntico byte por byte.
- Agregar/eliminar/cerrar requiere un único contorno lineal. Deben quedar al menos tres puntos después de eliminar y antes de cerrar. Los desplazamientos y transformaciones no eliminan subcontornos vecinos.
- Se rechaza la edición y se muestra el motivo cuando hay transformaciones/estilos en el trazado o sus ancestros, hojas de estilo, clase del trazado, geometría en `defs` o SVG anidado, comandos no admitidos o `viewBox` ausente/inválido. Las primitivas SVG no se convierten.
- Un arrastre escribe únicamente al soltar; antes hay una vista previa local. La confirmación verifica la instantánea exacta y la época de sesión. Escape, `pointercancel`, pérdida de captura y desenfoque cancelan; reemplazar/restaurar invalida un gesto obsoleto. Navegar fuera del taller también descarta el borrador.
- Se reutiliza el historial existente y se conserva la generación reactiva. No cambian validadores geométricos, extrusión raster ni límites de tamaño de paquetes. El SVG se muestra mediante una imagen con URL de datos, sin inyectarlo con `innerHTML`.

La revisión no encontró otros defectos bloqueantes en el alcance probado. No demuestra compatibilidad exhaustiva con todas las construcciones SVG/CSS ni rendimiento sobre archivos enormes.

## Comprobaciones realmente ejecutadas

Directorio temporal de proyecto aislado mediante `/workspace/.hermes-tools/workspace-tmp.py`, `GOMAXPROCS=2`, `UV_THREADPOOL_SIZE=2`.

| Comando | Resultado |
|---|---|
| `pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false` | **988/988**, 67 archivos, 211,14 s |
| `pnpm check` | **0 errores, 0 advertencias** |
| `pnpm test:smoke --pool=threads --fileParallelism=false` | **3/3**, 1 archivo, 3,38 s |
| `pnpm build` | **correcto**, 27,53 s; presupuestos sin cambios |
| `git diff --check` | **correcto** |

Registros fuera del repositorio: `/workspace/reports/sketch-full-tests.log`, `sketch-check.log`, `sketch-build.log`. La primera ejecución de la prueba funcional agregó `--maxWorkers=1` cuando el script ya lo incluía: Vitest rechazó la opción duplicada antes de ejecutar pruebas. La repetición indicada aprobó; no era un defecto del producto. El registro `sketch-export-smoke.log` conserva ese intento erróneo.

El informe de traspaso anterior indicaba 987/988 por agotarse el tiempo de espera de carga dinámica. La prueba de integración recibida ahora usa una espera explícita de 10 s para que el panel cargue realmente, coherente con sus esperas de generación. Se repitió y aprobó la batería completa; no se eliminó ninguna aserción funcional ni imagen de prueba.

## Chromium real sobre la distribución

Ejecutor ajeno a las dependencias de la aplicación: `/workspace/reports/sketch-workspace-smoke.mjs`. Chromium sin interfaz gráfica, almacenamiento temporal, vista previa `http://127.0.0.1:4342/cookie-cutter-designer/` limitada a localhost. Escritorio **1365 × 900**, móvil **375 × 812** con eventos táctiles reales de Chromium CDP (no solo `dispatchEvent` de `PointerEvent`).

Informe final: `/workspace/reports/sketch-workspace-1791659413721/report.json` (**pass: true**). Capturas inspeccionadas: `desktop-ready.png`, `mobile-ready-controls.png`; otros estados en la misma carpeta.

Recorridos verificados:

1. Importar SVG lineal, nombrar, guardar y abrir el taller.
2. Mover con teclado, Deshacer/Rehacer exactos; arrastrar con mouse, una sola acción Deshacer/Rehacer; Escape cancela.
3. Coordenadas, agregar/eliminar y Deshacer; reflejar y rotar, luego Deshacer.
4. Exportación JSON: fuente, ID, nombre y parámetros idénticos a la base; boceto realmente modificado.
5. Generación/exportación STL, guardado IndexedDB, recarga completa, apertura, JSON estrictamente igual y STL estrictamente igual: **2.484 bytes, 48 triángulos**.
6. Importar un segundo proyecto de identidad distinta y contorno abierto, cerrarlo, conservar fuente y guardar.
7. Móvil: `touchCancel` descarta el borrador; `touchEnd` aplica un gesto, una única acción Deshacer. Ancho de documento **375**, ventana **375**.
8. Arrastre en curso, navegación a Proyecto y apertura del segundo proyecto, luego liberación: la exportación del proyecto B es estrictamente igual a su instantánea guardada. Para evitar soltar artificialmente el mouse antes de la transición, se activan ambos botones de navegación mediante su método DOM `click`; el ejecutor no inyecta ni modifica almacenes.

Sin errores JavaScript, de consola ni solicitudes fallidas. Vista previa y navegador detenidos; puerto cerrado. Huellas del código y estado Git sin cambios antes/después.

Las capturas muestran el lienzo, los puntos alineados y el resultado 3D; los controles móviles se consultan desplazando el panel, independientemente del visor. La barra fija del historial puede tapar la parte superior de contenido ya desplazado: las capturas no garantizan que toda la interfaz quepa simultáneamente en pantalla. Los pequeños puntos de agarre no garantizan comodidad para todos los dedos; la selección y los campos de coordenadas ofrecen otra alternativa.

Huellas SHA-256 de las fuentes probadas:

```text
src/App.svelte 60d9fa0771af261c90e03e350428b27509d2d8bd7b25193446179e85e5d74836
src/lib/sketch/sketchCommands.ts 440be0ec8d99f3eb25a2de116fdaf36491ca1369bab34ec6d39436130b7bac9b
src/lib/components/ui/SketchWorkspace.svelte f8e382feba14e6f0bc238bc3bca439642f9781a266754bfd1f37dc6ac0b97026
dist/index.html 01114155899556fe7c93e3fbf4a5357be3d68b3c5f34d436f71fd7aa04285029
```

## No regresión raster

Se repitió el ejecutor anterior `/workspace/reports/raster-circle-loft-smoke.mjs` sobre la misma distribución: `/workspace/reports/raster-circle-loft-1791659317735/report.json`, **pass: true**. Se importó un PNG real con suavizado de bordes, fuente/boceto/parámetros idénticos al caso canónico; guardado/recarga exactos; STL idéntico antes/después (**178.884 bytes, 3.576 triángulos**), móvil sin desbordamiento, sin errores JavaScript ni de solicitudes, puerto cerrado. Esto valida el flujo raster existente, no la edición de todos sus puntos.

## Límites explícitos

- Sin pincel, texto, capas, ajuste magnético, herramienta de pluma completa, primitivas nuevas ni restauración dedicada del original; tampoco duplicación de trazados ni rotación/escalado libre.
- Sin nueva vectorización del raster después de recargar (los bytes raster faltan en V1) ni historial Deshacer persistente después de recargar.
- Algunas construcciones permanecen en solo lectura, sin convertirlas silenciosamente en polígonos; no hay garantía general sobre estilos SVG externos ni geometrías arbitrarias.
- Los comandos no certifican que una edición sea imprimible: las protecciones existentes de generación/exportación siguen siendo la referencia.
- No se validaron rendimiento con SVG grandes, lector de pantalla real, dispositivo físico, tema oscuro exhaustivo, otros navegadores, cierre inesperado durante el último gesto ni impresión física.
- Prueba local sobre diferencias sin commit: no existe evidencia de integración continua remota ni de producción para este lote.

> **Nota CookieForge:** estas cifras son registros históricos del proyecto original, no nuevas ejecuciones de pruebas sobre CookieForge.
