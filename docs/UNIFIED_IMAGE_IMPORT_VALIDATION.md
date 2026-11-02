# Importación unificada de imágenes — Validación del lote 2

## Alcance y procedencia

Rama original `feature/unified-image-import`, basada en la recuperación `1f3afd0dd928fc31a0f68cfec51db087aee21d56` (PR #59). Nueva pantalla de inicio con Importar / Formas / Reanudar, y un único proceso para archivos, arrastrar y soltar o pegar SVG, PNG, JPEG y WebP. Se conservaron la cancelación, la confirmación de cambios sin guardar y el documento canónico. El formato de proyecto V1 no cambió; los bytes originales de las imágenes rasterizadas no se persisten. No se modificaron dependencias, configuración, workers, reglas geométricas ni almacenamiento.

Dos revisiones independientes inspeccionaron una instantánea de 10 archivos de código y pruebas: SHA-256 `d8372363d63bd940fad7a98a18193567fd9a6d1c38488dccc6c2243be1525947` (rutas ordenadas, NUL, contenido, NUL). Conformidad PASS y calidad APPROVED. La revisión principal comparó los hashes individuales del informe de navegador con la instantánea actual: no hubo diferencias.

## Verificaciones locales

Ejecuciones secuenciales con directorio temporal aislado, `GOMAXPROCS=2` y `UV_THREADPOOL_SIZE=2`:

- `pnpm exec vitest run` con `--pool=threads --maxWorkers=1 --fileParallelism=false`: pruebas específicas **50/50, en 4 archivos**; batería global **965/965, en 63 archivos**.
- `pnpm check`: **0 errores y 0 advertencias**.
- Prueba funcional `src/lib/utils/__tests__/exportArtifacts.smoke.test.ts`, con las mismas opciones: **3/3**.
- `pnpm build`: **correcto**, 676 módulos.
- `pnpm audit --audit-level=moderate`: **ninguna vulnerabilidad conocida** en el momento de ejecutarse.
- `git diff --check`: sin problemas.

Registros finales fuera del repositorio: `/workspace/.hermes-tmp/repos/cookie-cutter-designer-4f8693bb50/commands/lot2-final-validation/`, archivos desde `10-targeted.log` hasta `15-audit.log`, `final-results.json` y `snapshot.json`. Se conservaron los intentos fallidos. Pruebas iniciales en rojo documentadas: se aceptaba un nombre sin extensión, una conversión no se cancelaba al abrir un proyecto y se interceptaba el pegado de PDF; se corrigieron y luego aprobaron las comprobaciones finales. No se recuperó la prueba roja inicial de toda la implementación.

## Prueba real con Chromium

Script puntual externo al repositorio: `/workspace/reports/unified-image-import-browser.mjs`. Informe: `/workspace/reports/unified-image-import-1791642893544/report.json`; archivos de prueba, JSON y capturas en la misma carpeta. **12 comprobaciones aprobadas y 1 comprobación adicional fallida**; sin errores de página, consola ni solicitudes fallidas.

Comprobaciones aprobadas: inicio con teclado mediante Intro/Espacio y rutas Formas/Reanudar; PNG importado por archivo, arrastre y pegado; nueva selección del mismo archivo; equivalencia estricta de la fuente y del SVG de contornos exportados entre archivo y pegado; WebP decodificado y vectorizado realmente, con generación del modelo; rechazo de imagen corrupta sin pérdida de datos; Cancelar con cambios pendientes preservando exactamente el documento y el foco inicial en Cancelar; pegado ignorado dentro de input/textarea y descendientes contenteditable; guardado en IndexedDB, recarga y reapertura del WebP con JSON idéntico y estado sin cambios; inicio y documento a 375 px sin desbordamiento horizontal.

Las capturas de escritorio y móvil fueron abiertas e inspeccionadas por la revisión principal: acciones legibles en escritorio y modelo visible en móvil. La captura móvil muestra solo una parte del panel; no demuestra que todos los controles sean visibles simultáneamente. El texto del límite de tamaño llega al borde inferior de la zona de importación.

SHA-256 del conjunto de fuentes/configuración durante la prueba de navegador: `9884c48c8d74cade4b4fa9da29a1908256ccc64637c4288e0399db4d026e67af`, idéntico antes y después; la lista y los hashes individuales figuran en el informe. El servidor y el navegador se cerraron en `finally`; el puerto quedó cerrado y el PID volvió a la línea de base de la ejecución.

## Reservas y seguimiento independiente

1. **Caso geométrico reproducible sin corregir:** círculo negro suavizado de 96 × 96, radio 28, fondo blanco. La importación, vectorización y exportación JSON funcionan, pero la generación 3D rechaza con `The polygon offset changes vertex topology between height layers.`. Se reprodujo en una página nueva. No se estableció que lo provocara el lote 2; se conservaron el archivo de prueba, el JSON y `circle-generation-error.png`. No debe afirmarse que todas las imágenes producen modelos imprimibles.
2. **Presupuesto final de entrada no certificado:** el complemento de compilación terminó correctamente, pero la entrada final midió 206286 caracteres / 206606 bytes, frente a un umbral de 204800 caracteres. La comprobación anterior en `generateBundle` se ejecutaba antes de que Vite agregara las dependencias de precarga. No se modificó la configuración ni se estableció una regresión respecto de la base exacta. Se mantuvo la advertencia del fragmento Three.js superior a 600 kB.
3. Pegado y arrastre: eventos del navegador construidos con objetos `File` reales, no con el portapapeles del sistema operativo ni un gesto físico. No se probó en dispositivo real, lector de pantalla ni impresión física.
4. Estas evidencias son locales, no certifican la integración continua, una vista previa remota ni producción. Se preveía una solicitud de incorporación en borrador basada en `feature/local-project-recovery`; ninguna fusión sin autorización específica.

## Reanudación y reversión

Conservar esta instantánea y comprobar el estado y las divergencias antes de publicar. Revisar el HEAD final exacto de la solicitud y su integración continua después de publicarla. Revertir mediante un commit de reversión en una rama dedicada, sin borrar datos ni publicar forzadamente; el formato V1 permanece igual. No iniciar el lote 3 antes de la pausa de reinicio solicitada originalmente.

> **Nota CookieForge:** todos los resultados, rutas temporales y autorizaciones descritos son registros históricos del proyecto de origen, no pruebas ejecutadas nuevamente sobre nuestra rama.
