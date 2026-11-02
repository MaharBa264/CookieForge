# API de Gemini — Documentación técnica

> Documento técnico histórico, actualizado originalmente el **16/11/2025**. Las versiones, precios, cuotas y recomendaciones de API deben contrastarse con la documentación actual antes de un despliegue.

Este documento describe los detalles técnicos de la integración de Gemini en Cookie Cutter Designer.

## Arquitectura general

```text
Navegador del usuario (cliente)
    ↓
geminiAPI.ts (adaptador de API)
    ↓
API de Google Gemini (REST)
    ↓
Respuesta (JSON/imagen)
```

## Modelos de API utilizados

### 1. Generación de texto: `gemini-2.5-flash`
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Usos:**
  - Sugerencias para mejorar el diseño.
  - Análisis de SVG.
  - Variaciones de diseño.
- **Capacidades:**
  - Instrucciones de sistema.
  - Respuestas estructuradas en JSON.
  - Esquemas de respuesta.

### 2. Generación de imágenes: `gemini-2.5-flash-image`
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`
- **Usos:**
  - Generación de imágenes desde texto.
  - Creación de siluetas para cortantes.
- **Salida:** imagen PNG/JPEG codificada en Base64.

## Detalles de implementación

### Instrucciones de sistema (buena práctica)

Las llamadas a la API usan `systemInstruction` para definir el rol y el comportamiento de la IA:

```typescript
const systemInstruction = `You are an expert 3D printing engineer with 10+ years of experience.
You provide practical, actionable advice focusing on structural integrity, printability, and user experience.`;
```

La instrucción en el código se mantiene literalmente para preservar el ejemplo técnico original.

**Ventajas:**
- Comportamiento uniforme entre solicitudes.
- Respuestas de mejor calidad.
- Definición clara del rol.

### Respuestas estructuradas (modo JSON)

Las funciones usan `responseMimeType` y `responseSchema` para solicitar respuestas JSON con estructura definida:

```typescript
responseMimeType: 'application/json',
responseSchema: {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string' },
          suggestion: { type: 'string' },
          reasoning: { type: 'string' }
        }
      }
    }
  }
}
```

**Ventajas:**
- Respuestas interpretables sin expresiones regulares manuales.
- Salidas con tipos definidos.
- Tratamiento alternativo cuando falla el análisis.

### Ajustes de temperatura

| Tarea | Temperatura | Motivo |
|---|---:|---|
| Análisis SVG | 0,2 | Respuesta precisa y más determinista |
| Sugerencias | 0,7 | Equilibrio entre creatividad y exactitud |
| Variaciones | 0,95 | Máxima creatividad |
| Generación de imágenes | 0,4 | Siluetas creativas pero consistentes |

### Indicaciones de razonamiento paso a paso

Para tareas complejas, el original utilizaba indicaciones estructuradas por pasos:

```typescript
**Step 1: Assess Current Parameters**
- Wall thickness: ${params.wallThickness}mm (recommended: 1.0-1.5mm)
- Cutting height: ${params.cuttingHeight}mm (recommended: 10-15mm)

**Step 2: Evaluate Against Best Practices**
Check for:
- Structural weaknesses
- Printability issues

**Step 3: Generate Recommendations**
```

**Ventajas documentadas:**
- Mejor calidad de razonamiento.
- Sugerencias más precisas.
- Proceso de evaluación más transparente.

El ejemplo anterior es una plantilla histórica de prompt, no una exposición del razonamiento interno de un modelo.

## Consideraciones de seguridad

### ⚠️ CRÍTICO: exposición de claves API

**Implementación original:**
- La clave se guarda en `localStorage` (cliente).
- Todas las llamadas se realizan directamente desde el navegador.
- La clave puede verse en las solicitudes de red del propio cliente.

**Nivel de riesgo:** 🔴 **ALTO** para aplicaciones de producción.

**Problemas:**
1. Quien tenga acceso al navegador o a scripts del mismo origen puede inspeccionar y extraer la clave.
2. La clave aparece en las solicitudes que construye el cliente, incluso si HTTPS protege el transporte.
3. Los límites de solicitudes se aplican a esa clave y pueden agotarse por abuso.
4. No hay validación del lado del servidor.

### ✅ Arquitectura recomendada para producción

Implementar un proxy en el backend:

```text
Navegador del usuario
    ↓
API del backend (Node.js/Express/Cloud Function)
    ↓ (clave API almacenada en el servidor)
API de Google Gemini
```

**Ejemplo de backend (Node.js/Express):**

```javascript
// server.js
const express = require('express');
const app = express();

app.post('/api/gemini', async (req, res) => {
  const { prompt, config } = req.body;

  // Clave API en una variable de entorno del servidor
  const apiKey = process.env.GEMINI_API_KEY;

  // Solicitud a la API Gemini
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: config
      })
    }
  );

  const data = await response.json();
  res.json(data);
});

app.listen(3000);
```

**Cambio en el frontend:**

```typescript
// En lugar de llamar directamente a Gemini:
// const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, ...)

// Llamar al backend propio:
const response = await fetch('/api/gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, config })
});
```

> Estos fragmentos son ilustrativos. Un proxy de producción también necesita autenticación o control de abuso, validación de entradas, límites de uso y tratamiento de errores.

### Alternativa: funciones sin servidor permanente

**Funciones de Vercel/Netlify:**

```typescript
// api/gemini.ts
export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  // ... solicitud a través del proxy
}
```

**Despliegue:**

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

### Justificación histórica de la implementación del lado del cliente

**Motivos documentados:**
1. ✅ **Educación y demostración:** facilita comprender el flujo.
2. ✅ **Claves aportadas por usuarios:** cada persona utiliza su propia clave API.
3. ✅ **Sin costo de infraestructura para desarrolladores:** no exige backend.
4. ✅ **Funcionamiento transparente:** permite ver qué solicitudes se hacen.

**Uso contemplado:**
- Proyectos personales.
- Aprendizaje y experimentación.
- Demostraciones y prototipos.
- Situaciones donde los usuarios comprenden los riesgos de proporcionar una clave.

**No recomendado para:**
- Aplicaciones SaaS de producción.
- Servicios públicos.
- Aplicaciones que utilizan una clave propia del desarrollador.
- Productos comerciales.

## Límites de frecuencia

El documento original indicaba para el nivel gratuito de Gemini 2.5 Flash:
- **15 solicitudes por minuto.**
- **1.500 solicitudes por día.**
- **1 millón de solicitudes por mes.**

Son **cifras históricas** y deben verificarse con Google.

**Cómo tratar límites:** la implementación original lanzaba un error al alcanzar la cuota. Para producción se proponía un reintento con espera exponencial:

```typescript
async function callGeminiWithRetry(prompt, config, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await callGemini(prompt, config);
    } catch (error) {
      if (error.message.includes('429') && i < retries - 1) {
        // Esperas exponenciales: 1 s, 2 s, 4 s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}
```

## Gestión de errores

Las funciones utilizaban `try/catch` con mensajes informativos:

```typescript
try {
  const response = await callGemini(prompt, config);
  const data = JSON.parse(response.text);
  return data.suggestions.map(/* ... */);
} catch (e) {
  // Analizar el formato heredado si falla JSON.
  // Con la respuesta estructurada debería ocurrir raramente.
  console.warn('Structured output parsing failed, using fallback');
  return parseLegacyFormat(response.text);
}
```

## Pruebas

### Pruebas manuales

```bash
# Iniciar el servidor de desarrollo
pnpm run dev

# 1. Configurar la clave API en la interfaz.
# 2. Probar todas las funciones:
#    - Generación: "Christmas tree"
#    - Sugerencias: cargar un diseño
#    - Análisis: revisar la consola
#    - Variaciones: "star cookie cutter"
```

### Prueba directa de API

```bash
# Probar con curl: sustituir YOUR_KEY por una clave de prueba
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello"}]}]
  }'
```

## Optimización del rendimiento

### 1. Caché de respuestas

El original no la tenía implementada. Para producción, proponía guardar solicitudes comunes:

```typescript
const cache = new Map();

async function callGeminiCached(prompt, config) {
  const key = `${prompt}-${JSON.stringify(config)}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await callGemini(prompt, config);
  cache.set(key, result);
  return result;
}
```

### 2. Agrupación temporal de solicitudes (*debounce*)

Para funciones en tiempo real se propuso limitar las llamadas:

```typescript
let debounceTimer;

function debouncedGenerateSuggestions(params) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    generateSuggestions(params);
  }, 500);
}
```

## Supervisión y registros

### Mensajes de consola

Las funciones originales emitían registros para depurar:

```typescript
console.log('SVG Optimization Analysis:', data);
console.error('Image generation error:', err);
```

### Supervisión en producción

Para producción se proponía un registro adecuado:

```typescript
// Con servicios como Sentry, LogRocket, etc.
try {
  const result = await callGemini(prompt, config);
  analytics.track('gemini_request_success', {
    model: 'gemini-2.5-flash',
    tokens: result.candidates[0].usage.totalTokens
  });
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'ai_suggestions' }
  });
}
```

## Mejoras futuras propuestas

### 1. Respuestas en streaming

Gemini admite respuestas en flujo para presentar resultados progresivamente:

```typescript
async function* streamGemini(prompt, config) {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ ...requestBody, stream: true })
  });

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield new TextDecoder().decode(value);
  }
}
```

### 2. Conversaciones con varios turnos

Mantener historial para refinar iterativamente:

```typescript
const history = [];

async function chatWithGemini(userMessage) {
  history.push({ role: 'user', parts: [{ text: userMessage }] });

  const response = await callGemini({
    contents: history,
    // ...
  });

  history.push({ role: 'model', parts: [{ text: response.text }] });
  return response;
}
```

### 3. Comprensión de imágenes

Analizar imágenes de entrada (mencionado como Gemini 2.5 Pro Vision):

```typescript
async function analyzeUploadedImage(imageBlob) {
  const base64 = await blobToBase64(imageBlob);

  const response = await callGemini({
    contents: [{
      parts: [
        { text: "Analyze this cookie cutter design and suggest improvements" },
        { inlineData: { mimeType: 'image/png', data: base64 } }
      ]
    }]
  });
}
```

## Referencias

- [Documentación de Gemini API](https://ai.google.dev/gemini-api/docs).
- [Estrategias de creación de prompts](https://ai.google.dev/gemini-api/docs/prompting-strategies).
- [Guía de salida estructurada](https://ai.google.dev/gemini-api/docs/json-mode).
- [Ajustes de seguridad](https://ai.google.dev/gemini-api/docs/safety-settings).
- [Límites de frecuencia](https://ai.google.dev/gemini-api/docs/quota).

## Ayuda

Para problemas de integración:
1. Revisar los errores detallados de la consola del navegador.
2. Comprobar la clave en [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Revisar el consumo y las cuotas en el panel de AI Studio.
4. Abrir una incidencia en GitHub con el detalle del error.

---

**Última actualización original:** 16/11/2025.  
**Versión de API:** v1beta.  
**Modelos:** `gemini-2.5-flash`, `gemini-2.5-flash-image`.
