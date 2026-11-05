# CookieForge en la miniPC de casa (Docker)

Versión piloto de LAN: contenedor Nginx con aplicación estática compilada.
**No incluye sincronización ni copias de seguridad de los proyectos locales del navegador.**

## Requisitos
- Linux con Docker Engine y el plugin `docker compose`.
- Git y salida a Internet **solo para clonar y construir**. Una vez construido, el editor estático se sirve localmente.
- Un puerto libre (por defecto `8787`). No modificar otros contenedores de la máquina.

## Primera instalación

```sh
cd ~
git clone --branch feature/advanced-contour-editor --single-branch https://github.com/MaharBa264/CookieForge.git
cd CookieForge
docker compose up -d --build
docker compose ps
```

Acceso desde otro equipo de la misma red:

```text
http://IP_DE_LA_MINIPC:8787/
```

El servidor redirige a `/cookie-cutter-designer/`, ruta que usa la compilación actual. Si el puerto `8787` ya está ocupado:

```sh
COOKIEFORGE_PORT=8790 docker compose up -d --build
```

Para comprobar HTTP desde la miniPC:

```sh
curl -I http://127.0.0.1:8787/
curl -I http://127.0.0.1:8787/cookie-cutter-designer/
docker compose ps
docker compose logs --tail=50
```

Se espera redirección HTTP 302 de `/`, respuesta HTTP 200 de la aplicación, y contenedor saludable. No publicar el puerto en Internet ni configurar port-forwarding de tu router para este piloto.

## Actualizar esta rama

```sh
cd ~/CookieForge
git pull --ff-only
docker compose up -d --build
```

## Detener o quitar

```sh
cd ~/CookieForge
docker compose down
```

No elimina proyectos del navegador: estos se almacenan en IndexedDB/localStorage bajo el origen que use el usuario. **Cambiar IP, hostname o puerto puede hacer que el navegador muestre una biblioteca vacía**, aunque los datos sigan vinculados al origen anterior. Exportar `.ccd.json` y mantener copias externas.

## Primera prueba real (prioridad absoluta)

1. Desde un navegador en la LAN, abrir la URL de CookieForge.
2. Crear un **cortante simple** (círculo o rectángulo) para probar el flujo, no una ilustración compleja.
3. Ajustar su tamaño y altura de corte.
4. Generar modelo 3D y descargar STL.
5. Abrir STL en el laminador y verificar dimensiones y malla antes de imprimir.
6. Imprimir una pieza de prueba; después pasar al sello artístico.

Los tests de CI prueban exportaciones, **no sustituyen** la prueba de impresión física.

## Diagnóstico rápido

- `docker compose: command not found`: falta plugin Compose.
- `bind: address already in use`: cambiar `COOKIEFORGE_PORT`.
- `pnpm install` falla: verificar conectividad a registro de paquetes desde Docker.
- Pantalla sin estilos: comprobar que se abre `/cookie-cutter-designer/`, no una copia de `index.html` fuera de esa ruta.
- Web no accesible desde otro equipo: verificar IP real, firewall local y aislamiento Wi-Fi.
- Si el navegador no guarda proyectos, verificar que no se use navegación privada ni se borren datos del sitio.

**Nota de compatibilidad:** funciones web que exigen contexto seguro (por ejemplo ciertas APIs de permisos) pueden estar limitadas en HTTP sobre LAN. La creación y descarga básica de STL no debería requerir cuentas ni un backend remoto.
