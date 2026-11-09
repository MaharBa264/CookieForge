declare module 'cdt2d' {
  /** Triangulación de Delaunay con restricciones (sin tipos propios). */
  export default function cdt2d(
    points: ReadonlyArray<readonly [number, number]>,
    edges?: ReadonlyArray<readonly [number, number]>,
    options?: { delaunay?: boolean; interior?: boolean; exterior?: boolean; infinity?: boolean }
  ): Array<[number, number, number]>;
}
