# Política de seguridad

> **Adaptación a CookieForge:** esta política traduce la documentación heredada de Cookie Cutter Designer. Las referencias a controles, plazos de respuesta y servicios del proyecto original no deben interpretarse como garantías o configuraciones verificadas en CookieForge. El workflow de calidad confirmado de CookieForge es `.github/workflows/quality-cookieforge.yml`.

## Versiones compatibles

La recomendación del proyecto original es utilizar la versión más reciente de `main`. Las versiones anteriores no reciben mantenimiento garantizado.

| Versión | Compatibilidad declarada originalmente |
|---|---|
| Más reciente (`main`) | Sí |
| Anteriores | No |

## Funciones y controles de seguridad

### Análisis automatizado

El proyecto original documenta varias capas de protección:

- **CodeQL:** análisis del código en publicaciones, solicitudes de incorporación y una programación semanal.
- **Auditoría de dependencias:** `pnpm audit --audit-level=moderate`.
- **Dependabot:** actualizaciones agrupadas de correcciones y versiones menores; revisión manual de actualizaciones mayores.
- **Integración protegida:** comprobaciones de calidad antes de publicar desde `main`.

En CookieForge, la existencia y activación de estos controles adicionales debe comprobarse por separado; no se deben asumir a partir de esta documentación.

### Revisión del código

El proceso recomendado por el proyecto original incluye:

1. Análisis automatizados de seguridad (CodeQL).
2. Auditoría de dependencias, comprobación de tipos y compilación.
3. Revisión manual por las personas responsables del mantenimiento.
4. Aprobación antes de incorporar cambios.

## Cómo informar una vulnerabilidad

Si encontrás una vulnerabilidad, seguí un procedimiento de divulgación responsable.

**No hagas lo siguiente:**

- Abrir una incidencia pública de GitHub con los detalles explotables.
- Difundir públicamente la vulnerabilidad antes de coordinar una solución.
- Explotarla contra otros usuarios o sistemas.

**En cambio:**

1. Contactá de forma privada a quien mantiene el repositorio mediante los canales de seguridad habilitados en GitHub o la información de contacto publicada en su perfil.
2. Incluí una descripción del problema, pasos para reproducirlo, impacto potencial y, si tenés, una propuesta de corrección.

### Plazos indicados por el proyecto original

- **24–48 horas:** confirmación inicial de recepción.
- **7 días:** evaluación y clasificación de gravedad.
- **30 días:** desarrollo y pruebas de la corrección.
- **Publicación:** parche de seguridad con reconocimiento a quien informó el problema, si así lo desea.

Estos plazos son **históricos del proyecto original**; CookieForge todavía no ha asumido formalmente un compromiso de respuesta equivalente.

## Recomendaciones de seguridad para usuarios

### Importación de archivos

- Importá preferentemente archivos de fuentes confiables.
- La aplicación procesa SVG, PNG y JPG en el navegador.
- El flujo local de importación no necesita subir los archivos a servidores externos.
- El procesamiento principal se realiza del lado del cliente.

### Seguridad en impresión 3D

- Revisá los STL generados antes de imprimir.
- **No presupongas que PLA, PETG ni otro filamento son aptos para contacto alimentario.** La aptitud depende de la certificación del material, los aditivos, la máquina, la superficie y las condiciones de limpieza.
- Seguí las buenas prácticas de impresión 3D.
- Evitá el lavavajillas salvo que el material y el proceso permitan expresamente ese uso; preferí la limpieza manual cuando corresponda.

### Seguridad del navegador

- Usá un navegador moderno y actualizado.
- Mantené JavaScript habilitado: la aplicación lo necesita.
- El funcionamiento principal se ejecuta en el navegador, sin procesamiento remoto obligatorio.

## Seguridad de dependencias

Las prácticas documentadas originalmente incluyen auditorías automatizadas en publicaciones y solicitudes de incorporación, comprobaciones semanales de Dependabot, revisión manual de actualizaciones y el archivo `pnpm-lock.yaml` para instalaciones reproducibles.

## Servicios externos

El proyecto original documenta:

- **GitHub Pages:** alojamiento estático de solo lectura.
- **GitHub Actions:** integración y entrega continuas en ejecuciones aisladas.
- **API de Google Gemini:** funciones opcionales de imagen/SVG que envían solicitudes directamente desde el navegador cuando el usuario configura una clave.
- **Analítica:** ningún servicio de seguimiento configurado de forma predeterminada.

Las claves de Gemini se almacenan y utilizan del lado del cliente. Deben tratarse como credenciales potencialmente expuestas: restringí cuotas y permisos, y nunca las incorpores al repositorio.

## Cabeceras de seguridad

Al alojar la aplicación en un servidor propio, el proyecto original recomienda configurar:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

**Advertencia:** esta política CSP heredada permite `unsafe-inline`; no debe considerarse una configuración óptima sin una revisión específica del despliegue.

## Trazabilidad

Los cambios de seguridad se documentan mediante commits y solicitudes de incorporación; los resultados de análisis pueden adjuntarse a las solicitudes y las notas de versión deben destacar las correcciones de seguridad.

## Contacto

- **Incidencias de GitHub:** errores generales que no comprometan la seguridad.
- **Canales privados del responsable:** vulnerabilidades que requieran divulgación coordinada.
- **GitHub Security Advisories:** avisos de seguridad, cuando estén habilitados.

## Reconocimientos

Se agradece a quienes informan vulnerabilidades de manera responsable. El proyecto original contempla reconocer sus aportes en las notas de versión, este documento y los agradecimientos del proyecto.

¡Gracias por ayudar a mantener CookieForge seguro! 🔒

**Archivo original conservado:** [docs/originales/SECURITY.md](docs/originales/SECURITY.md).
