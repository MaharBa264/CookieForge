# Decisiones técnicas para las sesiones Hermes

Este documento reúne las decisiones duraderas anteriormente registradas en `AGENT_CONTEXT.md`. Git conserva el historial de trabajo y el contexto breve solo el estado necesario para retomarlo.

## Dominio y persistencia

- La unidad lógica es el milímetro. STL no guarda unidades; las coordenadas se expresan en mm.
- La escena Three.js usa Y como eje vertical. Las exportaciones de fabricación usan Z como eje vertical y se apoyan en `Z = 0`.
- `DesignDocument.kind` es el único discriminante funcional; `parameters.mode` se conserva por compatibilidad con V1.
- Un tipo futuro permanece como `never` hasta que existan su contrato y su proceso de generación.
- Cualquier cambio incompatible del esquema persistido requiere una nueva versión y una migración explícita.
- `targetSize` reemplaza el factor abstracto anterior `scale`; la migración histórica convierte `scale: 1` en 75 mm.
- Los datos de IndexedDB vuelven a pasar por `parseDesignDocumentV1`; los datos corruptos provocan un error explícito.
- Si falla la apertura de IndexedDB, se elimina del caché para permitir un nuevo intento en la siguiente llamada, sin reintentos automáticos en bucle.
- El códec de proyectos sigue siendo puro: las API `File`, las descargas y la interfaz pertenecen a los adaptadores.
- La migración de datos antiguos utiliza una fábrica UUID inyectable para evitar colisiones y facilitar las pruebas.
- El almacén del documento valida antes de publicar, construye copias defensivas y congela profundamente las instantáneas persistidas.

## Generación y propiedad de recursos Three.js

- Antes de devolver correctamente el resultado, la receta es propietaria de su `Object3D`; después, la propiedad pasa al código que la llamó.
- Un error o cancelación posterior a la generación exige liberar los recursos exactamente una vez antes de propagar el error.
- `GeneratedArtifact` contiene objetos de ejecución y nunca debe serializarse.
- Los roles de los artefactos se relacionan con `DesignKind` en TypeScript.
- Una promesa de receta rechazada se retira del caché con una comprobación de identidad para permitir reintentos posteriores sin bucles.
- El registro es local y de carga diferida; no debe importar estáticamente JSCAD ni generadores pesados.
- El orquestador publica la nueva instantánea antes de liberar el resultado reemplazado; si falla, conserva el último resultado válido.
- Toda modificación confirmada lleva una revisión monótona: prevalece la reentrada más reciente.
- Las funciones síncronas de barrera o liberación pueden llamar nuevamente a `clear()` o `dispose()` sin ciclos: la operación reentrante comienza, pero la función no bloquea su propio vaciado.
- La generación por lotes no publica nada antes de completarse y destruye todos los artefactos parciales si falla o se cancela.
- Al desmontar Batch, vaciar primero el almacén y las referencias de la interfaz; luego liberar los recursos Three.js correspondientes.

## Geometría y exportaciones

- Validar siempre el objeto original y su copia transformada para fabricación.
- El validador cuenta componentes por adyacencia de triángulos, no por cantidad de mallas.
- No garantiza detectar exhaustivamente las autointersecciones entre triángulos.
- Un detalle menor que los desplazamientos de pared puede cambiar la topología: rechazarlo en vez de suavizarlo silenciosamente.
- Los sellos requieren una base común y una única envolvente final.
- `repairBooleanCapTriangles` debe seguir rechazando por defecto los casos inválidos: no ampliar sus umbrales para disimular geometría incorrecta.
- El mapa de calor es metadato exclusivo del visor; la exportación STL lo ignora.
- Un 3MF es un paquete OPC/ZIP, nunca un XML renombrado.
- Preservar exactamente `byteOffset` y `byteLength` del `DataView` STL.
- La vista previa de capas no es un laminador ni estima tiempos; no generar código G ficticio.

## Seguridad, interfaz y rendimiento

- Un SVG importado pasa por una lista de elementos geométricos permitidos; no ampliar silenciosamente esa frontera de seguridad.
- Revisar todo uso nuevo de `{@html}` con datos no confiables.
- La clave de Gemini permanece local al navegador y nunca debe incorporarse a Git ni mostrarse de nuevo.
- Los errores de campos utilizan `aria-describedby`, `aria-invalid` y avisos que evitan duplicaciones.
- Las secciones de parámetros usan los elementos nativos `<details>/<summary>`, objetivos de al menos 44 px y `:focus-visible`.
- JSCAD, Stamp y los paneles opcionales siguen cargándose mediante `import()` para proteger el tamaño inicial de la aplicación.
- Las imágenes rasterizadas se decodifican en Canvas/interfaz; ImageTracer se ejecuta en un Worker cancelable limitado a 16 MP.

## Entorno y publicación

- Con `pids.max=256`, `ERR_INSUFFICIENT_RESOURCES` puede deberse a saturación de Chromium y no al código de carga diferida.
- Tailscale permanece fuera del repositorio. El script de vista previa debe limpiar Serve al detenerse.
- La lista de hosts permitidos de Vite se limita al host privado previsto; no usar `allowedHosts: true`.
- Dato histórico del proyecto original: protección de `main` verificada mediante la API de GitHub el 08/08/2026, con comprobación estricta `validate`, historial lineal y prohibición de publicaciones forzadas y eliminación de rama. No acredita la configuración actual de CookieForge.
