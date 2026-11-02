# Invariantes del proyecto Cookie Cutter Designer

Referencia técnica duradera complementaria a `AGENT_CONTEXT.md`. Los resultados fechados de cada entrega permanecen en los documentos de validación y en Git. Las notas históricas completas se conservan en el commit original `5c74083baec230788468fa70c9bada5c1caecda3` y su fusión. Este archivo registra las decisiones útiles para continuar, no los estados antiguos.

> **Contexto CookieForge:** las referencias a infraestructura, cuentas y autorizaciones del proyecto original son históricas. No sustituyen las reglas ni los permisos actuales de CookieForge.

## Documento, edición y recursos

- Documento canónico V1: fuente SVG original separada del boceto; se conservan identidad, nombre, parámetros y preferencias. El raster original no se persiste; deshacer no sobrevive a una recarga.
- Taller de Creación Avanzada: `SketchWorkspace.svelte` y `sketchCommands.ts` leen el boceto actual y lo modifican mediante `session.updateSketch`. Permiten mover con mouse, táctil, teclado o coordenadas; agregar, borrar y cerrar un contorno lineal único; reflejar horizontalmente y rotar 90° respecto del centro de `viewBox`. Se conservan M/L/C/Q/Z y sus controles sin convertirlos a polígonos. Las primitivas, transformaciones, estilos y órdenes no admitidos se conservan y se indican como de solo lectura. No incluye pincel, texto, capas, ajuste magnético, pluma completa ni una función específica para restaurar el original.
- El arrastre permanece local hasta soltar; se confirma un único cambio protegido por instantánea exacta y época. Escape, `pointercancel`, pérdida de foco o captura cancelan; navegar, reemplazar o cambiar el historial invalida el borrador. Se reutilizan historial y generación existentes; no se declara migrada ninguna otra herramienta heredada.
- Formato `.ccd.json` estricto, límite de 10 MiB; validar antes de reemplazar. Cancelar conserva el documento; vaciar las escrituras aceptadas antes de cerrar el almacenamiento.
- Recuperación de IndexedDB independiente, reanudación explícita; la biblioteca solo cambia por una acción explícita. Los borradores se separan por pestaña y época, sin colaboración implícita.
- Mantener las comprobaciones de ciclo de vida, fuente y época hasta publicar. Exportar geometría requiere coherencia entre malla, época, estado listo y documento; JSON es independiente. Se mantiene la propiedad y liberación de recursos Three.js. Batch externo no se puede guardar en V1.
- Extrusión gradual de raster: conservar el procedimiento heredado para igual cantidad de vértices; para cantidades distintas, usar fusión perimetral monótona sin remuestreo. Rechazar cambios en la cantidad de componentes; el taller no modifica los validadores ni los archivos de prueba históricos.
- Límites finales UTF-8 después de la precarga de Vite: 200 KiB para entrada y 600 KiB para fragmentos. Separar entorno de ejecución y complementos no garantiza reducir la transferencia total.

## Importación fotográfica

- `photoSettings.ts`: umbral `null` significa automático; polaridad oscura/clara; recorte normalizado; `minComponentArea` igual a 0 y `fillHoles` igual a `false` por defecto. No hay decisiones destructivas implícitas.
- `photoProcessing.ts`: segmentación por luminancia/alfa, diagnósticos y topología. Worker `photoProcessor.worker.ts`: decodificación, presupuestos, ImageTracer solo en negro y control de huecos. `photoImport.ts`: Worker propio por solicitud, tiempo máximo, cancelación y limpieza.
- La aplicación prepara un borrador protegido por documento, instantánea, época y `sourceRevision`; `PhotoImportReview` prepara sin modificar y aplica solo por confirmación explícita. Volver a trazar conserva fuente, ID, nombre y parámetros, y reutiliza el historial canónico. Raster y ajustes son temporales; no se crea un esquema V2.
- Archivos de prueba fotográficos atribuidos a coins/coffee/chelsea en `src/lib/import/__tests__/fixtures/photos/`. Se complementan pruebas deterministas de Node y decodificación real en Chromium; no se recurre a la nube.

## Perfiles de pared

- `domain/wallProfiles.ts` define Fino (0,8 mm / 5°), Estándar (1 mm / 7°) y Robusto (1,5 mm / 10°). `CutterSection.svelte` aplica únicamente `wallThickness` y `taperAngle` mediante una actualización atómica de la interfaz existente; el documento de sesión sigue siendo dueño de los datos. Se conservan tamaño, alturas, agarre, boceto/fuente y puentes. El perfil activo se calcula por igualdad exacta de ambos valores; si no coincide, es Personalizado. No se persisten identificadores de perfil ni se crean esquema, migración o proceso geométrico nuevos. Los controles mantienen límites y pasos, y muestran valores fraccionarios históricos sin redondeos engañosos.

## Serie de cortadores

- V3: una fuente única homogénea, parámetros comunes, puentes y disposición (`copies`, `columns`, `spacingMm`). No se serializa ninguna malla. V1/V2 no cambian fuera de la función de serie; una aplicación antigua rechaza V3 como versión futura.
- Volver a un cortador único sin pérdida: V2 si hay puentes, o V1 si no los hay. Tamaño, perfiles, agarres y puentes siguen perteneciendo a la fuente común.
- Entre 1 y 24 copias; entre 1 y tantas columnas como copias; separación de 0,5 a 40 mm; total máximo de 500.000 triángulos. La superficie ocupada se mide desde la geometría completa, incluido el agarre. El límite de triángulos no constituye una medición de rendimiento máximo.
- El cortador original debe estar completo y conectado. Cada copia posee sus propias geometrías y materiales; se libera el prototipo. Una cancelación o error no expone series parciales.
- Una disposición imposible puede guardarse y exportarse como JSON, pero no como geometría. Batch debe seguir accesible sin malla después de reabrir para poder repararlo; no corregir el documento implícitamente.
- Abrir o introducir datos en Batch no modifica el proyecto; Crear/Aplicar publica un cambio atómico en el historial. El Batch libre histórico no admite guardado.
- Fuera de alcance: pieza monobloque, conexiones entre copias, dibujos o tamaños diferentes, sellos, ubicación libre u optimización avanzada, y bases, paredes o filos independientes.

## Archivos temporales y ejecución

- Las pruebas funcionales y los benchmarks asignan cada uno un directorio privado único mediante `mkdtempSync(join(tmpdir(), prefix))`, respetando siempre TMPDIR. Se elimina el borrado o reutilización de la ruta compartida de pruebas funcionales; los artefactos se conservan para inspección y sus rutas exactas se publican por salida estándar. El README se adaptó a rutas no estables.
- En el entorno original, suministrar siempre el directorio temporal aislado de la raíz Git mediante `/workspace/.hermes-tools/workspace-tmp.py`. Si falla el auxiliar o devuelve una ruta vacía, bloquear el comando. Ejecutar las comprobaciones secuencialmente; las pruebas funcionales y benchmarks ya limitan `maxWorkers`.
- Antes de Chromium, verificar los recursos reales. El ejecutor controla su propio navegador y servidor local y los detiene en `finally`. Tras un tiempo de espera agotado, detener solo sus propios procesos secundarios y conservar los registros fallidos. Reanudar las comprobaciones faltantes sobre las mismas versiones, sin contabilizar una interrupción como éxito.
- Comparar por HTTP el artefacto demuestra qué versión se sirvió, no que se probó en teléfono, lector de pantalla, laminador o impresora. Las pruebas de navegador solo avalan los casos efectivamente ejecutados.

## Publicación

- **Procedimiento histórico del proyecto original:** cuenta `razorglyon` por comando, según `/workspace/AGENTS.md`; no ejecutar `gh auth switch/login` ni editar `hosts.yml`.
- Las autorizaciones originales eran independientes para commit, push, solicitud de incorporación, marcar lista, fusión y despliegue. Una autorización antigua no habilita una etapa nueva. No eludir protecciones, eliminar ramas ni publicar forzadamente sin permiso.
- Verificar protecciones, rama base, HEAD y comprobaciones del SHA exacto. Diferenciar el análisis CodeQL de un veredicto externo. Al fusionar mediante squash, exigir los workflows previstos por sus disparadores sin afirmar que las comprobaciones externas de una solicitud se ejecutaron nuevamente.
- Después de squash, comprobar la igualdad de árboles y preservar la rama anterior. Para el siguiente trabajo, crear una rama desde `origin/main` verificado; una diferencia de SHA no demuestra que falte entregar cambios.
- En Pages, verificar despliegue/SHA, paquete realmente cargado y todos sus archivos públicos. Un `.nojekyll` vacío puede faltar por metadatos de empaquetado, pero solo después de comprobarlo; no excluir genéricamente los archivos ocultos.
