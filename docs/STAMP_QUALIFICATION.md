# Calificación de sellos — Geometría validada localmente

## Veredicto vigente

**Corazón de 10 mm sin agarre corregido en ambos modos; validación local del 13/10/2026.** Las dos pruebas positivas que antes fallaban ahora aprueban; el conjunto de casos y la batería completa también. No se redujo ningún umbral de degeneración, no se simplificaron contornos ni se modificaron los formatos V1–V3.

Rama original `fix/stamp-qualification`, creada desde el commit local verificado `319d8cd`, remoto `razorglyon/cookie-cutter-designer`. La corrección completa la ampliación que antes no estaba confirmada en Git. Sin publicación, solicitud de incorporación, fusión, despliegue ni lotes B–E. La geometría y Chromium se calificaron en los casos siguientes; **Firefox/WebKit y la impresión física siguen siendo limitaciones independientes**.

## Causa y corrección del corazón pequeño

Los contornos eran correctos. En el corazón muestreado con 48 segmentos por curva, Earcut elegía triángulos diminutos cerca de la punta: una faceta tenía un área doble de aproximadamente 3,32e-6 mm². El validador final la rechazaba según el umbral existente y luego informaba una superficie abierta al excluir los triángulos degenerados de su análisis. No correspondía ocultar esa señal reduciendo el umbral ni rellenando la superficie.

`stampBodyGeometry.ts` conserva la triangulación anterior cuando produce triángulos seguros. En caso contrario:

- Una tapa sin huecos intenta un abanico hacia un vértice **interior**.
- Una tapa con un hueco busca una banda triangulada que utilice cada arista de ambos contornos; puntos de apoyo **interiores** permiten conectar los dos lados de una punta cóncava sin crear triángulos diminutos.
- Cada reemplazo debe tener triángulos con área positiva según el mismo umbral, todas las aristas originales con orientación correcta, aristas interiores emparejadas y el área esperada. Si no cumple, se rechaza.

Los puntos de apoyo no modifican los bordes ni el SVG. No se vuelve a muestrear, eliminar ni desplazar ningún vértice de contorno, ni se tapa la cavidad. La malla final y el STL siguen sometidos a los validadores sin cambios. Las búsquedas tienen límites de estados e intentos.

## Contrato demostrado — ROJO y después VERDE

Evidencias nuevas: `/workspace/reports/stamp-qualification-heart10-msx6cikz/`. Copia de los cambios y de la nota previa a reanudar en `before/`; diagnóstico exploratorio archivado fuera de `src`.

- `red-heart10.log`: las **dos** pruebas positivas anteriores fallan antes de la corrección por triángulos degenerados/superficie abierta.
- `red-cap-contract.log`: dos pruebas de contrato del generador plano fallan antes de la corrección por la misma causa.
- `stampBodyGeometry.test.ts` ejercita luego **16 variantes**: Relieve/Hueco, cuatro posiciones cíclicas de inicio y ambos sentidos de recorrido. Para cada una: **288 aristas del dibujo conservadas**, área de tapas, volumen analítico, una única envolvente y todos los triángulos por encima del umbral.
- Las dos pruebas originales no se omiten ni se convierten en rechazos esperados. Las huellas históricas siguen aprobando; los **16 STL que ya funcionaban** son idénticos byte por byte después de la corrección.

## Resultados realmente obtenidos

Todos los comandos exigentes utilizan el directorio temporal aislado validado por `/workspace/.hermes-tools/workspace-tmp.py`. `GOMAXPROCS=2`, `UV_THREADPOOL_SIZE=2`, Vitest con un solo proceso y sin paralelismo entre archivos; se conservaron registros, comandos, tiempos agotados y huellas.

| Comprobación | Resultado final |
|---|---|
| Pruebas específicas de geometría/receta/aplicación | **86/86**, 5 archivos |
| Conjunto ampliado | **20/20**, incluidos ambos corazones de 10 mm |
| Batería completa | **1.241/1.241**, 93 archivos, 0 fallas; 333,73 s desde el ejecutor |
| Tipado | **0 errores, 0 advertencias** |
| Compilación y presupuestos existentes | **Correctos** |
| Pruebas funcionales de exportación | **4/4** |
| PrusaSlicer | **20/20 archivos laminados** |
| Chromium en escritorio y ventana móvil | **Correcto**, ambos modos de 10 mm, vista previa/guardado/reapertura/STL |
| Auditoría automatizada axe | **0 infracciones detectadas** en los dos estados examinados; 25 reglas aprobadas en escritorio y 24 en móvil |

`qualification-inputs.json` vincula los resultados con **236 huellas de archivos fuente** y el inventario de compilación. Coinciden con el código antes/después del navegador y con la recopilación final; los recursos servidos se compararon con la compilación. Las actualizaciones documentales y el encabezado de nota posteriores no modificaron esas fuentes.

Las evidencias anteriores en `/workspace/reports/stamp-qualification-85bcwu8c/` siguen disponibles, pero sus **1.223 éxitos / 2 fallas** ya no son el veredicto vigente. Las fallas de sondas e intentos descartados permanecen como diagnóstico, nunca como éxitos.

## STL y laminado realmente comprobados

La recopilación nueva incluye **18 STL del conjunto** y **2 descargas Chromium de 10 mm**, en total **20 archivos**. PrusaSlicer 2.9.2 reconoce cada uno como geometría manifold de una sola pieza; el laminado terminó con G-code no vacío, extrusión real, capas ordenadas y altura final comprobada. Los registros no anuncian reparaciones; eso no demuestra que el laminador no realice ninguna normalización interna.

Cada STL del corazón de 10 mm contiene **1.174 triángulos**, **58.784 bytes**, aristas compartidas dos veces con orientaciones opuestas, una envolvente conectada y volumen firmado positivo. El menor cuadrado de la norma del producto vectorial es aproximadamente **1,87e-6**, frente al umbral inalterado **1e-10**. La comprobación utiliza las coordenadas efectivamente serializadas, no solo la representación JSCAD.

| Modo, sin agarre | Dimensiones STL | Capas de 0,2 mm | Volumen |
|---|---|---|---|
| Relieve, profundidad 2 mm | 10 × 10 × 6 mm | **30**, última Z=6 mm | ≈488,8876 mm³ |
| Hueco, profundidad 3 mm | 10 × 10 × 4 mm | **20**, última Z=4 mm | ≈266,6686 mm³ |

El fondo del hueco es de 1 mm, verificado mediante raycast y planos del STL. Áreas y volúmenes corresponden al mismo contorno Float32, con todas sus aristas, no a una versión simplificada.

Informes `slicing-corpus.json`, `sliced-extra/results.json` y `verified-results.json`. Se volvieron a leer las huellas de los STL que utilizó el laminador y de sus G-code.

Perfil hipotético de calificación: plataforma de 1.200 × 1.200 mm para los tamaños grandes del conjunto, boquilla de 0,4 mm, filamento de 1,75 mm, capas de 0,2 mm, tres perímetros, cinco capas sólidas superiores/inferiores y relleno del 15 %. **G-code de comprobación, no preparado para la impresora de Rza**: se desconocen impresora, material, calibración, soportes, adhesión y tolerancias físicas. No se imprimió ninguna pieza.

Las pruebas adicionales anteriores a 0,1 mm y con agarre permanecen en el informe de la ejecución previa; no se presentan como laminados repetidos en esta ejecución. Las pruebas correspondientes de geometría, receta y aplicación volvieron a aprobar en la batería completa.

## Recorrido nuevo en Chromium — Ambos modos de 10 mm

Informe `browser-UOFovg/browser-result.json` dentro del directorio de evidencias nuevas. Escritorio **1365 × 900**, ventana móvil **390 × 844**; capturas inspeccionadas. No se probó en un teléfono físico.

- Figura Heart real de la biblioteca, tamaño 10 mm ingresado en campo numérico, opción «Sin agarre», Relieve a 2 mm y luego Hueco a 3 mm seleccionado mediante teclado.
- Vista previa WebGL real, controles seleccionados, sin desbordamiento y descarga de los dos modelos binarios.
- Guardado, lectura real de IndexedDB, recarga completa y reapertura explícita para Hueco; después también guardado/recarga/reapertura para Relieve. **JSON exacto y STL idéntico después de recuperar cada modo**.
- SHA-256 Relieve: `a742d8c49d48149038adad6ae18871702aee4448dfc318bc16305815ed3baa63`.
- SHA-256 Hueco: `a819cc63ff3a55530501688cda0152bc72213cda444da18e86b96a5902b9a2f1`.
- Ambas descargas son idénticas a los STL generados directamente. Cambiar de modo no exporta una malla anterior.
- **56 recursos** servidos comparados con la compilación; sin errores de página; servidor y navegador detenidos.
- Una primera sonda de tamaño falló porque usaba Home como para un control deslizante. El campo real es numérico y emite un evento `change`: se corrigió el ejecutor para escribir y presionar Tab, sin modificar el producto.

Las auditorías axe son automáticas y se limitan a esos estados: no certifican accesibilidad completa ni pruebas con un lector de pantalla utilizado por una persona.

## Compatibilidad y límites conservados

- Solo cuerpos planos sin agarre; no se inventan conexiones para el agarre. Se rechazan los resultados que no pueden validarse.
- Los formatos V1/V2/V3, parámetros heredados, códecs, sesión, interfaz, manifiesto y archivo de bloqueo no cambian con esta ampliación. `geometryRoute` sigue siendo un indicador temporal de Three.js, no un campo persistido.
- Círculo y corazón en ambos modos a **10 / 200 / 1.000 mm**, contorno ondulado de 512 vértices, convexo de 1.000 vértices y patrón con 25 huecos: todos los casos del conjunto aprueban. Se conservan las protecciones para más de 2 MiB, trazados y puntos.
- No se calificaron todos los SVG admitidos, los agarres a tamaños extremos, los límites de 10.000/50.000 puntos ni su rendimiento máximo.
- Las notas extensas de Limace/Sangsue siguen fuera de alcance; por eso la comprobación global de notas puede seguir en rojo independientemente de que la batería de aplicación apruebe.

## Firefox/WebKit — Limitación independiente, no resuelta

Los intentos anteriores no cambiaron: Firefox 146.0.1 abre una página HTML sin interfaz gráfica, pero la sonda WebGL2 devuelve `false`; WebKit 26.0 no logra crear una página. Xvfb/proot aislados fallan con `execve(.../Xvfb): Permission denied`. No se afirma conocer la causa raíz exacta.

**Los recorridos Firefox/WebKit no están calificados ni se repitieron con esta corrección geométrica.** Tarjeta `t_2742c31d` asignada a `default`, bloqueada antes de modificar componentes centrales. No se desprende ninguna autorización para instalar software del sistema, cambiar Docker/Hermes, reiniciar ni publicar. Safari/iPhone físico y lector de pantalla tampoco se probaron.

## Reanudación y Git

- Rama original **`fix/stamp-qualification`**, base **`319d8cd882e9940de7afd72a1233c8fde8062dc3`**, remoto esperado verificado. El commit local de corrección, una vez creado, puede identificarse con Git y `final-state.json` en el directorio de evidencias nuevas.
- Validaciones vinculadas al contenido fuente, no solo al SHA de base. Antes del commit se anunciaron archivos y mensaje; no había autorización para publicar.
- Texto previo de `AGENT_CONTEXT.md` preservado íntegramente salvo el encabezado de reanudación administrado por el agente; nota excluida del commit, índice vacío al terminar. No hubo operaciones destructivas de stash/reset.

> **Nota CookieForge:** esta calificación y sus cifras son históricas del proyecto original. No se ejecutaron nuevamente las pruebas al traducir el informe.
