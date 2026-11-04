# Colecciones locales — primer incremento

## Objetivo

Agrupar diseños sin cambiar el contrato de los documentos `.ccd.json` V1–V5 ni el almacén IndexedDB de proyectos. Las colecciones son metadatos separados, guardados en `localStorage` bajo `cookieforge-collections-v1`; la colección activa se recuerda bajo `cookieforge-active-collection-v1`.

## Uso actual

1. Entrar en **Proyectos locales**.
2. Escribir un nombre y elegir altura inicial del cortante y del sello (en mm); pulsar **Crear colección**.
3. En **Colección activa para nuevos diseños**, seleccionar la colección o **Sin colección**.
4. Importar una imagen o crear un diseño nuevo mediante el flujo habitual. Los parámetros de tamaño se copian **una sola vez** desde la colección activa al nuevo documento, usando `sizeMode: height`.
5. Modificar las medidas del diseño individual libremente; quedan persistidas en ese proyecto como siempre.
6. En la lista de proyectos guardados, usar **Colección** para asociar o desasociar un diseño ya existente. Esa asociación no cambia su geometría.

## Aislamiento y recuperación

- Los documentos antiguos no se migran, reescriben ni renombran al crear o asociar una colección.
- Los diseños sin colección siguen apareciendo en la biblioteca habitual.
- Cambiar de colección activa no modifica diseños abiertos ni guardados.
- El archivo `.ccd.json` representa **solo un diseño**; no incluye todavía los metadatos de colección.
- Las colecciones residen en **ese navegador y origen**; limpiar sus datos puede eliminarlas. Exportar `.ccd.json` sigue siendo la opción de respaldo para los diseños.
- Si falla la lectura del catálogo, no se aplican parámetros silenciosamente al diseño nuevo. Si falla su guardado, se muestra un error.
- Borrar una colección es una operación de dominio implementada pero todavía no expuesta en la interfaz; nunca borra diseños.

## Limitaciones del primer incremento

- El tamaño heredado corresponde a la **altura objetivo** (`targetSize` + `sizeMode`), no garantiza una anchura exacta de 75 mm; eso depende de la proporción del trazado y del espesor final de paredes.
- Cortante y sello siguen siendo **documentos separados** que pueden pertenecer a la misma colección.
- Todavía no hay edición de parámetros de colecciones existentes, exportación/importación de colección completa, filtrado por colección ni agrupación de dos piezas dentro de una carta.
- No hay sincronización entre dispositivos, usuarios o pestañas; no es una solución de respaldo de la colección.

## Regresión y validación

Ejecutar `pnpm run check`, `pnpm run test:run -- --maxWorkers=1`, `pnpm run build` y `pnpm run test:smoke` en la rama de desarrollo. Revisar GitHub Actions para el SHA definitivo. Verificar manualmente que un diseño anterior se abra sin cambios, que un nuevo cortante adopte la altura de la colección y que editar la medida del diseño no altere los demás.
