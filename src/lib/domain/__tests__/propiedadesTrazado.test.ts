import { describe, expect, it } from 'vitest';
import { crearPropiedadesTrazado, validarPropiedadesTrazado } from '../propiedadesTrazado';

describe('propiedades individuales de trazados', () => {
  it('crea valores predeterminados válidos', () => {
    const p = crearPropiedadesTrazado('trazado-1');
    expect(p.operacion).toBe('relieve');
    expect(validarPropiedadesTrazado(p).valido).toBe(true);
  });
  it('acepta las cuatro operaciones', () => {
    for (const operacion of ['corte', 'relieve', 'hueco', 'ignorar']) {
      expect(validarPropiedadesTrazado({ ...crearPropiedadesTrazado('x'), operacion }).valido).toBe(true);
    }
  });
  it('rechaza dimensiones inválidas y números no finitos', () => {
    expect(validarPropiedadesTrazado({ id: 'x', operacion: 'corte', espesorMm: NaN, profundidadMm: 1 }).valido).toBe(false);
    expect(validarPropiedadesTrazado({ id: 'x', operacion: 'relieve', espesorMm: 0.1, profundidadMm: -1 }).errores.length).toBe(2);
  });
  it('rechaza operaciones desconocidas y datos incompletos', () => {
    expect(validarPropiedadesTrazado({ id: '', operacion: 'laser' }).valido).toBe(false);
    expect(validarPropiedadesTrazado(null).valido).toBe(false);
  });
});
