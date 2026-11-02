# Validación del renderizado y el zoom del visor

## Alcance validado

Rama original `fix/viewer-shading-zoom`, creada desde `origin/main` verificado en el commit `61c14edc8e070de10833248a135c215e2cfba139`. La validación siguiente precedió a la publicación; las huellas del código se volvieron a verificar antes del commit. El estado de fusión y despliegue debe consultarse en GitHub, no deducirse de este informe. La vista previa existente de Cloudflare no fue reemplazada por esta validación local.

La geometría de fabricación y los formatos de proyecto no cambian. El visor construye una copia independiente de los buffers, con normales suavizadas en las curvas y separadas en las aristas pronunciadas. Las posiciones y el orden de los triángulos permanecen idénticos. Los materiales de la aplicación se comparten en modo de solo lectura; el mapa de espesor tiene sus propias copias y lee las mediciones de la geometría de origen. La selección mantiene el vínculo con la pieza original para los visores editables anteriores.

El zoom tiene límites relativos al tamaño, un plano de recorte cercano adaptado, acercamiento hacia el puntero y botones +/− identificados, accesibles mediante teclado y de al menos 44 px. El botón Ajustar vista restablece el encuadre.

## Evidencias realmente obtenidas

Informe completo: `/workspace/reports/viewer-shading-zoom-v69081tb/`.

| Verificación | Resultado |
|---|---|
| Desarrollo guiado por pruebas sobre el visor real con renderizador de prueba | 5 aserciones ROJAS antes de la corrección; VERDES después |
| Pruebas específicas: renderizado, recursos, visor, mapa de calor y protecciones de exportación | 31/31 |
| Batería completa | 1.249/1.249, 95 archivos |
| Comprobación de tipos Svelte/TypeScript | 0 errores, 0 advertencias |
| Pruebas funcionales de exportación | 4/4 |
| Compilación de producción y presupuestos | Correctos |
| Conjunto círculo/elipse/huevo | 24/24 controles; 24 STL idénticos byte por byte a la referencia anterior a la corrección |
| Chromium real en escritorio | Círculo y huevo × cortador/Relieve/Hueco a 75 mm; exportaciones idénticas antes y después del zoom y mapa de calor |
| Chromium móvil simulado, 390 × 844 | Círculo × cortador/Relieve/Hueco; botones, teclado, mapa de calor y exportaciones idénticas |
| Tema oscuro móvil | Cambio mediante el botón real; clase `dark-mode` y fondo de escena `111827` verificados |
| Zoom nativo de escritorio | Acercamiento más allá del límite anterior, con objetivo realmente observado mediante llamadas de los controles |
| Recursos | Copias liberadas sin destruir los originales; servidor y navegador de validación detenidos |

Las exportaciones del conjunto cubren sellos de 10/75/200 mm y cortadores de 75/200 mm, sin agarre, con una plataforma de prueba suficientemente grande. No validan parámetros nuevos ni contornos fuera de este conjunto.

### Trazabilidad e intentos

`runtime-inputs.json` relaciona las capturas con el HEAD de base, los archivos locales sin commit y una compilación aislada en la que cada archivo tiene su hash. Los archivos servidos a Chromium se compararon con esa compilación y se verificaron las huellas del código después de las comprobaciones. No presentar estas capturas como si correspondieran al commit publicado.

El primer ejecutor utilizó demasiado pocos eventos de rueda para alcanzar la distancia esperada. El segundo terminó los seis casos de escritorio, pero falló después en la comprobación móvil: plegaba el panel de exportación durante su apertura automática. Se conservaron las evidencias de estos intentos. Los seis casos de escritorio se revisaron individualmente con sus hashes; la prueba móvil independiente, corregida para esperar el estado ARIA del panel, terminó correctamente. Un primer intento del tema utilizó la clase equivocada y se descartó: luego se verificó el tema oscuro mediante el control real. No se modificó el producto para ocultar esos errores del sistema de pruebas.

## Límites

- No hubo una nueva impresión física: la ausencia de efectos de esta corrección sobre la fabricación se demuestra mediante identidad de archivos STL, no con una prueba material.
- Sin iPhone/Safari real, nueva validación de Firefox/WebKit ni lector de pantalla. El móvil y las zonas táctiles se simularon en Chromium.
- Las curvas siguen siendo las mismas aproximaciones poligonales: no se aumentó la resolución de los contornos ni se aplicó simplificación oculta. El suavizado afecta únicamente la iluminación.
- La imagen original de Rza no estaba accesible en el entorno aislado; la corrección aborda el defecto reproducido sin afirmar que se identificó su píxel exacto.

## Reanudación

Conservar `AGENT_CONTEXT.md`, mantenido localmente y excluido del commit. Rza autorizó el commit y la fusión de este lote; la publicación debía realizarse mediante una solicitud de incorporación y verificaciones sobre el HEAD exacto. Cualquier actualización independiente de la vista previa de Cloudflare requería la autorización correspondiente. Mensaje de commit original: `fix viewer lighting and detail zoom without changing exports`.

> **Nota CookieForge:** este informe describe pruebas históricas del proyecto de origen. Traducirlo no equivale a ejecutarlas nuevamente.
