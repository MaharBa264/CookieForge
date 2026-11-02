# Lote 5 — Puentes manuales entre islas: validación local

Fecha: 11 de octubre de 2026. Rama original `feature/manual-island-bridges`, creada desde `origin/main` en el commit `ee647698f4b94e75ba5993460e0f39527cc70f2e`. Rza autorizó el commit y la publicación de la rama; no autorizó solicitudes de incorporación, fusiones ni despliegues.

## Contrato y flujo de datos

- Los proyectos históricos siguen siendo documentos **V1** mientras no se agregue ningún puente; su lectura, guardado y generación utilizan la ruta V1. El primer puente promueve explícitamente, mediante copia, a **V2**. La versión del envoltorio `.ccd.json` coincide con la del documento. El analizador estricto rechaza versiones futuras y puentes malformados.
- Cada puente tiene dos extremos en coordenadas SVG, un ancho físico en milímetros y un identificador estable. Límites del contrato: 32 puentes, 0,8–10 mm y coordenadas finitas entre ±1.000.000. Cada extremo debe conectarse a un contorno diferente; se rechazan cruces y segmentos superpuestos, aunque dos puentes encadenados pueden compartir un extremo.
- La edición utiliza el documento canónico y el historial de sesión: agregar, mover mediante mouse/teclado/tacto, eliminar, eliminar todos y Deshacer/Rehacer. Una confirmación asíncrona vuelve a validar instantánea, época y componente montado antes de publicar; una validación rechazada no modifica el documento ni el historial.
- La geometría de los puentes se une a las huellas de pared, conservando huecos y la extrusión progresiva de paredes, incluso con agarre y ángulo de salida. Una conexión **completa** debe generar una única envolvente cerrada e imprimible. Cuando varias islas necesitan varios puentes, cada puente individualmente válido puede guardarse como estado **intermedio V2**; la exportación STL queda deshabilitada hasta conectar la última isla. El JSON del proyecto sigue siendo exportable en ese estado.
- Un cambio posterior en el dibujo puede invalidar puentes guardados. Se bloquea entonces la exportación; «Eliminar todos los puentes» permite recuperarse con una única acción reversible incluso si las eliminaciones individuales no superan la validación previa.

## Verificaciones automáticas

Con `TMPDIR` aislado mediante `/workspace/.hermes-tools/workspace-tmp.py --repo "$PWD" --purpose commands --path-only`, `GOMAXPROCS=2` y `UV_THREADPOOL_SIZE=2`:

| Comando | Resultado |
|---|---|
| `pnpm check` | 0 errores, 0 advertencias |
| `pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false` | 1.083 pruebas aprobadas, 77 archivos |
| `pnpm test:smoke --pool=threads --fileParallelism=false` | 3 pruebas aprobadas |
| `pnpm build` | correcto |
| `pnpm audit` | `No known vulnerabilities found` |
| `git diff --check` | correcto |

Las pruebas abarcan migración sin mutaciones, códec V1/V2, persistencia/recuperación, publicación asíncrona, historial, puentes aislados y encadenados, segmentos superpuestos, hueco central realmente abierto al trazar un rayo Three.js, variantes de agarre/ángulo de salida y compatibilidad de la ruta sin puentes. La prueba del primer puente en una cadena de tres contornos falló inicialmente antes de corregirse; también fallaron antes de sus correcciones las pruebas de solapamiento colineal y hueco central. Las verificaciones finales correspondientes aprobaron. Registros locales: `/workspace/reports/manual-island-bridges-final-{check,tests,smoke,build,audit}.log`.

## Navegador real (compilación de producción, Chromium local)

Script de prueba fuera del repositorio: `/workspace/reports/manual-island-bridges-smoke.mjs`. Informe del último recorrido: `/workspace/reports/manual-island-bridges-1791718707624/report.json`; capturas previas, de escritorio y móvil en la misma carpeta. No se simuló el generador: el recorrido carga SVG reales, genera y descarga STL, y después recarga proyectos IndexedDB.

- Un puente: agregar, mover con teclado/mouse/tacto, eliminar y Deshacer/Rehacer; exportación JSON V1 inicial y V2 después de agregar; guardado, recarga y STL **estrictamente idéntico** antes y después: 6.284 bytes, 124 triángulos, SHA-256 `35a7017f7752b3754956b71c5b4a0b600215a5aa91cbaa7bfa9e4c50bb0ceb3e`.
- Tres contornos: primer puente guardado y reabierto como proyecto V2 incompleto, botón STL deshabilitado; segundo puente conectado desde el extremo existente, Deshacer/Rehacer, STL exportado (10.084 bytes, 200 triángulos), JSON con dos puentes verificado; eliminación global seguida de Deshacer. Sin errores de consola ni solicitudes fallidas en el informe.
- Vista móvil emulada a 375 px: documento de 375 px, sin desbordamiento horizontal; movimiento táctil y Deshacer probados. Servidor de vista previa detenido y puerto cerrado después.

Prueba de no regresión V1 en navegador: `/workspace/reports/raster-circle-loft-1791719156523/report.json`. El círculo raster conserva su JSON canónico, fuente y STL de 178.884 bytes / 3.576 triángulos **idéntico después de recargar** (SHA-256 `272704f5baea3144ea793aec695e41eb049ba7ef6d6ff07477b28f804d4b1381`). El script informa `pass`, `sourceUnchanged` y `portClosed`.

Presupuestos JavaScript medidos en archivos reales de `dist/assets`: entrada `index-ygi8OyIm.js` de **173.489 bytes**, menor que 200 KiB; fragmento restante mayor `three-vendor-BVsn0h3b.js` de **561.528 bytes**, menor que 600 KiB; 35 archivos JS sin infracciones. Estos tamaños deben volver a medirse después de cualquier cambio de compilación.

## Límites

No hubo pruebas en teléfono físico, otro motor de navegador, laminador ni impresora 3D; las verificaciones de envolvente no certifican todos los SVG posibles ni la resistencia mecánica real de un puente de 0,8 mm. El navegador fue Chromium local en localhost y el tacto se emuló. El historial Deshacer/Rehacer permanece en memoria de la pestaña, no en el JSON. El script Playwright y sus artefactos están fuera del repositorio: las pruebas Vitest versionadas en Git son la regresión automática compartible. Los flujos Quality/CodeQL no se activan por un simple push de esta rama; no se ejecutó ninguna solicitud de incorporación, fusión ni despliegue de este lote.

> **Nota CookieForge:** estos resultados son históricos del proyecto original y no se volvieron a ejecutar al traducir el informe.
