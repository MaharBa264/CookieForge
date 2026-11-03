# CookieForge 1.0 — contrato de cierre

**Objetivo de producto:** producir, guardar, reabrir e imprimir un conjunto cortante + sello para una carta piloto del tarot celestial, con dimensiones verificadas. No pretendemos entregar un CAD generalista antes de llegar a una versión utilizable.

**Estado:** en desarrollo. Las comprobaciones de GitHub certifican software, NO una prueba física de impresión ni una carta compleja terminada. Los documentos de requisitos históricos son ideas de alcance más amplio, no condiciones de salida para 1.0.

## Alcance congelado de la versión 1.0

- Importar un SVG preparado y conservar su fuente.
- Editar/asignar contornos y parámetros con el taller existente.
- Obtener un **cortante imprimible** con borde exterior y hasta seis relieves interiores **cerrados**, de diferentes alturas, unidos mediante puentes, dentro de las restricciones verificadas.
- Guardar y reabrir el diseño en `.ccd.json` V5, y regenerar **STL y 3MF válidos** después de reabrir.
- Crear un **sello independiente** usando la receta Stamp existente si el diseño requiere más detalles de los que tolera el cortante V5.
- Probar una **carta piloto completa** antes de prometer la producción de las 78.

### No bloquean 1.0 (backlog posterior)

- Grabado negativo automático sobre cortante V5.
- Curvas y líneas SVG abiertas convertidas directamente en paredes imprimibles.
- Contornos exteriores cóncavos arbitrarios, SVG agrupados/transformados, red ilimitada de puentes.
- Generación automática de todo el mazo de 78 cartas, IA, lotes, exportación G-code, perfiles de impresión universales.
- Eliminar los puentes mediante ingeniería no probada o una base compleja no validada.

Estas funciones pueden ser útiles, pero no se vuelven **requisitos tácitos** al avanzar. Si la ilustración piloto contiene trazos abiertos, se preparan como contornos cerrados o se usa el sello independiente; no se finge que el motor acepta geometría que rechaza.

## Puertas de salida (en este orden)

- [x] **Base recuperable:** documento V5, selecciones, operaciones por contorno, alturas independientes y puentes; pruebas automáticas existentes.
- [x] **Generación restringida:** STL/3MF con hasta seis relieves y conexión en árbol, una malla estanca bajo las restricciones conocidas.
- [x] **Ensayo integrado CI:** guardar V5, decodificar sin pérdidas, regenerar y serializar STL/3MF en una sola prueba. Validado en el commit `07585484` ([GitHub Actions](https://github.com/MaharBa264/CookieForge/actions/runs/41741679385)).
- [ ] **Carta piloto:** La Estrella XVII tiene dos SVG de prueba (`examples/tarot-estrella-xvii/`): cortante exterior y sello simbólico simplificado. **Ambos pasaron la prueba integrada de guardado, reapertura, STL/3MF y dimensiones** en [`7946bb5f`](https://github.com/MaharBa264/CookieForge/actions/runs/41743214463). Pendiente: vectorizar fielmente la ilustración original, comprobar la visualización y las medidas en laminador, y revisar orientación/espejado antes de imprimir.
- [ ] **Ensayo físico:** imprimir al menos una pieza, comprobar que sea íntegra, estable y que marque masa de galletitas. Ajustar únicamente problemas comprobados en ese ensayo. Registrar boquilla/material/orientación y resultados.
- [ ] **Release 1.0:** pasar la CI en el commit definitivo, actualizar instrucciones de uso y limitaciones, preparar tag/release después de aprobación explícita. No fusionar a `main` automáticamente.

## Decisión práctica para el tarot

La calidad visual del tarot no se sacrifica para meter todo en el mismo cortante. La solución 1.0 preferida es **cortante exterior + sello de detalles independiente** cuando la imagen contiene muchos trazos finos, abiertos o curvos. El cortante V5 con relieve integrado queda como alternativa para motivos sencillos. Los 78 diseños vendrán **después de aprobar una carta piloto**, usando el mismo formato gráfico.

## Definición de «terminado»

1. Un usuario puede importar una carta piloto preparada, obtener geometría exportable y volver a abrir el proyecto sin perder sus ajustes.
2. Un laminador acepta el STL de las piezas y la validación comprueba el tamaño y una geometría estanca.
3. Se imprimió y probó al menos un conjunto físico en masa.
4. Hay guía reproducible, CI verde, límites expresos y versión etiquetada.

**Una función que no pasa estas puertas no cuenta como terminada.** Tampoco se amplía el alcance cada vez que surge una idea atractiva. El primer hito de negocio es una galletita lograda, no una lista infinita de características.
