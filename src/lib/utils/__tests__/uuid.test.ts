import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateUuid } from '../uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateUuid', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('usa crypto.randomUUID cuando existe', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'fijo' });
    expect(generateUuid()).toBe('fijo');
  });

  it('genera un UUID v4 válido en contextos inseguros (sin randomUUID)', () => {
    vi.stubGlobal('crypto', { getRandomValues: (array: Uint8Array) => array.fill(171) });
    expect(generateUuid()).toMatch(UUID_V4);
  });

  it('falla con un mensaje claro si no hay API de criptografía', () => {
    vi.stubGlobal('crypto', {});
    expect(() => generateUuid()).toThrow(/criptografía/);
  });
});
