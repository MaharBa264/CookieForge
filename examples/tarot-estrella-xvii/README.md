# La Estrella XVII — primera prueba de fabricación

**Estado:** piloto técnico, no reinterpretación definitiva del dibujo celestial original. Se tomaron sus motivos principales (estrella grande, estrellas secundarias, figura, dos jarras y agua) y se simplificaron deliberadamente en contornos cerrados que el motor actual puede procesar.

La ilustración de referencia es la carta completa de La Estrella XVII definida en el proyecto de tarot celestial. **No se usó una conversión automática fiel**: el PNG original tiene demasiadas líneas finas, curvas, espacios y detalles para asumir que serán imprimibles sin redibujo.

## Archivos

- `cortante.svg` — silueta de carta de **75 × 125 mm**, con esquinas suavizadas por segmentos. Reutilizar esta silueta en las 78 cartas.
- `sello-piloto.svg` — dibujo simplificado con **20 contornos cerrados**, sin título ni numeración, todos unidos mediante una base común por la receta Stamp.

No son SVG que se deban combinar en una única receta. Son **dos piezas independientes**: primero se corta y después se estampa la masa.

## Parámetros para reproducir el ensayo

| Ajuste | Cortante | Sello |
|---|---:|---:|
| Receta | Cutter | Stamp |
| Tamaño objetivo | 125 mm | 106 mm |
| Eje de tamaño | Altura | Altura |
| Ángulo | 0° | 0° |
| Mango | Desactivado | Desactivado |
| Altura de corte | 12 mm | No aplica |
| Profundidad de relieve | No aplica | 1,2 mm |
| Base del sello | No aplica | Activada |
| Superficie mínima recomendada | 200 × 200 mm | 200 × 200 mm |

El sello es deliberadamente menor para entrar dentro del cortante. La prueba automatizada comprueba **las dimensiones finales reales** y no solo los valores SVG.

## Procedimiento de validación

1. Abrí CookieForge en la rama `feature/advanced-contour-editor`.
2. Importá `cortante.svg`, elegí **Cortante** y aplicá los parámetros indicados.
3. Confirmá que el modelo 3D sea una pieza estanca; exportá el STL.
4. Importá `sello-piloto.svg` en un nuevo proyecto, elegí **Sello**, activá la base y aplicá sus parámetros.
5. Confirmá una sola malla estanca, guardá ambos diseños `.ccd.json` y exportá STL.
6. Abrí los dos STL en el laminador, comprobá tamaños, orientación y distancia disponible entre borde del sello y cortante.
7. Imprimí una unidad de cada pieza y realizá una prueba sobre masa. Registrá calidad de trazo, marcas visibles, flexión y facilidad de limpieza.

**Falta para La Estrella final:** redibujar el arte de referencia a trazos de ancho seguro, comprobar lectura de números y letras en espejo, corregir detalles que no estampen bien y repetir la prueba física. No extrapolar esta prueba a las 78 cartas.

## Precauciones

Los controles automáticos garantizan ciertas propiedades de malla; **no** garantizan calidad de impresión, aptitud alimentaria, facilidad de limpieza o fidelidad artística. Comprobar material y proceso adecuados para uso alimentario según las condiciones concretas. Una impresión 3D doméstica, especialmente con porosidad entre capas, no es automáticamente apta para contacto alimentario.

La prueba automatizada se ubica en `src/lib/generation/recipes/__tests__/stampRecipe.test.ts`. No marcar este ensayo como aprobado hasta que termine la CI del SHA definitivo.
