import { describe, expect, it } from 'vitest';
import { createUuid } from '../createUuid';

describe('createUuid in local HTTP', () => {
  it('uses randomUUID where available', () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const source = { randomUUID: () => id, getRandomValues: <T extends ArrayBufferView | null>(array: T): T => array };
    expect(createUuid(source)).toBe(id);
  });

  it('creates a valid v4 UUID from getRandomValues when randomUUID is unavailable', () => {
    let sequence = 0;
    const source = {
      getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
        if (!(array instanceof Uint8Array)) throw new Error('Expected Uint8Array');
        array.forEach((_, i) => { array[i] = (sequence + i) & 0xff; });
        sequence++;
        return array;
      }
    };
    const first = createUuid(source);
    const second = createUuid(source);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).not.toBe(first);
  });
});
