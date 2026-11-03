import * as THREE from 'three';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import type { DesignDocumentV1 } from '../../../domain/designDocument';
import type { GeneratedArtifact } from '../../../domain/generatedArtifact';
import {
  createDefaultCutterParameters,
  type CutterDesignParameters
} from '../../../domain/designParameters';
import type { GenerationContext } from '../../generationRecipe';
import { disposeObject3D } from '../../../utils/disposeThree';
import { serializeSTL } from '../../../utils/stlExporter';
import { serialize3MF } from '../../../utils/advancedExporter';
import {
  CutterGenerationError
} from '../../../utils/generationValidation';
import { generateCookieCutter } from '../../../utils/cookieCutterGenerator';
import {
  dimensionsFromBounds,
  inspectSvgTopology,
  LEGACY_HASH_ALGORITHM,
  legacyCutterFixture,
  logicalTriangleHash
} from '../../../utils/__tests__/legacyGeometryFixtureSupport';
import { installSvgLoaderDomParserAdapter } from '../../../utils/__tests__/svgDomTestSupport';
import { cutterRecipe } from '../cutterRecipe';

vi.mock('../../../utils/cookieCutterGenerator', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../../utils/cookieCutterGenerator')
  >();
  return {
    ...actual,
    generateCookieCutter: vi.fn(actual.generateCookieCutter)
  };
});

const generateCookieCutterMock = vi.mocked(generateCookieCutter);
let restoreDomParser: (() => void) | undefined;

beforeAll(() => {
  restoreDomParser = installSvgLoaderDomParserAdapter();
});

beforeEach(() => {
  generateCookieCutterMock.mockClear();
});

afterAll(() => {
  restoreDomParser?.();
});

function createCutterDocument(
  parameters: CutterDesignParameters = { ...legacyCutterFixture.success.parameters },
  svg = legacyCutterFixture.success.svg
): DesignDocumentV1<'cutter'> {
  return {
    schemaVersion: 1,
    id: 'legacy-cutter-document',
    name: 'Fixture Cutter legacy',
    kind: 'cutter',
    source: {
      type: 'svg',
      fileName: 'legacy-cutter.svg',
      svg
    },
    sketch: { svg, revision: 3 },
    parameters,
    viewport: {
      showGrid: true,
      showAxes: true,
      showWallThickness: false
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

function generationContext(signal: AbortSignal, revision = 17): GenerationContext {
  return { signal, revision };
}

function expectAbsoluteTolerance(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function disposableInvalidGroup(): {
  readonly object: THREE.Group;
  readonly objectClear: ReturnType<typeof vi.spyOn>;
  readonly geometryDispose: ReturnType<typeof vi.spyOn>;
  readonly materialDispose: ReturnType<typeof vi.spyOn>;
} {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.MeshBasicMaterial();
  const object = new THREE.Group();
  object.add(new THREE.Mesh(geometry, material));
  return {
    object,
    objectClear: vi.spyOn(object, 'clear'),
    geometryDispose: vi.spyOn(geometry, 'dispose'),
    materialDispose: vi.spyOn(material, 'dispose')
  };
}

async function captureFailure(
  document: DesignDocumentV1<'cutter'>,
  context: GenerationContext
): Promise<unknown> {
  let artifacts: readonly GeneratedArtifact<'cutter'>[] | undefined;
  let thrown: unknown;

  try {
    artifacts = await cutterRecipe.generate(document, context);
  } catch (error) {
    thrown = error;
  } finally {
    for (const artifact of artifacts ?? []) disposeObject3D(artifact.object);
  }

  return thrown;
}

describe('cutterRecipe', () => {
  it('expose des paramètres par défaut frais issus du domaine', () => {
    const first = cutterRecipe.createDefaultParameters();
    const second = cutterRecipe.createDefaultParameters();

    expect(cutterRecipe.kind).toBe('cutter');
    expect(first).toEqual(createDefaultCutterParameters());
    expect(second).toEqual(first);
    expect(first).not.toBe(second);
  });

  it('valide et reconstruit des paramètres Cutter sans retenir ni muter l’entrée', () => {
    const input = { ...legacyCutterFixture.success.parameters };
    const inputSnapshot = structuredClone(input);
    const result = cutterRecipe.validateParameters(input);

    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error('Les paramètres de fixture devraient être valides.');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.parameters)).toBe(true);
    expect(result.parameters).toEqual(input);
    expect(result.parameters).not.toBe(input);
    expect(input).toEqual(inputSnapshot);
  });

  it('retourne des issues discriminées et pathées pour un mode ou un champ invalide', () => {
    const invalidMode = cutterRecipe.validateParameters({
      ...legacyCutterFixture.success.parameters,
      mode: 'stamp',
      stampBase: true
    });
    const invalidField = cutterRecipe.validateParameters({
      ...legacyCutterFixture.success.parameters,
      wallThickness: 0.1
    });
    const unknownFieldInput = {
      ...legacyCutterFixture.success.parameters,
      unknownField: { preserved: true }
    };
    const unknownFieldInputSnapshot = structuredClone(unknownFieldInput);
    const unknownField = cutterRecipe.validateParameters(unknownFieldInput);

    expect(invalidMode).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({ path: 'mode', code: 'INVALID_PARAMS' })
      ]
    });
    expect(invalidField).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({ path: 'wallThickness', code: 'INVALID_PARAMS' })
      ]
    });
    expect(unknownField).toEqual({
      valid: false,
      issues: [expect.objectContaining({ code: 'INVALID_PARAMS' })]
    });
    expect(unknownFieldInput).toEqual(unknownFieldInputSnapshot);
    if (invalidField.valid === true) {
      throw new Error('Le champ invalide devrait produire une issue.');
    }
    expect(Object.isFrozen(invalidField)).toBe(true);
    expect(Object.isFrozen(invalidField.issues)).toBe(true);
    expect(Object.isFrozen(invalidField.issues[0])).toBe(true);
  });

  it('structure aussi une erreur de validation inattendue', () => {
    const sentinel = new Error('lecture hostile');
    const throwSentinel = (): never => {
      throw sentinel;
    };
    const hostileInput = new Proxy({}, {
      get: throwSentinel,
      has: throwSentinel,
      ownKeys: throwSentinel,
      getOwnPropertyDescriptor: throwSentinel
    });

    expect(cutterRecipe.validateParameters(hostileInput)).toEqual({
      valid: false,
      issues: [
        {
          path: 'parameters',
          code: 'UNEXPECTED_VALIDATION_ERROR',
          message: 'An unexpected error occurred while validating Cutter parameters.'
        }
      ]
    });
  });

  it('rejette un kind runtime incohérent avant le générateur', async () => {
    const document = createCutterDocument();
    Reflect.set(document, 'kind', 'stamp');
    const error = await captureFailure(
      document,
      generationContext(new AbortController().signal)
    );

    expect(error).toBeInstanceOf(CutterGenerationError);
    expect(error).toMatchObject({
      code: 'INVALID_PARAMS',
      details: expect.objectContaining({ field: 'kind' })
    });
    expect(generateCookieCutterMock).not.toHaveBeenCalled();
  });

  it('fait gagner une pré-annulation même avec le SVG d’échec legacy', async () => {
    const controller = new AbortController();
    controller.abort();
    const document = createCutterDocument(
      {
        ...legacyCutterFixture.failure.parameters,
        wallThickness: 0.1
      },
      legacyCutterFixture.failure.svg
    );
    Reflect.set(document, 'kind', 'stamp');
    const error = await captureFailure(document, generationContext(controller.signal));

    expect(error).toMatchObject({ name: 'AbortError' });
    expect(generateCookieCutterMock).not.toHaveBeenCalled();
  });

  it('rejette wallThickness invalide avant le générateur avec une erreur pathée', async () => {
    const document = createCutterDocument({
      ...legacyCutterFixture.success.parameters,
      wallThickness: 0.1
    });
    const error = await captureFailure(
      document,
      generationContext(new AbortController().signal)
    );

    expect(error).toBeInstanceOf(CutterGenerationError);
    expect(error).toMatchObject({
      code: 'INVALID_PARAMS',
      details: expect.objectContaining({ field: 'wallThickness' })
    });
    expect(generateCookieCutterMock).not.toHaveBeenCalled();
  });

  it('rejoue exactement la fixture Cutter legacy via la recette', async () => {
    const controller = new AbortController();
    const document = createCutterDocument();
    let artifacts: readonly GeneratedArtifact<'cutter'>[] | undefined;

    try {
      artifacts = await cutterRecipe.generate(
        document,
        generationContext(controller.signal, 42)
      );
      expect(artifacts).toHaveLength(1);
      expect(Object.isFrozen(artifacts)).toBe(true);

      const artifact = artifacts[0];
      expect(Object.isFrozen(artifact)).toBe(true);
      expect(Object.isFrozen(artifact.dimensionsMm)).toBe(true);
      expect(Object.isFrozen(artifact.object)).toBe(false);
      expect(artifact.id).toBe('legacy-cutter-document:cutter:42');
      expect(artifact.role).toBe('cutter');
      expect(generateCookieCutterMock).toHaveBeenCalledTimes(1);
      expect(generateCookieCutterMock).toHaveBeenCalledWith(
        legacyCutterFixture.success.svg,
        legacyCutterFixture.success.parameters
      );

      expect(artifact.object.userData.params).toEqual(
        legacyCutterFixture.success.parameters
      );
      expect(artifact.object.userData.contourCount).toBe(
        legacyCutterFixture.topology.contours
      );
      expect(inspectSvgTopology(legacyCutterFixture.success.svg)).toEqual(
        legacyCutterFixture.topology
      );

      const report = artifact.validation;
      expect(report.valid, report.errors.join('\n')).toBe(true);
      expect(report.triangles).toBe(legacyCutterFixture.expected.triangles);
      expect(report.shells).toBe(legacyCutterFixture.expected.shells);
      expect(report.volume).toBeGreaterThan(0);
      expectAbsoluteTolerance(
        report.volume,
        legacyCutterFixture.expected.signedVolumeMm3,
        legacyCutterFixture.tolerance.signedVolumeMm3
      );
      expect(report.bounds).not.toBeNull();
      if (!report.bounds) throw new Error('La recette doit conserver les bounds monde.');
      expect(report.bounds.min.y).toBeCloseTo(0, 5);
      expect(artifact.dimensionsMm).toEqual(dimensionsFromBounds(report.bounds));
      expectAbsoluteTolerance(
        artifact.dimensionsMm.width,
        legacyCutterFixture.expected.dimensionsMm.width,
        legacyCutterFixture.tolerance.dimensionsMm
      );
      expectAbsoluteTolerance(
        artifact.dimensionsMm.depth,
        legacyCutterFixture.expected.dimensionsMm.depth,
        legacyCutterFixture.tolerance.dimensionsMm
      );
      expectAbsoluteTolerance(
        artifact.dimensionsMm.height,
        legacyCutterFixture.expected.dimensionsMm.height,
        legacyCutterFixture.tolerance.dimensionsMm
      );
      expect(legacyCutterFixture.expected.logicalTriangleHashAlgorithm).toBe(
        LEGACY_HASH_ALGORITHM
      );
      expect(logicalTriangleHash(artifact.object)).toBe(
        legacyCutterFixture.expected.logicalTriangleHash
      );
    } finally {
      for (const artifact of artifacts ?? []) disposeObject3D(artifact.object);
    }
  });

  it('transmet les ponts V2 à la recette et ne les substitue pas au SVG', async () => {
    const svg = '<svg viewBox="-10 -10 120 120"><path d="M0 0 L100 0 L100 100 L0 100 Z"/><path d="M35 35 L65 35 L65 65 L35 65 Z"/></svg>';
    const bridge = { id: 'bridge-1', from: { x: 0, y: 50 }, to: { x: 35, y: 50 }, widthMm: 2 };
    const document = { ...createCutterDocument(createDefaultCutterParameters(), svg), schemaVersion: 2 as const, bridges: [bridge] };
    const artifacts = await cutterRecipe.generate(document, generationContext(new AbortController().signal));
    try {
      expect(generateCookieCutterMock).toHaveBeenCalledWith(svg, document.parameters, [bridge]);
      expect(artifacts[0].validation.shells).toBe(1);
      expect(artifacts[0].validation.valid).toBe(true);
    } finally { for (const artifact of artifacts) disposeObject3D(artifact.object); }
  });

  it('V5 aplica Ignorar a un path interior sin cambiar el SVG original', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0 L100 0 L100 100 L0 100 Z"/><path d="M30 30 L70 30 L70 70 L30 70 Z"/></svg>';
    const document = {
      ...createCutterDocument(createDefaultCutterParameters(), svg),
      schemaVersion: 5 as const,
      bridges: [],
      contourOperations: [{ pathIndex: 1, operation: 'ignore' as const }]
    };
    const artifacts = await cutterRecipe.generate(document, generationContext(new AbortController().signal));
    try {
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].validation.valid).toBe(true);
      expect(artifacts[0].object.userData.contourCount).toBe(1);
      const inputSvg = generateCookieCutterMock.mock.lastCall?.[0];
      expect(inputSvg).toContain('M0 0 L100 0');
      expect(inputSvg).not.toContain('M30 30 L70 30');
      expect(document.sketch.svg).toBe(svg);
    } finally {
      for (const artifact of artifacts) disposeObject3D(artifact.object);
    }
  });

  it.each(['emboss', 'engrave'] as const)('V5 bloquea %s sin fabricar una geometría falsa', async operation => {
    const svg = '<svg viewBox="0 0 100 100"><path d="M0 0 L100 0 L100 100 L0 100 Z"/></svg>';
    const document = {
      ...createCutterDocument(createDefaultCutterParameters(), svg),
      schemaVersion: 5 as const,
      bridges: [],
      contourOperations: [{ pathIndex: 0, operation }]
    };
    const previousCalls = generateCookieCutterMock.mock.calls.length;
    let error: unknown;
    try {
      await cutterRecipe.generate(document, generationContext(new AbortController().signal));
    } catch (cause) { error = cause; }
    expect(error).toMatchObject({ code: 'INVALID_PARAMS', details: { field: 'contourOperations' } });
    expect(generateCookieCutterMock.mock.calls.length).toBe(previousCalls);
  });

  it('V5 rechaza ignorar todos los contornos sin invocar el generador', async () => {
    const svg = '<svg viewBox="0 0 100 100"><path d="M0 0 L100 0 L100 100 L0 100 Z"/></svg>';
    const document = {
      ...createCutterDocument(createDefaultCutterParameters(), svg),
      schemaVersion: 5 as const,
      bridges: [],
      contourOperations: [{ pathIndex: 0, operation: 'ignore' as const }]
    };
    const previousCalls = generateCookieCutterMock.mock.calls.length;
    await expect(cutterRecipe.generate(document, generationContext(new AbortController().signal)))
      .rejects.toMatchObject({ code: 'NO_VALID_CONTOURS' });
    expect(generateCookieCutterMock.mock.calls.length).toBe(previousCalls);
  });

  it('V5 no interpreta silenciosamente contornos dentro de grupos', async () => {
    const svg = '<svg viewBox="0 0 100 100"><g><path d="M0 0 L100 0 L100 100 L0 100 Z"/></g><path d="M20 20 L30 20 L30 30 Z"/></svg>';
    const document = {
      ...createCutterDocument(createDefaultCutterParameters(), svg),
      schemaVersion: 5 as const,
      bridges: [],
      contourOperations: [{ pathIndex: 1, operation: 'ignore' as const }]
    };
    const previousCalls = generateCookieCutterMock.mock.calls.length;
    await expect(cutterRecipe.generate(document, generationContext(new AbortController().signal)))
      .rejects.toMatchObject({ code: 'INVALID_PARAMS' });
    expect(generateCookieCutterMock.mock.calls.length).toBe(previousCalls);
  });

  it('V5 genera el primer relieve interior unido en una única malla estanca', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0 L100 0 L100 100 L0 100 Z"/><path d="M30 30 L70 30 L70 70 L30 70 Z"/></svg>';
    const bridge = { id: 'relief-bridge', from: { x: 0, y: 50 }, to: { x: 30, y: 50 }, widthMm: 2 };
    const params = { ...createDefaultCutterParameters(), taperAngle: 0, enableHandle: false, handleStyle: 'none' as const };
    const document = {
      ...createCutterDocument(params, svg),
      schemaVersion: 5 as const, bridges: [bridge],
      contourOperations: [{ pathIndex: 0, operation: 'cut' as const }, { pathIndex: 1, operation: 'emboss' as const, depthMm: 1.5 }]
    };
    const artifacts = await cutterRecipe.generate(document, generationContext(new AbortController().signal));
    try {
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].validation.valid, artifacts[0].validation.errors.join('\n')).toBe(true);
      expect(artifacts[0].validation.shells).toBe(1);
      const object = artifacts[0].object;
      const stl = serializeSTL(object, true);
      expect(stl).toBeInstanceOf(DataView);
      if (!(stl instanceof DataView)) throw new Error('STL binario esperado.');
      expect(stl.byteLength).toBe(84 + artifacts[0].validation.triangles * 50);
      const threeMf = serialize3MF(object, params);
      expect(threeMf.byteLength).toBeGreaterThan(100);
      const meshes = object.children.filter(child => child instanceof THREE.Mesh);
      expect(meshes).toHaveLength(1);
      const geometry = (meshes[0] as THREE.Mesh).geometry;
      const vertices = geometry.getAttribute('position');
      const bottomHeights = Array.from({ length: vertices.count }, (_, i) => vertices.getY(i));
      expect(Math.max(...bottomHeights)).toBeGreaterThan(1.5);
      expect(generateCookieCutterMock).toHaveBeenCalledWith(
        svg, params, [bridge], { outerIndex: 0, detailIndex: 1, clearanceMm: 1.5 }
      );
      expect(document.sketch.svg).toBe(svg);
    } finally { for (const artifact of artifacts) disposeObject3D(artifact.object); }
  });

  it('V5 exporta dos relieves conectados con alturas independientes como una sola pieza', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path d="M0 0 L100 0 L100 100 L0 100 Z"/>' +
      '<path d="M25 20 L40 20 L40 40 L25 40 Z"/>' +
      '<path d="M60 60 L75 60 L75 80 L60 80 Z"/></svg>';
    const bridges = [
      { id: 'left', from: { x: 0, y: 30 }, to: { x: 25, y: 30 }, widthMm: 2 },
      { id: 'right', from: { x: 100, y: 70 }, to: { x: 75, y: 70 }, widthMm: 2 }
    ];
    const params = { ...createDefaultCutterParameters(), taperAngle: 0, enableHandle: false, handleStyle: 'none' as const };
    const document = {
      ...createCutterDocument(params, svg),
      schemaVersion: 5 as const, bridges,
      contourOperations: [
        { pathIndex: 0, operation: 'cut' as const },
        { pathIndex: 1, operation: 'emboss' as const, depthMm: 0.8 },
        { pathIndex: 2, operation: 'emboss' as const, depthMm: 2.4 }
      ]
    };
    const artifacts = await cutterRecipe.generate(document, generationContext(new AbortController().signal));
    try {
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].validation.valid, artifacts[0].validation.errors.join('\n')).toBe(true);
      expect(artifacts[0].validation.shells).toBe(1);
      const object = artifacts[0].object;
      expect(object.children.filter(child => child instanceof THREE.Mesh)).toHaveLength(1);
      const mesh = object.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
      const position = mesh.geometry.getAttribute('position');
      const scale = object.userData.effectiveScale as number;
      const closeTo = (x: number, z: number, clearance: number) => {
        const candidates = Array.from({ length: position.count }, (_, i) => ({
          distance: Math.hypot(Math.abs(position.getX(i)) - x * scale, Math.abs(position.getZ(i)) - z * scale),
          y: position.getY(i)
        })).filter(p => p.distance < 1.4);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.some(p => Math.abs(p.y - clearance) < 0.35)).toBe(true);
      };
      closeTo(25, 30, 0.8);
      closeTo(75, 70, 2.4);
      const stl = serializeSTL(object, true);
      expect(stl).toBeInstanceOf(DataView);
      if (!(stl instanceof DataView)) throw new Error('STL esperado.');
      expect(stl.byteLength).toBe(84 + artifacts[0].validation.triangles * 50);
      expect(serialize3MF(object, params).byteLength).toBeGreaterThan(100);
      expect(document.sketch.svg).toBe(svg);
    } finally {
      for (const artifact of artifacts) disposeObject3D(artifact.object);
    }
  });

  it('V5 admite tres detalles conectados de distintas alturas en un único STL', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path d="M0 0 L100 0 L100 100 L0 100 Z"/>' +
      '<path d="M25 20 L40 20 L40 40 L25 40 Z"/>' +
      '<path d="M60 60 L75 60 L75 80 L60 80 Z"/>' +
      '<path d="M45 35 L55 35 L55 45 L45 45 Z"/></svg>';
    const bridges = [
      { id: 'left', from: { x: 0, y: 30 }, to: { x: 25, y: 30 }, widthMm: 2 },
      { id: 'right', from: { x: 100, y: 70 }, to: { x: 75, y: 70 }, widthMm: 2 },
      { id: 'top', from: { x: 50, y: 0 }, to: { x: 50, y: 35 }, widthMm: 2 }
    ];
    const parameters = { ...createDefaultCutterParameters(), taperAngle: 0, enableHandle: false, handleStyle: 'none' as const };
    const document = {
      ...createCutterDocument(parameters, svg), schemaVersion: 5 as const, bridges,
      contourOperations: [
        { pathIndex: 0, operation: 'cut' as const },
        { pathIndex: 1, operation: 'emboss' as const, depthMm: 0.8 },
        { pathIndex: 2, operation: 'emboss' as const, depthMm: 2.4 },
        { pathIndex: 3, operation: 'emboss' as const, depthMm: 1.5 }
      ]
    };
    const artifacts = await cutterRecipe.generate(document, generationContext(new AbortController().signal));
    try {
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].validation.valid, artifacts[0].validation.errors.join('\n')).toBe(true);
      expect(artifacts[0].validation.shells).toBe(1);
      const stl = serializeSTL(artifacts[0].object, true);
      expect(stl).toBeInstanceOf(DataView);
      if (!(stl instanceof DataView)) throw new Error('STL esperado');
      expect(stl.byteLength).toBe(84 + artifacts[0].validation.triangles * 50);
    } finally {
      for (const artifact of artifacts) disposeObject3D(artifact.object);
    }
  });

  it('V5 genera y exporta seis relieves de alturas diferentes en una envolvente', async () => {
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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">${paths.join('')}</svg>`;
    const params = { ...createDefaultCutterParameters(), taperAngle: 0, enableHandle: false, handleStyle: 'none' as const };
    const document = { ...createCutterDocument(params, svg), schemaVersion: 5 as const,
      bridges, contourOperations: operations };
    const artifacts = await cutterRecipe.generate(document, generationContext(new AbortController().signal));
    try {
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].validation.valid, artifacts[0].validation.errors.join('\n')).toBe(true);
      expect(artifacts[0].validation.shells).toBe(1);
      const stl = serializeSTL(artifacts[0].object, true);
      expect(stl).toBeInstanceOf(DataView);
      if (!(stl instanceof DataView)) throw Error('Se esperaba STL binario');
      expect(stl.byteLength).toBe(84 + artifacts[0].validation.triangles * 50);
      expect(serialize3MF(artifacts[0].object, params).byteLength).toBeGreaterThan(100);
    } finally {
      for (const artifact of artifacts) disposeObject3D(artifact.object);
    }
  });

  it('V5 exporta un relieve con puente ramificado entre dos detalles interiores', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path d="M0 0 L100 0 L100 100 L0 100 Z"/>' +
      '<path d="M25 20 L40 20 L40 40 L25 40 Z"/>' +
      '<path d="M55 20 L70 20 L70 40 L55 40 Z"/></svg>';
    const bridges = [
      { id: 'root', from: { x: 0, y: 30 }, to: { x: 25, y: 30 }, widthMm: 2 },
      { id: 'branch', from: { x: 40, y: 30 }, to: { x: 55, y: 30 }, widthMm: 2 }
    ];
    const parameters = { ...createDefaultCutterParameters(), taperAngle: 0, enableHandle: false, handleStyle: 'none' as const };
    const document = { ...createCutterDocument(parameters, svg), schemaVersion: 5 as const, bridges,
      contourOperations: [
        { pathIndex: 0, operation: 'cut' as const },
        { pathIndex: 1, operation: 'emboss' as const, depthMm: 0.9 },
        { pathIndex: 2, operation: 'emboss' as const, depthMm: 2.2 }
      ] };
    const artifacts = await cutterRecipe.generate(document, generationContext(new AbortController().signal));
    try {
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].validation.valid, artifacts[0].validation.errors.join('\n')).toBe(true);
      expect(artifacts[0].validation.shells).toBe(1);
      expect(artifacts[0].object.children.filter(child => child instanceof THREE.Mesh)).toHaveLength(1);
      const stl = serializeSTL(artifacts[0].object, true);
      expect(stl).toBeInstanceOf(DataView);
      if (!(stl instanceof DataView)) throw Error('Se esperaba STL binario');
      expect(stl.byteLength).toBe(84 + artifacts[0].validation.triangles * 50);
      expect(serialize3MF(artifacts[0].object, parameters).byteLength).toBeGreaterThan(100);
    } finally { for (const artifact of artifacts) disposeObject3D(artifact.object); }
  });

  it('V5 falla cerrado si Relieve carece de puente o conserva un mango', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L100 0 L100 100 L0 100 Z"/><path d="M30 30 L70 30 L70 70 L30 70 Z"/></svg>';
    const bridge = { id: 'join', from: { x: 0, y: 50 }, to: { x: 30, y: 50 }, widthMm: 2 };
    const document = {
      ...createCutterDocument(createDefaultCutterParameters(), svg), schemaVersion: 5 as const,
      bridges: [bridge], contourOperations: [{ pathIndex: 1, operation: 'emboss' as const, depthMm: 1.2 }]
    };
    const calls = generateCookieCutterMock.mock.calls.length;
    await expect(cutterRecipe.generate(document, generationContext(new AbortController().signal)))
      .rejects.toMatchObject({ code: 'INVALID_PARAMS' });
    await expect(cutterRecipe.generate({ ...document, bridges: [] }, generationContext(new AbortController().signal)))
      .rejects.toMatchObject({ code: 'INVALID_PARAMS' });
    expect(generateCookieCutterMock.mock.calls.length).toBe(calls);
  });

  it('propage intact le code d’échec capturé par la fixture legacy', async () => {
    const document = createCutterDocument(
      { ...legacyCutterFixture.failure.parameters },
      legacyCutterFixture.failure.svg
    );
    const error = await captureFailure(
      document,
      generationContext(new AbortController().signal)
    );

    expect(error).toBeInstanceOf(CutterGenerationError);
    expect(error).toMatchObject({ code: legacyCutterFixture.failure.errorCode });
  });

  it('propage par identité une CutterGenerationError du générateur sans wrapping', async () => {
    const sentinel = new CutterGenerationError(
      'INVALID_GEOMETRY',
      'Erreur sentinelle du générateur.',
      { field: 'sentinel' }
    );
    generateCookieCutterMock.mockRejectedValueOnce(sentinel);

    const error = await captureFailure(
      createCutterDocument(),
      generationContext(new AbortController().signal)
    );

    expect(error).toBe(sentinel);
  });

  it('rejette une géométrie finale invalide et dispose ses ressources exactement une fois', async () => {
    const generated = disposableInvalidGroup();
    generateCookieCutterMock.mockResolvedValueOnce(generated.object);

    const error = await captureFailure(
      createCutterDocument(),
      generationContext(new AbortController().signal)
    );

    expect(error).toBeInstanceOf(CutterGenerationError);
    expect(error).toMatchObject({ code: 'INVALID_GEOMETRY' });
    expect(generated.objectClear).toHaveBeenCalledTimes(1);
    expect(generated.geometryDispose).toHaveBeenCalledTimes(1);
    expect(generated.materialDispose).toHaveBeenCalledTimes(1);
  });

  it('dispose exactement une fois un objet produit si le signal est annulé après l’await', async () => {
    const controller = new AbortController();
    const generated = disposableInvalidGroup();
    generateCookieCutterMock.mockImplementationOnce(async () => {
      controller.abort();
      return generated.object;
    });

    const error = await captureFailure(
      createCutterDocument(),
      generationContext(controller.signal)
    );

    expect(error).toMatchObject({ name: 'AbortError' });
    expect(generated.objectClear).toHaveBeenCalledTimes(1);
    expect(generated.geometryDispose).toHaveBeenCalledTimes(1);
    expect(generated.materialDispose).toHaveBeenCalledTimes(1);
  });
});
