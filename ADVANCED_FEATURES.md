# Funciones avanzadas — Cookie Cutter Designer

> Documento histórico del proyecto de origen. Las marcas de «implementado», los datos de compatibilidad y los pasos pendientes reflejan el momento en que se redactó; no sustituyen una auditoría actual de CookieForge.

## Nuevas funciones implementadas

### 1. Clipper.js — Operaciones precisas sobre trazados ✅

**Archivo:** `src/lib/utils/pathOperations.ts`

**Funciones:**
- ✅ **Desplazamiento de trazados:** creación de paredes con espesor preciso.
- ✅ **Unión booleana:** combinación de varias formas.
- ✅ **Diferencia booleana:** sustracción de una forma de otra.
- ✅ **Intersección booleana:** conservación exclusiva de zonas superpuestas.
- ✅ **Simplificación de trazados:** eliminación de puntos redundantes.
- ✅ **Creación de paredes:** generación automática de paredes interiores y exteriores.

**Ejemplo de uso:**
```typescript
import { offsetPath, unionPaths, createCutterWalls } from './lib/utils/pathOperations';

// Crear un desplazamiento de contorno
const offsetted = await offsetPath(points, 2.5, 'round');

// Crear las paredes de un cortante
const { outer, inner } = await createCutterWalls(points, 1.0);
```

**Ventajas:**
- Control preciso en milímetros.
- Conservación del espesor de las paredes.
- Mayor facilidad para realizar operaciones complejas.
- Rendimiento optimizado mediante WebAssembly.

---

### 2. Web Workers para procesamiento asíncrono ✅

**Archivos:**
- `src/workers/imageProcessor.worker.ts`
- `src/lib/utils/workerManager.ts`

**Funciones:**
- ✅ Vectorización de imágenes en un hilo de ejecución independiente.
- ✅ Interfaz sin congelamientos durante el procesamiento.
- ✅ Gestión automática de los workers.
- ✅ Compatibilidad con mensajes de error.

**Ejemplo de uso:**
```typescript
import { vectorizeImageInWorker } from './lib/utils/workerManager';

const svgString = await vectorizeImageInWorker(imageData, options);
```

**Ventajas:**
- Interfaz fluida durante el procesamiento.
- Mejor experiencia de uso.
- Posibilidad de trabajar con imágenes de alta resolución.
- Sin bloquear el hilo principal.

---

### 3. Interfaz de operaciones booleanas ✅

**Archivo:** `src/lib/components/ui/BooleanOperations.svelte`

**Funciones:**
- ✅ Interfaz gráfica para operaciones booleanas.
- ✅ Unión, sustracción e intersección.
- ✅ Carga de formas secundarias.
- ✅ Visualización de las operaciones.

**Interfaz:**
- Botones con íconos para cada operación.
- Vista previa del efecto.
- Carga de un archivo SVG secundario.

---

### 4. Texto personalizado en relieve ✅

**Archivo:** `src/lib/components/ui/TextEmbosser.svelte`

**Funciones:**
- ✅ Incorporación de texto personalizado.
- ✅ Selección entre nueve tipografías.
- ✅ Tamaño de letra ajustable (6–30 mm).
- ✅ Profundidad de relieve ajustable (0,5–5 mm).
- ✅ Opción de espejado para sellos.
- ✅ Vista previa en tiempo real.
- ✅ Límite de 50 caracteres.

**Tipografías disponibles:**
- Arial
- Arial Black
- Comic Sans MS
- Courier New
- Georgia
- Impact
- Times New Roman
- Trebuchet MS
- Verdana

**Uso:**
1. Ingresar el texto.
2. Elegir la tipografía.
3. Ajustar el tamaño y la profundidad.
4. Activar el espejado si corresponde.
5. Presionar «Agregar texto al diseño» (en el original, `Add Text to Design`).

---

### 5. Gestión de proyectos (importación y exportación) ✅

**Archivos:**
- `src/lib/types/Project.ts`
- `src/lib/utils/projectManager.ts`
- `src/lib/components/ui/ProjectManager.svelte`

**Funciones:**
- ✅ **Exportación de proyectos** en formato `.ccd.json`.
- ✅ **Importación de proyectos** desde archivos.
- ✅ **Guardado local** en `localStorage`.
- ✅ **Metadatos:** nombre, fechas y archivo original.
- ✅ **Miniaturas:** vista previa del diseño.
- ✅ **Versionado:** compatibilidad entre versiones.

**Formato del proyecto:**
```json
{
  "version": "1.0.0",
  "name": "My Cookie Cutter",
  "createdAt": "2025-11-15T12:00:00Z",
  "modifiedAt": "2025-11-15T13:30:00Z",
  "svgData": "<svg>...</svg>",
  "parameters": { ... },
  "thumbnail": "data:image/png;base64,...",
  "metadata": {
    "originalFileName": "star.svg",
    "fileType": "svg"
  }
}
```

> Este bloque representa la estructura ilustrativa del original: los puntos suspensivos no constituyen JSON válido.

---

### 6. Galería de diseños ✅

**Archivo:** `src/lib/components/ui/DesignGallery.svelte`

**Funciones:**
- ✅ **Vista en cuadrícula** de todos los diseños guardados.
- ✅ **Miniaturas** para reconocerlos rápidamente.
- ✅ **Ordenamiento por fecha** de modificación.
- ✅ **Carga rápida** de un diseño.
- ✅ **Eliminación** con confirmación.
- ✅ **Ventana a pantalla completa** adaptable.
- ✅ **Estado vacío** cuando todavía no hay diseños.

**Interfaz:**
- Botón para mostrar u ocultar la galería, con contador de diseños.
- Cuadrícula adaptable (`auto-fill`).
- Efectos al pasar el cursor para indicar interactividad.
- Botón de eliminación discreto.
- Información de nombre, fecha y archivo fuente.

---

### 7. Extracción y manipulación de trazados SVG ✅

**Archivo:** `src/lib/utils/svgPathExtractor.ts`

**Funciones:**
- ✅ **Extracción de puntos** desde SVG.
- ✅ **Conversión de trazados a SVG**.
- ✅ **Cálculo de la caja delimitadora** (`bounding box`).
- ✅ **Centrado automático** de trazados.
- ✅ **Cambio de escala** de trazados.
- ✅ **Traslación** de trazados.

**Ejemplo de uso:**
```typescript
import { extractPathsFromSVG, centerPaths, scalePaths } from './lib/utils/svgPathExtractor';

// Extraer los trazados
const paths = extractPathsFromSVG(svgString);

// Centrar
const centered = centerPaths(paths);

// Cambiar la escala
const scaled = scalePaths(paths, 2.0);
```

---

## Arquitectura de las nuevas funciones

```text
src/
├── lib/
│   ├── components/
│   │   └── ui/
│   │       ├── BooleanOperations.svelte      ✅ Operaciones booleanas
│   │       ├── TextEmbosser.svelte            ✅ Texto en relieve
│   │       ├── ProjectManager.svelte          ✅ Importación/exportación
│   │       └── DesignGallery.svelte           ✅ Galería de diseños
│   ├── types/
│   │   └── Project.ts                         ✅ Tipos de proyectos
│   └── utils/
│       ├── pathOperations.ts                  ✅ Clipper.js
│       ├── workerManager.ts                   ✅ Web Workers
│       ├── svgPathExtractor.ts                ✅ Manipulación SVG
│       └── projectManager.ts                  ✅ Gestión de proyectos
└── workers/
    └── imageProcessor.worker.ts               ✅ Worker de vectorización
```

---

## Próximos pasos (pendientes en el documento original)

### Funciones restantes

1. **Editor de trazados vectoriales** 🔄
   - Manipulación de nodos.
   - Incorporación y eliminación de puntos.
   - Curvas de Bézier.
   - Transformación manual.

2. **Compatibilidad con varias capas** 🔄
   - Modo cortante y sello.
   - Superposición de capas.
   - Exportación separada o combinada.
   - Visualización por capa.

3. **Almacenamiento en la nube** 🔄
   - Autenticación de usuarios.
   - Sincronización entre dispositivos.
   - Uso compartido de diseños.
   - Guardado automático.

4. **Opciones avanzadas de relieve** 🔄
   - Variaciones de profundidad.
   - Gradientes de altura.
   - Texturas personalizadas.
   - Importación de imágenes para relieve.

---

## Integración en la aplicación

Para habilitar estas funciones desde la interfaz principal, el documento original proponía:

1. **Importar los componentes** en `App.svelte`.
2. **Agregar los controladores de eventos** para las interacciones.
3. **Integrarlos en el panel izquierdo** o en pestañas.
4. **Conectarlos con el proceso 3D** existente.

### Ejemplo de integración

```svelte
<script>
  import TextEmbosser from './lib/components/ui/TextEmbosser.svelte';
  import ProjectManager from './lib/components/ui/ProjectManager.svelte';
  import DesignGallery from './lib/components/ui/DesignGallery.svelte';
  import BooleanOperations from './lib/components/ui/BooleanOperations.svelte';

  // Controladores
  function handleAddText(event) {
    const { text, font, size, depth, mirror } = event.detail;
    // Generar el SVG del texto y agregarlo al diseño
  }

  function handleExportProject() {
    exportProject(projectName, svgCache, $params, thumbnail);
  }
</script>

<!-- En el panel izquierdo -->
<DesignGallery on:load={handleLoadProject} />
<ProjectManager on:export={handleExportProject} on:import={handleImportProject} />
<TextEmbosser on:addText={handleAddText} />
<BooleanOperations on:operation={handleBooleanOp} />
```

---

## Rendimiento y optimizaciones

### Clipper.js
- ✅ WebAssembly para mejorar el rendimiento.
- ✅ Escala de precisión ajustable.
- ✅ Liberación automática de memoria.
- ✅ Compatibilidad con trazados complejos.

### Web Workers
- ✅ Procesamiento sin bloqueo de la interfaz.
- ✅ Gestión automática del ciclo de vida.
- ✅ Mensajes tipados para mayor seguridad.
- ✅ Gestión robusta de errores.

### localStorage
- ✅ Guardado inmediato.
- ✅ Capacidad para varios MB (sujeta a las cuotas reales del navegador).
- ✅ Persistencia entre sesiones.
- ✅ Posibilidad de migración a la nube.

---

## Pruebas recomendadas

1. **Clipper.js:**
   - Probar desplazamientos con distintos espesores.
   - Probar operaciones booleanas sobre formas complejas.
   - Comprobar la precisión de las paredes.

2. **Web Workers:**
   - Vectorizar imágenes grandes (más de 5 MB).
   - Verificar que la interfaz no se congele.
   - Probar la gestión de errores.

3. **Importación/exportación:**
   - Guardar y cargar proyectos.
   - Comprobar la integridad de los datos.
   - Probar la compatibilidad entre versiones.

4. **Galería:**
   - Cargar muchos diseños (más de 20).
   - Evaluar el rendimiento del desplazamiento.
   - Probar eliminación múltiple.

---

## Notas técnicas

### Dependencias agregadas
- `js-angusj-clipper`: operaciones sobre trazados.
- Web Workers: funcionalidad nativa, sin dependencia adicional.

### Compatibilidad con navegadores (afirmaciones históricas)
- Chrome/Edge: ✅ completa, según el documento original.
- Firefox: ✅ completa, según el documento original.
- Safari: ✅ completa (iOS 15+), según el documento original.
- Web Workers: ✅ navegadores modernos, según el documento original.

Estas afirmaciones no sustituyen las pruebas posteriores que documentaron limitaciones de Firefox y WebKit.

### Tamaño del paquete (estimaciones históricas)
- Clipper.js: aproximadamente 100 KB (WebAssembly).
- Workers: aproximadamente 5 KB.
- Total agregado: aproximadamente 105 KB.

---

## Documentación para usuarios

Texto que el documento original proponía agregar al README:

### Funciones avanzadas

**Operaciones booleanas:** combinar varias formas para crear diseños complejos.

**Texto en relieve:** agregar texto personalizado a los cortantes, con tipografía y profundidad configurables.

**Gestión de proyectos:** guardar diseños en la biblioteca o exportarlos para compartir.

**Biblioteca de diseños:** acceder rápidamente a los diseños guardados mediante vistas previas.

---

Hecho con ❤️ usando Clipper.js, Web Workers y tecnologías web modernas.
