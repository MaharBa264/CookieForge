import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import * as THREE from 'three';
import type { ExportOptions } from '../types/CookieCutter';
import { CutterGenerationError } from './generationValidation';
import { validatePrintableObject } from './geometryValidation';
import { cloneForManufacturing } from './manufacturingCoordinates';

function exportFailure(
  message: string,
  details: Readonly<Record<string, unknown>>
): never {
  throw new CutterGenerationError('EXPORT_FAILED', message, details);
}

/**
 * Validate then serialize an object without touching the DOM.
 */
export function serializeSTL(
  object: THREE.Object3D,
  binary: boolean = true
): DataView | string {
  const sourceReport = validatePrintableObject(object);
  if (!sourceReport.valid) {
    exportFailure(`Exportación STL bloqueada: ${sourceReport.errors[0]}`, {
      errors: sourceReport.errors,
      triangles: sourceReport.triangles,
      shells: sourceReport.shells,
      meshes: sourceReport.meshes,
      volume: sourceReport.volume
    });
  }

  const manufacturingObject = cloneForManufacturing(object);
  const report = validatePrintableObject(manufacturingObject);
  if (!report.valid) {
    exportFailure(`Exportación STL bloqueada: ${report.errors[0]}`, {
      errors: report.errors,
      triangles: report.triangles,
      shells: report.shells,
      meshes: report.meshes,
      volume: report.volume
    });
  }

  const output = new STLExporter().parse(manufacturingObject, { binary });

  if (binary) {
    if (!(output instanceof DataView)) {
      exportFailure('El exportador STL devolvió un resultado binario inesperado.', {
        triangles: report.triangles
      });
    }

    const view = output;
    const expectedLength = 84 + report.triangles * 50;
    if (view.byteLength !== expectedLength || view.byteLength < 84) {
      exportFailure('El tamaño del STL binario no coincide con su cantidad de triángulos.', {
        actualBytes: view.byteLength,
        expectedBytes: expectedLength,
        triangles: report.triangles
      });
    }

    const serializedTriangles = view.getUint32(80, true);
    if (serializedTriangles !== report.triangles) {
      exportFailure('El encabezado del STL binario contiene una cantidad de triángulos inválida.', {
        actual: serializedTriangles,
        expected: report.triangles
      });
    }

    for (let triangle = 0; triangle < serializedTriangles; triangle += 1) {
      const start = 84 + triangle * 50;
      for (let component = 0; component < 12; component += 1) {
        if (!Number.isFinite(view.getFloat32(start + component * 4, true))) {
          exportFailure('El STL binario contiene un valor no finito.', {
            triangle,
            component
          });
        }
      }
    }

    return view;
  }

  if (typeof output !== 'string') {
    exportFailure('El exportador STL devolvió un resultado de texto inesperado.', {
      triangles: report.triangles
    });
  }

  if (/NaN|Infinity/.test(output)) {
    exportFailure('El STL ASCII contiene un valor no finito.', {
      triangles: report.triangles
    });
  }

  const facetCount = output.match(/\bfacet normal\b/g)?.length ?? 0;
  if (facetCount !== report.triangles) {
    exportFailure('La cantidad de triángulos del STL ASCII es inconsistente.', {
      actual: facetCount,
      expected: report.triangles
    });
  }

  return output;
}

/**
 * Validate, serialize and download a Three.js object as STL.
 */
export function exportToSTL(
  object: THREE.Object3D,
  filename: string = 'cookie-cutter.stl',
  options: ExportOptions = { binary: true }
): void {
  const serialized = serializeSTL(object, options.binary);
  const blob = createSTLBlob(serialized);

  downloadBlob(blob, filename);
}

/**
 * Preserve the exact DataView window instead of accidentally including bytes
 * before or after the serialized STL payload.
 */
export function createSTLBlob(serialized: DataView | string): Blob {
  if (typeof serialized === 'string') {
    return new Blob([serialized], { type: 'model/stl' });
  }

  const window = new Uint8Array(
    serialized.buffer,
    serialized.byteOffset,
    serialized.byteLength
  );
  const ownedBytes = Uint8Array.from(window);
  return new Blob([ownedBytes], { type: 'model/stl' });
}

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Calculate estimated file size before export.
 */
export function estimateSTLSize(object: THREE.Object3D, binary: boolean = true): number {
  let totalFaces = 0;

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const geometry = child.geometry;
    const position = geometry.getAttribute('position');
    if (!position) return;

    totalFaces += geometry.index ? geometry.index.count / 3 : position.count / 3;
  });

  return binary ? 84 + totalFaces * 50 : totalFaces * 200;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
