/**
 * Genera un identificador UUID v4.
 *
 * `crypto.randomUUID()` solo existe en contextos seguros (HTTPS o localhost). La aplicación
 * se sirve por HTTP desde la red local (por ejemplo http://192.168.x.x), donde esa función no
 * está definida; en ese caso se usa `crypto.getRandomValues`, que sí está disponible.
 */
export function generateUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('No se puede generar un identificador: la API de criptografía no está disponible.');
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}
