import { describe, expect, it } from 'vitest';
import { keepInkOnly } from '../inkOnlySvg';

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

/** Salida típica de ImageTracer con dos colores: tinta negra + fondo y detalles blancos. */
const traced = wrap(`
  <path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" d="M 10 10 L 90 10 L 90 90 L 10 90 Z M 40 40 L 60 40 L 60 60 L 40 60 Z"/>
  <path fill="rgb(255,255,255)" stroke="rgb(255,255,255)" d="M 0 0 L 100 0 L 100 100 L 0 100 Z"/>
  <path fill="rgb(255,255,255)" d="M 40 40 L 60 40 L 60 60 L 40 60 Z"/>
`);

function pathCount(svg: string): number {
  return (svg.match(/<path/g) ?? []).length;
}

describe('keepInkOnly', () => {
  it('descarta el fondo y los detalles blancos y conserva la tinta con sus huecos', () => {
    const result = keepInkOnly(traced);
    expect(pathCount(result)).toBe(1);
    expect(result).toContain('rgb(0,0,0)');
    expect(result).not.toContain('rgb(255,255,255)');
    // El hueco interior sigue siendo un subtrazado de la forma oscura.
    expect((result.match(/M /g) ?? []).length).toBe(2);
  });

  it.each([
    ['#ffffff', true],
    ['#fff', true],
    ['white', true],
    ['rgb(240,240,240)', true],
    ['none', true],
    ['#000', false],
    ['black', false],
    ['rgb(30,30,30)', false]
  ])('trata el relleno %s como %s', (fill, discarded) => {
    const svg = wrap(`
      <path fill="#000" d="M 0 0 L 10 0 L 10 10 Z"/>
      <path fill="${fill}" d="M 20 20 L 30 20 L 30 30 Z"/>
    `);
    expect(pathCount(keepInkOnly(svg))).toBe(discarded ? 1 : 2);
  });

  it('descarta formas transparentes', () => {
    const svg = wrap(`
      <path fill="rgb(0,0,0)" d="M 0 0 L 10 0 L 10 10 Z"/>
      <path fill="rgb(0,0,0)" opacity="0" d="M 20 20 L 30 20 L 30 30 Z"/>
    `);
    expect(pathCount(keepInkOnly(svg))).toBe(1);
  });

  it('conserva las formas sin atributo de relleno (negro por defecto)', () => {
    const svg = wrap('<path d="M 0 0 L 10 0 L 10 10 Z"/>');
    expect(keepInkOnly(svg)).toBe(svg);
  });

  it('no modifica un SVG sin formas claras', () => {
    const svg = wrap('<circle cx="50" cy="50" r="20" fill="black"/>');
    expect(keepInkOnly(svg)).toBe(svg);
  });

  it('no modifica una imagen en negativo (todas las formas claras)', () => {
    const svg = wrap('<path fill="white" d="M 0 0 L 10 0 L 10 10 Z"/>');
    expect(keepInkOnly(svg)).toBe(svg);
  });

  it('devuelve el texto original si no es un SVG válido', () => {
    expect(keepInkOnly('esto no es un SVG')).toBe('esto no es un SVG');
    expect(keepInkOnly('<svg><path')).toBe('<svg><path');
  });
});
