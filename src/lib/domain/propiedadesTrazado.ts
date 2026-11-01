/**
 * Modelo experimental de operaciones por trazado.
 * No modifica los documentos V1–V4 ni el generador 3D existente.
 * La integración persistente se hará mediante una nueva versión de documento.
 */
export type OperacionTrazado = 'corte' | 'relieve' | 'hueco' | 'ignorar';

export interface PropiedadesTrazado {
  readonly id: string;
  readonly operacion: OperacionTrazado;
  readonly espesorMm: number;
  readonly profundidadMm: number;
}

export interface ResultadoValidacionTrazado {
  readonly valido: boolean;
  readonly errores: readonly string[];
}

const OPERACIONES: readonly OperacionTrazado[] = ['corte', 'relieve', 'hueco', 'ignorar'];

export function validarPropiedadesTrazado(valor: unknown): ResultadoValidacionTrazado {
  const errores: string[] = [];
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return { valido: false, errores: ['Las propiedades deben ser un objeto.'] };
  }
  const p = valor as Record<string, unknown>;
  if (typeof p.id !== 'string' || !p.id.trim()) errores.push('El identificador es obligatorio.');
  if (!OPERACIONES.includes(p.operacion as OperacionTrazado)) errores.push('La operación no es válida.');
  if (typeof p.espesorMm !== 'number' || !Number.isFinite(p.espesorMm) || p.espesorMm < 0.4 || p.espesorMm > 10) {
    errores.push('El espesor debe estar entre 0,4 y 10 mm.');
  }
  if (typeof p.profundidadMm !== 'number' || !Number.isFinite(p.profundidadMm) || p.profundidadMm < 0 || p.profundidadMm > 20) {
    errores.push('La profundidad debe estar entre 0 y 20 mm.');
  }
  return { valido: errores.length === 0, errores };
}

export function crearPropiedadesTrazado(id: string): PropiedadesTrazado {
  const propiedades: PropiedadesTrazado = { id, operacion: 'relieve', espesorMm: 1.2, profundidadMm: 1.2 };
  const resultado = validarPropiedadesTrazado(propiedades);
  if (!resultado.valido) throw new Error(resultado.errores.join(' '));
  return propiedades;
}
