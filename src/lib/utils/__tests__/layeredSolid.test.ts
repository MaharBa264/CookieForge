import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { validatePrintableObject } from '../geometryValidation';
import {
  LayeredSolidBuilder,
  loopArea,
  loopDepths,
  polygonsFromLoops,
  type Loop
} from '../layeredSolid';

const square = (cx: number, cy: number, half: number): Loop => [
  { x: cx - half, y: cy - half },
  { x: cx + half, y: cy - half },
  { x: cx + half, y: cy + half },
  { x: cx - half, y: cy + half }
];

function groupFrom(builder: LayeredSolidBuilder): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(builder.toGeometry(), new THREE.MeshStandardMaterial()));
  group.updateMatrixWorld(true);
  return group;
}

describe('polygonsFromLoops', () => {
  it('agrupa por anidamiento: lazo exterior, hueco e isla dentro del hueco', () => {
    const loops = [square(0, 0, 10), square(0, 0, 6), square(0, 0, 2), square(30, 0, 3)];
    expect(loopDepths(loops)).toEqual([0, 1, 2, 0]);
    const polygons = polygonsFromLoops(loops);
    expect(polygons).toHaveLength(3);
    expect(polygons[0].holes).toHaveLength(1);
    expect(polygons[1].holes).toHaveLength(0);
  });

  it('calcula el área con signo según la orientación', () => {
    expect(loopArea(square(0, 0, 1))).toBeCloseTo(4);
    expect(loopArea([...square(0, 0, 1)].reverse())).toBeCloseTo(-4);
  });
});

describe('LayeredSolidBuilder', () => {
  it('arma un prisma cerrado, orientado hacia afuera y con el volumen esperado', () => {
    const builder = new LayeredSolidBuilder();
    const outline = square(0, 0, 5);
    builder.addCap([outline], 0, false);
    builder.addWall(outline, 0, 3, true);
    builder.addCap([outline], 3, true);

    const report = validatePrintableObject(groupFrom(builder), { requireSingleShell: true });
    expect(report.valid, report.errors.join('\n')).toBe(true);
    expect(report.shells).toBe(1);
    expect(report.volume).toBeCloseTo(10 * 10 * 3, 3);
  });

  it('arma una copa con cavidad y relieve sobre el fondo, sin uniones en T', () => {
    const builder = new LayeredSolidBuilder();
    const outer = square(0, 0, 10);
    const cavity = square(0, 0, 8);
    const relief = square(0, 0, 3);
    builder.addCap([outer], 0, false);
    builder.addWall(outer, 0, 10, true);
    builder.addCap([outer, cavity], 10, true);
    builder.addWall(cavity, 4, 10, false);
    builder.addCap([cavity, relief], 4, true);
    builder.addWall(relief, 4, 6, true);
    builder.addCap([relief], 6, true);

    const report = validatePrintableObject(groupFrom(builder), { requireSingleShell: true });
    expect(report.valid, report.errors.join('\n')).toBe(true);
    // Prisma exterior − cavidad + relieve.
    const expected = 20 * 20 * 10 - 16 * 16 * 6 + 6 * 6 * 2;
    expect(report.volume).toBeCloseTo(expected, 3);
  });

  it('arma un grabado hundido (relieve negativo) con volumen menor que la placa', () => {
    const builder = new LayeredSolidBuilder();
    const outer = square(0, 0, 10);
    const recess = square(0, 0, 4);
    builder.addCap([outer], 0, false);
    builder.addWall(outer, 0, 4, true);
    builder.addCap([outer, recess], 4, true);
    builder.addWall(recess, 2, 4, false);
    builder.addCap([recess], 2, true);

    const report = validatePrintableObject(groupFrom(builder), { requireSingleShell: true });
    expect(report.valid, report.errors.join('\n')).toBe(true);
    expect(report.volume).toBeCloseTo(20 * 20 * 4 - 8 * 8 * 2, 3);
  });
});
