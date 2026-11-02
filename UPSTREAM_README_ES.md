# Cookie Cutter Designer — README original traducido al español

> Traducción íntegra del README histórico del proyecto original. Se conserva [UPSTREAM_README.md](UPSTREAM_README.md) sin modificaciones. Las referencias a funcionalidades, validaciones y despliegues describen el proyecto de origen; no constituyen una nueva certificación de CookieForge.

[![Despliegue en GitHub Pages](https://github.com/razorglyon/cookie-cutter-designer/actions/workflows/deploy.yml/badge.svg)](https://github.com/razorglyon/cookie-cutter-designer/actions/workflows/deploy.yml)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Creado con Svelte](https://img.shields.io/badge/Made%20with-Svelte-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Aplicación web que convierte ilustraciones SVG, PNG y JPG en cortantes de galletitas con dimensiones definidas y sellos conectados, preparados para impresión 3D.

**[Demostración en línea del proyecto original](https://razorglyon.github.io/cookie-cutter-designer/)**

## ¿Qué significa aquí «listo para imprimir»?

El proceso de producción hace más que mostrar una vista previa convincente en Three.js:

- las dimensiones se expresan y miden en milímetros;
- las paredes y los agarres de los cortantes se generan como geometrías cerradas;
- el relieve, la base y el agarre de los sellos se unen en un único sólido conectado;
- los buffers finales de triángulos se comprueban para detectar coordenadas no finitas, triángulos degenerados, aristas abiertas o no manifold, componentes conectados, orientación de caras adyacentes y volumen con signo;
- se bloquean las exportaciones cuando estas comprobaciones fallan;
- las exportaciones para fabricación se transforman del eje Y vertical de Three.js al eje Z vertical habitual en laminadores, y se apoyan en `Z = 0`.

El validador **no** afirma detectar todas las autointersecciones entre triángulos. Revisá siempre el modelo exportado en tu laminador antes de imprimir.

## Archivos de entrada

| Formato | Procesamiento |
|---|---|
| SVG | Se interpreta como contornos vectoriales |
| PNG | Se decodifica mediante Canvas y se vectoriza en un Web Worker |
| JPG/JPEG | Se decodifica mediante Canvas y se vectoriza en un Web Worker |

Límites de carga:

- tamaño máximo de archivo: 10 MB;
- lado máximo de imagen raster: 8192 px;
- superficie raster máxima: 16 megapíxeles.

En Cargar y Creación avanzada existen dos recorridos explícitos para imágenes raster:

- **Dibujo contrastado** (`Dessin contrasté` en la interfaz histórica) mantiene la configuración de vectorización anterior.
- **Foto — preparación guiada** (`Photo — préparation guidée`) abre una revisión del original y del contorno con recorte normalizado, umbral automático o manual y primer plano oscuro/claro. No aplica desenfoque, eliminación implícita de componentes ni relleno oculto de huecos. El filtrado de ruido y el relleno de huecos de la silueta exterior son controles explícitos; los diagnósticos informan sus efectos. No se pueden aplicar contornos vacíos, recortados, desconectados, ambiguos o excesivamente complejos. Cambiar la configuración invalida el resultado hasta recalcularlo. **Aplicar** es una confirmación independiente y explícita: seleccionar un ajuste predefinido o preparar/cancelar una foto nunca reemplaza el proyecto.

La preparación fotográfica comprueba el contorno, no el modelo mecánico final: la generación sigue aplicando todas las protecciones de geometría imprimible y bloquea exportaciones inválidas. Es segmentación guiada por umbral, no reconocimiento general de objetos; conviene elegir un sujeto bien diferenciado del fondo y ajustar recorte/contraste cuando haga falta.

Revectorizar utiliza el raster original que todavía se conserva en la sesión y modifica únicamente el boceto; fuente, identidad y parámetros permanecen iguales. Deshacer restaura las correcciones reemplazadas. V1 no guarda píxeles raster ni ajustes fotográficos: después de reabrir, hay que volver a importar la imagen original. Calificación y límites: `docs/PHOTO_IMPORT_VALIDATION.md`. Las mediciones de ajustes experimentales anteriores permanecen como antecedentes en `docs/TRACING_PRESETS_VALIDATION.md`.

La decodificación de dibujos contrastados utiliza Canvas del navegador y transfiere los píxeles al Worker de vectorización histórico. La decodificación, segmentación y vectorización ImageTracer de fotos se ejecutan en un Worker dedicado mediante `createImageBitmap`/`OffscreenCanvas`, con un límite de 1024 píxeles por lado y un megapíxel después del recorte. Cancelar termina el Worker de esa solicitud; los resultados tardíos, tiempos agotados y errores nunca publican un proyecto. No se utiliza ningún servidor ni servicio externo de imágenes.

## Modos de diseño

### Cortante

- dimensión física objetivo: ancho, alto o lado mayor;
- objetivo predeterminado: 75 mm;
- espesor de pared, altura de corte, altura total, ángulo de salida y agarre configurables;
- **Perfiles de pared:** en Parámetros → Cortante, elegir **Fino** (`Fin`: pared de 0,8 mm / salida de 5°), **Estándar** (`Standard`: 1,0 mm / 7°) o **Robusto** (`Robuste`: 1,5 mm / 10°). Una selección modifica solo esos dos parámetros existentes; se conservan tamaño, alturas, agarre, boceto y puentes manuales. Todos los valores siguen siendo editables. La etiqueta activa se deduce del espesor y ángulo actuales o aparece como **Personalizado** (`Personnalisé`) cuando no coinciden; el nombre del perfil no se guarda en el proyecto. Vista previa, exportaciones, guardados locales y `.ccd.json` utilizan los mismos valores del documento. Los proyectos V1 existentes siguen siendo V1 y los que tienen puentes siguen siendo V2.
- el visor muestra las dimensiones finales medidas `ancho × profundidad × altura`;
- **Puentes manuales entre islas:** en Creación avanzada, abrir el editor de puentes, elegir un ancho (0,8–10 mm) y hacer clic cerca de dos contornos distintos. Los extremos se ajustan al eje central de los contornos. Se puede arrastrar un extremo (o usar las flechas), eliminar un puente y utilizar los botones compartidos Deshacer/Rehacer. Antes de aceptar una disposición completa se comprueba la geometría imprimible del cortante; se rechazan resultados con cruces, superposiciones, desconexiones o superficies no herméticas. Si quedan islas por conectar, cada puente individualmente válido se guarda como borrador incompleto; la exportación STL permanece deshabilitada hasta conectar la última isla. Los proyectos Cortante existentes permanecen en V1 hasta que la primera edición de puentes promueve el documento a V2. Guardar, exportar como `.ccd.json` y reabrir conserva incluso los puentes incompletos. Eliminar un puente puede volver a dejar incompleto el cortante; Deshacer lo restaura.

Estos perfiles de pared son configuraciones iniciales, no una nueva geometría independiente de base/pared/filo, una clasificación de resistencia mecánica ni una certificación de seguridad alimentaria. La idoneidad de impresión y materiales debe evaluarse por separado. Consultar la [validación de perfiles de pared](docs/WALL_PROFILES_VALIDATION.md) para el alcance probado y sus limitaciones.

El editor superpone los contornos muestreados sobre el SVG original atenuado. No planifica puentes automáticamente: hay que elegir puentes para cada isla desconectada y verificar el modelo resultante en un laminador antes de imprimir. Si una edición posterior del boceto invalida varios puentes guardados, **Eliminar todos los puentes** (`Supprimer tous les ponts`) permite quitarlos mediante una única acción reversible y evita que el proyecto quede bloqueado.

### Sello

- relieve, base común obligatoria y agarre opcional forman un único sólido unido mediante operaciones booleanas JSCAD;
- las islas desconectadas de la ilustración permanecen unidas a través de la base;
- se conservan los huecos del SVG;
- el resultado debe superar el mismo validador de geometría imprimible que un cortante.

## Exportaciones

| Formato | Garantía |
|---|---|
| STL binario | Se comprueban cantidad de triángulos y tamaño exacto de datos; coordenadas finitas con Z vertical |
| OBJ | Modelo validado exportado en coordenadas de fabricación con Z vertical |
| 3MF | Paquete ZIP/OPC real con unidades en milímetros, relaciones, recursos del modelo y elementos de construcción |

Un paquete 3MF contiene como mínimo:

```text
[Content_Types].xml
_rels/.rels
3D/3dmodel.model
```

STL no almacena una declaración de unidades. Esta aplicación genera coordenadas STL en milímetros; si el laminador pregunta, seleccionar milímetros al importar.

### G-code

Cookie Cutter Designer no genera G-code. Este depende de la impresora, boquilla, material, temperaturas, velocidades y firmware. Hay que exportar STL o 3MF y luego laminarlo con OrcaSlicer, PrusaSlicer, Bambu Studio, Cura u otro laminador consolidado.

## Vista previa de intersección por capas

El panel de capas intersecta los triángulos del modelo real con planos horizontales y muestra contornos X/Z cerrados a la altura seleccionada.

Es una herramienta de inspección geométrica, **no un laminador**. No calcula perímetros, relleno, soportes, extrusión, movimientos de desplazamiento ni tiempo de impresión.

## Generación por lotes atómica

El modo por lotes:

- genera y mide cada elemento antes de publicar el resultado;
- distribuye las huellas medidas sobre la plataforma de impresión solicitada;
- informa qué elemento falló y por qué;
- permite cancelar y muestra el progreso;
- libera todos los modelos parciales si falla la generación o la distribución;
- nunca devuelve silenciosamente un lote incompleto.

## Primeros pasos

### Requisitos previos

- Node.js 22.12 o posterior;
- pnpm 10.

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

El servidor de desarrollo normalmente se abre en `http://localhost:5173/`.

### Vista previa móvil privada mediante Tailscale

El repositorio incluye un lanzador en primer plano para una vista previa accesible solo desde la red privada Tailscale:

```bash
./scripts/start-private-preview.sh
```

Cuando hace falta, inicia Tailscale en modo de espacio de usuario, lanza la vista previa de producción en loopback y la publica mediante `tailscale serve`. El estado de autenticación permanece fuera del repositorio, en `/root/.tailscale`; no se escribe ningún token ni credencial en Git.

La URL solo es accesible desde dispositivos conectados a la misma red Tailscale. Hay que mantener ejecutándose el lanzador mientras se necesite la vista previa; detenerlo deshabilita el proxy HTTPS y la vista previa local.

### Validación de producción

```bash
pnpm run check
pnpm run test:run -- --maxWorkers=1
pnpm run build
pnpm audit --audit-level=moderate
```

Prueba funcional específica de exportación:

```bash
pnpm run test:smoke
# Usar el directorio privado exacto indicado como "Export smoke artifacts".
SMOKE_DIR="/absolute/path/from/test/output"
unzip -t "$SMOKE_DIR/cookie-cutter.3mf"
unzip -Z1 "$SMOKE_DIR/cookie-cutter.3mf"
```

Prueba de rendimiento del proceso:

```bash
pnpm run benchmark
```

Cada ejecución de pruebas funcionales o rendimiento crea un directorio privado único mediante `mkdtemp` dentro del directorio temporal del sistema operativo (respetando `TMPDIR` si está definido). Los artefactos se conservan para inspección y las pruebas imprimen sus rutas exactas. La prueba de rendimiento escribe `report.json` en su directorio privado. Las rutas cambian entre ejecuciones; no se elimina ni reutiliza ningún directorio compartido. Los tiempos son indicadores locales de regresión, no estimaciones de tiempo de impresión.

## Uso

1. Cargar una ilustración SVG, PNG o JPG, o seleccionar una forma de la biblioteca.
2. Elegir Cortante o Sello.
3. Definir la dimensión final en milímetros y seleccionar ancho, alto o lado mayor.
4. Revisar las dimensiones medidas y el resultado de imprimibilidad.
5. Opcionalmente, inspeccionar las intersecciones reales por capas.
6. Exportar STL binario, OBJ o 3MF.
7. Abrir la exportación en un laminador, confirmar dimensiones en milímetros y orientación, elegir un perfil de impresora y generar allí el G-code.

## Conjunto de pruebas

Los casos de regresión incluyen:

- rectángulos, círculos, concavidades, huecos y múltiples contornos;
- islas de relieve desconectadas en sellos;
- trazados abiertos, degenerados y autointersecados;
- detalles menores que la resolución que alteran la topología durante los desplazamientos de contorno;
- relaciones de aspecto extremas;
- datos raster ruidosos deterministas;
- parámetros no finitos, componentes flotantes, triángulos invertidos y geometría degenerada en Float32.

Las ilustraciones no admitidas o inseguras se rechazan en lugar de repararlas silenciosamente para producir un modelo sin verificar.

## Límites prácticos actuales

- no existe una prueba completa de autointersección entre triángulos;
- no hay un editor completo de nodos SVG; el taller de bocetos permite ediciones de puntos limitadas y el editor independiente de puentes solo conecta contornos existentes;
- los detalles muy pequeños pueden desaparecer o cambiar de topología durante el desplazamiento de paredes, por lo que se rechazan;
- la vista previa por capas no es un motor de laminado;
- el G-code debe generarse externamente;
- las pruebas automáticas validan estructuralmente los archivos, pero sigue recomendándose importarlos manualmente en el laminador de destino.

## Tecnología

- Svelte 5 y TypeScript estricto;
- Vite 7;
- Three.js;
- js-angusj-clipper para desplazamientos de polígonos;
- JSCAD para sólidos booleanos de sellos;
- ImageTracer en un Web Worker;
- fflate para empaquetado ZIP/OPC de 3MF;
- Vitest y happy-dom.

Las funciones opcionales exigentes se importan dinámicamente. Vite impone un presupuesto de 200 KiB para el fragmento JavaScript de entrada y 600 KiB para los fragmentos asíncronos.

## Funciones opcionales de Gemini

La generación de imágenes y las sugerencias mediante Gemini requieren la clave API propia del usuario. La integración actual llama a Gemini desde el navegador. Para un servicio público de producción, utilizar un proxy de backend y restringir la clave en el proveedor.

Consultar [configuración de Gemini](GEMINI_API_SETUP.md) y [documentación técnica](GEMINI_API_TECHNICAL.md).

Nunca incorporar claves API ni secretos de entorno al repositorio.

## Licencia

MIT. Consultar el archivo de licencia del repositorio.
