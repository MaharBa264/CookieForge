# Validación del flujo de proyectos locales — Lote REA 1

## Alcance

Integración original: `141b774cb12632b69d27d49d9932018160e5bb08`, rama `feature/local-project-workflow`, solicitud de incorporación #57 basada en #41. Los commits posteriores de documentación no modificaron la aplicación. No se autorizó fusionar ni publicar en producción sin un permiso explícito de fusión.

Este lote conecta la sesión canónica con la aplicación, el guardado en IndexedDB, la biblioteca, las confirmaciones, la importación/exportación `.ccd.json`, el historial, los parámetros, la generación, el visor y las exportaciones geométricas. No incluye los lotes posteriores.

## Revisiones y procedencia

- Conformidad integrada: `deleg_aeeb6bd6`, PASS.
- Calidad independiente: `deleg_b958751c`, APPROVED.
- Revisiones estáticas de 17 archivos; no se demostró ningún defecto P1/P2. No equivalen a ejecuciones en navegador.
- SHA-256 de la instantánea revisada: `48e9e63739d290519362e865c10f79be7a99dee3c388926fd71cb971f9a429f6`.
- SHA-256 de los mismos 17 archivos publicados: `e3ee4951fdeceb51b35c271f95ab299a7299a3e4d260da29a4273d33072e2f5c`.
- Convención: rutas ordenadas lexicográficamente; para cada una, ruta UTF-8 + NUL + bytes del archivo + NUL.
- Única diferencia posterior a la revisión: un salto de línea LF adicional al final de cada prueba `App.export-validity`, `App.local-projects`, `BatchMode.lifecycle` y `ThreeViewer.project-viewport`, rechazado por la comparación indexada. En cada caso se demostró `anterior == nuevo + b'\n'`; todos los demás archivos quedaron intactos. El código de aplicación fue idéntico a la instantánea aprobada. Después se repitieron las cuatro pruebas: 57 aprobadas.

## Comprobaciones locales sobre el commit exacto

Ejecutadas en `141b774cb12632b69d27d49d9932018160e5bb08`, con directorio temporal aislado, `GOMAXPROCS=2`, `UV_THREADPOOL_SIZE=2` y Vitest con un solo proceso:

```sh
pnpm exec vitest run --pool=threads --maxWorkers=1 --fileParallelism=false
pnpm check
pnpm exec vitest run src/lib/utils/__tests__/exportArtifacts.smoke.test.ts --pool=threads --maxWorkers=1 --fileParallelism=false
pnpm build
git diff --check
```

Resultados obtenidos: **830 pruebas en 55 archivos**, comprobación de tipos **0 errores / 0 advertencias**, prueba funcional **3 pruebas**, compilación y comprobación de diferencias correctas. Se conservó la advertencia de fragmento Three.js superior a 600 kB; no se cambiaron los límites.

## Prueba real en Chromium — Observación puntual

13 etapas aprobadas en la copia local antes del commit, con código de aplicación idéntico. Sin errores JavaScript, de consola ni de solicitudes en la página principal; tampoco hubo errores JavaScript en el contexto de falla. Los informes y capturas originales están **fuera del repositorio** y no se archivaron aquí: `/workspace/.hermes-tmp/repos/cookie-cutter-designer-4f8693bb50/commands/native-app-1791626877971/`. Ejecutor: `/workspace/reports/local-project-app-browser.mjs`, Playwright Core 1.58.2 y Chromium headless shell 1208, WebGL por software.

1. Biblioteca accesible con la aplicación vacía.
2. Círculo creado, renombrado y guardado desde la interfaz real en IndexedDB.
3. Recarga completa y reapertura: dimensiones y nombre idénticos; proyecto sin cambios pendientes.
4. Diálogo nativo: foco inicial en Cancelar; cancelar conserva el proyecto con cambios sin guardar.
5. Descarga STL real: 576 triángulos, 28.884 bytes; longitud binaria verificada.
6. SVG real con dos contornos próximos: guardado, colisiones, corrección automática desactivada; clic forzado que conserva posiciones, documento, historial y estado sin cambios.
7. Canvas procesado no vacío; PNG serializado idéntico píxel por píxel a la vista previa (64 × 64).
8. Transferencia del PNG procesado, vectorización raster y espera real hasta obtener un resultado canónico listo.
9. Cuadrícula desactivada y ejes activados conservados después de guardar, recargar y reabrir el raster.
10. Importación de JSON inválido: error visible y proyecto guardado actual preservado.
11. Proyecto de sello creado con fábrica y códec reales, importado desde archivo en la interfaz: sin guardado automático; guardado, recarga y reapertura conservan el modo Sello; STL real de 804 triángulos y 40.284 bytes.
12. Eliminación de proyecto inactivo: Cancelar lo conserva; confirmar lo elimina sin reemplazar el proyecto activo.
13. Error `SecurityError` de IndexedDB inyectado en un contexto aislado: guardado rechazado, documento modificado preservado, copia de seguridad JSON portable descargada y leída. No fue una falla espontánea del navegador.

Las evidencias de condiciones de carrera asíncronas, reentradas e historial exacto permanecen en las pruebas versionadas; no debe afirmarse que todas se reprodujeron de forma nativa.

## Intentos fallidos conservados, no contabilizados como éxitos

- Los primeros selectores de STL eran demasiado estrictos respecto de su nombre accesible: se corrigió el ejecutor, no la aplicación.
- Los predicados asíncronos de `waitForFunction` resultaron insuficientes: el código instalado de Playwright `frames.js:1243–1288` comprueba si el resultado es verdadero antes de esperar; una Promise puede resolver `false` sin repetir la condición. Se precargaron importaciones, se usaron predicados síncronos y se repitió la prueba real. Los antiguos indicadores «ready» obtenidos así no prueban que se esperó la generación.
- La ejecución `native-app-1791626451286` se interrumpió por una recarga de Vite después de optimizar de forma diferida `imagetracer`, confirmado en `server.log`. Se repitió por separado con la caché preparada, sin modificar el código.
- Un intento de limpiar el final de archivo mediante texto devuelto por la herramienta alteró un simulador al reemplazar `()` por un marcador de ocultamiento; el analizador rechazó la prueba. Se restauró el literal y se demostró igualdad byte a byte con el índice antes de repetir y publicar. No quedó ningún cambio de comportamiento.

## Límites e integración continua

- La integración continua remota debe revisarse en el commit publicado exacto. Las comprobaciones locales no garantizan su aprobación.
- Ejecución histórica Quality `38005840408`: falló la auditoría de dependencias con 12 vulnerabilidades (1 baja, 6 moderadas y 5 altas). No se eludieron controles, redujeron umbrales ni mezclaron actualizaciones de dependencias con este lote.
- No certifica producción, todos los navegadores, garantías de comparación e intercambio entre pestañas ni impresión física.
- V1 guarda el SVG vectorizado, no los bytes raster originales. Batch externo no puede guardarse; se omiten metadatos globales si su procedencia es heterogénea o desconocida.
- No se agregaron cuentas, nube ni guardado automático. La recuperación y las funciones posteriores tuvieron ramas y solicitudes separadas.

> **Nota CookieForge:** se conserva el registro histórico del proyecto original; estas pruebas no se ejecutaron nuevamente al traducir el documento.
