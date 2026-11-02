# CookieForge 🍪

**Diseñador libre de cortantes y sellos para galletas, con generación de modelos para impresión 3D.**

CookieForge es una adaptación de [Cookie Cutter Designer](https://github.com/razorglyon/cookie-cutter-designer). Permite importar imágenes **SVG, PNG y JPG**, convertirlas en contornos, configurar dimensiones en milímetros, previsualizar modelos tridimensionales y exportar archivos **STL, OBJ y 3MF**.

> **Estado del proyecto:** versión base importada y validada. Estamos desarrollando un editor avanzado para asignar operaciones y dimensiones a cada trazado. Esta función todavía **no** está integrada al motor 3D ni al formato de guardado.

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

## Desarrollo previsto

1. Traducir la documentación y la interfaz al español.
2. Seleccionar trazados y asignarles funciones individuales: corte, relieve, hueco o ignorar.
3. Guardar estas propiedades en una nueva versión de documento, manteniendo la compatibilidad con V1–V4.
4. Integrar las propiedades con la generación y validación de modelos 3D.
5. Preparar una distribución sin conexión para Windows y evaluar una versión para Android.

Los avances experimentales se desarrollan en la rama `feature/advanced-contour-editor`; la rama `main` conserva el código base estable. Esta actualización del README no incorpora funciones experimentales.

## Seguridad e impresión

**Que un modelo sea imprimible no significa que sea apto para contacto alimentario.** La seguridad depende del material, la impresora, el proceso, el acabado y la limpieza. Verificá las condiciones de uso antes de poner una pieza impresa en contacto con alimentos. Revisá siempre el STL o 3MF en un laminador (*slicer*) antes de imprimir.

## Origen, autoría y licencia

Basado en **Cookie Cutter Designer**, creado por [razorglyon](https://github.com/razorglyon/cookie-cutter-designer), bajo licencia **MIT**. Se conservan el archivo [LICENSE](LICENSE) y la documentación original en [UPSTREAM_README.md](UPSTREAM_README.md) como referencia histórica y de atribución. También está disponible su [traducción completa al español](UPSTREAM_README_ES.md).

La documentación principal de CookieForge se mantiene en español. Los nombres de APIs, comandos y formatos técnicos permanecen sin traducir cuando corresponde.
