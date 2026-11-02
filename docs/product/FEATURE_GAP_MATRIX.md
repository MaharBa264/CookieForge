# Matriz de brechas — Cookiecad V6 y Cookie Cutter Designer

> Referencia del producto: `COOKIE_CUTTER_DESIGNER_PRD.md`.  
> Comparación: `COOKIECAD_V6_ANALYSIS.md`.  
> **Documento histórico:** los estados describen el análisis original y no deben interpretarse como inventario actualizado de CookieForge.

## Estado local del lote 3 — 10/10/2026

Esta matriz conserva brechas históricas. Las filas no actualizadas no certifican el producto actual. Los cimientos, proyectos, recuperación e importación se consolidaron antes del lote 3. Taller mínimo validado en diferencias locales de `feature/sketch-workspace`, base `8037df8`, **sin commit ni publicación**: 988 pruebas, comprobación 0/0, exportación 3/3, compilación y Chromium en escritorio/móvil. Evidencias y límites en `../SKETCH_WORKSPACE_VALIDATION.md`. No implicó paridad funcional completa ni una receta nueva.

## Leyenda

- **Sólido:** implementado, integrado y probado significativamente.
- **Parcial:** código o interfaz presente, pero flujo incompleto o garantías insuficientes.
- **Ausente:** implementación funcional no comprobada.
- **P0:** base necesaria para refactorizar.
- **P1:** prioridad de equivalencia funcional.
- **P2:** ampliación posterior a la estabilización.
- **P3:** exploración u opción comercial.

## 1. Base y calidad de impresión

| Capacidad | Cookiecad V6 | Repositorio analizado | Estado | Prioridad | Decisión |
|---|---|---|---|---|---|
| Dimensiones físicas | Sí | Sí, medidas en mm | Sólido | P0 | Conservar |
| Ancho/alto/lado mayor | Sí | Sí | Sólido | P0 | Conservar |
| Validación topológica | Sin documentación detallada | Aristas, componentes, orientación y volumen | Sólido | P0 | Ventaja funcional |
| Orientación Z vertical para laminador | Sin documentación | Sí | Sólido | P0 | Conservar |
| Apoyo en Z = 0 | Sin documentación | Sí | Sólido | P0 | Conservar |
| Mapa térmico de espesores | No observado | Sí | Sólido | P1 | Conservar |
| Autointersecciones exhaustivas | Sin documentación | No | Ausente | P2 | Investigar, no prometer |
| G-code | No | No | Sólido | P0 | Mantener fuera del alcance |

## 2. Importación y preparación

| Capacidad | Cookiecad V6 | Repositorio analizado | Estado | Prioridad | Objetivo |
|---|---|---|---|---|---|
| SVG | Sí | Sí | Sólido | P0 | Conservar |
| PNG/JPG | Sí | Sí, Worker | Sólido | P0 | Conservar |
| WebP | Sí | No documentado/admitido | Ausente | P1 | Incorporar decodificación |
| Pegar desde portapapeles | Sí | No | Ausente | P1 | Incorporar |
| Arrastrar y soltar | Sí | Sí | Sólido | P0 | Conservar |
| Errores estructurados | Sí | Sí | Sólido | P0 | Unificar |
| Cancelar procesamiento | Sí/no documentado | Sí | Sólido | P0 | Conservar |
| Descartar resultados obsoletos | Sin documentación | Sí | Sólido | P0 | Conservar |
| Editor 2D integrado | Sí | Taller canónico local validado; comandos M/L/C/Q/Z acotados | Parcial | P1 | Sin herramienta pluma completa, primitivas/capas/ajuste magnético; consultar lote 3 |
| Restaurar original | Sí | Historial parcial | Parcial | P1 | Copia inmutable de fuente |
| Guardado automático | Sí | No | Ausente | P2 | Priorizar funcionamiento local |

## 3. Modos de diseño

| Modo | Cookiecad V6 | Repositorio analizado | Estado | Prioridad |
|---|---|---|---|---|
| Cortante (Cutter) | Sí | Sí | Sólido | P0 |
| Sello (Stamp) | Premium | Sí | Geometría sólida | P0 |
| Cortante con impresión interior (Imprint Cutter) | Sí | Sin receta específica | Parcial | P1 |
| Cortante + sello | Premium | Generadores separados, sin pareja coordinada | Parcial | P1 |
| Múltiples cortantes | Premium | Lotes genéricos | Parcial | P1 |
| Conjunto de tamaños | Premium | No | Ausente | P2 |
| Plantilla (Stencil) | Premium | Patrones/capas parciales | Parcial | P1 |
| Cortante de sándwich | Premium | No | Ausente | P2 |
| Adorno para torta | Premium | Texto/patrones parciales | Parcial | P2 |
| Molde para cake pops | Premium | No | Ausente | P3 |
| Galletita de práctica | Premium | No | Ausente | P3 |

## 4. Parámetros del cortante

| Parámetro | Cookiecad | Repositorio | Estado | Prioridad |
|---|---|---|---|---|
| Espesor de pared | Sí | Sí | Sólido | P0 |
| Altura de corte | Sí | Sí | Sólido | P0 |
| Altura total | Sí | Sí | Sólido | P0 |
| Ángulo de salida | Sí | Sí | Sólido | P0 |
| Segundo filo | Sí | No | Ausente | P1 |
| Punta biselada | Sí | Solo ángulo global | Parcial | P1 |
| Borde redondeado | Sí | No | Ausente | P2 |
| Filo para fondant | Sí | No | Ausente | P2 |
| Filo simétrico | Sí | No | Ausente | P2 |
| Estilos de agarre | Sí | Varios estilos | Sólido | P0 |
| Agarre simétrico | Sí | No explícito | Ausente | P2 |
| Varias barras centrales | Sí | No integrado | Ausente | P1 |
| Texto sobre la pared | Sí | `TextEmbosser` sin integrar | Parcial | P2 |
| Placa con nombre | Sí | Sin integrar | Ausente | P2 |

## 5. Sello e impresión interior

| Capacidad | Cookiecad | Repositorio | Estado | Prioridad |
|---|---|---|---|---|
| Relieve y base común | Sí | Sí | Sólido | P0 |
| Islas conectadas | Sí | Sí, mediante la base | Sólido | P0 |
| Huecos conservados | Sí | Sí | Sólido | P0 |
| Profundidad | Sí | Sí | Sólido | P0 |
| Relieve positivo/negativo | Sí, Premium | Sin diferenciación funcional | Ausente | P1 |
| Curvas de profundidad | Sí | No | Ausente | P1 |
| Base de impresión configurable | Sí | Base fija del sello | Parcial | P1 |
| Tolerancia cortante/sello | Sí | No | Ausente | P1 |
| Agarre independiente | Sí | No | Ausente | P2 |
| Rosca/encastre | Sí | No | Ausente | P2 |
| Texto en el sello | Sí | Componente parcial | Parcial | P2 |

## 6. Edición y operaciones 2D

| Capacidad | Repositorio analizado | Estado | Acción |
|---|---|---|---|
| Editor de trazados | Taller local conectado al boceto canónico, fuente preservada | Parcial | Selección, movimiento, topología lineal, Deshacer/Rehacer validados; sin publicar |
| Editor Bézier | Controles C/Q editables sin poligonizar en el mismo taller | Parcial | Herramienta pluma completa y comandos SVG adicionales fuera del lote |
| Herramienta pluma | No integrada como flujo principal | Parcial | Agregar segmentos y Bézier |
| Primitivas 2D | ShapeLibrary distinta de un editor | Parcial | Rectángulo, elipse, polígono, estrella |
| Grilla y ajuste magnético | No verificados | Ausente | Grilla, puntos, ejes y centros |
| Transformaciones numéricas | X/Y de un punto, espejo horizontal y giro de 90° locales del trazado | Parcial | Giros/escalas libres y traslación global no entregados |
| Capas 2D | Componente existente | Parcial | Visibilidad, bloqueo y orden |
| Operaciones booleanas | Utilidad/componente existente | Parcial | Definir garantías y pruebas |
| Generador de patrones | Existente | Parcial | Reutilizar para plantillas y múltiples cortantes |
| Gestor de capas | Existente | Parcial | Definir modelo de capas |
| Detector de colisiones | Existente | Parcial | Integrar en diagnósticos |
| Texto en relieve | Existente | Parcial | Unificar texto 2D/3D |
| Herramientas de imágenes con IA | Existentes, clave en cliente | Riesgoso | Aislar detrás de una capacidad opcional |

El problema principal no era la falta de componentes, sino la falta de un **documento de diseño compartido** y recetas que coordinaran su funcionamiento.

## 7. Vista previa y diagnósticos

| Capacidad | Cookiecad | Repositorio | Estado | Prioridad |
|---|---|---|---|---|
| Órbita 3D | Sí | Sí | Sólido | P0 |
| Encajar vista automáticamente | Sí | Sí/por verificar | Parcial | P1 |
| Líneas de malla | Sí | Sí/por verificar | Parcial | P2 |
| Materiales | Sí | Sí | Sólido | P2 |
| Dimensiones finales | No relevado | Sí | Sólido | P0 |
| Imprimibilidad | Sin detalle | Sí | Sólido | P0 |
| Mapa térmico | No relevado | Sí | Sólido | P1 |
| Vista por capas | No relevado | Sí | Sólido | P2 |
| Eliminación de objetos | No relevado | Sí | Sólido | P2 |

## 8. Exportaciones

| Formato o función | Cookiecad | Repositorio | Estado | Prioridad |
|---|---|---|---|---|
| STL binario | Sí | Sí, validado | Sólido | P0 |
| 3MF | Sí | Sí, OPC/ZIP real | Sólido | P0 |
| OBJ | No relevado | Sí | Sólido | P2 |
| PDF de contorno | Sí | No | Ausente | P2 |
| Conjunto de varias piezas | Sí | Exportación agrupada parcial | Parcial | P1 |
| Tamaño estimado | No relevado | Sí | Sólido | P2 |
| Bloqueo de exportación inválida | Sin documentación | Sí | Sólido | P0 |
| Proyecto fuente portátil | URL/biblioteca | No | Ausente | P1 |
| SVG del contorno | Sí en Cookiecad/objetivo P2 | No | Ausente | P2 |
| Captura del visor | Idea complementaria | No | Ausente | P2 |
| PWA sin conexión | Idea complementaria | No | Ausente | P2 |

## 9. Persistencia y transferencia local

| Capacidad | Cookiecad | Repositorio | Estado | Prioridad |
|---|---|---|---|---|
| Deshacer/Rehacer | Editor | Sí | Sólido/por reforzar | P0 |
| Proyecto local | Biblioteca en nube | ProjectManager parcial | Parcial | P1 |
| Perfiles de parámetros | Premium | No | Ausente | P1 |
| Archivo de proyecto compartible | URL en Cookiecad | No | Ausente | P1 |
| Biblioteca local | Nube en Cookiecad | CloudGallery parcial | Parcial | P1 |
| Importar/exportar JSON del proyecto | No relevado | No | Ausente | P1 |

Decisión histórica: usar formato local versionado, IndexedDB y ajustes predefinidos. Cuentas, pagos, suscripciones, restricciones comerciales, backends de negocio y bibliotecas en la nube quedan fuera del alcance de esta aplicación personal.

## 10. Arquitectura

| Tema | Estado histórico | Brecha | Prioridad |
|---|---|---|---|
| Modelo de parámetros | Interfaz monolítica Cortante/Sello | No admite 11 recetas | P0 |
| Coordinación | `App.svelte` muy grande | Responsabilidades mezcladas | P0 |
| Proceso de generación | Generadores separados | Sin registro uniforme | P0 |
| Componentes avanzados | Numerosos, integración variable | Riesgo de interfaz sin función real | P0 |
| Worker raster | Sólido | Conservar | P0 |
| Carga diferida | Sello y paneles | Generalizar | P0 |
| Pruebas | 216 pruebas declaradas | Buena base | P0 |
| Tamaño de JavaScript | Presupuestos establecidos | Conservar | P0 |

## 11. Hoja de ruta recomendada en aquel momento

### P0 — Refactorización sin regresiones

1. Incorporar `DesignDocument`, `DesignKind` y `GenerationRecipe`.
2. Extraer la coordinación desde `App.svelte`.
3. Adaptar Cortante y Sello a un registro de recetas.
4. Versionar el archivo de proyecto.
5. Conservar validaciones, exportaciones y presupuestos.

### P1 — Equivalencia funcional útil

1. Cortante con impresión interior.
2. Cortante y sello con tolerancia.
3. Múltiples cortantes deterministas.
4. Plantillas.
5. Editor 2D integrado.
6. Perfiles de parámetros.
7. WebP y pegado desde portapapeles.
8. Importar/exportar proyectos.

### P2 — Funciones diferenciadoras

1. Perfiles de filo.
2. Barras centrales.
3. Texto y placas identificadoras.
4. Agarre y encastres.
5. Cortante de sándwich.
6. Adorno para tortas.
7. PDF de contorno y archivo transferible.
8. Grilla, ajuste magnético, transformaciones y capas completas.
9. PWA sin conexión y captura del visor.

### P3 — Después de validación física

1. Molde para cake pops.
2. Galletita de práctica.

No existía una fase de monetización ni de nube en esa hoja de ruta.

## 12. Criterios para finalizar la refactorización

- Cortante y Sello producen los mismos resultados sobre el conjunto de pruebas existente.
- `App.svelte` deja de contener detalles de algoritmos de generación.
- Cada modo posee esquema, valores predeterminados, validación y receta.
- No se presenta ningún panel sin implementación real y probada.
- STL/OBJ/3MF conservan Z vertical, se apoyan en cero y bloquean resultados inválidos.
- Las 216 pruebas históricas siguen pasando, ampliadas con pruebas de migración.
- El fragmento inicial permanece bajo 200 KiB y los fragmentos asíncronos bajo 600 KiB.
