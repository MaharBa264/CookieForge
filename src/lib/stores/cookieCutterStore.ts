import { writable, derived, get, readonly, type Readable } from 'svelte/store';
import type { CookieCutterParams, CookieCutterModel, PrintabilityCheck } from '../types/CookieCutter';
import { DEFAULT_PARAMS } from '../types/CookieCutter';
import {
  createInitialGenerationState,
  freezeGenerationState,
  type GenerationState
} from '../generation/generationState';
import {
  CutterGenerationError,
  GENERATION_LIMITS,
  validateCookieCutterParams
} from '../utils/generationValidation';

function createDefaultParams(): Readonly<CookieCutterParams> {
  return Object.freeze({ ...DEFAULT_PARAMS });
}

/** Convert persisted pre-mm settings without weakening runtime validation. */
export function migrateLegacyCookieCutterParams(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;

  const source = value as Record<string, unknown>;
  if ('targetSize' in source && 'sizeMode' in source) return value;
  if (!('scale' in source) || typeof source.scale !== 'number' || !Number.isFinite(source.scale)) {
    return value;
  }

  const { scale, ...rest } = source;
  return {
    ...rest,
    targetSize: DEFAULT_PARAMS.targetSize * scale,
    sizeMode: 'longest'
  };
}

// Legacy parameter bridge kept during the incremental document-store cutover.
const paramsStore = writable<Readonly<CookieCutterParams>>(createDefaultParams());
/** @deprecated Use a DesignDocumentStore for new document-driven workflows. */
export const params: Readable<Readonly<CookieCutterParams>> = readonly(paramsStore);

// Uploaded file store
export const uploadedFile = writable<File | null>(null);

// SVG path data store
export const pathData = writable<string | null>(null);

// 3D model store
export const model = writable<CookieCutterModel | null>(null);

// Atomic generation lifecycle snapshot. Legacy UI stores remain during the incremental cutover.
const generationStateStore = writable<GenerationState>(createInitialGenerationState());
export const generationState: Readable<GenerationState> = readonly(generationStateStore);

export function publishGenerationState(state: GenerationState): void {
  generationStateStore.set(freezeGenerationState(state));
}

// Loading state
export const isProcessing = writable<boolean>(false);

// Error state
export const error = writable<string | null>(null);
export interface ParameterIssue {
  readonly message: string;
  readonly field: string | null;
}

export const parameterIssue = writable<ParameterIssue | null>(null);
export const parameterError: Readable<string | null> = derived(
  parameterIssue,
  ($parameterIssue) => $parameterIssue?.message ?? null
);
export const parameterErrorField: Readable<string | null> = derived(
  parameterIssue,
  ($parameterIssue) => $parameterIssue?.field ?? null
);

// Printability check
export const printability = derived(
  [params],
  ([$params]) => checkPrintability($params)
);

// Check if parameters are valid for 3D printing
export function checkPrintability(value: unknown): PrintabilityCheck {
  let params: Readonly<CookieCutterParams>;

  try {
    params = validateCookieCutterParams(value);
  } catch (validationError) {
    const message =
      validationError instanceof CutterGenerationError
        ? validationError.message
        : 'Los parámetros del cortador son inválidos.';

    return {
      isValid: false,
      warnings: [message],
      recommendations: [],
    };
  }

  const warnings: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;

  // Check wall thickness
  if (params.wallThickness < 0.8) {
    warnings.push('El espesor de pared está por debajo del mínimo recomendado (0,8 mm)');
    isValid = false;
  } else if (params.wallThickness < 1.0) {
    warnings.push('Las paredes finas pueden ser frágiles. Considerá subir a 1,0 mm o más.');
  }

  if (params.wallThickness > 1.5) {
    warnings.push('Las paredes muy gruesas usan más material y tardan más en imprimirse.');
  }

  // Check cutting height
  if (params.cuttingHeight < 8) {
    warnings.push('La altura de corte es bastante baja. Puede no funcionar bien con masa gruesa.');
  } else if (params.cuttingHeight > 20) {
    warnings.push('Filo de corte muy alto. Asegurate de que tu masa sea lo bastante gruesa.');
  }

  // Check taper angle
  if (params.taperAngle < 3) {
    warnings.push('Un ángulo de conicidad bajo puede dificultar sacar la galleta.');
  } else if (params.taperAngle > 15) {
    warnings.push('Un ángulo de conicidad alto puede debilitar estructuralmente el cortador.');
  }

  // Add recommendations
  if (params.wallThickness === 0.8) {
    recommendations.push('Con boquilla de 0,4 mm: configurá 2 líneas de pared en el laminador');
  }

  recommendations.push('Imprimí boca abajo (con el filo de corte hacia arriba)');
  recommendations.push('Usá filamento PLA o PETG');
  recommendations.push('Altura de capa: se recomiendan 0,2 mm');
  recommendations.push('Relleno: 20 % con 2-3 perímetros');

  if (params.enableEmbossing) {
    recommendations.push('Para relieve: usá una altura de capa de 0,15-0,2 mm');
    recommendations.push('Reflejá el texto en tu diseño para los sellos');
  }

  return {
    isValid,
    warnings,
    recommendations,
  };
}

function minimumTotalHeight(value: Readonly<CookieCutterParams>): number {
  if (value.mode === 'stamp') return value.totalHeight;
  const activeHandle = value.enableHandle && value.handleStyle !== 'none';
  return value.cuttingHeight + (activeHandle ? value.handleHeight : 0);
}

const TOTAL_HEIGHT_DEPENDENCIES = [
  'cuttingHeight',
  'handleHeight',
  'enableHandle',
  'handleStyle'
] as const satisfies readonly (keyof CookieCutterParams)[];

function hasOwnParam(
  patch: Partial<CookieCutterParams>,
  key: keyof CookieCutterParams
): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

function buildParamUpdate(
  current: Readonly<CookieCutterParams>,
  patch: Partial<CookieCutterParams>
): CookieCutterParams {
  const candidate: CookieCutterParams = { ...current, ...patch };

  const requiredTotalHeight = minimumTotalHeight(candidate);
  const explicitlyUpdatesTotalHeight = hasOwnParam(patch, 'totalHeight');
  const updatesTotalHeightDependency = TOTAL_HEIGHT_DEPENDENCIES.some((key) =>
    hasOwnParam(patch, key)
  );

  if (candidate.totalHeight < requiredTotalHeight && explicitlyUpdatesTotalHeight) {
    throw new CutterGenerationError(
      'INVALID_PARAMS',
      `El parámetro totalHeight debe ser al menos ${requiredTotalHeight} para la altura de corte y el asa actuales.`,
      { field: 'totalHeight', value: candidate.totalHeight }
    );
  }

  if (candidate.totalHeight < requiredTotalHeight && updatesTotalHeightDependency) {
    if (requiredTotalHeight > GENERATION_LIMITS.maxTotalHeight) {
      throw new CutterGenerationError(
        'INVALID_PARAMS',
        `El totalHeight requerido por esta actualización de parámetros (${requiredTotalHeight}) supera el totalHeight máximo de ${GENERATION_LIMITS.maxTotalHeight}.`,
        { field: 'totalHeight', value: requiredTotalHeight }
      );
    }

    candidate.totalHeight = requiredTotalHeight;
  }

  return candidate;
}

// Helper functions to update legacy params.
/** @deprecated Use DesignDocumentStore.updateParameters instead. */
export function updateParam<K extends keyof CookieCutterParams>(
  key: K,
  value: CookieCutterParams[K]
): boolean {
  return updateParams({ [key]: value } as Partial<CookieCutterParams>);
}

/** @deprecated Use DesignDocumentStore.updateParameters instead. */
export function updateParams(patch: Partial<CookieCutterParams>): boolean {
  const current = get(paramsStore);

  try {
    const candidate = buildParamUpdate(current, patch);
    const validated = validateCookieCutterParams(candidate);
    paramsStore.set(validated);
    parameterIssue.set(null);
    return true;
  } catch (validationError) {
    if (validationError instanceof CutterGenerationError) {
      const field = validationError.details?.field;
      parameterIssue.set({
        message: validationError.message,
        field: typeof field === 'string' ? field : null
      });
      return false;
    }

    throw validationError;
  }
}

/** @deprecated Use DesignDocumentStore.replace instead. */
export function setParams(value: unknown) {
  const validated = validateCookieCutterParams(migrateLegacyCookieCutterParams(value));
  paramsStore.set(validated);
  parameterIssue.set(null);
}

/** @deprecated Replace or create a complete versioned document instead. */
export function resetParams() {
  paramsStore.set(createDefaultParams());
  parameterIssue.set(null);
}
