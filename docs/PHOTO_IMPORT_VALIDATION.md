# Preparación guiada de fotografías — Validación local

> **Informe histórico del proyecto original, fechado el 10/10/2026.** Los resultados corresponden a esa versión y no implican que se haya repetido la validación en CookieForge.

## Estado

10/10/2026, rama `feature/robust-photo-import`, base `8683d16b73e843d5bc04ee149151944788a601fe` (#67). Diferencias locales sin confirmar ni publicar. **Validado localmente en la versión final:** 1.068/1.068 pruebas, comprobación 0 errores/0 advertencias, pruebas de exportación 3/3, compilación, auditoría y revisión de diferencias correctas; recorrido real repetido después de las correcciones. Los intentos anteriores se describen más adelante, pero no sustituyen las evidencias finales. No hubo commit, push, PR, fusión ni despliegue de ese trabajo. Revisión independiente de la corrección de tapa: sin bloqueos; un revisor informó la verificación numérica de 216 casos/permutaciones y ocho rechazos, distinta de las pruebas ejecutadas por el proceso principal. Ningún agente auxiliar seguía activo al finalizar.

## Flujo y propiedad del estado

`Dessin contrasté` («Dibujo contrastado») conserva el tratamiento histórico. `Photo — préparation guidée` («Foto — preparación guiada») ya no consiste en desenfoque 2/`pathomit16`: ofrece comparación original/contorno, recorte normalizado, umbral de luminancia automático o manual y polaridad oscura/clara. La limpieza por superficie y el relleno de huecos se eligen explícitamente, deshabilitados de forma predeterminada; sus efectos se cuentan e informan. No se selecciona ocultamente el objeto más grande. Antes de aplicar se rechazan máscaras vacías o uniformes, contactos con bordes, componentes múltiples, contactos diagonales o complejidad excesiva. Los huecos se conservan y se rechaza una vectorización incapaz de representarlos.

`PhotoImportReview` posee el borrador de ajustes, el resultado y la señal de cancelación; cambiar un ajuste invalida Aplicar hasta recalcular. La aplicación conserva documento, época y revisión de la fuente hasta confirmar. Cancelación, navegación y cambio de documento descartan respuestas tardías. Confirmar una importación crea el proyecto; confirmar una nueva vectorización reemplaza únicamente el boceto mediante el historial canónico. Se conservan fuente, identidad y parámetros.

Cada preparación utiliza su propio Worker, que se termina tras éxito, cancelación, error o tiempo agotado. Decodificación y procesamiento usan `createImageBitmap`/`OffscreenCanvas`. Después del recorte se limita el trabajo a 1.024 px por lado y 1 MP; archivo de hasta 10 MiB, raster de origen de hasta 8.192 px por lado y 16 MP. Sin nube. El límite del origen se comprueba después de decodificar el bitmap: no garantiza un uso máximo universal de memoria durante la decodificación del navegador.

V1 no cambia: ni el raster ni los ajustes se guardan. Se necesita reimportar tras recargar. La preparación valida el contorno, **no la imprimibilidad**; siguen siendo obligatorios los controles de generación y exportación.

## Conjunto reproducible

Fotografías reales `coins`, `coffee` y `chelsea`; atribuciones y huellas en `src/lib/import/__tests__/fixtures/photos/README.md`. Las pruebas no descargan archivos. Las imágenes PNG se decodifican en pruebas Node y se someten a segmentación/vectorización deterministas sin modificar el original; se rechaza el fondo complejo y no se eliminan huecos/islas implícitamente. Un recorte explícito de la moneda se prepara como componente único. Tres fotografías no demuestran segmentación universal ni reconocimiento de objetos.

## Primeras comprobaciones (antes de corregir la tapa)

Manifiesto y registros: `/workspace/reports/robust-photo-gates-1791670270537866951/manifest.json`; huellas SHA-256 sin cambios durante la ejecución y todos los códigos de salida en cero:

- Pruebas específicas: 96 pruebas / 5 archivos.
- `pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false`: 1.065/1.065 pruebas / 72 archivos.
- `pnpm check`: 0 errores / 0 advertencias.
- `pnpm test:smoke --pool=threads --fileParallelism=false`: 3/3.
- `pnpm build`: correcto; no se excedieron los presupuestos de 200 KiB de entrada / 600 KiB de otros fragmentos.

Directorio temporal aislado dentro del espacio de trabajo, `GOMAXPROCS=2` y `UV_THREADPOOL_SIZE=2`, comprobaciones secuenciales. Se guardaron comandos y registros individuales; no se dedujo su resultado únicamente del código de salida del proceso contenedor.

## Prueba real y defecto encontrado

Ejecutor externo al repositorio `/workspace/reports/robust-photo-browser.mjs`, almacenamiento descartable de Chromium y compilación `dist`. Informe inicial `/workspace/reports/robust-photo-1791669949838/report.json`: pieza fotográfica recortada, Aplicar separado, STL válido de 85.584 bytes / 1.710 triángulos; cancelación de nueva vectorización sin cambios; JSON y STL idénticos después de IndexedDB/recarga; raster no reconstruido después de recargar. `coffee` a cuadro completo se rechaza por 1.941 componentes/1.837 huecos sin publicar proyecto; móvil de 375 px sin desbordamiento. Sin errores de JavaScript o solicitudes; servidores detenidos y puertos cerrados.

Prueba ampliada `/workspace/reports/robust-photo-1791670700031/report.json`: el umbral manual 140 generó otro contorno, pero la generación lo rechazó con `The wall triangulation produced a degenerate triangle.` Se bloqueó exportar y no se produjo un STL inválido. El escenario Deshacer/Rehacer se detuvo: **ese informe no demuestra que haya funcionado**.

Fallo reproducido (RED): `/workspace/reports/robust-photo-geometry-red-product.log`. La foto con umbral automático aprobaba y la del umbral 140 fallaba en `addCap`. Se retiró la instrumentación temporal. Diagnóstico externo: `/workspace/reports/robust-photo-geometry-debug.log`, tres vértices alineados y área doble ≈ 1,78 × 10⁻¹⁴. `repairCollinearCapFaces` reemplaza el par de caras adyacentes compartiendo el vecino mediante el punto intermedio: mismos vértices y aristas de borde, área conservada, sin eliminar triángulos, puntos ni huecos. Se exigen proyección interior, vecino único, diagonal nueva no existente y caras no degeneradas; ante la incertidumbre permanece el control estricto histórico. Dos fotografías derivadas se guardaron como casos de prueba.

Tras el primer arreglo, 39/39 pruebas aprobaron en `photoGeometry`, `cutterGeometry` y `cookieCutterGenerator`. Una comprobación más fuerte de `validatePrintableObject` descubrió otro defecto: el trazado blanco usado como fondo de la vista previa se interpretaba como borde de corte y agregaba un marco. Se conservó el fallo RED en `/workspace/reports/robust-photo-background-red.log`: dos pruebas rechazaban un trazado blanco. Se corrigió el Worker para emitir únicamente contornos negros; el fondo visual pertenece al CSS, no al SVG. No se aplicó un filtrado general de colores a SVG de usuarios ni al proceso de dibujo contrastado.

Los casos actuales `photo-auto`/`photo-threshold140` proceden de exportaciones Chromium de la versión corregida. Prueba explícita: `validatePrintableObject(..., {requireSingleShell:true})`, cierre, orientación de caras y volumen positivos, una sola envolvente y un solo contorno. El SVG antiguo con marco se guarda aparte como `coin-photo-pre-fix-frame.svg` únicamente para regresión de la tapa; no se presenta como salida correcta para el usuario.

Una espera de interfaz del panel `CollisionDetector` fallaba al segundo durante su carga diferida (también en pruebas específicas). La prueba ahora espera el control real hasta 10 segundos, como el resto del flujo asíncrono; conserva todas las comprobaciones de rechazo de cambios y exportaciones. No se alteró ningún tiempo de espera del producto ni un control de seguridad. Se retiró la instrumentación temporal.

## Calificación final tras todas las correcciones

Manifiesto `/workspace/reports/robust-photo-qualified-gates-1791673153140978086/manifest.json`, huellas del código fuente idénticas antes/después y todos los códigos de salida en cero:

- Pruebas específicas de fotos/importación/exportación/geometría: **151/151 en 9 archivos**.
- Suite completa: **1.068/1.068 pruebas en 73 archivos**.
- `pnpm check`: 0 errores / 0 advertencias.
- Pruebas de exportación: 3/3; compilación correcta de 684 módulos.
- `pnpm audit --audit-level=moderate`: ninguna vulnerabilidad conocida.
- `git diff --check`: correcto; presupuestos 200/600 KiB sin cambios.

Recorrido final sobre esa compilación: `/workspace/reports/robust-photo-1791673558128/report.json`.

- Fotografía `coins.png`, recorte 33,3 % / 33,3 % / 14,1 % / 17,8 %, polaridad clara, limpieza de 9 px² y silueta exterior elegida explícitamente. Aplicar es independiente del cálculo; cambiar ajustes invalida el resultado anterior.
- STL de la silueta únicamente: **94.584 bytes / 1.890 triángulos**; SHA-256 `a1fc1850819fea162ee1aea776ea235a0a740161cb13cb85a5b8869205380a32`. El valor anterior de 1.710 incluía el marco incorrecto y **no prueba la fidelidad fotográfica**.
- La nueva vectorización real con umbral manual 140 produce otro boceto sin modificar identidad, nombre, fuente, parámetros, vista ni fecha de creación. Generación y exportación correctas; Deshacer/Rehacer restaura documentos idénticos y Deshacer recupera el STL original.
- Cancelar conserva exactamente el documento; IndexedDB guarda y recupera JSON/STL idénticos. V1 pide la imagen original tras recargar.
- Fotografía compleja `coffee`: Aplicar deshabilitado, diagnósticos explícitos y ningún objeto seleccionado/eliminado ocultamente. Móvil y documento de 375 px; cancelar conserva el proyecto. Sin errores de JS, consola ni solicitudes.
- Navegador y servidor cerrados, puerto liberado. Se inspeccionaron capturas escritorio/móvil: agarre y encuadre visibles sin superposición en las áreas recorridas; controles restantes accesibles desplazándose.

Caso histórico del círculo en la misma compilación: `/workspace/reports/raster-circle-loft-1791673641926/report.json`, 178.884 bytes / 3.576 triángulos, JSON/STL idénticos después de recargar; SHA-256 STL `272704f5baea3144ea793aec695e41eb049ba7ef6d6ff07477b28f804d4b1381` invariable. Servidor y puerto cerrados; ningún error. Las comprobaciones y recorridos fueron locales, **no CI remota**.

## Limitaciones

No se extraen objetos arbitrarios automáticamente ni hay IA semántica; el usuario decide recorte y contraste. No se inventan detalles imposibles de segmentar. Limpieza y relleno destructivos requieren aprobación explícita. El contorno puede no servir para las dimensiones o paredes pedidas; la aplicación bloquea la exportación en lugar de entregar una figura inválida.

No hubo mediciones de rendimiento en archivos grandes, pruebas con Safari/iOS físico, lector de pantalla ni impresión real. La ausencia de desbordamiento a 375 px y el viewport táctil simulado de Chromium no certifican todos los dispositivos. No hubo CI remota ni despliegue de ese desarrollo.
