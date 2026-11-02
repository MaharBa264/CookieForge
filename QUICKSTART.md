# Guía de inicio rápido — CookieForge

## Requisitos e instalación

Necesitás **Node.js 22.12 o posterior** y **pnpm 10**. Por ahora, esta es una aplicación web que se ejecuta localmente; el instalador de Windows todavía no está disponible.

```bash
git clone https://github.com/MaharBa264/CookieForge.git
cd CookieForge
pnpm install --frozen-lockfile
pnpm run dev
```

Abrí la dirección que muestre la terminal, habitualmente `http://localhost:5173/`.

## Crear un cortante o sello

1. Importá un archivo SVG, PNG o JPG, o utilizá la figura de prueba.
2. Si importaste una imagen rasterizada, revisá el resultado de la vectorización.
3. Elegí el modo **cortante** o **sello**, según el diseño.
4. Ajustá tamaño, espesor de pared, altura y demás parámetros disponibles.
5. Revisá la previsualización 3D y las advertencias de geometría.
6. Exportá el modelo en STL, OBJ o 3MF para abrirlo en tu laminador de impresión 3D.

La interfaz original aún contiene algunas etiquetas en otros idiomas. Su traducción se está realizando por etapas.

## Parámetros iniciales orientativos

| Tipo de pieza | Espesor de pared | Altura de corte | Altura total |
|---|---:|---:|---:|
| Cortante fino | 0,8 mm | 10 mm | 15 mm |
| Cortante estándar | 1,0 mm | 12 mm | 20 mm |
| Cortante robusto | 1,2 mm | 15 mm | 25 mm |

Son valores de partida, **no garantías de resistencia ni de aptitud alimentaria**. El resultado depende de la geometría, el material y la impresora.

## Consejos para preparar imágenes

- Preferí imágenes nítidas y de buen contraste.
- Evitá detalles demasiado pequeños para la boquilla y el tamaño final de impresión.
- Revisá los huecos interiores y las zonas aisladas del diseño.
- En imágenes complejas, comprobá que los contornos resultantes coincidan con lo que querés imprimir.
- Para diseños de varias alturas o relieves, esperá la integración del editor avanzado por trazado: todavía está en desarrollo.

## Antes de imprimir

1. Abrí el STL o 3MF en un laminador como PrusaSlicer, OrcaSlicer o Cura.
2. Comprobá las dimensiones en **milímetros** y la orientación de la pieza.
3. Revisá paredes, capas, soportes y posibles detalles frágiles.
4. Imprimí primero una pieza de prueba.
5. Para uso alimentario, evaluá por separado el material, el proceso de fabricación y la limpieza. No presupongas que el PLA o cualquier otro filamento es apto para contacto con alimentos.

## Si algo falla

- **El diseño sale incompleto:** revisá el contraste de la imagen y los contornos vectorizados.
- **Hay islas separadas:** comprobá las conexiones y los puentes entre partes del cortante.
- **El modelo es frágil:** aumentá el espesor o simplificá detalles muy finos.
- **No permite exportar:** leé los mensajes de validación; pueden señalar una geometría abierta o no imprimible.
- **La imagen es demasiado compleja:** probá con una versión más simple o de mayor contraste.

Para informar un problema, abrí una [incidencia en GitHub](https://github.com/MaharBa264/CookieForge/issues).

## Verificar el código

```bash
pnpm run check
pnpm run test:run -- --maxWorkers=1
pnpm run build
pnpm run test:smoke
```

¡A diseñar! 🍪
