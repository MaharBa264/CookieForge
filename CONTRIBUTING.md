# Cómo colaborar con CookieForge

¡Gracias por querer contribuir! CookieForge es un proyecto de código abierto orientado a diseñar cortantes y sellos para galletas imprimibles en 3D.

## Idioma del proyecto

**El español es el idioma principal** de la interfaz, documentación, tutoriales, mensajes y ejemplos. Consultá [las convenciones de idioma](docs/CONVENCIONES_ES.md). Conservá los nombres de APIs, dependencias, archivos y formatos cuando traducirlos pueda romper compatibilidad.

## Informar errores y proponer mejoras

Antes de abrir una incidencia, comprobá si ya existe otra similar. Incluí una descripción clara, pasos para reproducir el problema, resultado esperado y resultado observado. Adjuntá capturas, archivos de ejemplo y datos del navegador o sistema operativo cuando sean útiles. No publiques credenciales ni información privada.

Las propuestas de nuevas funciones también se registran mediante [incidencias](https://github.com/MaharBa264/CookieForge/issues). Explicá qué problema resuelven y, si podés, acompañalas con un ejemplo.

## Preparar el entorno

Se requieren **Node.js 22.12 o posterior** y **pnpm 10.33.4**.

```bash
git clone https://github.com/MaharBa264/CookieForge.git
cd CookieForge
pnpm install --frozen-lockfile
pnpm run dev
```

El servidor local suele estar disponible en `http://localhost:5173/`.

## Proponer cambios

1. Creá una rama a partir de la versión que corresponda y evitá modificar directamente `main`.
2. Realizá cambios pequeños y enfocados.
3. Conservá la compatibilidad de los documentos existentes y evitá alterar el motor geométrico sin pruebas.
4. Escribí o actualizá las pruebas pertinentes.
5. Ejecutá las verificaciones antes de enviar una solicitud de incorporación (*pull request*).
6. Explicá el cambio, sus límites y cómo lo probaste.

```bash
pnpm run check
pnpm run test:run -- --maxWorkers=1
pnpm run build
pnpm run test:smoke
```

Para revisar las dependencias, también podés ejecutar `pnpm audit --audit-level=moderate`.

## Convenciones de código

- Utilizá TypeScript con tipado estricto.
- Preferí funciones y componentes pequeños, con responsabilidades claras.
- Mantené separadas la lógica de interfaz y la lógica geométrica.
- Conservá los nombres existentes de componentes, tipos y funciones cuando renombrarlos implique cambios innecesarios.
- Agregá comentarios explicativos en español, especialmente para restricciones geométricas y decisiones de compatibilidad.
- Respetá las convenciones de Svelte 5 ya utilizadas en el proyecto.

## Pruebas recomendadas

Además de las pruebas automáticas, comprobá los casos que correspondan al cambio: SVG con varios trazados, imágenes rasterizadas, contornos con huecos, límites de parámetros, funcionamiento táctil, guardado y recuperación de proyectos, y apertura de los archivos exportados en un laminador.

**No basta con que la vista 3D se vea bien:** las geometrías exportadas deben superar las validaciones existentes.

## Seguridad y compatibilidad

- No introduzcas llamadas a servicios externos en funciones previstas para trabajar sin conexión.
- No incorpores claves ni tokens al repositorio.
- No alteres los formatos V1–V4 sin un plan de migración y pruebas de compatibilidad.
- No declares que una pieza es apta para contacto alimentario sin evidencia específica.
- Conservá la licencia y los avisos de atribución del proyecto original.

## Convivencia y licencia

Se espera una colaboración respetuosa, constructiva e inclusiva. No se admiten acoso, discriminación ni divulgación de datos privados. Las contribuciones se distribuyen bajo la licencia MIT del repositorio.

¡Gracias por ayudar a construir CookieForge! 🍪
