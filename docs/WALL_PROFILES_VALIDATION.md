# Validación local — Perfiles sencillos de pared (lote 6)

> Informe **histórico** del proyecto de origen. Los resultados siguientes no son pruebas nuevas realizadas sobre CookieForge.

## Estado calificado

Validación del **11 de octubre de 2026** en `feature/simple-wall-profiles`, dentro del clon `cookie-cutter-designer`. Base Git: `c98e63855e7263aba2dc7de151b03daad251c24b`, squash de la PR #69. La versión examinada era **local, sin confirmar ni publicar**; ese SHA identifica la base, no un commit que contenga los perfiles. Rza autorizó después **únicamente el commit local** el 11/10/2026; el commit entregado puede consultarse mediante `git log -1` en aquella rama. No se autorizó publicación.

La rama anterior `feature/manual-island-bridges` se conservó en `23759cd1dcb1a58ef283e69c0120fa69bc00b3f6`, sin rebase ni eliminación. La modificación local previa de `AGENT_CONTEXT.md` se conservó íntegra al cambiar de rama y luego se amplió. Los estados históricos de la hoja de ruta no sustituyen ese contexto comprobado.

## Contrato de la primera etapa

| Perfil | `wallThickness` | `taperAngle` |
|---|---:|---:|
| Fino | 0,8 mm | 5° |
| Estándar | 1 mm | 7° |
| Robusto | 1,5 mm | 10° |

- El catálogo inmutable se encuentra en `src/lib/domain/wallProfiles.ts`.
- `CutterSection.svelte` aplica los dos valores juntos mediante `updateParams`, la conexión existente hacia la sesión. El documento actual sigue siendo el propietario de los parámetros; los almacenes heredados no se convierten en una segunda referencia persistente.
- La elección activa se deriva de la igualdad exacta entre espesor y ángulo. Fuera del catálogo se muestra **Personalizado**. Presionar el perfil ya activo no crea una modificación.
- Los valores siguen siendo ajustables. Las etiquetas y los valores de accesibilidad muestran las magnitudes físicas actuales, sin redondear los decimales de proyectos antiguos.
- Tamaño, alturas, agarre, identidad, fuente, boceto y puentes no se sustituyen al elegir perfil. Cada elección equivale a un único paso de Deshacer/Rehacer.
- No se guarda identificador de perfil, nuevo esquema, migración ni geometría independiente de base/pared/filo. Los proyectos V1 siguen siendo V1 y los que contienen puentes siguen siendo V2.
- Son ajustes indicativos, **sin certificación de resistencia ni de seguridad alimentaria**. Siguen aplicándose los controles geométricos existentes.

## TDD y pruebas automáticas

Primero se ejecutaron las pruebas de perfiles en rojo antes de implementar, y luego en verde. Una regresión específica reprodujo el redondeo engañoso de un valor personalizado (`0.85 mm`) antes de corregirlo. Chromium también reprodujo la fragmentación de la palabra `Standard`; el arreglo CSS se limitó a las etiquetas de los botones nuevos. Después, cada nombre cabía en una línea en las capturas registradas.

Las pruebas de interfaz y sesión cubrieron la aplicación atómica de parámetros, ausencia de aplicación al montar, estado derivado, personalización, ausencia del grupo en modo Sello, aviso, fidelidad de valores y persistencia V1/V2. Las pruebas de App utilizaron sesión, historial, receta y serialización STL reales; solo se simuló el visor GPU y se usó almacenamiento en memoria. **Ese almacenamiento simulado no se presentó como prueba de IndexedDB:** la persistencia se comprobó por separado en Chromium.

Después del último cambio funcional:

| Comprobación | Resultado |
|---|---|
| Perfiles y módulos asociados: parámetros, App, historial, exportación, recetas, códec, sesión y puentes | 191 pruebas correctas en 11 archivos |
| `pnpm check` | 0 errores, 0 advertencias |
| Suite completa | 1.096 pruebas correctas, 79 archivos |
| Pruebas de exportación | 3 correctas |
| `pnpm build` | Correcto |
| Presupuesto de entrada JS | 175.103 bytes / 204.800 permitidos (200 KiB) |
| Fragmento restante más grande, `three-vendor` | 561.528 bytes / 614.400 permitidos (600 KiB) |
| Inventario de presupuestos | 35 archivos JS, ninguna infracción |
| `pnpm audit --audit-level=moderate` | Ninguna vulnerabilidad conocida notificada |

Los presupuestos corresponden a los archivos JS finales UTF-8 sin comprimir, después de la transformación `preload` de Vite. No prueban una reducción del tráfico total transferido.

### Comandos realmente ejecutados

En la raíz de Git, con directorio temporal aislado y paralelismo limitado:

```sh
REPO_TMP=$(python3 /workspace/.hermes-tools/workspace-tmp.py --repo "$PWD" --purpose commands --path-only) || exit 1
test -n "$REPO_TMP" || exit 1
export TMPDIR="$REPO_TMP" GOMAXPROCS=2 UV_THREADPOOL_SIZE=2

pnpm exec vitest run src/__tests__/App.wall-profiles.test.ts src/__tests__/App.history-session.test.ts src/__tests__/App.export-validity.test.ts src/lib/components/parameters src/lib/generation/recipes src/lib/projects/__tests__/bridgesRoundTrip.test.ts src/lib/projects/__tests__/projectCodec.test.ts src/lib/projects/__tests__/projectSessionIntegration.test.ts src/lib/sketch/__tests__/bridgeCommands.test.ts --pool=threads --maxWorkers=1 --fileParallelism=false
pnpm check
pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false
pnpm test:smoke --pool=threads --fileParallelism=false
pnpm build
pnpm audit --audit-level=moderate
git diff --check
```

Las pruebas de exportación y rendimiento se modificaron para respetar `TMPDIR` con `tmpdir()`; sus artefactos permanecían en el directorio aislado y no en una ruta `/tmp` fija. No se cambiaron dependencias funcionales.

## Recorrido real en Chromium

El ejecutor sirvió dos compilaciones estáticas en localhost: una base archivada desde `origin/main` verificado y recompilada en el directorio temporal; otra de `dist` con los cambios locales. Se compararon por HTTP los **54 archivos HTML/recursos de cada compilación** con sus bytes locales. Las capturas no se atribuyeron únicamente al SHA base: el informe registró rama, estado de Git y huellas de todas las fuentes `src/` antes y después, idénticas durante la prueba.

Recorridos realizados:

1. Se abrió en la nueva versión un V1 creado/exportado con la base, sin editarlo: JSON y STL quedaron idénticos byte a byte.
2. **Fino → Estándar → Robusto**, en V1 y luego en V2 con un puente creado en el editor real: valores exportados exactos, fuente/boceto/puentes preservados y tres STL diferentes.
3. Deshacer/Rehacer: JSON restaurado exactamente, con un paso por elección.
4. Personalización mediante teclado: espesor de 1,4 mm y altura ajustada; estado Personalizado.
5. Guardado IndexedDB, recarga completa, reapertura y nuevas exportaciones: JSON y STL estrictamente idénticos a lo guardado, tanto en V1 como V2.
6. V2 móvil: selección táctil de Estándar, guardado/recarga/reapertura, puente intacto y JSON/STL idénticos.
7. Activación de perfiles mediante teclado con foco visible (borde de 3 px), temas claro/oscuro, escritorio de 1.365 × 900 y móvil de 375 × 812; sin desplazamiento horizontal del documento. Botones medidos en 97 × 61 px en el recorrido móvil.
8. Medición de vértices STL binarios: dimensiones acordes con la insignia de la vista previa dentro de su precisión de 0,1 mm; altura y posición Z comprobadas. No sustituye mediciones físicas.

No hubo errores de consola ni solicitudes fallidas en el informe final. Fuentes invariables durante el recorrido. Se detuvieron los servidores y se comprobó que los puertos estuvieran cerrados.

## Evidencias e intentos intermedios

Las evidencias originales se guardaron fuera del repositorio en `/workspace/reports`:

- Comprobaciones finales: `wall-profiles-{targeted,check,tests,smoke,build}-post-ui.log`.
- Presupuestos: `wall-profiles-budgets-post-ui.json`.
- Auditoría: `wall-profiles-audit-post-ui.log`.
- Recorrido completo: `wall-profiles-browser-1791725360750/report.json`, JSON, STL y capturas asociadas; ejecutor `wall-profiles-smoke.mjs`.
- Etiquetas corregidas: `wall-profiles-labels-1791725349336/report.json`; ejecutor `wall-profiles-labels.mjs`.
- Comparación visual final: `wall-profiles-framing-1791726291148/report.json`, antes del control de pared y después de seleccionar Robusto, escritorio/móvil; ejecutor `wall-profiles-framing.mjs`. Comprobó encuadre en el viewport y ausencia de ocultamiento en bordes superior/inferior mediante `elementFromPoint`, huellas de compilación y ausencia de cambios.

Los primeros encuadres del panel completo o alineados con su comienzo estaban parcialmente cortados o tapados por la barra Deshacer/Rehacer. Aunque un informe preliminar indicara PASS para las dimensiones que medía, la inspección visual mostró el problema: esas imágenes **no se aceptaron como comparación final**. Se verificó e inspeccionó de nuevo el encuadre centrado, sin modificar CSS funcional para fabricar la evidencia.

La cadena de revalidación posterior a la corrección excedió el límite de la herramienta de terminal (420 s). Ese estado de herramienta no se consideró éxito del comando. Se revisaron individualmente los registros, se inventariaron los procesos y el ejecutor de navegador terminó con informe PASS y puertos cerrados. No se infirió ningún resultado del tiempo agotado por sí solo.

Dos primeras ejecuciones de pruebas de App fallaron (tiempo de espera y luego comparación de identidad en memoria). El tiempo máximo del test se fijó en 30 s; el orquestador valida y clona legítimamente el documento, por lo que se verifica la igualdad completa del contenido y no la misma instancia en memoria. Los éxitos citados corresponden a ejecuciones finales posteriores a ambos arreglos.

## Revisión de diferencias final

Último `fetch` de calificación antes del commit: `HEAD == origin/main`, base invariable, rama anterior del lote 5 intacta, índice Git vacío y ninguna PR abierta. Revisión local frente a esa base, incluidos archivos nuevos: alcance y calidad examinados, sin bloqueos. Las **217 huellas de `src/`** coincidían con el informe final del navegador; los últimos cambios eran exclusivamente documentales. Los presupuestos de los 35 archivos JS se recalcularon desde `dist`, se verificaron vínculos documentales locales y espacios en archivos no seguidos. Se confirmó TypeScript estricto después de resolver la herencia `@tsconfig/svelte`, no leyendo solamente JSON sin procesar.

Revisión reproducible externa: `/workspace/reports/wall-profiles-final-review.py`; informe `/workspace/reports/wall-profiles-final-review.log`. En esa etapa había nueve archivos nuevos/modificados locales sin indexar. El permiso limitado al commit local quedó registrado en el informe y en `AGENT_CONTEXT.md` antes de agregar al índice.

Antes de confirmar, el 11/10/2026, se repitieron `pnpm check` (0 errores/0 advertencias) y `pnpm exec vitest run src/lib/components/parameters/__tests__/WallProfiles.test.ts src/__tests__/App.wall-profiles.test.ts --pool=threads --maxWorkers=1 --fileParallelism=false`: **13/13 pruebas correctas** en 2 archivos. Mismo directorio temporal aislado; registros `wall-profiles-precommit-{check,tests}.log`. No se repitieron la suite completa ni Chromium en ese paso: las pruebas anteriores seguían asociadas con las mismas 217 huellas funcionales, comprobadas antes del commit.

## Corrección de archivos temporales después de publicar la PR #70

El commit inicial `1d3d351019ba00940d743ab4c45dc25b62572b62` superó Quality y el trabajo de análisis CodeQL, pero el veredicto externo CodeQL señaló cuatro alertas altas «Insecure temporary file» en pruebas de exportación/rendimiento. Que el trabajo de análisis terminara bien no implicaba aprobación de seguridad.

El 11/10/2026 Rza autorizó corregir, probar, confirmar y publicar en la misma PR borrador, sin pasarla a lista para revisión, fusionar ni desplegar.

- Cada una de las dos pruebas pasó a crear un directorio único con `mkdtempSync` bajo `tmpdir()`, con permisos privados `0700` en Linux. Se sigue respetando `TMPDIR`.
- La prueba de exportación no elimina ni reutiliza rutas compartidas predecibles. Los artefactos finales mantienen nombres estables **dentro** del directorio privado, inaccesible a otros usuarios a través de su carpeta padre.
- Los artefactos se conservan tras las pruebas y las rutas se imprimen con `process.stdout.write`. Un intento con `console.info` no mostraba las rutas en ese entorno; se comprobó la salida real después de corregirlo.
- El README indica utilizar la ruta exacta comunicada, sin buscar mediante patrones globales artefactos potencialmente antiguos. El benchmark crea `report.json` en su carpeta privada.
- Dos regresiones ejecutadas antes de corregir fallaban con las rutas compartidas; después aprobaron junto con controles de permisos. Se verificaron dos ejecuciones independientes: directorios distintos, artefactos previos conservados, informes JSON legibles y archivos 3MF íntegros (`unzip -t` en ambos).

Calificación local final: **1.098 pruebas en 79 archivos**, `pnpm check` 0/0, exportación **4/4**, rendimiento **2/2**, auditoría sin vulnerabilidades conocidas y compilación correcta. Las dos nuevas regresiones explican la diferencia con las 1.096 pruebas iniciales. La suite final se volvió a ejecutar tras modificar la salida estándar. Presupuestos finales sin cambios: 35 archivos JS, entrada 175.103 bytes y máximo restante 561.528 bytes, dentro de 200/600 KiB.

Comandos adicionales realmente ejecutados, con el mismo directorio aislado:

```sh
pnpm exec vitest run src/lib/utils/__tests__/exportArtifacts.smoke.test.ts src/lib/utils/__tests__/pipeline.benchmark.test.ts -t 'uses a private unique temporary directory' --pool=threads --maxWorkers=1 --fileParallelism=false # RED antes de corregir
pnpm test:smoke --pool=threads --fileParallelism=false
pnpm benchmark --pool=threads --fileParallelism=false
pnpm check
pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false
pnpm build
pnpm audit --audit-level=moderate
```

Evidencias fuera del repositorio: `/workspace/reports/wall-profiles-temp-security-red.log`, `*-smoke-final.log`, `*-benchmark-final.log`, `*-check-final.log`, `*-full-final.log`, `*-build.log` y `*-audit.log`. Los cuatro puntos inicialmente señalados quedaron cubiertos sin desactivar ni descartar CodeQL; el veredicto remoto debe comprobarse nuevamente sobre el SHA correctivo publicado.

No se modificó código funcional; únicamente las pruebas de exportación/rendimiento difirieron de la implementación calificada bajo `src/`. No se repitió el recorrido de navegador para este arreglo de herramientas; no debe presentarse la validación histórica como una ejecución nueva. Los directorios de artefactos se conservaron deliberadamente y pueden limpiarse por separado tras inspección y autorización, nunca mediante una limpieza global automática.

## Limitaciones y próxima decisión histórica

- Solo Chromium con tacto emulado: no se probó teléfono físico, Safari, Firefox ni lector de pantalla.
- Sin laminador, impresora, medición de rigidez, pruebas de materiales o calificación alimentaria.
- Los recorridos nuevos de perfiles/V2 cubrieron un puente sencillo. Las cadenas de puentes y estados intermedios se cubrieron con pruebas históricas repetidas, no con un recorrido nuevo en navegador para cadenas.
- Los perfiles no garantizan que un SVG cualquiera produzca un modelo válido; los controles geométricos existentes pueden rechazarlo.
- Sin pruebas de rendimiento sobre SVG enormes ni pruebas de zoom/texto al 200 % en ese lote.
- PR #70 publicada como borrador tras autorización; corrección de herramientas, commit y push permitidos. CI inicial detallada anteriormente; **no se autorizaron ni ejecutaron fusión o despliegue**. No cambió la versión publicada.

Antes de cualquier publicación del proyecto original se exigía permiso explícito de Rza y nueva validación de la versión exacta. Base, pared y filo independientes y múltiples cortantes quedaban fuera de alcance.
