# Documento de requisitos del producto (PRD) — Cookie Cutter Designer de nueva generación

**Estado histórico:** listo para dividir en tareas técnicas.  
**Destinatarios:** Codex, desarrolladores y revisores de producto.  
**Producto:** aplicación personal y local para diseñar herramientas alimentarias imprimibles en 3D.  
**Tecnologías obligatorias del proyecto original:** Svelte 5, TypeScript estricto, Three.js, Web Workers y pnpm.

**Restricción de alcance:** sin cuentas, suscripciones, pagos, muros de pago, backend funcional ni biblioteca en nube. Las funciones Premium de Cookiecad se consideran únicamente capacidades que podrían ofrecerse localmente.

> Documento histórico de requisitos: las funciones aquí descritas son **objetivos**, no una afirmación de que todas estén implementadas en CookieForge.

## 1. Resumen ejecutivo

Cookie Cutter Designer convierte una imagen, un dibujo o una forma en una o más herramientas imprimibles: cortante, sello, plantilla y variantes especializadas.

La refactorización debe evolucionar desde un modelo monolítico `cutter | stamp` hasta un sistema extensible de **documentos**, **recetas de generación** y **artefactos validados**, sin perder las comprobaciones de imprimibilidad existentes.

La propuesta diferencial es:

> Diseñar rápidamente una herramienta personalizada, conocer sus dimensiones y riesgos, y exportar un archivo realmente validado para fabricar, sin necesidad de crear una cuenta.

## 2. Problema

Quienes no dominan CAD quieren convertir imágenes en piezas imprimibles sin:

- redibujar toda la geometría;
- comprender operaciones booleanas;
- administrar ejes y unidades;
- descubrir después de imprimir que la malla está abierta o desconectada;
- utilizar varios programas para variantes frecuentes.

El repositorio analizado tenía geometría robusta, pero:

- su modelo de parámetros representaba solo Cortante y Sello;
- `App.svelte` coordinaba demasiadas responsabilidades;
- varios componentes avanzados no formaban flujos coherentes;
- no existía un archivo de proyecto portátil y versionado;
- no podían agregarse limpiamente modos especializados.

## 3. Objetivos

### 3.1 Objetivos de producto

- Reducir a menos de 30 segundos el tiempo desde importar una imagen sencilla hasta obtener una primera vista previa útil.
- Crear Cortante, Sello, Cortante con impresión interior, Cortante + Sello, Múltiples cortantes y Plantilla en la base P1.
- Mostrar dimensiones finales, validez y advertencias antes de exportar.
- Conservar una aplicación prioritariamente local, sin registro obligatorio.
- Permitir guardar y continuar proyectos.
- Lograr que toda función anunciada sea realmente ejecutable y esté probada.

### 3.2 Objetivos técnicos

- Reemplazar el modo binario por un registro extensible de recetas.
- Extraer de `App.svelte` la coordinación de generación.
- Mantener TypeScript estricto y validaciones actuales.
- Respetar los límites de tamaño JavaScript.
- Garantizar cancelación, rechazo de respuestas obsoletas y liberación de memoria.
- Versionar documentos y migraciones.

## 4. Fuera de alcance

- Generar G-code.
- Estimar de manera confiable el tiempo de impresión.
- Integrar un laminador.
- Cuentas, autenticación o sesiones de usuario.
- Suscripciones, pagos, pruebas comerciales, muros de pago o gestión de licencias.
- Backend de negocio, alojamiento de proyectos o biblioteca en nube.
- Mercado de modelos.
- Copiar la interfaz, el contenido o el código de Cookiecad.
- Reparar silenciosamente geometrías ambiguas.
- Prometer detección exhaustiva de autointersecciones sin implementar el algoritmo correspondiente.

## 5. Personas usuarias

### 5.1 Creador ocasional

- Tiene impresora 3D o utiliza un servicio de impresión.
- Parte de una imagen.
- Quiere obtener un STL rápidamente.
- Necesita valores recomendados y errores comprensibles.

### 5.2 Pastelero o artesano

- Prepara series regularmente.
- Necesita medidas y tolerancias precisas.
- Quiere Cortante + Sello, Múltiples cortantes, texto y perfiles predefinidos.
- Debe poder recuperar sus proyectos.

### 5.3 Usuario avanzado de fabricación

- Comprende parámetros geométricos.
- Quiere inspeccionar espesores, capas y topología.
- Exporta STL, OBJ y 3MF.
- Prefiere un formato portátil de proyectos.

## 6. Principios de experiencia de usuario

1. **Divulgación progresiva:** controles esenciales visibles y opciones avanzadas plegadas.
2. **Resultados medidos:** mostrar dimensiones del sólido final, no solamente valores solicitados.
3. **Errores accionables:** indicar problema, ubicación cuando sea posible y forma de corregirlo.
4. **Sin éxitos ficticios:** impedir exportaciones que no superen la validación obligatoria.
5. **Primero local:** el navegador funciona sin cuenta ni backend.
6. **Operaciones cancelables:** permitir reemplazar o cancelar tareas largas.
7. **Consulta móvil:** priorizar escritorio para edición compleja, pero permitir ajustes, visualización y exportación en móvil.

## 7. Modelo de dominio previsto

```ts
export type DesignKind =
  | 'cutter'
  | 'imprint-cutter'
  | 'stamp'
  | 'cutter-and-stamp'
  | 'multi-cutter'
  | 'cutter-set'
  | 'stencil'
  | 'sandwich-cutter'
  | 'cake-topper'
  | 'cake-pop-mold'
  | 'practice-cookie';

export interface DesignDocumentV1 {
  schemaVersion: 1;
  id: string;
  name: string;
  kind: DesignKind;
  source: DesignSource;
  sketch: SketchDocument;
  parameters: DesignParametersByKind[DesignKind];
  viewport: ViewportPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedArtifact {
  id: string;
  role: 'primary' | 'cutter' | 'stamp' | 'handle' | 'tray' | 'set-item';
  object: THREE.Object3D;
  dimensionsMm: { width: number; depth: number; height: number };
  validation: GeometryValidationReport;
}
```

Cada receta proporciona:

```ts
export interface GenerationRecipe<K extends DesignKind> {
  kind: K;
  defaults(): DesignParametersByKind[K];
  validate(params: DesignParametersByKind[K]): ParameterValidationResult;
  generate(input: GenerationInput<K>, signal: AbortSignal): Promise<GeneratedArtifact[]>;
}
```

## 8. Flujo principal

1. La persona inicia un proyecto vacío o un ejemplo.
2. Importa un archivo o elige una figura.
3. La aplicación limpia/vectoriza y muestra los contornos detectados.
4. Si hace falta, corrige el dibujo en el editor 2D.
5. Selecciona la receta de fabricación.
6. Los parámetros predeterminados producen un primer resultado.
7. Los cambios activan una generación agrupada temporalmente y cancelable.
8. La aplicación mide y valida cada artefacto.
9. El usuario inspecciona vista previa, mapa térmico o capas.
10. Guarda el proyecto o exporta uno o varios archivos.

## 9. Requisitos funcionales

### FR-001 — Creación del proyecto

- Crear desde cero, desde un ejemplo o desde un archivo.
- Pedir confirmación antes de sustituir un proyecto modificado.
- Asignar identificador local y nombre editable.

**Aceptación:** si hay un proyecto modificado y se solicita otro, el anterior permanece intacto hasta confirmar.

### FR-002 — Importación

Formatos P0/P1: SVG, PNG, JPG/JPEG y WebP.

- selección, arrastrar/soltar y pegar;
- límites explícitos de tamaño, dimensiones y píxeles;
- validación de MIME y extensión;
- saneamiento SVG sin scripts, eventos ni recursos remotos;
- vectorización raster en Worker;
- progreso, cancelación y errores estructurados.

**Aceptación:**
- Un archivo que supera los límites se rechaza antes de vectorizar.
- Dos importaciones rápidas no pueden publicar el resultado de la primera después de la segunda.
- Un SVG con scripts nunca los ejecuta.

### FR-003 — Documento de boceto 2D

- Contornos cerrados, huecos e islas.
- Pluma de segmentos rectos y curvas Bézier.
- Rectángulo, círculo/elipse, polígono regular y estrella.
- Seleccionar, mover, duplicar y eliminar.
- Editar puntos, convertir entre esquinas/curvas y manejar controles Bézier.
- Trasladar, girar, escalar, reflejar y conservar proporciones opcionalmente.
- Grilla configurable.
- Ajuste magnético activable a grilla, puntos, ejes y centros.
- Capas renombrables, visibles/ocultas, bloqueables y reordenables.
- Deshacer/Rehacer.
- Restaurar una copia del original.
- Operaciones booleanas explícitas.
- Detectar caminos abiertos y autointersecciones 2D.

**Aceptación:**
- Desactivar ajuste magnético permite coordenadas libres sin modificar puntos existentes.
- Una transformación numérica seguida de Deshacer restaura exactamente las coordenadas previas.
- Una capa bloqueada no admite modificaciones por gestos ni atajos.
- Convertir primitivas a trazados editables no introduce diferencias visuales perceptibles.

### FR-004 — Catálogo de recetas

- Mostrar recetas disponibles con descripción y nivel de madurez.
- Filtrar ajustes según receta.
- Bloquear combinaciones incompatibles.
- Requerir migración explícita al cambiar de receta.

Una receta sin pruebas y exportaciones verificadas nunca aparece como estable.

### FR-005 — Cortante

Parámetros obligatorios:

- tamaño objetivo y dimensión de referencia;
- espesor de pared;
- altura de corte y altura total;
- ángulo de salida;
- agarre, estilo y altura;
- base de impresión de referencia.

P1/P2: segundo filo, punta biselada, perfil para fondant, simetría y barras centrales.

El resultado es un sólido cerrado y conectado, excepto cuando se declara explícitamente un conjunto de varias piezas.

### FR-006 — Sello

- Relieve.
- Base común obligatoria.
- Agarre opcional.
- Conservación de huecos.
- Islas conectadas mediante la base.
- Relieve positivo o negativo.
- Altura del dorso y del relieve.

### FR-007 — Cortante con impresión interior

- Cortante exterior.
- Relieves interiores.
- Profundidad desde la punta del filo.
- Se permite profundidad cero para convertir detalle en corte.
- Perfil plano, biselado o redondeado.
- Base de relieves configurable.

### FR-008 — Cortante + sello

- Generar al menos dos artefactos: cortante y sello.
- Coordinar dimensiones.
- Holgura positiva configurable.
- Espejado correcto del sello.
- Validación independiente de ambas piezas.
- Exportación separada y 3MF agrupado.

### FR-009 — Múltiples cortantes

- Filas, columnas y distancias X/Y.
- Conexión estructural configurable.
- Distribución medida sobre la plataforma.
- Límites de unidades y triángulos.
- Generación atómica.

### FR-010 — Conjunto de cortantes

- Lista de tamaños.
- Proporciones conservadas.
- Nombres y orden deterministas.
- Exportación agrupada.
- Rechazo de tamaños no imprimibles.

### FR-011 — Plantilla (Stencil)

- Repetición rectangular o diagonal.
- Tamaño del motivo, grilla o medidas exteriores.
- Márgenes y espesor.
- Conservación opcional de detalles.
- Puentes que unen islas.
- Resultado de una sola envolvente salvo opción documentada.

### FR-012 — Cortante para sándwich

- Cortante exterior.
- Banda de sellado.
- Dientes con forma, tamaño, distancia y profundidad regulables.
- Sello complementario opcional.
- No admitir ángulos ni detalles menores que los umbrales configurados.

### FR-013 — Adorno para tortas

- Imagen, texto o ambos.
- Respaldo que une detalles.
- Base y relieve.
- Una o varias varillas.
- Texto en varias líneas.
- Validación de la unión entre respaldo y varillas.

### FR-014 — Molde para cake pops

Solo P3:

- Molde, empujador y posible bandeja.
- Holgura por pieza.
- Empujador de una o varias piezas.
- Distribución sin colisiones.
- Pruebas físicas obligatorias antes de declararlo estable.

### FR-015 — Texto

- Texto de pared, relieve y placa identificadora.
- Tipografías incluidas o importadas legalmente.
- Vista previa.
- Conservación del texto editable hasta terminar la conversión.
- Transformación determinista a trazados para generar y exportar.
- Respaldo rectangular o desplazado.
- Posición y extrusión.
- Detección de caracteres no admitidos.

### FR-016 — Perfiles predefinidos

- Perfiles del sistema inmutables.
- Perfiles locales del usuario.
- Crear, duplicar, renombrar y borrar.
- Versionar por receta.
- Migrar o rechazar explícitamente incompatibilidades.

### FR-017 — Historial

- Deshacer/Rehacer parámetros y boceto.
- Agrupar movimientos continuos.
- Historial acotado.
- Restaurar sin volver a generar resultados obsoletos.

### FR-018 — Vista previa 3D

- Órbita, desplazamiento, zoom y encuadre.
- Grilla y ejes opcionales.
- Dimensiones.
- Selección de artefactos.
- Materiales.
- Mapa térmico.
- Vista por capas identificada como «inspección, no laminado».
- Liberación de todos los recursos sustituidos.

### FR-019 — Validación

Comprobaciones obligatorias existentes que deben conservarse:

- Coordenadas finitas.
- Triángulos no degenerados.
- Aristas abiertas o no manifold.
- Componentes conectados.
- Orientación de caras contiguas.
- Volumen con signo.
- Dimensiones y posición de fabricación.

Cada informe incluye código, gravedad, mensaje para usuario y detalles técnicos.

### FR-020 — Exportación

- STL binario.
- OBJ.
- 3MF real.
- P2: PDF/SVG de contorno.
- Nombres deterministas.
- Eje Z vertical y `Z = 0`.
- Milímetros.
- Bloqueo de exportación ante error.
- Varias piezas agrupadas o separadas sin fusión accidental.
- STL individual por función (`cutter`, `stamp`, `handle`, `tray`).
- P2: captura PNG del visor sin modificar la escena.

### FR-021 — Proyecto portátil

- Guardado JSON versionado.
- Importación de proyectos.
- Fuente incluida opcionalmente.
- Sumas de comprobación de recursos.
- Migración de esquema.
- Nunca serializar objetos Three.js.

### FR-022 — Biblioteca local

- Proyectos recientes.
- Búsqueda y etiquetas.
- Duplicado.
- Exportación y eliminación.
- IndexedDB con cuotas y errores visibles.
- Sin sincronización en nube.
- Sin cuenta.
- Exportación JSON para guardar o transferir manualmente.

### FR-023 — Transferencia local de proyecto

P2:

- Exportar un archivo compartible.
- Importarlo en otro dispositivo.
- URL con datos serializados solo si se mantiene bajo un límite seguro.
- No enviar fuentes ni datos a servidores.
- Sin acortadores ni almacenamiento remoto.

### FR-024 — IA opcional

- Deshabilitada por defecto.
- Nunca guardar la clave en el proyecto.
- Advertir antes de enviar imágenes.
- En esta aplicación personal, una posible clave del usuario queda en almacenamiento local del navegador.
- No agregar backend para IA en el alcance original.
- El funcionamiento básico no depende de IA.

### FR-025 — PWA sin conexión

P2:

- Manifiesto instalable.
- Caché solo de recursos estáticos versionados.
- Inicio y acceso a proyectos locales sin red después de una primera visita exitosa.
- No almacenar opacamente llamadas de IA en caché.
- Aviso explícito cuando haya actualización.
- Estrategia que evite mezclar fragmentos de distintas versiones.

## 10. Estados y errores

Estados mínimos:

```ts
type PipelineStatus =
  | 'idle'
  | 'reading-source'
  | 'vectorizing'
  | 'generating'
  | 'validating'
  | 'ready'
  | 'cancelled'
  | 'error';
```

Un error nunca debe borrar el último resultado válido. La interfaz informa cuando los parámetros actuales todavía no produjeron un resultado exportable.

## 11. Requisitos no funcionales

### Rendimiento

- Fragmento inicial JavaScript: máximo 200 KiB según la regla existente de Vite (en el PRD original se lo describe como comprimido; comprobar el criterio real de medición).
- Fragmento asíncrono: máximo 600 KiB.
- Generación simple interactiva: objetivo menor que 500 ms en equipo de referencia.
- Operaciones mayores que 250 ms: indicador de actividad.
- Raster y tareas pesadas: Worker si es posible.
- No renderizar continuamente si la escena está inmóvil.
- Editor 2D interactivo sobre caso de 10.000 puntos; documentar equipo, protocolo y objetivo antes de exigir un límite de FPS.

### Confiabilidad

- Generación determinista con parámetros idénticos.
- Nunca publicar un resultado obsoleto.
- Reversión completa de lotes.
- Sin pérdidas de memoria de geometrías, materiales, texturas o Workers.

### Seguridad

- Saneamiento SVG estricto.
- No usar `{@html}` con fuentes no confiables.
- Límites de recursos antes de decodificar.
- Sin claves ni datos sensibles en URL, registros o proyecto.
- Política CSP adecuada a despliegue estático.
- Auditoría de dependencias.

### Privacidad

- Procesamiento local obligatorio excepto solicitudes de IA iniciadas explícitamente.
- Sin telemetría.
- Sin cuentas, identificadores de usuario ni almacenamiento remoto.
- Eliminación local real de proyectos.

### Accesibilidad

- Navegación mediante teclado.
- Foco visible.
- Etiquetas y unidades anunciadas.
- Objetivos táctiles de al menos 44 px.
- Errores con `role="alert"`.
- Mapa térmico acompañado de valores textuales.
- Contraste WCAG AA.

### Compatibilidad

- Versiones estables recientes de Chrome, Firefox, Safari y Edge.
- Escritorio completo.
- Móvil: importar, ajustar, previsualizar y exportar.
- Mensaje explícito si WebGL no está disponible.

## 12. Indicadores de éxito

- Porcentaje de importaciones que producen un primer modelo válido.
- Tiempo mediano desde importación hasta modelo.
- Tasa de exportaciones bloqueadas y categorías de error.
- Porcentaje de proyectos recuperados correctamente.
- Memoria después de 20 cambios de modelo.
- Regresiones del conjunto de pruebas.
- Éxito al importar archivos de proyecto anteriores.

No agregar telemetría sin una decisión de privacidad independiente.

## 13. Prioridades

### P0 — Refactorización

- Modelo de documento.
- Registro de recetas.
- Migración de Cortante/Sello.
- Orquestador.
- Validación y exportación sin cambios.
- Archivo de proyecto.
- Pruebas contra regresiones.

### P1 — Producto avanzado utilizable

- Cortante con impresión interior.
- Cortante + Sello.
- Múltiples cortantes.
- Plantillas.
- Editor 2D.
- WebP y pegado.
- Perfiles.
- Biblioteca local.

### P2 — Ampliaciones

- Perfiles de filo.
- Barras centrales.
- Texto y placas de identificación.
- Agarres.
- Cortante de sándwich.
- Adorno para tortas.
- PDF/SVG de contorno y archivo transferible.
- PWA sin conexión.
- Captura PNG del visor.

### P3 — Requieren pruebas físicas

- Molde de cake pops.
- Galletita de práctica.

Cuentas, suscripciones, pagos, restricciones comerciales y servicios en nube siguen fuera de alcance incluso después de P3.

## 14. Definición global de terminado

Una funcionalidad se considera terminada solo cuando:

- tiene tipos y esquemas estrictos;
- define valores predeterminados explícitos;
- rechaza parámetros inválidos;
- posee pruebas unitarias y de integración de éxito, límites y cancelación;
- el modelo final supera la validación;
- las exportaciones están comprobadas;
- se liberan los recursos;
- la interfaz es accesible y adaptable;
- la documentación de usuario está actualizada;
- no se introducen secretos ni servicios remotos implícitos.
