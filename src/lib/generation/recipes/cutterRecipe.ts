import type { CutterDesignParameters } from '../../domain/designParameters';
import { createDefaultCutterParameters } from '../../domain/designParameters';
import type { GeneratedArtifact } from '../../domain/generatedArtifact';
import { generateCookieCutter } from '../../utils/cookieCutterGenerator';
import { disposeObject3D } from '../../utils/disposeThree';
import {
  CutterGenerationError,
  validateCookieCutterParams
} from '../../utils/generationValidation';
import { validatePrintableObject } from '../../utils/geometryValidation';
import type {
  GenerationRecipe,
  RecipeValidationIssue,
  RecipeValidationResult
} from '../generationRecipe';

function invalidResult(
  issue: RecipeValidationIssue
): RecipeValidationResult<CutterDesignParameters> {
  return Object.freeze({
    valid: false,
    issues: Object.freeze([Object.freeze(issue)])
  });
}

function issueFromGenerationError(
  error: CutterGenerationError
): RecipeValidationIssue {
  const field = error.details?.field;
  return {
    path: typeof field === 'string' ? field : 'parameters',
    code: error.code,
    message: error.message
  };
}

function reconstructCutterParameters(
  value: unknown
): RecipeValidationResult<CutterDesignParameters> {
  try {
    const validated = validateCookieCutterParams(value);
    if (validated.mode !== 'cutter') {
      throw new CutterGenerationError(
        'INVALID_PARAMS',
        'The mode parameter must be cutter for the Cutter recipe.',
        { field: 'mode', value: validated.mode }
      );
    }

    const parameters: CutterDesignParameters = Object.freeze({
      wallThickness: validated.wallThickness,
      cuttingHeight: validated.cuttingHeight,
      totalHeight: validated.totalHeight,
      taperAngle: validated.taperAngle,
      targetSize: validated.targetSize,
      sizeMode: validated.sizeMode,
      handleStyle: validated.handleStyle,
      handleHeight: validated.handleHeight,
      enableHandle: validated.enableHandle,
      enableEmbossing: validated.enableEmbossing,
      embossDepth: validated.embossDepth,
      buildPlateSize: validated.buildPlateSize,
      mode: validated.mode,
      stampDepth: validated.stampDepth,
      stampBase: validated.stampBase
    });

    return Object.freeze({ valid: true, parameters });
  } catch (error: unknown) {
    if (error instanceof CutterGenerationError) {
      return invalidResult(issueFromGenerationError(error));
    }

    return invalidResult({
      path: 'parameters',
      code: 'UNEXPECTED_VALIDATION_ERROR',
      message: 'An unexpected error occurred while validating Cutter parameters.'
    });
  }
}

function assertRuntimeCutterKind(document: { readonly kind: string }): void {
  if (document.kind !== 'cutter') {
    throw new CutterGenerationError(
      'INVALID_PARAMS',
      'The document kind must be cutter for the Cutter recipe.',
      { field: 'kind', value: document.kind }
    );
  }
}

/**
 * Etapa inicial de V5: un path SVG simple equivale a un contorno.
 * Otros elementos/paths compuestos no tienen correspondencia inequívoca con pathIndex.
 * En esos casos se rechaza antes de generar un STL incorrecto.
 */
function resolveV5CutterSvg(document: import('../../domain/designDocument').DesignDocument<'cutter'>): string {
  if (document.schemaVersion !== 5 || document.contourOperations.length === 0) {
    return document.sketch.svg;
  }

  const unsupported = document.contourOperations.find(
    assignment => assignment.operation === 'emboss' || assignment.operation === 'engrave'
  );
  if (unsupported) {
    throw new CutterGenerationError(
      'INVALID_PARAMS',
      'Las operaciones Relieve y Grabado aún no generan geometría 3D. Quitá estas asignaciones antes de exportar.',
      { field: 'contourOperations', pathIndex: unsupported.pathIndex, operation: unsupported.operation }
    );
  }

  if (!document.contourOperations.some(assignment => assignment.operation === 'ignore')) {
    return document.sketch.svg;
  }

  const parsed = new DOMParser().parseFromString(document.sketch.svg, 'image/svg+xml');
  const root = parsed.documentElement;
  const children = [...root.children];
  if (children.some(child => child.localName.toLowerCase() !== 'path')) {
    throw new CutterGenerationError(
      'INVALID_PARAMS',
      'Ignorar contornos solo admite por ahora SVG con trazados path directos, sin grupos ni otras figuras.',
      { field: 'contourOperations' }
    );
  }
  const paths = children;
  if (paths.some(path => (path.getAttribute('d')?.match(/[Mm]/g)?.length ?? 0) !== 1)) {
    throw new CutterGenerationError(
      'INVALID_PARAMS',
      'Ignorar contornos requiere que cada path tenga un único trazado.',
      { field: 'contourOperations' }
    );
  }
  if (paths.some(path => path.hasAttribute('transform')) || root.hasAttribute('transform')) {
    throw new CutterGenerationError(
      'INVALID_PARAMS',
      'Ignorar contornos todavía no admite transformaciones SVG.',
      { field: 'contourOperations' }
    );
  }
  const ignored = new Set(
    document.contourOperations.filter(assignment => assignment.operation === 'ignore').map(assignment => assignment.pathIndex)
  );
  if (ignored.size >= paths.length) {
    throw new CutterGenerationError(
      'NO_VALID_CONTOURS',
      'No queda ningún contorno de corte después de aplicar Ignorar.',
      { field: 'contourOperations' }
    );
  }
  paths.forEach((path, index) => { if (ignored.has(index)) path.remove(); });
  return root.outerHTML;
}

export const cutterRecipe = Object.freeze({
  kind: 'cutter',

  createDefaultParameters(): CutterDesignParameters {
    return createDefaultCutterParameters();
  },

  validateParameters(
    value: unknown
  ): RecipeValidationResult<CutterDesignParameters> {
    return reconstructCutterParameters(value);
  },

  async generate(document, context): Promise<readonly GeneratedArtifact<'cutter'>[]> {
    context.signal.throwIfAborted();
    assertRuntimeCutterKind(document);

    const validation = cutterRecipe.validateParameters(document.parameters);
    if (validation.valid === false) {
      const firstIssue = validation.issues[0] ?? {
        path: 'parameters',
        code: 'INVALID_PARAMS',
        message: 'The Cutter parameters are invalid.'
      };
      throw new CutterGenerationError('INVALID_PARAMS', firstIssue.message, {
        field: firstIssue.path,
        issues: validation.issues
      });
    }

    let ownedObject: Awaited<ReturnType<typeof generateCookieCutter>> | undefined;

    try {
      const svgForCutter = resolveV5CutterSvg(document);
      const bridges = document.schemaVersion === 2 || document.schemaVersion === 5 ? document.bridges : [];
      ownedObject = bridges.length > 0
        ? await generateCookieCutter(svgForCutter, validation.parameters, bridges)
        : await generateCookieCutter(svgForCutter, validation.parameters);
      context.signal.throwIfAborted();

      const report = validatePrintableObject(ownedObject);
      if (!report.valid || report.bounds === null) {
        throw new CutterGenerationError(
          'INVALID_GEOMETRY',
          'The generated Cutter object is not valid printable geometry.',
          {
            field: 'geometry',
            errors: report.errors,
            bounds: report.bounds
          }
        );
      }

      const dimensionsMm = Object.freeze({
        width: report.bounds.max.x - report.bounds.min.x,
        depth: report.bounds.max.z - report.bounds.min.z,
        height: report.bounds.max.y - report.bounds.min.y
      });
      const artifact: GeneratedArtifact<'cutter'> = Object.freeze({
        id: `${document.id}:cutter:${context.revision}`,
        role: 'cutter',
        object: ownedObject,
        dimensionsMm,
        validation: report
      });
      const artifacts: readonly GeneratedArtifact<'cutter'>[] = Object.freeze([
        artifact
      ]);

      ownedObject = undefined;
      return artifacts;
    } catch (error: unknown) {
      const objectToDispose = ownedObject;
      ownedObject = undefined;
      if (objectToDispose !== undefined) disposeObject3D(objectToDispose);
      throw error;
    }
  }
} satisfies GenerationRecipe<'cutter'>);
