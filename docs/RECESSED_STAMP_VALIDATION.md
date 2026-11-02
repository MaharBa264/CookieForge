# Lote A — Sello en hueco: validación local

## Veredicto

Este informe describe el lote A del commit local `319d8cd`. La ampliación geométrica y el corazón de 10 mm ya fueron validados localmente: consultar `STAMP_QUALIFICATION.md` para las evidencias posteriores del 13/10/2026 y las limitaciones restantes de navegador y pruebas físicas. Este informe histórico no sustituye esa calificación del contenido nuevo.

**Lote A validado localmente después de corregir el corazón el 12/10/2026.** El defecto `non-manifold edges 12` se reprodujo con prueba ROJA y luego se corrigió, sin flexibilizar los validadores ni retirar la prueba. El veredicto inicialmente bloqueado fue reemplazado por los resultados siguientes. La calificación cubre los casos probados, no todos los dibujos posibles.

Trabajo local en `feature/recessed-stamp`, creada desde `origin/main` verificado (`acc50405b4a7d43b9b543893a6f77d6eeea3201a`). Repositorio remoto verificado: `razorglyon/cookie-cutter-designer`. Sin publicación, solicitud de incorporación, fusión ni despliegue. Lotes B–E excluidos.

## Alcance implementado

- Documento y envoltorio V4 estrictos, solo para sellos, `bridges: []`, `imprintMode: raised | recessed`. Se conservan definiciones V1/V2/V3, parámetros heredados y valores predeterminados; las pruebas antiguas de «versión futura» apuntan ahora a V5.
- Comando de sesión atómico, historial, guardado JSON/almacenamiento/recuperación e instantáneas de generación. El modo no se agrega a `CookieCutterParams`.
- Rechazo explícito de profundidades mayores a 3 mm para conservar nominalmente 1 mm de una base fija de 4 mm; también se rechaza la ausencia de base. Se ofrece reducir a 3 mm mediante una acción voluntaria, sin perder el ajuste de relieve cuando se rechaza.
- Controles accesibles Relieve/Hueco, con profundidad y espesor restante explícitos. Las comprobaciones síncronas de exportación incluyen el modo, incluso después de cancelar una regeneración y conservar la malla anterior.
- Sustracción sobre la cara de impresión, agarre en el reverso. La reparación histórica de pequeñas tapas sigue siendo exclusiva del relieve. Los planos conocidos de profundidad se reajustan dentro del épsilon JSCAD, sin agregar, eliminar ni tapar caras.

## Pruebas realmente ejecutadas

Todos los comandos exigentes utilizan el directorio temporal creado por `/workspace/.hermes-tools/workspace-tmp.py`, junto con `GOMAXPROCS=2` y `UV_THREADPOOL_SIZE=2`. Evidencias iniciales en `/workspace/reports/recessed-stamp-noihqr_1/`; calificación posterior a la corrección en `/workspace/reports/recessed-heart-opc6i2_c/`. Vitest usa un solo proceso, sin paralelismo de archivos.

- Base anterior a las modificaciones: **34/34**; huellas geométricas de relieve para círculo, hueco, islas y agarre, y STL V1/V2 sin cambios.
- ROJO de documento/códec V4: **18 fallas / 1 éxito**. ROJO de sesión: **6 fallas / 1 éxito**. ROJO geométrico inicial: **6 fallas / 8 éxitos**. ROJO de receta/interfaz/exportación: **4 fallas / 15 éxitos**, incluido exportar incorrectamente el relieve anterior después de cancelar.
- VERDE inicial del contrato, sesión y almacenes históricos: **99/99**. La primera calificación completa tuvo **1.193 éxitos / 1 falla**; ese resultado anterior no es el veredicto vigente.
- ROJO de la corrección: **1 falla / 19 éxitos** para el corazón original; luego **11 fallas / 19 éxitos** al agregar combinaciones de profundidad/agarre. Registros `red-heart-fix-2035.log` y `red-heart-depths-handles.log`.
- VERDE final de geometría/receta/aplicación/contrato/sesión: **76/76**, 5 archivos. El recorrido de la aplicación prueba tanto círculo como corazón, Deshacer/Rehacer, edición, guardado/reapertura y protección de exportación.
- Batería final completa: **1.205/1.205**, 91 archivos, sin fallas; terminó normalmente en **322,04 s** desde el ejecutor. Informe `full-suite-vitest.json`.
- `pnpm check`: **0 errores, 0 advertencias**.
- `pnpm build`: **correcto**, respetando presupuestos existentes.
- `pnpm test:smoke --pool=threads --fileParallelism=false`: **4/4**.
- Comprobación global de notas de perfil: solo fallaron los contextos demasiado largos de Limace y Sangsue, sin cambios. Este proyecto respeta el límite (5.981 caracteres), y tiene directorio temporal, rama y estado presentes; esta comprobación no es una prueba de aplicación.

Comandos reproducibles desde la raíz:

```sh
REPO_TMP=$(python3 /workspace/.hermes-tools/workspace-tmp.py --repo "$PWD" --purpose commands --path-only) || exit 1
test -n "$REPO_TMP" || exit 1
export TMPDIR="$REPO_TMP" GOMAXPROCS=2 UV_THREADPOOL_SIZE=2
pnpm exec vitest run src/lib/utils/__tests__/stampGenerator.test.ts src/lib/generation/recipes/__tests__/stampRecipe.test.ts src/__tests__/App.recessed-stamp.test.ts src/lib/projects/__tests__/recessedStamp.test.ts src/lib/projects/__tests__/recessedStampSession.test.ts --pool=threads --maxWorkers=1 --fileParallelism=false
pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false
pnpm check
pnpm build
pnpm test:smoke --pool=threads --fileParallelism=false
```

## Prueba final en Chromium — Corazón

Compilación local servida por Vite Preview en loopback, sin exposición pública. El ejecutor y el navegador fueron iniciados y detenidos por la prueba; última recopilación: `/workspace/reports/recessed-heart-opc6i2_c/browser-VvSzWY/browser-result.json`. El ejecutor `browser-smoke.mjs` está archivado en su carpeta principal. La prueba se vincula a huellas del código, no solo al SHA de base Git.

- Escritorio 1365 × 900 y móvil 390 × 844; capturas inspeccionadas. Rechazo de un relieve de 5 mm sin modificación, reducción voluntaria y selección Hueco mediante teclado.
- Lectura real de IndexedDB después de guardar, descarga `.ccd.json` V4, recarga completa y apertura explícita desde la biblioteca.
- Vista previa WebGL real y STL binario descargado: **1.828 triángulos, 91.484 bytes**, dimensiones mostradas 75 × 75 × 12 mm (incluido agarre de 8 mm), plano de fondo a 9 mm que conserva 1 mm de base. Una envolvente conectada, aristas compartidas dos veces con orientaciones opuestas, ningún triángulo degenerado y volumen firmado positivo.
- JSON exacto y STL **idéntico byte por byte después de reabrir**: SHA-256 `cc943cca4ebaab2bb6d2c503f4ae0b2317b1a024f1c2c641cda32964981a89c6`. Volver a Relieve y luego Hueco regenera las exportaciones correctas.
- Dos zonas táctiles de al menos 44 px, estado seleccionado y ausencia de desbordamiento global; captura móvil reencuadrada mediante desplazamiento y pruebas de clic en ambos botones.
- Ningún mensaje de error de navegador; **56 recursos** del paquete servido comparados con la compilación local; **233 huellas de código idénticas antes/después** y a las entradas de calificación final.

Esta prueba final de navegador valida el corazón. El círculo también había aprobado una prueba de navegador antes de la corrección; sus regresiones y la batería completa se ejecutaron nuevamente después. Los únicos cambios posteriores a las 233 huellas calificadas fueron documentales y en la nota local.

## Diagnóstico y corrección

El diagnóstico identifica uniones en T y duplicados numéricos durante el ajuste de coordenadas de JSCAD. La doble pasada pública sin normalización de coordenadas conservaba seis aristas abiertas; con normalización a 1e-8 mm no quedaron aristas abiertas y la validación JSCAD aprobó (`publicTwoPass` en `stages.json`).

La ruta de hueco normaliza coordenadas, triangula y une sin ajuste ni simplificación, y luego aplica ajuste/triangulación sin simplificación. Utiliza únicamente API públicas de JSCAD y no tapa ni elimina caras. Los planos de profundidad se reajustan dentro del épsilon JSCAD; la reparación de tapas sigue siendo exclusiva del relieve. Se retiraron los intentos exploratorios infructuosos y se archivaron sus diagnósticos fuera del repositorio de aplicación.

Las regresiones cubren el corazón a **0,1 y 3 mm** con **los cinco estilos de agarre**, pruebas de rayos de profundidad, envolvente/volumen/geometría manifold válidos y STL. La ruta de relieve histórica, sus huellas y los formatos V1–V3 permanecen iguales.

## Límites y defecto histórico independiente

El corazón en **relieve**, 75 mm, profundidad 2 mm, sin agarre, ya es rechazado por el generador exacto de la base Git (`boolean repair refused a non-triangular boundary`). El rechazo también se reproduce en la rama; el mismo caso en hueco es válido. No lo introdujo ni lo corrigió V4. Evidencia: `baseline-raised-refusal.log`.

No se contó con laminador, impresión física, Safari/Firefox, teléfono real, lector de pantalla ni calificación de tamaños o complejidades máximas. **STL estructuralmente validado en los casos probados; impresión física no ensayada.** El texto local anterior de `AGENT_CONTEXT.md` se conservó íntegramente, con solo un encabezado breve de reanudación; esa nota quedó excluida de todo commit.

> **Nota CookieForge:** resultados y autorizaciones pertenecen al repositorio original; la traducción no repite estas pruebas.
