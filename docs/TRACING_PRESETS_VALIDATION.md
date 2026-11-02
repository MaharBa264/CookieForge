# Lote 4 — Ajustes predefinidos de vectorización: validación local

> Registro histórico de los ajustes entregados en #67. El nuevo proceso guiado reemplaza los parámetros difusos `blurradius`/`pathomit`; **no utilizar las mediciones siguientes como prueba de calificación fotográfica**. Estado y evidencias posteriores: `PHOTO_IMPORT_VALIDATION.md`.

10/10/2026, rama `feature/tracing-presets`, base `b1b6aa8c35b4a61cd299b1d860650174b0a64e0e`, cambios locales sin commit. Sin commit, publicación, solicitud de incorporación, fusión ni despliegue; no hubo nuevas verificaciones remotas.

## Funcionalidad entregada y garantías

Dos opciones explícitas en Cargar y Creación Avanzada: **Dibujo contrastado** conserva exactamente las opciones históricas; **Foto — suavizado experimental** cambia únicamente `blurradius: 2` y `pathomit: 16`. Selección determinista, sin decisión automática. Los SVG ignoran estas opciones. Elegir un ajuste por sí solo no modifica nada. Importación y nuevo trazado utilizan el mismo importador y Worker existentes.

El archivo rasterizado es temporal y está asociado a la época de sesión. Volver a trazar reemplaza únicamente el boceto; conserva fuente, ID, nombre y parámetros. Instantánea exacta, señal y época protegen la publicación; cualquier edición simultánea o reemplazo invalida el resultado. Deshacer recupera las correcciones reemplazadas. V1 permanece intacto y no incluye píxeles: al abrir o recargar se pide reimportar, sin inventar un raster.

## Comandos aprobados después de la última corrección

Con directorio temporal de proyecto que bloquea fallas por defecto y `GOMAXPROCS=2 UV_THREADPOOL_SIZE=2`:

- `pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false`: **995/995 pruebas, 68 archivos**, 213,74 s.
- `pnpm check`: **0 errores y 0 advertencias**; tsc correcto.
- `pnpm test:smoke --pool=threads --fileParallelism=false`: **3/3**.
- `pnpm build`: correcto, 26,51 s; entrada 166,43 kB, fragmento mayor 561,53 kB.
- `git diff --check`: correcto.

Registros: `/workspace/reports/tracing-presets-{fulltests,check,smoke,build}.log`.

## Conjunto de pruebas realmente ejecutado

Ejecutor externo al repositorio: `/workspace/reports/tracing-presets-browser.mjs`. Informe final: `/workspace/reports/tracing-presets-1791664025018/report.json`, PNG/SVG y huellas SHA-256 en esa carpeta. Cuatro **imágenes de prueba originales generadas mediante procedimientos**, incluido el círculo rasterizado histórico; **ninguna fotografía tomada con cámara**. Dos ajustes × tres repeticiones × cuatro imágenes: **24 decodificaciones Canvas y vectorizaciones reales con Worker en Chromium**; los SVG fueron estrictamente idénticos entre repeticiones de cada combinación.

Medición de coordenadas: pares presentes en los trazados SVG, incluidos controles de curvas; **no representan cantidad de vértices de la malla**. Topología medida después de rasterizar el SVG a su resolución original, umbral negro menor a 128 y relleno por expansión a cuatro vecinos; no representa la topología imprimible. La duración incluye decodificación y comunicación con el Worker; mediana de tres intentos, primero contraste y luego foto; el primer círculo incluye arranque en frío. No es un benchmark controlado con carga constante.

| Imagen de prueba | Pares contraste → foto | Componentes contraste → foto | Huecos contraste → foto | Mediana ms contraste → foto |
|---|---:|---:|---:|---:|
| Círculo 96 × 96 | 37 → 37 | 1 → 1 | 0 → 0 | 73,8 → 80,3 |
| Anillo + hueco pequeño 128 × 128 | 35 → 25 | 1 → 1 | 2 → 1 | 5,2 → 9,3 |
| Detalles finos + isla pequeña 128 × 128 | 43 → 33 | 2 → 1 | 1 → 1 | 4,3 → 9,3 |
| Ruido determinista 128 × 128 | 634 → 54 | 3 → 1 | 22 → 0 | 8,5 → 12,0 |

La opción Foto reduce el ruido, pero también elimina un hueco intencional y una isla pequeña; la punta fina ensayada permanece negra en ambas opciones. El círculo resulta idéntico byte por byte. No se promete mejor calidad fotográfica ni menor duración.

## Pruebas funcionales y seguridad: distinción de evidencias

Chromium real en desarrollo, escritorio 1365 × 900 y móvil 375 × 812: ajuste inicial de contraste, selección de Foto sin modificar exactamente el documento, botón Volver a trazar accesible mediante clic real, nuevo trazado del círculo idéntico y conservación de identidad, fuente, parámetros y visor, guardado IndexedDB seguido de recarga completa y reapertura exacta; botón de nuevo trazado ausente y solicitud de reimportación. Ancho móvil 375/375. Sin errores de página, consola ni solicitudes fallidas; servidor detenido, puerto cerrado y diferencias de código sin cambios durante la recolección.

Pruebas de aplicación/happy-dom con Worker simulado: un resultado distinto actualiza solo el boceto; deshacer es exacto; cancelación explícita y respuesta tardía, edición o reemplazo durante el nuevo trazado no sobrescriben nada; V1 restaurado no vuelve a vectorizar. El escenario de navegador con círculo no valida deshacer sobre un resultado distinto porque ambos ajustes producen el mismo SVG. No se inyectó el almacén en la prueba funcional de interfaz.

No regresión sobre **dist**: `node /workspace/reports/raster-circle-loft-smoke.mjs`; informe `/workspace/reports/raster-circle-loft-1791664090814/report.json`. Importación raster histórica estrictamente igual a la imagen canónica; JSON y recarga exactos; STL antes y después idénticos: **178884 bytes, 3576 triángulos**, SHA-256 `272704f5baea3144ea793aec695e41eb049ba7ef6d6ff07477b28f804d4b1381`. Sin errores; servidor detenido y puerto cerrado.

## Fallas encontradas y límites

- Primera ejecución de desarrollo interrumpida por optimización tardía de `imagetracer` en Vite y recarga; reanudación correcta con caché preparada.
- El área de arrastre tapaba el botón de volver a trazar: Playwright rechazó el clic real. Se corrigió el encogimiento de los elementos hijos del panel desplazable; el clic real funcionó y se repitieron todas las verificaciones.
- La aserción inicial «el círculo debe cambiar» era incorrecta: las mediciones demuestran SVG idénticos. Se reemplazó por igualdad explícita; no se inventó evidencia de cambio.
- Intento de interfaz con anillo y hueco de 3 × 3 rechazado por la validación geométrica existente: `The contour is too small for the requested wall and taper.`. Se conservó el caso para evaluar vectorización, sin presentarlo como modelo imprimible.
- No se probó con fotografía de cámara, raster grande, dispositivo o tacto físico, lector de pantalla, impresión física ni integración continua remota. No se garantiza rendimiento universal de interfaz. La prueba detallada de ajustes se hizo en desarrollo; la prueba de distribución cubre círculo, generación, exportación y recarga.

El lote quedó implementado y las comprobaciones locales aprobaron dentro de este alcance. La calificación fotográfica y una prueba completa en navegador del nuevo trazado que modifique geometría con deshacer/cancelar siguen siendo ampliaciones pendientes de cobertura, no resultados obtenidos.

> **Nota CookieForge:** cifras, rutas y pruebas son registros históricos del proyecto original, no nuevas mediciones sobre CookieForge.
