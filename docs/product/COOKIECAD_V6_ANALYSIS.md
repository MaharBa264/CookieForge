# Análisis funcional — Cookiecad Designer V6

> **Observación histórica:** 23/07/2026.  
> **Producto:** https://app.cookiecad.com/  
> **Propósito:** comparar funcionalidades con Cookie Cutter Designer sin copiar código, apariencia ni contenido propietario.
>
> CookieForge es una aplicación personal. Los precios, cuentas y niveles Premium que figuran aquí únicamente documentan la competencia; no se pretende implementar suscripciones, pagos, funciones bloqueadas, backend ni biblioteca en la nube. Las condiciones comerciales pueden haber cambiado.

## 1. Método y limitaciones

El estudio combinó exploración sin cuenta de Cookiecad Designer V6, ejemplos públicos configurados, novedades V6, documentación oficial, página pública Premium e inspección de opciones serializadas en enlaces públicos compartidos.

Se utilizaron cuatro clasificaciones: **observado** (visible públicamente), **confirmado** (publicado por una fuente oficial), **Premium** (marcado con estrella o listado en esa oferta) y **desconocido** (función identificada sin nivel comercial confirmado).

No se utilizaron cuentas, suscripciones, pruebas de pago, pagos ni mecanismos para eludir accesos. No se verificaron internamente los algoritmos geométricos ni la calidad de los archivos producidos.

## 2. Fuentes oficiales

| Fuente | URL |
|---|---|
| Designer V6 | https://app.cookiecad.com/ |
| Novedades de V6 | https://app.cookiecad.com/whats-new |
| Plan Premium | https://app.cookiecad.com/premium |
| Manual del diseñador | https://docs.cookiecad.com/cookiecad-designer/ |
| Funcionalidades | https://docs.cookiecad.com/cookiecad-designer/features-overview/ |
| Novedades anteriores | https://docs.cookiecad.com/cookiecad-designer/whats-new/ |

## 3. Posicionamiento

Cookiecad convierte imágenes o dibujos en utensilios imprimibles en 3D. Está dirigido a pasteleros, artesanos de arcilla polimérica, ceramistas y usuarios de impresoras sin conocimientos avanzados de CAD.

Flujo propuesto: **importar o elegir una figura → escoger tipo de objeto → ajustar parámetros → examinar el modelo en 3D → descargar, compartir o guardar el proyecto**.

## 4. Navegación y estructura

Se observó una navegación principal con **Designer** (Diseñador), **My Library** (Mi biblioteca), **Docs** (Documentación), **Shop Filament** (Tienda de filamento), **Community** (Comunidad), selección de tema sistema/claro/oscuro, inicio de sesión e indicador V6.

En el diseñador aparecían: aviso Premium, selector `Thing to make` (qué crear), búsqueda y perfiles de ajustes, controles organizados en acordeones, pestañas **3D Preview** (vista 3D) y **Edit Image** (editar imagen), exportaciones, archivo nuevo, enlaces para compartir, edición CADit y agregado a biblioteca.

## 5. Entrada y preparación de imágenes

### 5.1 Fuentes admitidas

PNG, JPG/JPEG, WebP y SVG; arrastrar/soltar, selección de archivo, pegado con `Ctrl/Cmd+V`, figuras predeterminadas y ejemplos de diseños.

### 5.2 Edición integrada

V6 anuncia un editor integrado de bocetos CADit, edición dentro del diseñador, guardado automático cada dos minutos, restauración del original y opciones para compartir o bifurcar bocetos editados.

### 5.3 Tratamiento de contornos

Tres operaciones diferenciadas:

- **Imprint:** conservar las líneas para generar detalles.
- **Edge Trace:** seguir el límite de una región sólida.
- **Outline:** mantener únicamente el contorno exterior.

Entre las novedades V6: varias formas detectadas visibles, margen de `Outline All` ajustable, contornos circulares más precisos, opción «solo bordes interiores», errores claros de importación y reintentos.

## 6. Catálogo de objetos

| Objeto | Nivel público observado | Función |
|---|---|---|
| Cortante (Cutter) | Gratis | Cortar un contorno |
| Cortante con impresión (Imprint Cutter) | Gratis | Cortar y marcar detalles |
| Cortante de sándwich | Premium | Cortar y sellar sándwiches |
| Molde de cake pops | Premium | Molde, empujador y posible bandeja |
| Adorno para torta | Premium | Imagen, texto y varillas decorativas |
| Plantilla (Stencil) | Premium | Placa perforada repetitiva |
| Cortante + sello | Premium | Pareja separada con medidas coordinadas |
| Sello (Stamp) | Premium | Sello independiente |
| Conjunto de cortantes | Premium | Tamaños proporcionales del mismo diseño |
| Galletita de práctica | Premium | Superficie para practicar decoración |
| Múltiples cortantes | Premium | Repeticiones por filas y columnas |

Los niveles reflejan estrellas observadas sin cuenta. La página Premium, en parte anterior al catálogo V6, no necesariamente enumera todos los objetos.

## 7. Parámetros comunes

### 7.1 Dimensiones

Unidad general en mm o pulgadas; tamaño final; dimensión controlada por ancho, alto o lado más largo; tamaño de usuario serializado en el enlace compartido.

### 7.2 Filos

Profundidad y espesor; segundo filo exterior de refuerzo con su propia profundidad/espesor; filo centrado simétricamente sobre el trazado; punta afinada con bisel de ancho y altura configurables; borde superior redondeado; filo para fondant con ángulo interior y ancho regulable.

### 7.3 Bases y agarres

Altura y ancho de base; agarre circular o rectangular; simetría; múltiples barras centrales con ángulo, posición y ancho; barra central maciza opcional.

### 7.4 Marcas interiores y sellos

Profundidad respecto del filo; ancho de base del detalle; perfil plano/redondeado/biselado; aplicación a huecos, regiones rellenas o ambas; amplitud y desplazamiento interior; inversión relieve/grabado; eliminación de contorno exterior; conservar solo bordes internos; espejado; tolerancia cortante/sello; espesor posterior y altura del relieve.

### 7.5 Texto y placas identificadoras

**Texto sobre pared:** tipografía, contenido, tamaño, interlineado, extrusión, posición y agregado al sello.

**Placas:** texto y tipografía; respaldo rectangular o siguiendo el texto; márgenes horizontales/verticales; espesor, solapamiento y altura; posición; destino en cortante, sello o ambos.

### 7.6 Apariencia y opciones experimentales

Materiales para vista previa, líneas de malla, espejo, resolución, simplificación, desplazamiento de contornos interior/exterior, espesor mínimo obligatorio, opciones internas de triangulación y diagnóstico.

## 8. Funciones especializadas

### 8.1 Cortante + sello y agarre separado

Pareja de sólidos independientes; holgura de ensamble ajustable; agarre separado; conexión roscada o alojamiento para pegar/biselar; encastre posterior del sello; ubicación automática o manual X/Y; profundidad y diámetro del encastre; holgura; altura, diámetro y redondeo inferior del agarre; resolución circular.

### 8.2 Múltiples cortantes y conjuntos

**Multi Cutter:** filas, columnas, distancia y repetición de una misma herramienta.

**Cutter Set:** varios tamaños proporcionales del mismo dibujo y exportación conjunta coherente.

### 8.3 Plantilla

Tamaño del patrón; grilla rectangular/diagonal; filas, columnas, espaciado y márgenes; dimensiones a partir de grilla o exteriores; espesor; detalles interiores opcionales; barras para unir islas; optimización de regiones repetidas.

### 8.4 Cortante de sándwich

Forma, tamaño, distancia y profundidad de los dientes; ancho de sellado; holgura entre sello de borde y cortante; dientes redondeados y radio; contorno exterior desplazado del sello; sello complementario opcional.

### 8.5 Molde de cake pops

Molde macizo con alojamiento del empujador; empujador de una o dos piezas; cara exterior o con detalles interiores; placa posterior; holguras para empujador y palito; bandeja opcional; rotación, márgenes, espesor, profundidad de encastre, holgura de bandeja y distribución de piezas para impresión.

### 8.6 Adorno para tortas

Imagen, texto o ambos; relieve de imagen; respaldo que une detalles finos y su desplazamiento; alturas de base/texto/imagen; mensaje multilínea; tipografía, tamaño, interlineado y posición; varillas con longitud/ancho/posición; reutilización de placas y perfiles de profundidad.

## 9. Visor, conservación y exportaciones

### 9.1 Vista previa

Órbita 3D; rotación más allá de las vistas superior/inferior; zoom para encuadrar todas las piezas; renderizado bajo demanda para ahorrar energía; alternativa WebGL1; material similar a un laminador y líneas de malla opcionales.

### 9.2 Compartir y conservar

URL con parámetros; enlaces cortos con sesión; diseños compartidos; biblioteca privada; perfiles de configuración; guardado de imágenes y STL; organización de favoritos.

### 9.3 Exportaciones

STL, 3MF y PDF del contorno. La documentación indicaba cuenta gratuita para descargar STL y sesión iniciada para agregar diseños a `My Library`.

## 10. Cookiecad Premium — Comparación comercial fuera de alcance

### 10.1 Precios observados en la fecha del estudio

| Modalidad | Precio observado | Período de prueba anunciado |
|---|---|---|
| Mensual | USD 14,99 al mes | 3 semanas |
| Anual | USD 150 al año (USD 12,50 al mes) | 3 semanas |
| Prueba sin pago | Gratis | 2 semanas, sin tarjeta |

La coexistencia de dos duraciones de prueba en una página era una ambigüedad de contenido, no una regla a copiar. **No son precios vigentes verificados.**

### 10.2 Funcionalidades publicitadas

Cortante y sello separados; biblioteca privada; perfiles; parámetros experimentales; engrosamiento de detalles interiores; barra central sólida; inversión de relieve/grabado; dirección de desplazamientos; resolución; conjuntos de cortantes; almacenamiento STL.

## 11. Fortalezas de experiencia de usuario

Terminología de pastelería y fabricación en vez de jerga CAD; numerosos ejemplos; opciones progresivas en acordeones; búsqueda de ajustes; cambio de tipo sin abandonar el flujo; enlaces compartibles; parámetros serializados; separación entre vista previa y edición 2D; perfiles y presentación clara de Premium.

## 12. Debilidades y riesgos observados

Excesiva densidad de opciones; parámetros difíciles sin ayuda; discrepancias entre nivel Gratis/Premium en páginas antiguas y V6; dos duraciones de prueba; enlaces compartidos muy largos; parámetros internos de depuración geométrica visibles; documentación incompleta de novedades V6; falta de garantías públicas detalladas sobre topología y orientación de exportaciones.

## 13. Aprendizajes para la aplicación personal

**Conservar como principios:** catálogo de objetos; ejemplos completos; perfiles; búsqueda; edición 2D; intercambio de proyectos; tipos especializados con ajustes específicos.

**Diferenciarse:** validación geométrica visible y bloqueante; dimensiones finales medidas; orientación de fabricación comprobada; diagnóstico de espesores; prioridad local y sin cuenta; funciones locales sin categorías de pago; biblioteca, proyectos y perfiles almacenados en navegador y exportables; formatos abiertos; no simular laminado ni generación G-code.

## 14. Conclusión

Cookiecad V6 aportaba una comparación funcional amplia, en particular para objetos especiales y asistentes de diseño. El repositorio original poseía una buena base de verificación geométrica, pero necesitaba evolucionar del modelo Cortante/Sello a un catálogo extensible de recetas y flujos integrados.

## 15. Propuestas complementarias no atribuidas a Cookiecad

Las siguientes ideas procedían de una propuesta externa transmitida por la persona propietaria del proyecto, **no** de funcionalidades verificadas de Cookiecad:

- Pluma con vértices de esquina y manejadores Bézier.
- Primitivas: rectángulo, elipse, polígono regular y estrella.
- Grilla configurable y ajuste a grilla, puntos y ejes.
- Traslación, rotación, escala y espejo numéricos.
- Capas 2D con visibilidad, bloqueo y orden.
- Texto convertido en trazados con fuente editable conservada.
- STL separados por función para modelos de varias piezas.
- Exportación SVG del contorno 2D.
- Captura de imagen del visor.
- PWA sin conexión.
- Medición del rendimiento del lienzo con hasta 10.000 puntos.

El PRD debía evaluar esas ideas según su utilidad personal. No justificaban otro conjunto tecnológico, backend, cuentas o pagos. DXF, G-code, soportes de impresión, cortantes articulados, colaboración en tiempo real y mercado de modelos quedaban fuera del alcance hasta demostrar una necesidad concreta.
