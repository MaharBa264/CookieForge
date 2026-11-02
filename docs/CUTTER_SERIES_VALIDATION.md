# Serie de cortadores — Lote 7a, validación local

## Alcance y estado

El 11/10/2026, Rza autorizó la implementación local del lote 7a: copias homogéneas **separadas y recuperables** del cortador actual. Rama `feature/reprenable-cutter-series`, creada desde `origin/main` verificado en `1c9e54a2507eceac7bcb788ffc5ad90d4c38cc9e` (lote 6 integrado). Esta calificación precedió a la publicación. Autorización adicional explícita de Rza el 11/10/2026: commit, publicación, solicitud de incorporación y fusión solo después de que Quality y seguridad aprobaran el SHA exacto, seguidas de la verificación del despliegue Pages. Al redactar este documento antes del commit, producción seguía en el lote 6; el resultado remoto debía registrarse en la nota de reanudación.

- Entrada Batch existente: abrir o escribir no cambia el documento; Crear/Aplicar publica un cambio atómico registrado en el historial canónico.
- Un dibujo y un conjunto compartido de parámetros, agarres y puentes. Los perfiles Fino / Estándar / Robusto y los valores personalizados siguen editando la fuente de la serie.
- De 1 a 24 copias, columnas entre 1 y la cantidad de copias, separación positiva de 0,5 a 40 mm; filas calculadas. Distribución sobre la plataforma cuadrada existente, medida desde toda la geometría, incluido el agarre.
- Documento y envoltorio V3 estrictos (`kind: multi-cutter`, `layout`, puentes), sin mallas serializadas. V1/V2 permanecen iguales hasta utilizar la función. Se conservan identidad, fuente original, boceto, parámetros y visor. Regresar al cortador único produce V2 si existen puentes, o V1 si no, sin restablecer parámetros.
- Sin migración automática ni identificador nuevo de perfil; la versión anterior de producción rechaza archivos V3 como versión futura. El formato V3 requiere la nueva aplicación.
- Se reutilizan `CutterRecipe` y el motor Batch; el cortador debe estar completo y conectado. Cada copia tiene geometrías y materiales propios; se libera el prototipo. Cancelar o fallar la distribución no publica series parciales. El límite total de 500.000 triángulos se comprueba antes de duplicar.
- Distribución físicamente imposible: el documento puede guardarse y exportarse como JSON, pero se bloquea la geometría. Batch sigue accesible sin malla después de reabrir para reducir la distribución; se muestra un mensaje de plataforma sin reparación automática.
- El Batch libre histórico se conserva como opción expresamente no guardable. Fuera de alcance: conexiones entre copias, pieza monobloque, dibujos o tamaños múltiples, sellos, ubicación libre u optimizador avanzado, y base/pared/filo independientes.

## Desarrollo guiado por pruebas y regresiones

Se observaron ciclos ROJO/VERDE para el contrato V3, la promoción de sesión, la receta ausente y los controles de serie ausentes. Otros ciclos ROJO/VERDE: restricciones solo para cortadores que impiden editar puentes V3; error de parámetros que seguía visible después de corregir mediante el puerto de interfaz; imposibilidad de reparar una V3 demasiado grande después de reabrir y mensaje de plataforma oculto por un error genérico. Las aserciones de exportación exigen un botón real, no `every()` sobre una lista posiblemente vacía.

Cobertura adicional (no presentada como pruebas rojas previas a implementar): propiedad de recursos de clones, cancelación entre copias y liberación; verificación anticipada del presupuesto de triángulos con contador inyectado en el límite del validador. Esta última demuestra la protección, **no** el rendimiento de una geometría real con 500.000 triángulos.

Las imágenes de prueba antiguas que indicaban «versión futura 3» pasan a 4, manteniendo el rechazo estricto y la prioridad del diagnóstico de versión. Los cambios de tipado reflejan la nueva unión sin `any`. Un primer ejecutor de aplicación buscó Deshacer en Batch en vez de Parámetros; también falló una espera demasiado corta de importación dinámica. Estos intentos no se contabilizan como validaciones aprobadas; la prueba final sigue los controles reales con espera limitada.

## Calificación final después de la última corrección

Desde la raíz Git, directorio temporal aislado mediante `/workspace/.hermes-tools/workspace-tmp.py`, `GOMAXPROCS=2`, `UV_THREADPOOL_SIZE=2`, comprobaciones secuenciales:

| Comprobación | Resultado |
|---|---|
| Pruebas relacionadas y vecinas | 511/511, 29 archivos |
| Batería completa | 1.128/1.128, 84 archivos |
| `pnpm check` | salida 0, Svelte 0 errores / 0 advertencias, tsc correcto |
| `pnpm test:smoke --pool=threads --fileParallelism=false` | 4/4 |
| `pnpm benchmark --pool=threads --fileParallelism=false` | 2/2 |
| `pnpm build` | correcto |
| Presupuestos JS finales | 37 archivos; entrada 178.253 bytes, menor que 200 KiB; fragmento restante máximo 561.528 bytes, menor que 600 KiB; ninguna infracción |
| `git diff --check` | correcto |

Pruebas: `pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false`. No repetir `maxWorkers` en scripts de prueba funcional/benchmark que ya lo establecen. Artefactos en directorios temporales privados y únicos bajo el temporal del repositorio; se mantiene el comportamiento seguro del lote 6.

Registros: `/workspace/reports/multi-cutter-{targeted,full,check,smoke,benchmark,build}-qualified.log`. La primera ejecución agrupada superó 420 s: sus registros mostraron pruebas terminadas mientras tsc seguía activo. Después se confirmó `check` con salida real 0; las comprobaciones finales indicadas se repitieron tras corregir los problemas de navegador. No considerar exitoso el tiempo de espera agotado inicialmente.

## Prueba funcional real en navegador

Chromium existente, servidor de compilación localhost controlado por el ejecutor y contextos de almacenamiento nuevos. Sin inyección de almacenes, respuestas de red ni datos persistidos. Ejecutor fuera del repositorio: `/workspace/reports/cutter-series-smoke.mjs`. Informe final **PASS**: `/workspace/reports/cutter-series-browser-PjTE35/report.json`.

- Base real archivada desde el SHA de main verificado y recompilada en directorio temporal, luego comparada con la nueva distribución. Se leyeron por HTTP el HTML y todos los recursos de ambas compilaciones y se compararon con sus SHA-256: 54 recursos en la base y 56 en la nueva. Este recuento local no es una nueva verificación del despliegue histórico de Pages.
- V1 con pared personalizada de 1,4 mm: JSON y STL sin cambios ni ediciones entre main y la aplicación nueva. Una copia: 576 triángulos; tres: 1.728; dos: 1.152. Dimensiones STL coherentes con la etiqueta de vista previa redondeada a 0,1 mm, eje Z vertical y coordenadas finitas.
- Abrir Batch no modifica JSON. Se rechazan 25 copias y se conserva el documento; creación de 3 copias, 2 columnas y 5 mm. Deshacer/Rehacer exactos; STL idéntico después de Rehacer.
- Móvil 375 × 812: aplicación táctil de una serie de dos copias; guardado IndexedDB, recarga/reapertura, JSON y STL estrictamente idénticos; sigue visible el perfil Personalizado.
- Distribución 4 × 1 demasiado ancha: exportación bloqueada, JSON guardado y reabierto sin cambios. Sin malla después de recargar, exportación geométrica ausente y Batch accesible; reparación a 2 copias / 2 columnas, STL exacto y regreso al cortador único con STL original.
- V2 creada con el editor nativo de puentes y promovida a V3: fuente y puentes conservados, triángulos duplicados; perfil Fino aplicado realmente a la fuente de serie; extremo del puente movido con teclado, distribución conservada; guardado/recarga y JSON/STL exactos.
- Escritorio 1365 × 900 en claro/oscuro y móvil oscuro: campos/acciones de al menos 44 px, foco de teclado de 3 px, sin desbordamiento horizontal. Capturas de controles centrados, comprobaciones DOM de visibilidad y ausencia de obstrucciones, luego inspección visual. El título o el final del texto pueden quedar fuera de pantalla por el desplazamiento normal del panel móvil; los controles seleccionados sí están visibles, sin afirmar que se capturó todo el panel.
- Cero errores de página/consola y cero solicitudes fallidas. Las 225 huellas de `src/`, HEAD, rama y estado permanecieron idénticas antes y después; las huellas también se mantuvieron después de la batería final. Navegador y servidores detenidos; el ejecutor comprobó que los puertos 4354/4355 estaban cerrados.

La primera ejecución de navegador `/workspace/reports/cutter-series-browser-ZMfVGW/` fue **FAIL**: reveló la imposibilidad de reparar una serie demasiado grande tras reabrir. Se transformaron los defectos en pruebas ROJO/VERDE, se corrigieron y se completó la calificación final anterior. No utilizar esa primera captura como validación del código final.

## Límites

Solo Chromium, tacto emulado; sin Safari/Firefox, teléfono físico, lector de pantalla, laminador, impresión ni pruebas mecánicas o alimentarias. Conjunto de navegador: círculo SVG y SVG con un puente sencillo; estados intermedios, cancelación y documentos malformados cubiertos por pruebas, pero no reproducidos íntegramente en navegador. No hubo nuevo flujo raster/foto ni benchmark de rendimiento de series máximas. Las pruebas funcionales y benchmarks históricos califican sus respectivos procesos, no prometen velocidad para 24 copias. V3 rechaza exportar un cortador incompleto, pero permite recuperar el documento. El Batch libre anterior sigue fuera de la persistencia canónica. La integración continua y CodeQL no se habían ejecutado en el momento de esta calificación local; su ejecución sobre el SHA publicado estaba autorizada y seguía siendo requisito para fusionar. Los controles remotos no eliminan las limitaciones de la prueba funcional descrita.

> **Nota CookieForge:** resultados, autorizaciones y rutas de esta validación pertenecen al proyecto original. La traducción no constituye una nueva ejecución de pruebas.
