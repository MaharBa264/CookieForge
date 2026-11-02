# Guía de configuración de las funciones de IA con Gemini

> **Documento histórico del proyecto original.** Los límites gratuitos, precios, tiempos de respuesta y capacidades de Gemini pueden haber cambiado. Consultá la documentación vigente de Google antes de configurar pagos o compartir datos. Las funciones de IA son opcionales: CookieForge está pensado para funcionar sin conexión en sus funciones principales.

Esta guía explica cómo configurar y utilizar las funciones de IA que originalmente se integraron con el modelo Gemini 2.5 Flash de Google.

## Descripción general

Cookie Cutter Designer integra la API Gemini 2.5 Flash para ofrecer asistencia al diseño:

- 🎨 **Optimización SVG:** simplificar y optimizar trazados complejos.
- 💡 **Sugerencias de diseño:** recomendaciones para mejorar la impresión 3D.
- 🔄 **Variaciones de diseño:** alternativas creativas a partir de descripciones.
- 🤖 **Recomendaciones inteligentes:** sugerencias de parámetros para cada diseño.

## Obtener una clave API

### Paso 1: Abrir Google AI Studio

Ingresá a [Google AI Studio](https://aistudio.google.com/app/apikey).

### Paso 2: Iniciar sesión

Accedé con tu cuenta de Google, personal o de trabajo.

### Paso 3: Crear la clave

1. Presioná **«Create API Key»** (Crear clave API).
2. Elegí **«Create API key in new project»** (Crear clave en un proyecto nuevo) o seleccioná un proyecto existente.
3. Copiá la clave generada, cuyo formato históricamente comenzaba con `AIzaSy...`.

**Importante:** protegé la clave y no la compartas públicamente.

### Paso 4: Configurar la aplicación

1. Abrí Cookie Cutter Designer.
2. Buscá la sección **«🤖 Gemini AI Configuration»** (Configuración de Gemini).
3. Pegá tu clave.
4. Presioná **«Save & Validate»** (Guardar y validar).

La aplicación intenta verificar la clave y confirmar su funcionamiento.

## Cuotas y precios de API

### Nivel gratuito histórico

El documento original atribuía a Gemini 2.5 Flash los siguientes límites:

- **15 solicitudes por minuto.**
- **1.500 solicitudes por día.**
- **1 millón de solicitudes por mes.**

Estas cifras se conservan como registro histórico, **no como cuotas vigentes garantizadas**. El texto original las consideraba suficientes para uso personal.

### Límites de frecuencia

Si superás el límite, aparecerá un error. Esperá el intervalo indicado por el proveedor y volvé a intentar.

## Usar las funciones de IA

### 1. Sugerencias de diseño

1. Importá una ilustración y configurá el cortante.
2. Abrí **«🤖 AI Assistant»** (Asistente de IA).
3. Elegí **«💡 Suggestions»** (Sugerencias).
4. Presioná **«Get Suggestions»** (Obtener sugerencias).

La IA analiza espesor de pared, integridad estructural, dificultades de impresión 3D, estética y posibles mejoras funcionales.

### 2. Optimización SVG

1. Cargá un archivo SVG.
2. Abrí **«🤖 AI Assistant»**.
3. Elegí **«⚡ Optimize»** (Optimizar).
4. Presioná **«Optimize SVG»** (Optimizar SVG).

La IA intenta simplificar trazados complejos, eliminar elementos innecesarios, combinar trazados cuando corresponda y mantener las dimensiones originales. Revisá el resultado antes de utilizarlo para fabricar.

### 3. Variaciones de diseño

1. Abrí **«🤖 AI Assistant»**.
2. Elegí **«🎨 Variations»** (Variaciones).
3. Presioná **«Generate Variations»** (Generar variaciones).
4. Ingresá una descripción, por ejemplo «cortante de galletita con forma de estrella».

La integración original proponía cinco enfoques de diseño diferentes.

## Información del modelo

### Gemini 2.5 Flash

- **Identificador:** `gemini-2.5-flash`.
- **Velocidad:** el documento original indicaba respuestas normalmente inferiores a 2 segundos; no es una garantía.
- **Calidad:** sugerencias para programación y tareas técnicas.
- **Contexto:** el documento original indicaba una ventana de un millón de tokens.
- **Fortalezas:** generación de código, análisis técnico y respuestas estructuradas.

### ¿Por qué Flash y no Pro?

El proyecto original eligió Flash por considerar que ofrecía:

- un nivel gratuito amplio (en otra sección del documento original se citaban **1,5 millones de solicitudes mensuales**, cifra distinta de la indicada arriba);
- respuestas más rápidas para una interfaz interactiva;
- buen rendimiento en optimización SVG y análisis técnico;
- menor costo en planes pagos;
- capacidad suficiente para sugerencias de diseño.

Estas razones y cuotas reflejan la documentación histórica, no una comparación actualizada.

## Privacidad y seguridad

### Almacenamiento local

- La clave API se almacena **localmente en el navegador** mediante `localStorage`.
- Se envía a Google cuando se realizan llamadas a su API.
- El servidor del proyecto original no almacena la clave.

**Precaución:** una clave guardada en `localStorage` puede quedar expuesta a scripts que se ejecuten en el mismo origen. Para una aplicación pública, es preferible un backend que proteja credenciales y aplique restricciones.

### Datos enviados a Gemini

Al utilizar estas funciones, pueden enviarse a Google:

- **contenido SVG** para optimización;
- **parámetros de diseño**, como espesor y altura;
- **descripciones de texto** para variaciones.

El documento original afirmaba que no se enviaba información personal; sin embargo, **un SVG o una descripción pueden contener datos personales**. Revisá los contenidos antes de enviarlos.

### Eliminar la clave API

1. Abrí la configuración de Gemini.
2. Presioná **«Clear Key»** (Eliminar clave).
3. La aplicación elimina la clave del almacenamiento del navegador.

## Solución de problemas

### Error «Invalid API key» (Clave API inválida)

**Causa:** clave incorrecta o vencida.

**Solución:**

1. Comprobá que copiaste la clave completa.
2. Generá una nueva desde Google AI Studio.
3. Verificá que no haya espacios adicionales.

### Error «Rate limit exceeded» (Límite de solicitudes superado)

**Causa:** demasiadas solicitudes en poco tiempo.

**Solución:** esperá y reintentá de acuerdo con los límites actuales. El documento histórico recomendaba 60 segundos y citaba 15 solicitudes por minuto y 1.500 por día.

### Error «Failed to validate API key» (No se pudo validar la clave)

**Causa:** problema de conexión o interrupción temporal del servicio.

**Solución:**

1. Comprobá Internet.
2. Consultá el [estado de Google Cloud](https://status.cloud.google.com/).
3. Volvé a intentar unos minutos después.

### La clave API no se guarda

**Causa:** `localStorage` podría estar deshabilitado.

**Solución:**

1. Permití almacenamiento local en la configuración del navegador.
2. Probá otro navegador.
3. Probá fuera del modo privado o incógnito.

## Buenas prácticas de uso

### 1. Utilizar la IA cuando aporte valor

Cada consulta consume cuota. Reservala para sugerencias útiles, no para cada modificación pequeña.

### 2. Conservar resultados

Guardá las sugerencias que te sirvan. La aplicación original no almacenaba en caché las respuestas de IA.

### 3. Agrupar operaciones

Cuando tenga sentido, combiná varios SVG antes de optimizarlos, en lugar de hacer consultas individuales.

### 4. Supervisar el consumo

Consultá las métricas de uso en [Google AI Studio](https://aistudio.google.com/app/apikey).

## Detalles técnicos

### Endpoint de API

```text
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

### Formato de solicitud

La aplicación envía solicitudes POST con una estructura como esta:

```json
{
  "contents": [
    {
      "parts": [{ "text": "your prompt here" }]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 2048
  }
}
```

### Configuración de seguridad

El documento original indicaba filtros de contenido en todas las solicitudes:

- Acoso: `BLOCK_MEDIUM_AND_ABOVE`.
- Discurso de odio: `BLOCK_MEDIUM_AND_ABOVE`.
- Contenido sexual explícito: `BLOCK_MEDIUM_AND_ABOVE`.
- Contenido peligroso: `BLOCK_MEDIUM_AND_ABOVE`.

Los nombres de constantes se mantienen sin traducir para respetar la API histórica.

## Pasar a un nivel pago

Si necesitás más cuota:

1. Visitá [Google Cloud Console](https://console.cloud.google.com/).
2. Habilitá la facturación del proyecto.
3. Consultá los precios actuales de Gemini 2.5 Flash. **El documento original citaba USD 0,075 por millón de tokens de entrada y USD 0,30 por millón de tokens de salida**, cifras históricas que no deben usarse como cotización vigente.

El documento original consideraba estos valores accesibles para la mayoría de los usos.

## Alternativas

Si preferís no usar la API de Google:

- La aplicación funciona sin las funciones de IA.
- Las funciones principales —importación SVG, vista previa 3D y exportación STL— se ejecutan del lado del cliente.
- La IA es una mejora opcional.

## Ayuda

### Consultas sobre claves API

- [Google AI Studio](https://aistudio.google.com/).
- [Documentación de la API Gemini](https://ai.google.dev/gemini-api/docs).

### Consultas sobre la aplicación original

- [Incidencias en GitHub del proyecto original](https://github.com/razorglyon/cookie-cutter-designer/issues).
- [CONTRIBUTING.md](CONTRIBUTING.md), instrucciones para colaborar.

---

**¡Disfrutá de la asistencia de diseño con Gemini 2.5 Flash!** 🤖✨
