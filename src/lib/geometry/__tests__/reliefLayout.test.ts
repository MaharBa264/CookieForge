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
  it('acepta dos detalles independientes de diferentes alturas, cada uno conectado al exterior', () => {
    const multiSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path d="M0 0 L100 0 L100 100 L0 100 Z"/>' +
      '<path d="M25 20 L40 20 L40 40 L25 40 Z"/>' +
      '<path d="M60 60 L75 60 L75 80 L60 80 Z"/></svg>';
    const bridges = [
      { id: 'left', from: { x: 0, y: 30 }, to: { x: 25, y: 30 }, widthMm: 2 },
      { id: 'right', from: { x: 100, y: 70 }, to: { x: 75, y: 70 }, widthMm: 2 }
    ];
    const document = fixture({
      sketch: { svg: multiSvg, revision: 2 },
      bridges,
      contourOperations: [
        { pathIndex: 0, operation: 'cut' },
        { pathIndex: 1, operation: 'emboss', depthMm: 0.8 },
        { pathIndex: 2, operation: 'emboss', depthMm: 2.4 }
      ]
    });
    const assessed = assessFirstReliefLayout(document);
    expect(assessed.topologyReady, assessed.reason).toBe(true);
    expect(assessed.detailProfiles).toEqual([
      { pathIndex: 1, clearanceMm: 0.8, bridgeId: 'left' },
      { pathIndex: 2, clearanceMm: 2.4, bridgeId: 'right' }
    ]);
  });
  it('rechaza detalles sin puente propio, anidados o superpuestos', () => {
    const multiSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path d="M0 0 L100 0 L100 100 L0 100 Z"/>' +
      '<path d="M25 20 L40 20 L40 40 L25 40 Z"/>' +
      '<path d="M60 60 L75 60 L75 80 L60 80 Z"/></svg>';
    const operations = [
      { pathIndex: 0, operation: 'cut' as const },
      { pathIndex: 1, operation: 'emboss' as const, depthMm: 0.8 },
      { pathIndex: 2, operation: 'emboss' as const, depthMm: 2.4 }
    ];
    const oneBridge = { id: 'left', from: { x: 0, y: 30 }, to: { x: 25, y: 30 }, widthMm: 2 };
    expect(assessFirstReliefLayout(fixture({
      sketch: { svg: multiSvg, revision: 1 }, contourOperations: operations, bridges: [oneBridge]
    })).topologyReady).toBe(false);
    const nested = multiSvg.replace('M60 60 L75 60 L75 80 L60 80','M28 23 L35 23 L35 35 L28 35');
    expect(assessFirstReliefLayout(fixture({
      sketch: { svg: nested, revision: 1 }, contourOperations: operations, bridges: [
        oneBridge, { id: 'right', from: { x: 100, y: 30 }, to: { x: 35, y: 30 }, widthMm: 2 }
      ]
    })).topologyReady).toBe(false);
  });
  it('admite seis detalles con enlaces independientes al exterior y rechaza el séptimo', () => {
    const centers = [27, 72, 117];
    const paths = ['<path d="M0 0 L160 0 L160 160 L0 160 Z"/>'];
    const bridges: Array<{ id: string; from: { x: number; y: number }; to: { x: number; y: number }; widthMm: number }> = [];
    const operations: Array<{ pathIndex: number; operation: 'cut' | 'emboss'; depthMm?: number }> =
      [{ pathIndex: 0, operation: 'cut' }];
    for (let i = 0; i < 6; i++) {
      const right = i >= 3, y = centers[i % 3], x0 = right ? 120 : 25, x1 = right ? 135 : 40;
      paths.push(`<path d="M${x0} ${y-7} L${x1} ${y-7} L${x1} ${y+7} L${x0} ${y+7} Z"/>`);
      bridges.push({ id: `link-${i}`, from: { x: right ? 160 : 0, y }, to: { x: right ? 135 : 25, y }, widthMm: 2 });
      operations.push({ pathIndex: i+1, operation: 'emboss', depthMm: 0.5 + i*0.4 });
    }
    const svg6 = `<svg viewBox="0 0 160 160">${paths.join('')}</svg>`;
    const ready = assessFirstReliefLayout(fixture({
      sketch: { svg: svg6, revision: 1 }, bridges, contourOperations: operations
    }));
    expect(ready.topologyReady, ready.reason).toBe(true);
    expect(ready.detailProfiles).toHaveLength(6);
    expect(ready.detailProfiles?.map(p => p.clearanceMm)).toEqual([0.5,0.9,1.3,1.7,2.1,2.5]);
    const invalid = assessFirstReliefLayout(fixture({
      sketch: { svg: svg6, revision: 1 }, bridges,
      contourOperations: [...operations, { pathIndex: 7, operation: 'emboss' }]
    }));
    expect(invalid.topologyReady).toBe(false);
  });
  it('rechaza el puente que atraviesa un relieve ajeno aunque ambos extremos encajen', () => {
    const svg = '<svg viewBox="0 0 100 100"><path d="M0 0 L100 0 L100 100 L0 100 Z"/>' +
      '<path d="M25 20 L40 20 L40 40 L25 40 Z"/>' +
      '<path d="M25 60 L40 60 L40 80 L25 80 Z"/></svg>';
    const assessment = assessFirstReliefLayout(fixture({
      sketch: { svg, revision: 1 },
      contourOperations: [
        { pathIndex: 0, operation: 'cut' }, { pathIndex: 1, operation: 'emboss', depthMm: 1 },
        { pathIndex: 2, operation: 'emboss', depthMm: 2 }
      ],
      bridges: [
        { id: 'left', from: { x: 0, y: 30 }, to: { x: 25, y: 30 }, widthMm: 2 },
        { id: 'vertical', from: { x: 30, y: 0 }, to: { x: 30, y: 60 }, widthMm: 2 }
      ]
    }));
    expect(assessment.topologyReady).toBe(false);
  });
  it('no confunde la calificación topológica con grabado o dos relieves', () => {
    expect(assessFirstReliefLayout(fixture({ contourOperations: [{ pathIndex: 1, operation: 'engrave', depthMm: 1 }] })))
      .toMatchObject({ topologyReady: false });
    expect(assessFirstReliefLayout(fixture({ contourOperations: [
      { pathIndex: 0, operation: 'emboss' }, { pathIndex: 1, operation: 'emboss' }
    ] }))).toMatchObject({ topologyReady: false });
  });
});
