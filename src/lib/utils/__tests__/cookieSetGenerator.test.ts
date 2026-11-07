import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, type CookieCutterParams } from '../../types/CookieCutter';
import { disposeObject3D } from '../disposeThree';
import {
  COOKIE_SET_LIMITS,
  generateCookieSet,
  type CookieSetOptions
} from '../cookieSetGenerator';
import { CutterGenerationError } from '../generationValidation';
import { validatePrintableObject } from '../geometryValidation';
import { serializeSTL } from '../stlExporter';
import { installSvgLoaderDomParserAdapter } from './svgDomTestSupport';

/** Círculo exterior con dos huecos interiores: silueta + detalle. */
const detailedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path fill-rule="evenodd" d="M 50 5 A 45 45 0 1 1 49.99 5 Z
    M 35 40 H 45 V 50 H 35 Z
    M 58 55 H 72 V 62 H 58 Z" />
</svg>`;

/** Solo silueta, sin detalle interior. */
const plainSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="black" />
</svg>`;

/** Triángulo con la punta hacia arriba y un hueco: sirve para comprobar el espejo. */
const triangleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path fill-rule="evenodd" d="M 50 0 L 100 100 L 0 100 Z M 45 70 H 55 V 85 H 45 Z" />
</svg>`;

function setParams(overrides: Partial<CookieCutterParams> = {}): CookieCutterParams {
  return {
    ...DEFAULT_PARAMS,
    enableHandle: false,
    handleStyle: 'none',
    targetSize: 70,
    wallThickness: 1,
    cuttingHeight: 12,
    totalHeight: 12,
    stampDepth: 2,
    ...overrides
  };
}

function options(overrides: Partial<CookieSetOptions> = {}): CookieSetOptions {
  return { layout: 'separate', clearanceMm: 0.5, imprint: 'raised', ...overrides };
}

function size(object: THREE.Object3D): THREE.Vector3 {
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

/** Centroide de los vértices en Z respecto del centro de la caja envolvente. */
function zBias(object: THREE.Object3D): number {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const centerZ = box.getCenter(new THREE.Vector3()).z;
  let sum = 0;
  let count = 0;
  const vertex = new THREE.Vector3();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const position = child.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld);
      sum += vertex.z - centerZ;
      count += 1;
    }
  });
  return sum / count;
}

let restoreDomParser: (() => void) | undefined;
beforeAll(() => {
  restoreDomParser = installSvgLoaderDomParserAdapter();
});
afterAll(() => {
  restoreDomParser?.();
});

describe('generateCookieSet — dos piezas', () => {
  it('genera cortador y sello imprimibles, y el sello entra dentro del cortador', async () => {
    const params = setParams();
    const result = await generateCookieSet(detailedSvg, params, options());
    try {
      expect(result.layout).toBe('separate');
      expect(result.cutter).not.toBeNull();
      expect(result.stamp).not.toBeNull();
      expect(result.single).toBeNull();

      const cutterReport = validatePrintableObject(result.cutter!);
      const stampReport = validatePrintableObject(result.stamp!, { requireSingleShell: true });
      expect(cutterReport.valid, cutterReport.errors.join('\n')).toBe(true);
      expect(stampReport.valid, stampReport.errors.join('\n')).toBe(true);

      const cutterSize = size(result.cutter!);
      const stampSize = size(result.stamp!);
      expect(cutterSize.x).toBeCloseTo(params.targetSize, 0);
      // El sello deja pared + holgura a cada lado.
      expect(stampSize.x).toBeLessThan(cutterSize.x - 2 * (params.wallThickness / 2 + 0.5));
      expect(stampSize.y).toBeCloseTo(4 + params.stampDepth, 3);
      expect(result.notes).toEqual([]);
    } finally {
      disposeObject3D(result.plate);
    }
  });

  it('dispone las piezas lado a lado sin superponerse', async () => {
    const result = await generateCookieSet(detailedSvg, setParams(), options());
    try {
      const cutterBox = new THREE.Box3().setFromObject(result.cutter!);
      const stampBox = new THREE.Box3().setFromObject(result.stamp!);
      expect(cutterBox.intersectsBox(stampBox)).toBe(false);
      expect(stampBox.min.x - cutterBox.max.x).toBeGreaterThanOrEqual(
        COOKIE_SET_LIMITS.layoutGapMm - 1e-6
      );
    } finally {
      disposeObject3D(result.plate);
    }
  });

  it('exporta cada pieza y el conjunto como STL binario válido', async () => {
    const result = await generateCookieSet(detailedSvg, setParams(), options());
    try {
      for (const piece of [result.cutter!, result.stamp!, result.plate]) {
        const binary = serializeSTL(piece, true) as DataView;
        expect(binary.byteLength).toBe(84 + 50 * binary.getUint32(80, true));
      }
    } finally {
      disposeObject3D(result.plate);
    }
  });

  it('soporta sello hundido y mango', async () => {
    const result = await generateCookieSet(
      detailedSvg,
      setParams({ enableHandle: true, handleStyle: 'round', handleHeight: 8, totalHeight: 20 }),
      options({ imprint: 'recessed' })
    );
    try {
      const stampReport = validatePrintableObject(result.stamp!, { requireSingleShell: true });
      expect(stampReport.valid, stampReport.errors.join('\n')).toBe(true);
      expect(size(result.stamp!).y).toBeCloseTo(8 + 4, 3);
    } finally {
      disposeObject3D(result.plate);
    }
  });

  it('avisa cuando la imagen no tiene detalle interior', async () => {
    const result = await generateCookieSet(plainSvg, setParams(), options());
    try {
      expect(result.notes.join(' ')).toContain('no tiene detalle interior');
    } finally {
      disposeObject3D(result.plate);
    }
  });

  it('mantiene el cortador y el sello con la misma orientación (sin espejo entre sí)', async () => {
    const result = await generateCookieSet(triangleSvg, setParams(), options());
    try {
      const cutterBias = zBias(result.cutter!);
      const stampBias = zBias(result.stamp!);
      expect(Math.abs(cutterBias)).toBeGreaterThan(1);
      expect(Math.sign(cutterBias)).toBe(Math.sign(stampBias));
    } finally {
      disposeObject3D(result.plate);
    }
  });
});

describe('generateCookieSet — una sola pieza', () => {
  it('genera un único sólido con placa, pared cortante y relieve', async () => {
    const params = setParams();
    const result = await generateCookieSet(detailedSvg, params, options({ layout: 'single' }));
    try {
      expect(result.layout).toBe('single');
      expect(result.single).not.toBeNull();
      expect(result.cutter).toBeNull();
      expect(result.stamp).toBeNull();

      const report = validatePrintableObject(result.single!, { requireSingleShell: true });
      expect(report.valid, report.errors.join('\n')).toBe(true);
      expect(report.shells).toBe(1);
      const dimensions = size(result.single!);
      expect(dimensions.x).toBeCloseTo(params.targetSize, 0);
      expect(dimensions.y).toBeCloseTo(4 + params.cuttingHeight, 3);

      const binary = serializeSTL(result.single!, true) as DataView;
      expect(binary.byteLength).toBe(84 + 50 * binary.getUint32(80, true));
    } finally {
      disposeObject3D(result.plate);
    }
  });

  it('soporta mango y sello hundido en una pieza', async () => {
    const result = await generateCookieSet(
      detailedSvg,
      setParams({ enableHandle: true, handleStyle: 'round', handleHeight: 8, totalHeight: 20 }),
      options({ layout: 'single', imprint: 'recessed' })
    );
    try {
      const report = validatePrintableObject(result.single!, { requireSingleShell: true });
      expect(report.valid, report.errors.join('\n')).toBe(true);
      expect(size(result.single!).y).toBeCloseTo(8 + 4 + 12, 3);
    } finally {
      disposeObject3D(result.plate);
    }
  });

  it('rechaza un relieve tan alto que supere el filo', async () => {
    await expect(
      generateCookieSet(detailedSvg, setParams({ stampDepth: 12 }), options({ layout: 'single' }))
    ).rejects.toThrow(/relieve/i);
  });
});

describe('generateCookieSet — validación', () => {
  it.each([0, 0.01, 4, Number.NaN])('rechaza la holgura %s', async (clearanceMm) => {
    await expect(
      generateCookieSet(detailedSvg, setParams(), options({ clearanceMm }))
    ).rejects.toBeInstanceOf(CutterGenerationError);
  });

  it('rechaza un sello hundido demasiado profundo', async () => {
    await expect(
      generateCookieSet(detailedSvg, setParams({ stampDepth: 3.5 }), options({ imprint: 'recessed' }))
    ).rejects.toThrow(/3 mm/);
  });

  it('informa en español cuando el cortador no entra en la placa', async () => {
    await expect(
      generateCookieSet(detailedSvg, setParams({ buildPlateSize: 50 }), options())
    ).rejects.toThrow(/plataforma/);
  });
});
