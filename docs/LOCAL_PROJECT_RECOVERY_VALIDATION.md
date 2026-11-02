# Validación — Borradores de recuperación local (REA, lote 1b)

## Entrega y alcance

Fecha: 10/10/2026. Repositorio original `razorglyon/cookie-cutter-designer`, copia local `/workspace/cookie-cutter-designer`. Rama `feature/local-project-recovery`, **PR #59 en borrador**, base `fix/dependency-audit` / #58. El programa REA y Continue1558447158800420917 autorizaban commits, publicaciones y solicitudes de incorporación; **no autorizaban fusionar ni desplegar sin un permiso específico**.

- Fundamentos: `fc757b1140a20feda926ee348e6173b3493808d0`, incorporación de borradores aislados de recuperación local.
- Aplicación/interfaz: `c3d9fbacb4f30fe22da947011112538fa01d8d26`, conexión de borradores de recuperación al flujo de la aplicación.
- El siguiente punto de control documental no modificó código fuente, pruebas, manifiesto, archivo de bloqueo ni configuración.
- La base de producto #57 y la corrección de seguridad #58 permanecían separadas, abiertas y sin fusionar; no se cerraron solicitudes de Dependabot.

## Contrato implementado

Base IndexedDB independiente `cookie-cutter-designer-recovery`, versión 1, almacén `drafts`; estructura estricta con formato, versión, UUID `draftId`, `savedAt` y `documentV1`, separada, congelada y revalidada al leer y escribir. No se modifica el esquema de proyectos con nombre.

Un UUID nuevo por instancia/época; un mismo proyecto abierto en varias pestañas genera borradores independientes. Espera de 750 ms antes de guardar, cola serializada y confirmación únicamente después de completar la transacción. Las instantáneas del proyecto anterior conservan su ubicación y no reemplazan el estado del nuevo.

Reanudación explícita mediante `workflow.startNew` y comprobación de guardar/descartar/cancelar: captura antes de la primera espera, verificación de la versión mostrada, e invalidación de reanudaciones tardías si hubo ediciones, importaciones, cambios de sesión o desmontaje. No hay recuperación automática ni eliminación del borrador de origen. Eliminación confirmada mediante comparación atómica en una transacción; conflicto visible y actualización si otra pestaña cambia la versión.

Los borradores **se conservan después de Guardar proyecto** y pueden eliminarse expresamente. Los errores, reintentos y el estado de guardado automático son distintos de «Guardado localmente»; la exportación `.ccd.json` permite obtener una copia de seguridad. Vaciado de escrituras en `pagehide` o `visibilityhidden` como mejor esfuerzo; drenaje al desmontar normalmente.

## Procedencia de las comprobaciones

- Desarrollo guiado por pruebas de los fundamentos: resultado rojo real, seguido de 52 pruebas específicas aprobadas; ejecución global principal de 882 pruebas en 57 archivos y comprobación de tipos 0/0 antes del commit.
- Conformidad del núcleo `deleg_908eab2c`: PASS; calidad `deleg_10d31ca1`: APPROVED. Digest4 de rutas ordenadas, UTF-8 + NUL + bytes + NUL: `2fc266d643616285fed2513f3e46f445ec07d5dbe2a0352d120adf16b604b2ec`, idéntico a los bytes publicados.
- Desarrollo guiado por pruebas de integración: propuesta inicial roja, luego 73 pruebas específicas aprobadas, incluidas `App.local-projects` y `App.export-validity`, sin modificar pruebas vecinas.
- **Ejecución global principal: 915 pruebas / 59 archivos**; comprobación 0 errores / 0 advertencias, 3 pruebas de exportación, compilación correcta y `pnpm audit` con umbral moderado sin avisos conocidos. Directorio temporal aislado, Vitest con un proceso y validaciones secuenciales. Advertencia previa de fragmento Three.js mayor a 600 kB.
- Conformidad de interfaz `deleg_cfc14922`: PASS; calidad `deleg_8fddb9ad`: APPROVED. Digest4: `7cb502cea7a816d2b4831244319a8ac20fdb28005df83eba3df8177648f7c1f6`, comprobado e idéntico al commit `c3d9fba`. Revisiones de solo lectura, no ejecuciones adicionales.

## Chromium real — observación puntual externa al repositorio

Script: `/workspace/reports/local-project-recovery-browser.mjs`. Informe: `commands/native-recovery-1791636402629/report.json` bajo el directorio temporal del repositorio. Servidor Vite `127.0.0.1:4325`, contexto de navegador nuevo y datos de prueba descartables; resolución 1365 × 900 y luego 375 × 812. Se probó la aplicación real, sin montaje alternativo de componentes ni datos nativos simulados. Solo se inyectó deliberadamente una falla de cuota en `put` del almacén de recuperación; lo demás utilizó la interfaz y transacciones IndexedDB reales.

**11 etapas aprobadas:**

1. Crear/guardar un proyecto con nombre y luego editarlo: borrador confirmado igual al JSON exportado; biblioteca sin cambios.
2. Recargar: se ofrece el borrador sin abrir automáticamente ningún documento.
3. Reanudar explícitamente la versión exacta con generación, estado modificado, borrador de origen y proyecto guardado preservados.
4. Dos pestañas editan el mismo ID de proyecto con UUID de borradores distintos; se conserva el borrador anterior.
5. Reanudación con cambios sin guardar: Cancelar nativo conserva documento y borrador.
6. Otra pestaña actualiza durante la confirmación de eliminación: la transacción comparativa rechaza la instantánea desactualizada.
7. Cancelar eliminación conserva; confirmar elimina solo el borrador elegido y devuelve el foco.
8. Falla de cuota inyectada solo en recuperación: error visible, copia JSON disponible y biblioteca intacta.
9. Tras restaurar el `put` nativo, reintentar confirma la última instantánea aceptada.
10. Guardar proyecto explícitamente modifica el proyecto con nombre sin purgar el borrador.
11. Escritorio y ancho de 375 px: capturas revisadas, sin desbordamiento horizontal global.

Listas de errores, errores de consola y solicitudes fallidas vacías. HEAD `fc757b1` y digest11 de fuentes/pruebas/manifiesto/bloqueo/configuración `fcf331130e40dc2e33148ae48621eb942395dbf8a8362eb8e3f279eb10b3a2d6` idénticos antes y después. Los mismos bytes se compararon con los blobs del commit `c3d9fba` antes de publicarlo. Por eso el SHA de recolección no se presenta como el SHA publicado en aquel momento: la igualdad de contenidos se demostró por separado.

## Límites y próximos pasos

El ejecutor del navegador, el informe y las capturas permanecen fuera del repositorio y no forman parte de la integración continua. Las capturas muestran partes visibles o desplazadas del panel, no todos los controles simultáneamente. No certifican lectores de pantalla, adaptación global a móviles, aplicación desplegada ni impresión física. Los 750 ms exactos no se midieron en las pruebas de aplicación/interfaz (se cubrieron en el núcleo); desmontar durante la pregunta de reanudación no es un caso explícito de la aplicación: las pruebas distinguen lectura retrasada y confirmación de eliminación.

No se garantiza conservar el último gesto antes de un cierre forzado, fallo o transacción sin terminar. No se incorporaron deshacer ni raster original después de recargar el formato V1. No hay purga automática, coordinación colaborativa ni resolución «última escritura gana» entre pestañas.

La integración continua final debe comprobarse sobre el commit exacto de #59; solo se preveía disparar Quality porque la base no era `main`. Los resultados locales no implican que la integración remota haya aprobado. No se ejecutó Deploy. Solo después de autorizar una fusión se permite revertir mediante solicitud de incorporación; no eliminar las bases de datos del usuario. Siguiente lote funcional original: importación fluida, lote 2, rama y solicitud separadas.

> **Nota CookieForge:** se trata de evidencias y autorizaciones históricas del proyecto original, no de pruebas repetidas en nuestra rama.
