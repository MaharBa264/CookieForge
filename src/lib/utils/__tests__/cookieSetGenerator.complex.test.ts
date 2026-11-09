import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_PARAMS } from '../../types/CookieCutter';
import { disposeObject3D } from '../disposeThree';
import { generateCookieSet } from '../cookieSetGenerator';
import { generateStamp } from '../stampGenerator';
import { validatePrintableObject } from '../geometryValidation';
import { installSvgLoaderDomParserAdapter } from './svgDomTestSupport';

/**
 * Caso real: carta ilustrada vectorizada desde un PNG (71 trazados, ~5.700 segmentos).
 * Antes fallaba por exceso de puntos y luego porque el sello quedaba con la superficie abierta.
 */
const svg = readFileSync(resolve(process.cwd(), 'src/lib/utils/__tests__/fixtures/carta-compleja-trazada.svg'), 'utf8');
const params = {
  ...DEFAULT_PARAMS,
  enableHandle: false,
  handleStyle: 'none' as const,
  targetSize: 75,
  wallThickness: 1,
  cuttingHeight: 12,
  totalHeight: 12,
  stampDepth: 2
};

let restore: () => void;
beforeAll(() => { restore = installSvgLoaderDomParserAdapter(); });
afterAll(() => restore());

describe('juego cortador + sello con una imagen muy detallada', () => {
  for (const layout of ['separate', 'single'] as const) {
    it(`genera piezas imprimibles en disposición «${layout}»`, async () => {
      const result = await generateCookieSet(svg, params, { layout, clearanceMm: 0.5, imprint: 'raised' });
      try {
        const pieces = layout === 'separate' ? [result.cutter, result.stamp] : [result.single];
        for (const piece of pieces) {
          expect(piece).not.toBeNull();
          expect(validatePrintableObject(piece as THREE.Group).valid).toBe(true);
        }
      } finally {
        disposeObject3D(result.plate);
      }
    }, 120000);
  }
});

describe('sello suelto con una imagen muy detallada', () => {
  for (const imprint of ['raised', 'recessed'] as const) {
    for (const enableHandle of [false, true]) {
      it(`genera un sello imprimible (${imprint}, ${enableHandle ? 'con' : 'sin'} mango)`, async () => {
        const stamp = await generateStamp(
          svg,
          { ...DEFAULT_PARAMS, targetSize: 75, stampDepth: 2, enableHandle, handleStyle: 'round' as const },
          imprint
        );
        try {
          expect(validatePrintableObject(stamp, { requireSingleShell: true }).valid).toBe(true);
          expect(stamp.userData.geometryRoute).toBe('layered');
        } finally {
          disposeObject3D(stamp);
        }
      }, 120000);
    }
  }
});
