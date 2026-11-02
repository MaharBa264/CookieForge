# Límites de tamaño de dependencias y paquetes JavaScript

## Alcance

Svelte 5.57.2, svelte-check 4.7.6, Vite 7.3.7 y Three.js 0.186.1, consolidados a partir de las solicitudes de Dependabot #61/#56 del proyecto original. No se modificó la lógica de la aplicación ni de persistencia. Los límites siguen siendo **200 KiB por archivo de entrada** y **600 KiB por cada otro fragmento JavaScript**.

La configuración anterior agrupaba el núcleo de Three.js y todos sus ejemplos (controles, cargadores y exportadores) en un único fragmento. La solución separa esos complementos del núcleo y permite almacenar en caché, de forma independiente, el entorno compartido de Svelte. Esto reduce el tamaño de cada fragmento, pero no necesariamente la transferencia total al inicio: las dependencias síncronas siguen siendo síncronas y pueden precargarse.

El complemento que controla el presupuesto ahora se ejecuta en la fase `post generateBundle` y cuenta bytes UTF-8, incluida la reescritura de precarga de Vite. Tres pruebas de regresión cubren la fase, los límites exactos y los bytes de caracteres no ASCII. Los archivos finales se midieron independientemente después de compilar.

## Evidencia local obtenida

- Antes de la corrección, la actualización conjunta de dependencias fallaba: `three-vendor` ocupaba 601,6 KiB, por encima del límite de 600 KiB. La integración continua existente de #61 también mostraba un archivo de entrada de 201,2 KiB, superior al límite de 200 KiB.
- Instalación con archivo de bloqueo congelado correcta; auditoría sin vulnerabilidades conocidas.
- `pnpm check`: 0 errores y 0 advertencias.
- Batería completa de Vitest: **968 pruebas aprobadas en 64 archivos**, con un solo proceso de trabajo y sin paralelismo entre archivos.
- Compilación de producción correcta, 677 módulos; archivo de entrada final de 162738 bytes, núcleo de Three.js de 561528 bytes, complementos de 53740 bytes y entorno de Svelte de 46981 bytes. Todos los archivos JavaScript finales quedaron por debajo de su presupuesto correspondiente. No se aumentaron los límites.
- Prueba funcional con Chromium sobre `vite preview` sirviendo la compilación real, con almacenamiento descartable del navegador: importación PNG, generación de geometría actual y descarga STL, guardado/recarga/reapertura local, ausencia de desbordamiento horizontal a 375 px y cero errores de página, consola o solicitudes fallidas.
- Script de prueba fuera del repositorio: `/workspace/reports/dependency-bundle-smoke.mjs`. Los intentos iniciales fallaron porque faltaba abrir el panel o navegar hasta la exportación; un intento de diagnóstico agotó el tiempo de espera. Esos intentos **no** se cuentan como validaciones exitosas. La última ejecución completa aprobó todas las aserciones y cerró el navegador y el servidor.

## Límites y publicación

No constituye una certificación del dispositivo ni de impresión física; permanece sin cambios la limitación geométrica existente de los círculos suavizados (*antialiased*). No se rediseñó la interfaz. Las ramas de Dependabot se reemplazan únicamente después de verificar la integración. Se requieren las comprobaciones reales de Quality/CodeQL en el commit de la solicitud de incorporación y las ejecuciones posteriores a la fusión sobre el SHA exacto de `main`. Deben conservarse las protecciones de rama: sin excepciones de administrador, publicaciones forzadas ni eliminación de ramas. La reversión se realiza mediante una solicitud de incorporación específica que revierta los cambios.

> **Contexto:** las cifras y los números de solicitudes anteriores son evidencia histórica del proyecto original, no resultados medidos nuevamente en CookieForge.
