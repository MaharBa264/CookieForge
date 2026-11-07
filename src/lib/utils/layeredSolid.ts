import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Constructor de sólidos por capas (tapas planas + paredes verticales).
 *
 * Las operaciones booleanas 3D generan triángulos degenerados con contornos reales de
 * imágenes vectorizadas. Aquí cada cara horizontal se triangula a partir de lazos 2D y
 * cada pared vertical usa exactamente los mismos vértices de esos lazos, de modo que el
 * mallado resultante es cerrado y conforme por construcción (sin uniones en T).
 *
 * Coordenadas de entrada: Z hacia arriba. La salida usa el sistema del visor (Y hacia
 * arriba): (x, y, z) → (x, z, −y), una rotación propia que conserva la orientación.
 */

export type Pt = Readonly<{ x: number; y: number }>;
export type Loop = ReadonlyArray<Pt>;

export interface LoopPolygon {
  readonly outer: Loop;
  readonly holes: ReadonlyArray<Loop>;
}

export function loopArea(loop: Loop): number {
  let twice = 0;
  for (let index = 0; index < loop.length; index += 1) {
    const current = loop[index];
    const next = loop[(index + 1) % loop.length];
    twice += current.x * next.y - next.x * current.y;
  }
  return twice / 2;
}

export function pointInLoop(point: Pt, loop: Loop): boolean {
  let inside = false;
  for (let index = 0, previous = loop.length - 1; index < loop.length; previous = index++) {
    const a = loop[index];
    const b = loop[previous];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Profundidad de anidamiento de cada lazo respecto de los demás (par = sólido, impar = hueco). */
export function loopDepths(loops: ReadonlyArray<Loop>): number[] {
  return loops.map((loop, index) =>
    loops.reduce(
      (depth, candidate, candidateIndex) =>
        candidateIndex !== index && pointInLoop(loop[0], candidate) ? depth + 1 : depth,
      0
    )
  );
}

/** Agrupa lazos estrictamente anidados o disjuntos en polígonos con huecos (regla par-impar). */
export function polygonsFromLoops(loops: ReadonlyArray<Loop>): LoopPolygon[] {
  const depths = loopDepths(loops);
  const polygons: LoopPolygon[] = [];
  loops.forEach((loop, index) => {
    if (depths[index] % 2 !== 0) return;
    const holes = loops.filter(
      (candidate, candidateIndex) =>
        depths[candidateIndex] === depths[index] + 1 && pointInLoop(candidate[0], loop)
    );
    polygons.push({ outer: loop, holes });
  });
  return polygons;
}

export class LayeredSolidBuilder {
  private readonly positions: number[] = [];

  private pushTriangle(a: readonly number[], b: readonly number[], c: readonly number[]): void {
    this.positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }

  /** Cara horizontal en `z` cubriendo la región definida por los lazos (par-impar). */
  addCap(loops: ReadonlyArray<Loop>, z: number, facesUp: boolean): void {
    for (const polygon of polygonsFromLoops(loops)) {
      const outer = polygon.outer.map(({ x, y }) => new THREE.Vector2(x, y));
      const holes = polygon.holes.map((hole) => hole.map(({ x, y }) => new THREE.Vector2(x, y)));
      const points = [...outer, ...holes.flat()];
      const triangles = THREE.ShapeUtils.triangulateShape(outer, holes);
      for (const [a, b, c] of triangles) {
        const pa = points[a];
        const pb = points[b];
        const pc = points[c];
        const cross = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x);
        if (cross === 0) continue;
        const counterClockwise = cross > 0;
        const ordered = counterClockwise === facesUp ? [pa, pb, pc] : [pa, pc, pb];
        this.pushTriangle(
          [ordered[0].x, ordered[0].y, z],
          [ordered[1].x, ordered[1].y, z],
          [ordered[2].x, ordered[2].y, z]
        );
      }
    }
  }

  /**
   * Pared vertical sobre un lazo entre `zBottom` y `zTop`.
   * `solidInside`: el material está dentro del lazo (borde exterior) o fuera (hueco).
   */
  addWall(loop: Loop, zBottom: number, zTop: number, solidInside: boolean): void {
    if (zTop - zBottom <= 0) return;
    // Para un lazo antihorario el interior queda a la izquierda de cada arista.
    const counterClockwise = loopArea(loop) > 0;
    const normalPointsRight = solidInside === counterClockwise;
    for (let index = 0; index < loop.length; index += 1) {
      const a = loop[index];
      const b = loop[(index + 1) % loop.length];
      if (a.x === b.x && a.y === b.y) continue;
      const a0 = [a.x, a.y, zBottom];
      const b0 = [b.x, b.y, zBottom];
      const b1 = [b.x, b.y, zTop];
      const a1 = [a.x, a.y, zTop];
      if (normalPointsRight) {
        this.pushTriangle(a0, b0, b1);
        this.pushTriangle(a0, b1, a1);
      } else {
        this.pushTriangle(a0, b1, b0);
        this.pushTriangle(a0, a1, b1);
      }
    }
  }

  get triangleCount(): number {
    return this.positions.length / 9;
  }

  toGeometry(): THREE.BufferGeometry {
    const viewerPositions: number[] = [];
    for (let index = 0; index < this.positions.length; index += 3) {
      viewerPositions.push(
        this.positions[index],
        this.positions[index + 2],
        -this.positions[index + 1]
      );
    }
    const raw = new THREE.BufferGeometry();
    raw.setAttribute('position', new THREE.Float32BufferAttribute(viewerPositions, 3));
    const welded = mergeVertices(raw, 1e-5);
    raw.dispose();
    welded.computeVertexNormals();
    welded.computeBoundingBox();
    welded.computeBoundingSphere();
    return welded;
  }
}
