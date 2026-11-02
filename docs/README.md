# Documentación de CookieForge

El idioma principal de CookieForge es el **español**. Esta página registra el avance de la traducción y permite localizar la documentación sin confundir las referencias históricas del proyecto original con las guías vigentes.

## Guías principales en español

- [Presentación y estado del proyecto](../README.md)
- [Guía de inicio rápido](../QUICKSTART.md)
- [Cómo colaborar](../CONTRIBUTING.md)
- [Convenciones de idioma](CONVENCIONES_ES.md)

## Inventario de documentación técnica heredada

Los documentos ya traducidos se identifican a continuación. Los restantes se conservan temporalmente en su idioma original para no perder resultados de pruebas ni advertencias. La traducción no implica que las pruebas históricas se hayan repetido en CookieForge.

### Arquitectura y mantenimiento

- Traducidos: [CLAUDE.md](../CLAUDE.md) y [ADVANCED_FEATURES.md](../ADVANCED_FEATURES.md)
- Pendientes: `AGENT_CONTEXT.md`, `FEATURES_COMPLETE.md`
- Traducido: [SECURITY.md](../SECURITY.md)
- Traducidos: [AGENT_DECISIONS.md](AGENT_DECISIONS.md), [MAINTENANCE.md](MAINTENANCE.md), [PROJECT_INVARIANTS.md](PROJECT_INVARIANTS.md), [DEPENDENCY_BUNDLE_BUDGETS.md](DEPENDENCY_BUNDLE_BUDGETS.md)

### Validación y pruebas

- [CUTTER_SERIES_VALIDATION.md](CUTTER_SERIES_VALIDATION.md) — traducido
- [LOCAL_PROJECT_RECOVERY_VALIDATION.md](LOCAL_PROJECT_RECOVERY_VALIDATION.md) — traducido
- [LOCAL_PROJECT_WORKFLOW_VALIDATION.md](LOCAL_PROJECT_WORKFLOW_VALIDATION.md) — traducido
- [MANUAL_ISLAND_BRIDGES_VALIDATION.md](MANUAL_ISLAND_BRIDGES_VALIDATION.md) — traducido
- `docs/PHOTO_IMPORT_VALIDATION.md`
- [RECESSED_STAMP_VALIDATION.md](RECESSED_STAMP_VALIDATION.md) — traducido
- [SKETCH_WORKSPACE_VALIDATION.md](SKETCH_WORKSPACE_VALIDATION.md) — traducido
- [STAMP_QUALIFICATION.md](STAMP_QUALIFICATION.md) — traducido
- [TRACING_PRESETS_VALIDATION.md](TRACING_PRESETS_VALIDATION.md) — traducido
- [UNIFIED_IMAGE_IMPORT_VALIDATION.md](UNIFIED_IMAGE_IMPORT_VALIDATION.md) — traducido
- [VIEWER_RENDERING_VALIDATION.md](VIEWER_RENDERING_VALIDATION.md) — traducido
- `docs/WALL_PROFILES_VALIDATION.md`

### Investigación y planificación heredadas

- `docs/product/CODEX_IMPLEMENTATION_PLAN.md`
- `docs/product/COOKIECAD_V6_ANALYSIS.md`
- `docs/product/COOKIE_CUTTER_DESIGNER_PRD.md`
- `docs/product/FEATURE_GAP_MATRIX.md`
- Traducido: [GEMINI_API_SETUP.md](../GEMINI_API_SETUP.md)
- Pendiente: `GEMINI_API_TECHNICAL.md`

### Referencia histórica

- [README original](../UPSTREAM_README.md): se conserva **sin reemplazar** para atribución y consulta del proyecto de origen.
- [README original traducido íntegramente al español](../UPSTREAM_README_ES.md): consulta en nuestro idioma sin modificar el original.
- [Licencia MIT](../LICENSE): se conserva su texto legal original, sin traducir ni sustituirlo.

## Prioridad de traducción para cerrar la fase 3

La traducción completa sigue pendiente. El orden acordado es:

1. Arquitectura y decisiones técnicas.
2. Informes de validación geométrica, importación y persistencia.
3. Documentos de planificación y características.
4. Revisión de cadenas visibles de la interfaz y pruebas asociadas.
5. Verificación de enlaces, comandos y pruebas automáticas.

El cierre verificable se registra en [PLAN_CIERRE_FASE_3.md](PLAN_CIERRE_FASE_3.md).

## Criterios para continuar la traducción

1. Traducir íntegramente el contenido, sin borrar restricciones ni resultados de validación.
2. Actualizar nombres y rutas obsoletas solo después de contrastarlas con el repositorio.
3. Conservar comandos, nombres de API y fragmentos de código funcionales.
4. Mantener la documentación histórica claramente identificada.
5. Revisar enlaces y ejecutar las pruebas automáticas después de cada lote.

**Estado:** traducción en curso. El [README principal](../README.md), la guía de inicio, la guía para colaborar y varios documentos técnicos e informes de validación ya están en español. La [traducción íntegra del README histórico](../UPSTREAM_README_ES.md) ya está publicada por separado; [UPSTREAM_README.md](../UPSTREAM_README.md) permanece intacto. La interfaz y los demás documentos aún requieren revisión.
