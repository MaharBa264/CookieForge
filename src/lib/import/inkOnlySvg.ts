/**
 * Deja en un SVG vectorizado solo la "tinta" (las formas oscuras).
 *
 * El vectorizador de imágenes (ImageTracer) devuelve una capa por color: al convertir
 * un dibujo en blanco y negro entrega las formas negras y además un fondo blanco y los
 * detalles blancos como formas rellenas. Si todas se tratan como contornos sólidos, el
 * cortador y el sello quedan con paredes en el fondo y en los detalles. Aquí se descartan
 * las formas claras o transparentes; los huecos de las formas oscuras (ojos, boca, etc.)
 * ya vienen como subtrazados dentro de la forma oscura y se conservan.
 */

const LIGHT_LUMINANCE_THRESHOLD = 0.5;
const MIN_OPACITY = 0.5;

const NAMED_COLORS: Readonly<Record<string, readonly [number, number, number]>> = Object.freeze({
  black: [0, 0, 0],
  white: [255, 255, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  red: [255, 0, 0],
  blue: [0, 0, 255],
  green: [0, 128, 0]
});

function parseColor(value: string | null): readonly [number, number, number] | 'none' | null {
  if (value === null) return null;
  const text = value.trim().toLowerCase();
  if (text === '' || text === 'currentcolor') return null;
  if (text === 'none' || text === 'transparent') return 'none';

  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(text);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [
      parseInt(digits.slice(0, 2), 16),
      parseInt(digits.slice(2, 4), 16),
      parseInt(digits.slice(4, 6), 16)
    ];
  }

  return NAMED_COLORS[text] ?? null;
}

function luminance([red, green, blue]: readonly [number, number, number]): number {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function numericAttribute(element: Element, name: string): number | null {
  const raw = element.getAttribute(name);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** ¿Es una forma de fondo o de detalle claro que no debe convertirse en geometría? */
function isLightOrInvisible(element: Element): boolean {
  const fill = parseColor(element.getAttribute('fill'));
  if (fill === 'none') return true;
  if (fill !== null && luminance(fill) >= LIGHT_LUMINANCE_THRESHOLD) return true;

  for (const name of ['opacity', 'fill-opacity']) {
    const opacity = numericAttribute(element, name);
    if (opacity !== null && opacity < MIN_OPACITY) return true;
  }
  return false;
}

/**
 * Devuelve el SVG sin las formas claras o transparentes.
 * Si el SVG no tiene formas claras, o no se puede analizar, lo devuelve igual.
 * Si todas las formas fueran claras (imagen en negativo) también lo devuelve igual.
 */
export function keepInkOnly(svg: string): string {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return svg;

  let document: Document;
  try {
    document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  } catch {
    return svg;
  }
  const root = document.documentElement;
  if (!root || root.localName !== 'svg' || document.querySelector('parsererror')) return svg;

  const shapes = Array.from(root.querySelectorAll('path, polygon, rect, circle, ellipse'));
  if (shapes.length === 0) return svg;

  const light = shapes.filter(isLightOrInvisible);
  if (light.length === 0 || light.length === shapes.length) return svg;

  for (const element of light) element.parentNode?.removeChild(element);
  return new XMLSerializer().serializeToString(root);
}
