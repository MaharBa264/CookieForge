# CLAUDE.md

> Instrucciones para asistentes de programación que trabajan con el código de este repositorio. Traducción del documento original; algunas rutas y descripciones reflejan una arquitectura anterior y deben comprobarse contra el código actual antes de hacer cambios.

Este archivo orienta a Claude Code (`claude.ai/code`) al trabajar con el repositorio.

## Descripción del proyecto

Cookie Cutter Designer es una aplicación web para crear cortantes y sellos personalizados imprimibles en 3D a partir de imágenes vectoriales (SVG) o raster (PNG/JPG). Ofrece vista previa 3D en tiempo real, múltiples opciones de personalización y exportación STL.

## Comandos de desarrollo

### Gestor de paquetes

Este proyecto utiliza **pnpm**, no npm ni yarn.

### Comandos habituales

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo (http://localhost:5173/)
pnpm run dev

# Compilar para producción
pnpm run build

# Previsualizar la compilación de producción
pnpm run preview

# Comprobar tipos
pnpm run check
```

## Tecnologías

- **Interfaz:** Svelte 5 (runas y sintaxis reactiva moderna).
- **Lenguaje:** TypeScript (modo estricto).
- **Compilación:** Vite 7.
- **Visualización 3D:** Three.js (0.181.x).
- **Operaciones vectoriales:** js-angusj-clipper (Clipper.js WebAssembly).
- **Vectorización de imágenes:** imagetracer.
- **Operaciones geométricas:** @jscad/modeling, paper y tess2.

## Arquitectura

### Gestión del estado

La aplicación utiliza almacenes de Svelte para centralizar el estado:

- **`cookieCutterStore.ts`:** almacén principal que contiene:
  - `params`: parámetros reactivos del cortante.
  - `uploadedFile`: archivo cargado.
  - `pathData`: datos de trazados SVG extraídos.
  - `model`: modelo tridimensional generado.
  - `isProcessing`: estado de procesamiento.
  - `error`: mensajes de error.
  - `printability`: almacén derivado para validación en tiempo real.
- **`historyStore.ts`:** funciones Deshacer/Rehacer para la edición de trazados.

### Proceso principal

La aplicación sigue este flujo de datos:

1. **Carga de archivos → `FileUpload.svelte`**
   - Acepta SVG, PNG y JPG (máximo 10 MB).
   - Verifica tipo y tamaño.

2. **Procesamiento de imágenes → `imageProcessor.ts` y `imageProcessor.worker.ts`**
   - Las imágenes raster se vectorizan mediante Web Workers sin bloquear la interfaz.
   - Los archivos SVG se procesan directamente.

3. **Operaciones sobre trazados → `pathOperations.ts`**
   - Utiliza Clipper.js para desplazamientos de contorno y operaciones booleanas precisas.
   - Crea paredes interiores y exteriores con espesor definido.
   - Admite unión, diferencia e intersección.

4. **Generación 3D → `cookieCutterGenerator.ts`**
   - Convierte trazados 2D en mallas 3D mediante Three.js.
   - Aplica extrusión, ángulo de salida, agarres y relieve.
   - Incluye los modos `cutter` (cortante) y `stamp` (sello).

5. **Representación → `ThreeViewer.svelte`**
   - Vista previa WebGL en tiempo real con OrbitControls.
   - Centrado y posicionamiento automático de cámara.
   - Grilla e iluminación.

6. **Exportación → `stlExporter.ts`**
   - Exporta en formato STL binario.
   - Admite metadatos opcionales.

### Funciones avanzadas

#### Compatibilidad con varias capas
- **Tipos de capa:** Cutter, Stamp, Emboss (consultar `Layer.ts`).
- **`LayerManager.svelte`:** interfaz para gestionar varias capas.
- **`multiLayerGenerator.ts`:** combina capas en un STL único o en archivos separados.
- Cada capa posee profundidad, visibilidad y datos SVG independientes.

#### Operaciones booleanas
- **`BooleanOperations.svelte`:** interfaz para unir, sustraer e intersectar.
- **`booleanOperations.ts`:** implementa operaciones con Clipper.js.
- Permite cargar formas secundarias y combinarlas con el diseño principal.

#### Texto en relieve
- **`TextEmbosser.svelte`:** incorpora texto personalizado a los diseños.
- Incluye nueve tipografías (Arial, Impact, Times New Roman, etc.).
- Tamaño configurable de 6–30 mm y profundidad de 0,5–5 mm.
- Opción de espejado para sellos.

#### Gestión de proyectos
- **`Project.ts`:** definiciones de tipos del formato `.ccd.json`.
- **`projectManager.ts`:** importación/exportación mediante `localStorage`.
- **`ProjectManager.svelte` y `DesignGallery.svelte`:** interfaz para guardar y abrir diseños.
- Los proyectos incluyen metadatos, miniaturas y versión.

#### Edición de trazados
- **`PathEditor.svelte`:** lienzo interactivo para editar trazados vectoriales.
- **`bezierEditor.ts`:** utilidades para manipular curvas de Bézier.
- Tres modos: seleccionar, agregar y eliminar puntos.

#### Web Workers
- **`workerManager.ts`:** administra el ciclo de vida de los workers.
- **`imageProcessor.worker.ts`:** ejecuta vectorización sin bloquear la interfaz.
- Gestiona errores y libera recursos automáticamente.

## Patrones de diseño principales

### Runas de Svelte 5

El código utiliza la sintaxis de runas de Svelte 5:

- `$state()`: estado reactivo del componente.
- `$derived()`: valores calculados.
- `$effect()`: efectos secundarios.
- Los almacenes también utilizan `writable()` y `derived()` de `svelte/store`.

### Interfaces de TypeScript

Los parámetros y estructuras de datos tienen tipos explícitos:

- `CookieCutterParams`: opciones de personalización.
- `Point2D` y `Path2D`: primitivas geométricas 2D.
- `Layer` y `Project`: tipos para capas y proyectos.

Utilizá estos tipos al modificar funcionalidades.

### Precisión de los trazados

- **Importante:** usar Clipper.js (`pathOperations.ts`) para desplazamientos y operaciones booleanas.
- Las operaciones numéricas simples de JavaScript pueden resultar insuficientes para tolerancias de fabricación.
- Clipper.js utiliza escalado a enteros internamente para sus cálculos.

### Actualización del modelo 3D

Al modificar parámetros, el flujo descrito originalmente es:

1. Actualizar el almacén mediante `updateParam(key, value)`.
2. La reactividad del almacén activa la regeneración en `ThreeViewer.svelte`.
3. La malla nueva reemplaza la anterior en la escena Three.js.
4. No hace falta llamar manualmente a `requestAnimationFrame`.

**Atención:** antes de implementar cambios en CookieForge, comprobar la sesión canónica y el flujo actual; esta descripción proviene de una etapa anterior.

## Organización de archivos

```text
src/lib/
├── components/
│   ├── ui/              # Componentes de interfaz (23 en el inventario original)
│   │   ├── FileUpload.svelte
│   │   ├── ParameterPanel.svelte
│   │   ├── BooleanOperations.svelte
│   │   ├── TextEmbosser.svelte
│   │   ├── LayerManager.svelte
│   │   ├── PathEditor.svelte
│   │   ├── ProjectManager.svelte
│   │   ├── DesignGallery.svelte
│   │   └── ... (generadores de patrones, gestores de materiales, etc.)
│   └── viewer/
│       └── ThreeViewer.svelte
├── stores/              # Almacenes Svelte
│   ├── cookieCutterStore.ts
│   └── historyStore.ts
├── types/               # Definiciones de tipos TypeScript
│   ├── CookieCutter.ts
│   ├── Layer.ts
│   └── Project.ts
└── utils/               # Lógica de aplicación (28 archivos en el inventario)
    ├── cookieCutterGenerator.ts  # Generación 3D principal
    ├── pathOperations.ts         # Operaciones de Clipper.js
    ├── imageProcessor.ts         # Vectorización de imágenes
    ├── stlExporter.ts           # Exportación STL
    ├── multiLayerGenerator.ts   # STL con varias capas
    └── ... (utilidades especializadas)
```

## Restricciones importantes

### Requisitos de impresión 3D

Según el documento original, la aplicación aplicaba comprobaciones de imprimibilidad mediante `checkPrintability` en `cookieCutterStore.ts`:

- Espesor de pared: 0,8–2,0 mm (recomendado: 1,0 mm).
- Altura de corte: 8–25 mm (ideal: 10–15 mm).
- Ángulo de salida: 0–15° (recomendado: 5–10°).
- Orientación de impresión: modelo invertido, con el filo hacia arriba.

Al agregar parámetros, respetar las restricciones geométricas efectivamente vigentes y verificar el resultado en el laminador. Estos valores no garantizan resistencia mecánica ni aptitud alimentaria.

### Rendimiento
- Utilizar Web Workers para operaciones intensivas de CPU (más de 100 ms, como referencia).
- El costo de Clipper.js aumenta con la complejidad del trazado; considerar simplificación cuando haya demasiados puntos.
- Liberar las mallas Three.js sustituidas para evitar pérdidas de memoria.
- `localStorage` suele tener cuotas aproximadas de 5–10 MB; comprimir miniaturas si hace falta.

### Tratamiento SVG
- El documento original describe el uso de Three.js SVGLoader para interpretar SVG.
- Los trazados con muchos puntos pueden requerir simplificación mediante `pathOperations.ts`.
- Convertir los textos SVG en trazados antes de procesarlos cuando el flujo utilizado no admita texto.

## Pruebas recomendadas

Al realizar cambios:

1. Probar formas simples (`public/test-star.svg`).
2. Probar SVG complejos con muchos trazados y curvas.
3. Probar imágenes raster grandes (más de 5 MB).
4. Verificar los STL en un laminador como PrusaSlicer o Cura.
5. Comprobar que las advertencias de imprimibilidad se actualicen correctamente.
6. Probar guardado y recuperación de proyectos en almacenamiento local.

## Estilo de código

- Utilizar TypeScript en modo estricto; evitar `any` salvo al interoperar con bibliotecas sin tipos.
- Preferir `async/await` para el código asíncrono.
- Mantener la lógica de interfaz en los componentes y delegar la lógica de negocio en utilidades.
- Sustituir números mágicos por constantes o parámetros.
- Agregar comentarios JSDoc a las funciones exportadas.
