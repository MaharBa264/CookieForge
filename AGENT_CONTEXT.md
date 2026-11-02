# Contexto del agente — cookie-cutter-designer

> Registro histórico del proyecto original, actualizado el 11 de octubre de 2026. Los permisos, ramas y estados que describe **no constituyen autorizaciones vigentes para CookieForge**.

## Repositorio y estado en aquel momento

- Repositorio de origen: `razorglyon/cookie-cutter-designer`; clon `/workspace/cookie-cutter-designer`; rama predeterminada `main`.
- **Lote 7a fusionado y desplegado, verificado el 11/10/2026.** PR #71 fusionada; squash `bafc4246d5c5789a385f844ea5ff3a1d2d7e99dd`. El `origin/main` recuperado coincidía con el SHA de GitHub.
- Rama funcional conservada: `feature/reprenable-cutter-series`, HEAD publicado `5c74083baec230788468fa70c9bada5c1caecda3`. Su árbol coincidía con el squash (`3492b6e40b02764c9f83fa021cd95852e7acb4e9`); la diferencia de historial no significaba trabajo funcional pendiente. No se alteraron, reorganizaron ni eliminaron `main` local ni otras ramas.
- Quality y CodeQL Security Scan aprobaron en el HEAD de la PR; CodeQL notificó «No new alerts in code changed by this pull request» y GitGuardian también aprobó. Sobre el squash: Quality `38167985591`, CodeQL `38167985501` y Pages `38167985508` finalizaron en SUCCESS, con validación, análisis, compilación y despliegue correctos. Las evaluaciones externas de la PR no se presentaron como repetidas sobre `main`.
- Despliegue GitHub Pages `7000582643`: SHA y estado final satisfactorio comprobados. Se comparó el paquete con la compilación calificada: **58/58 archivos públicos** respondieron HTTP 200 con tamaño y SHA-256 idénticos, incluidos fragmentos diferidos y Workers. El único `.nojekyll` vacío era específico de la compilación y se clasificó como metadato de empaquetado.
- Rama documental entonces activa: `docs/refresh-product-roadmap`, creada desde `origin/main` verificado; sin alterar `main` ni reorganizar la rama entregada. Permiso histórico: confirmar y publicar cinco documentos autorizados por Rza, **sin** autorización de PR, fusión o puesta en producción.
- Sin código local pendiente ni PR abierta en el último relevamiento. Los cinco documentos estaban listos para confirmar/publicar: era una comprobación previa, no prueba de publicación remota; el estado real debía verificarse en Git y GitHub.
- El contexto respetaba la extensión permitida. El control global de notas fallaba solo por los contextos demasiado largos de Limace y Sangsue, no modificados en esa entrega. Ese problema documental no invalidaba la CI del producto.

## Lote entregado y pruebas

- Series homogéneas de cortantes separados desde Lotes: copias, columnas y espaciado; fuente, perfiles, puentes y agarre comunes editables. Documento/envoltorio V3 estrictos, IndexedDB, JSON, recuperación y Deshacer/Rehacer canónicos. Vuelta al cortante único sin pérdida. V1/V2 conservados; V3 requería la aplicación nueva. El modo Lotes libres histórico no admitía guardado.
- Límites: 1–24 copias, columnas entre 1 y el número de copias, espaciado de 0,5–40 mm y 500.000 triángulos. Una distribución demasiado grande podía guardarse pero su geometría se bloqueaba; Lotes seguía accesible sin malla para corregirla después de recargar.
- Validación del HEAD exacto: auditoría sin vulnerabilidades conocidas, comprobación 0 errores/0 advertencias, **1.128/1.128 pruebas (84 archivos)**, pruebas de exportación 4/4, rendimiento 2/2 y compilación/presupuestos correctos (entrada 178.253 bytes; máximo restante 561.528 bytes). Archivos versionados coincidentes con los blobs Git y huellas idénticas antes/después. El primer intento de pruebas se interrumpió a los 210 s, se detuvieron los procesos hijos y una nueva ejecución aprobó en 278,92 s sin modificar el código.
- Recorrido Chromium local previo todavía vinculado: 225 huellas de `src` idénticas al commit publicado. Escritorio/móvil, V1 comparado con el `main` real, V2/puentes/perfiles, JSON y STL exactos después de recargar, historial y reparación de la plataforma. No se repitió un recorrido en producción; solo hubo comprobación HTTP de los archivos servidos. No se hicieron pruebas con Safari, Firefox, dispositivos reales, lectores de pantalla, laminadores o impresoras; tampoco se certificaron series máximas.

## Tecnología, comandos y recursos

Svelte 5, TypeScript estricto, Vite 7, Three.js, Clipper/JSCAD e ImageTracer en Worker. pnpm 10.33.4 y Node.js 22.12 o posterior.

```sh
REPO_TMP=$(python3 /workspace/.hermes-tools/workspace-tmp.py --repo "$PWD" --purpose commands --path-only) || exit 1
test -n "$REPO_TMP" || exit 1
export TMPDIR="$REPO_TMP" GOMAXPROCS=2 UV_THREADPOOL_SIZE=2
pnpm install --frozen-lockfile
pnpm check
pnpm test:run --pool=threads --maxWorkers=1 --fileParallelism=false
pnpm test:smoke --pool=threads --fileParallelism=false
pnpm benchmark --pool=threads --fileParallelism=false
pnpm build
# Desarrollo: pnpm dev; vista previa privada: ./scripts/start-private-preview.sh
```

En aquel entorno se exigía aislar el directorio temporal al instalar, probar y compilar; ejecutar las comprobaciones secuencialmente y no duplicar `maxWorkers` en las pruebas de exportación/rendimiento. Había que dimensionar las esperas según la duración medida y controlar la creación y detención de procesos.

## Mapa, decisiones y continuación histórica

- `src/lib/domain/` y `stores/designSessionStore.ts`: documento/sesión canónicos; `projects/`: códec, IndexedDB y recuperación; `App.svelte`: integración.
- `import/` y `workers/`: importación; `sketch/`: edición; `generation/` y `utils/`: recetas, geometría y exportación.
- Invariantes duraderos en **`docs/PROJECT_INVARIANTS.md`**; nota previa íntegra conservada en el historial Git del HEAD publicado. Informes: `docs/CUTTER_SERIES_VALIDATION.md`, `WALL_PROFILES_VALIDATION.md`, `MANUAL_ISLAND_BRIDGES_VALIDATION.md`, `PHOTO_IMPORT_VALIDATION.md` y `SKETCH_WORKSPACE_VALIDATION.md`.
- Evidencia de entrega: `/workspace/reports/cutter-series-release-a0f7i03a/qualification.json` y `pages-verified.json`; CI: `/workspace/reports/cutter-series-ci-pr-crj3f8yn/final.json` y `/workspace/reports/cutter-series-ci-main-x4dzinj3/final.json`.
- Paso siguiente que establecía el original: preservar notas locales, actualizar referencias y crear una rama desde `origin/main` verificado. Hoja de ruta: `.hermes/plans/2026-10-09_214154-rea-product-improvements.md`. Sus estados antiguos no reemplazaban ese contexto. No había autorización para ampliar al diseño monobloque/múltiple o a sellos, ni para publicar documentación sin nuevo permiso.

**Para CookieForge:** consultar la hoja de ruta, las decisiones y el estado actual de nuestro propio repositorio antes de aplicar cualquier instrucción operativa.
