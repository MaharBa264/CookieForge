# CookieForge 🍪

**Diseñador libre de cortantes y sellos para galletas, con generación de modelos para impresión 3D.**

CookieForge es una adaptación de [Cookie Cutter Designer](https://github.com/razorglyon/cookie-cutter-designer). Permite importar imágenes **SVG, PNG y JPG**, convertirlas en contornos, configurar dimensiones en milímetros, previsualizar modelos tridimensionales y exportar archivos **STL, OBJ y 3MF**.

> **Estado del proyecto:** versión 1.0 **en preparación**, no publicada. En la rama `feature/advanced-contour-editor` ya hay operaciones persistentes V5 por contorno y geometría exportable para hasta seis relieves interiores **cerrados**, conectados por una red de puentes sin ciclos, con restricciones de topología. Las líneas abiertas y Grabado no generan geometría V5. Aún falta validar una carta piloto real y hacer un ensayo de impresión con masa. Consultá el [contrato de cierre 1.0](docs/CIERRE_COOKIEFORGE_1_0.md).

## Funciones disponibles

- Importación de imágenes vectoriales y rasterizadas, con vectorización.
- Creación de cortantes y sellos, con parámetros geométricos configurables.
- Editor 2D de trazados, puntos de anclaje y curvas compatibles.
- Previsualización 3D y comprobaciones de geometría antes de exportar.
- Exportación a STL, OBJ y 3MF.
- Proyectos locales, historial de cambios y otras funciones heredadas del proyecto original.

La interfaz heredada está en proceso de traducción al español. El editor de dibujo 2D ya tiene sus controles principales traducidos.

## Primeros pasos

Se necesitan **Node.js 22.12 o posterior** y **pnpm 10**.

```bash
git clone https://github.com/MaharBa264/CookieForge.git
cd CookieForge
pnpm install --frozen-lockfile
pnpm run dev
```

Abrí la dirección que indique Vite, normalmente `http://localhost:5173/`.

Para comprobar el proyecto:

```bash
pnpm run check
pnpm run test:run -- --maxWorkers=1
pnpm run build
pnpm run test:smoke
```

La integración continua ejecuta estas comprobaciones en GitHub Actions. Consultá [la guía de inicio](QUICKSTART.md) y [las instrucciones para colaborar](CONTRIBUTING.md).

## Camino a la versión 1.0

La prioridad ya no es ampliar indefinidamente las funciones: es completar una **carta piloto del tarot celestial**, guardar y reabrir el proyecto, exportar un cortante y un sello cuando corresponda, comprobarlos en un laminador y probar físicamente su impresión y marcado sobre masa. La [lista de aceptación y funciones aplazadas](docs/CIERRE_COOKIEFORGE_1_0.md) fija el alcance antes de publicar la versión.

La aplicación de escritorio sin conexión, Android y las herramientas CAD más avanzadas quedan para versiones posteriores.

Los avances experimentales se desarrollan en la rama `feature/advanced-contour-editor`; `main` conserva la base estable.

## Seguridad e impresión

**Que un modelo sea imprimible no significa que sea apto para contacto alimentario.** La seguridad depende del material, la impresora, el proceso, el acabado y la limpieza. Verificá las condiciones de uso antes de poner una pieza impresa en contacto con alimentos. Revisá siempre el STL o 3MF en un laminador (*slicer*) antes de imprimir.

## Origen, autoría y licencia

Basado en **Cookie Cutter Designer**, creado por [razorglyon](https://github.com/razorglyon/cookie-cutter-designer), bajo licencia **MIT**. Se conservan el archivo [LICENSE](LICENSE) y la documentación original en [UPSTREAM_README.md](UPSTREAM_README.md) como referencia histórica y de atribución. También está disponible su [traducción completa al español](UPSTREAM_README_ES.md).

La documentación principal de CookieForge se mantiene en español. Los nombres de APIs, comandos y formatos técnicos permanecen sin traducir cuando corresponde.
