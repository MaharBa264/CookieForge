# Cierre de fase 3 y acceso a fase 5

## Objetivo

CookieForge debe ofrecer documentación e interfaz en español antes de implementar el sistema de operaciones por contorno. La documentación original se conserva como referencia histórica; la licencia MIT permanece intacta.

## Estado comprobado

- [x] Importación del motor original y rama de desarrollo independiente.
- [x] Pruebas de referencia aprobadas (1253 pruebas de la batería principal y 4 pruebas de exportación en la ejecución comunicada).
- [x] README, guía rápida, contribuciones, mantenimiento, límites de dependencias, seguridad y convenciones en español.
- [x] Controles principales del editor de dibujo traducidos.
- [ ] Traducir íntegramente los documentos técnicos y de validación restantes.
- [ ] Publicar traducción completa del README original, conservando `UPSTREAM_README.md` intacto.
- [ ] Revisar y traducir todos los textos visibles de los componentes Svelte y mensajes al usuario en TypeScript.
- [ ] Actualizar pruebas que dependen de cadenas visibles, sin debilitar sus verificaciones.
- [ ] Ejecutar y aprobar `check`, `test:run`, `build` y `test:smoke`.
- [ ] Revisar enlaces, nombres de comandos y rutas documentadas.

## Inventario de documentación pendiente

### Raíz

- `ADVANCED_FEATURES.md`
- `AGENT_CONTEXT.md`
- `CLAUDE.md`
- `FEATURES_COMPLETE.md`
- `GEMINI_API_SETUP.md`
- `GEMINI_API_TECHNICAL.md`
- `UPSTREAM_README.md` (conservar original y publicar traducción separada)

### Arquitectura

- `docs/AGENT_DECISIONS.md`
- `docs/PROJECT_INVARIANTS.md`

### Validaciones

- `docs/CUTTER_SERIES_VALIDATION.md`
- `docs/LOCAL_PROJECT_RECOVERY_VALIDATION.md`
- `docs/LOCAL_PROJECT_WORKFLOW_VALIDATION.md`
- `docs/MANUAL_ISLAND_BRIDGES_VALIDATION.md`
- `docs/PHOTO_IMPORT_VALIDATION.md`
- `docs/RECESSED_STAMP_VALIDATION.md`
- `docs/SKETCH_WORKSPACE_VALIDATION.md`
- `docs/STAMP_QUALIFICATION.md`
- `docs/TRACING_PRESETS_VALIDATION.md`
- `docs/UNIFIED_IMAGE_IMPORT_VALIDATION.md`
- `docs/VIEWER_RENDERING_VALIDATION.md`
- `docs/WALL_PROFILES_VALIDATION.md`

### Producto y planificación

- `docs/product/CODEX_IMPLEMENTATION_PLAN.md`
- `docs/product/COOKIECAD_V6_ANALYSIS.md`
- `docs/product/COOKIE_CUTTER_DESIGNER_PRD.md`
- `docs/product/FEATURE_GAP_MATRIX.md`

## Puente mínimo de fase 4 hacia fase 5

No hace falta terminar toda la fase 4, pero sí:

1. Seleccionar un trazado estable en el dibujo.
2. Asignar una operación por trazado: corte, relieve, hueco o ignorar.
3. Editar espesor y profundidad de forma independiente.
4. Persistir los cambios en un formato nuevo, migrando proyectos V1–V4 sin pérdida.
5. Reflejar las operaciones en la geometría y exportación 3D.
6. Probar guardado, reapertura, deshacer, geometría y exportación.

## Regla de cierre

La fase 3 no se marca como completada hasta que se hayan revisado los documentos, la interfaz y las pruebas. Los archivos históricos se conservan, pero deben tener una traducción española accesible.
