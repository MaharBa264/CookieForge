# Guía de mantenimiento

> **Nota de CookieForge:** este documento procede del proyecto original. Algunas referencias a workflows y a la ausencia de pruebas describen un estado histórico. Actualmente CookieForge tiene una batería automatizada de pruebas y el workflow `.github/workflows/quality-cookieforge.yml`. Se conservan los criterios técnicos originales, con esta aclaración para evitar confusiones.

## Herramientas compatibles

- Node.js: `>=22.12.0` (`.nvmrc` selecciona Node 22).
- pnpm: `10.33.4` (`package.json#packageManager`).
- Archivo de bloqueo de dependencias: `pnpm-lock.yaml`.

Instalación reproducible:

```sh
pnpm install --frozen-lockfile
```

## Comprobaciones de calidad obligatorias

Ejecutá estos comandos antes de proponer una solicitud de incorporación (*pull request*):

```sh
pnpm audit --audit-level=moderate
pnpm run check
pnpm run build
git diff --check
```

Resultado esperado:

- Ninguna vulnerabilidad conocida de gravedad moderada o superior.
- Cero errores de TypeScript/Svelte.
- Cero advertencias de Svelte.
- Compilación de producción correcta.
- Ningún error de espacios en blanco.

**Estado histórico del documento original:** indicaba que el repositorio aún no contaba con una batería automatizada de pruebas unitarias y exigía probar manualmente la carga de archivos, los cambios de parámetros, el renderizado 3D, el guardado y apertura de proyectos y la exportación STL. **Estado actual de CookieForge:** esas verificaciones manuales siguen siendo útiles, pero ahora también existe `pnpm run test:run -- --maxWorkers=1` y `pnpm run test:smoke`.

## Política de dependencias

- Aplicar actualizaciones compatibles de corrección o versión menor en lotes pequeños y reversibles.
- Agrupar cada familia de dependencias en un mismo commit.
- Revisar conjuntamente `package.json` y `pnpm-lock.yaml`.
- Rechazar fuentes inesperadas de paquetes tarball, Git o HTTP.
- Validar con una instalación congelada después de cada cambio del archivo de bloqueo.
- Gestionar las actualizaciones de versión mayor en ramas dedicadas.

Ramas previstas originalmente para actualizaciones mayores:

```text
upgrade/vite-8
upgrade/typescript-7
upgrade/three-0.185
perf/code-splitting
```

Dependabot agrupa actualizaciones compatibles de corrección y versión menor. Las actualizaciones mayores se ignoran en su configuración de versiones y requieren revisión manual. Las actualizaciones de seguridad de GitHub se administran por separado en la configuración del repositorio.

## Áreas sensibles desde el punto de vista de la seguridad

### Archivos proporcionados por el usuario

Los SVG, PNG y JPG se procesan en el navegador. Tratá el marcado SVG analizado y el contenido generado mediante `{@html}` como datos no confiables. No agregues nuevos puntos de inserción de HTML sin sanitización y revisión específica.

### API de Gemini

Las funciones opcionales de Gemini realizan solicitudes directamente desde el navegador. Las claves de API del lado del cliente no pueden considerarse secretas. Usá claves restringidas, cuotas y listas de APIs permitidas; nunca incorpores claves ni archivos `.env` al repositorio.

### Servidor de desarrollo Vite

No expongas el servidor de desarrollo de Vite a redes no confiables. Preferí la vinculación predeterminada a la interfaz local (*loopback*). Si necesitás pruebas remotas, utilizá un túnel controlado o una regla de cortafuegos y retiralos al terminar.

### Geometría y exportaciones

Usá Clipper.js para desplazamientos de contornos y operaciones booleanas sensibles a la precisión. Realizá pruebas de exportación STL binaria después de modificar Three.js o los exportadores.

## Integración continua

**Workflows documentados por el proyecto original:**

- `.github/workflows/quality.yml`: instalación congelada, auditoría de dependencias, comprobaciones Svelte/TypeScript y compilación de producción.
- `.github/workflows/deploy.yml`: repite las comprobaciones y la compilación antes de publicar GitHub Pages.
- `.github/workflows/codeql.yml`: análisis CodeQL en pushes, solicitudes de incorporación y ejecución semanal.

**CookieForge:** el workflow incorporado y verificado es `.github/workflows/quality-cookieforge.yml`, que incluye además las pruebas automatizadas y de exportación. Los workflows originales enumerados arriba no deben darse por activos en esta adaptación.

## Reversión de cambios

Los commits de mantenimiento se separan por área técnica. Revertí el commit afectado en lugar de reescribir el historial de la rama:

```sh
git revert <commit>
```

Nunca hagas una publicación forzada (*force-push*) para revertir cambios sin la autorización explícita de quien mantiene el proyecto.
