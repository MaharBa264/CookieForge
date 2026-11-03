// @vitest-environment happy-dom
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CutterDocumentV5 } from '../../domain/designDocument';
import { createDefaultCutterParameters } from '../../domain/designParameters';
import { installSvgLoaderDomParserAdapter } from '../../utils/__tests__/svgDomTestSupport';
import { assessFirstReliefLayout } from '../reliefLayout';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0 L100 0 L100 100 L0 100 Z"/><path d="M30 30 L70 30 L70 70 L30 70 Z"/></svg>';
const bridge = { id: 'join', from: { x: 0, y: 50 }, to: { x: 30, y: 50 }, widthMm: 2 };

function fixture(patch: Partial<CutterDocumentV5> = {}): CutterDocumentV5 {
  return {
    schemaVersion: 5,
    id: 'relief-1', name: 'Relieve con unión', kind: 'cutter',
    source: { type: 'svg', fileName: 'relief.svg', svg },
    sketch: { svg, revision: 0 },
    parameters: createDefaultCutterParameters(),
    viewport: { showGrid: true, showAxes: false, showWallThickness: false },
    createdAt: '2026-11-03T00:00:00.000Z',
    updatedAt: '2026-11-03T00:00:00.000Z',
    bridges: [bridge],
    contourOperations: [{ pathIndex: 0, operation: 'cut' }, { pathIndex: 1, operation: 'emboss', depthMm: 1.5 }],
    ...patch
  };
}
let restore: (() => void) | undefined;
beforeAll(() => { restore = installSvgLoaderDomParserAdapter(); });
afterAll(() => restore?.());

describe('diagnóstico topológico de primer relieve', () => {
  it('reconoce exterior convexo, relieve interior y puente explícito sin generar STL', () => {
    const document = fixture();
    const result = assessFirstReliefLayout(document);
    expect(result).toMatchObject({
      topologyReady: true, outerPathIndex: 0, detailPathIndex: 1, markingClearanceMm: 1.5, bridgeId: 'join'
    });
    expect(document.sketch.svg).toBe(svg);
  });
  it('exige un puente válido, no lo inventa', () => {
    expect(assessFirstReliefLayout(fixture({ bridges: [] }))).toMatchObject({ topologyReady: false });
    expect(assessFirstReliefLayout(fixture({ bridges: [{ ...bridge, to: { x: 45, y: 45 } }] })))
      .toMatchObject({ topologyReady: false });
  });
  it('rechaza un relieve fuera del borde y SVG compuestos sin correspondencia inequívoca', () => {
    const outside = svg.replace('M30 30 L70 30 L70 70 L30 70', 'M120 30 L150 30 L150 70 L120 70');
    expect(assessFirstReliefLayout(fixture({ sketch: { svg: outside, revision: 1 } })))
      .toMatchObject({ topologyReady: false });
    const grouped = svg.replace('<path d="M30', '<g><path d="M30').replace('L30 70 Z"/></svg>', 'L30 70 Z"/></g></svg>');
    expect(assessFirstReliefLayout(fixture({ sketch: { svg: grouped, revision: 1 } })))
      .toMatchObject({ topologyReady: false });
  });
  it('no confunde la calificación topológica con grabado o dos relieves', () => {
    expect(assessFirstReliefLayout(fixture({ contourOperations: [{ pathIndex: 1, operation: 'engrave', depthMm: 1 }] })))
      .toMatchObject({ topologyReady: false });
    expect(assessFirstReliefLayout(fixture({ contourOperations: [
      { pathIndex: 0, operation: 'emboss' }, { pathIndex: 1, operation: 'emboss' }
    ] }))).toMatchObject({ topologyReady: false });
  });
});
