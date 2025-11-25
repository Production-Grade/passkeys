/**
 * Convert Uint8Array to base64url string
 * @param buffer - Uint8Array to encode
 * @returns Base64url encoded string
 */
export function uint8ArrayToBase64url(buffer: Uint8Array): string {
  const base64 = Buffer.from(buffer).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert base64url string to Uint8Array
 * @param base64url - Base64url encoded string
 * @returns Uint8Array
 */
export function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const buffer = Buffer.from(base64 + padding, 'base64');
  return new Uint8Array(buffer);
}

/**
 * Convert Buffer to base64url string
 * @param buffer - Buffer to encode
 * @returns Base64url encoded string
 */
export function bufferToBase64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert base64url string to Buffer
 * @param base64url - Base64url encoded string
 * @returns Buffer
 */
export function base64urlToBuffer(base64url: string): Buffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, 'base64');
}

/**
 * Convert ArrayBuffer to base64url string
 * @param buffer - ArrayBuffer to encode
 * @returns Base64url encoded string
 */
export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  return uint8ArrayToBase64url(new Uint8Array(buffer));
}

/**
 * Convert base64url string to ArrayBuffer
 * @param base64url - Base64url encoded string
 * @returns ArrayBuffer
 */
export function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const uint8Array = base64urlToUint8Array(base64url);
  const buffer = new ArrayBuffer(uint8Array.length);
  const view = new Uint8Array(buffer);
  view.set(uint8Array);
  return buffer;
}

/**
 * Check if string is valid base64url
 * @param str - String to validate
 * @returns True if valid base64url
 */
export function isValidBase64url(str: string): boolean {
  // Base64url should only contain: A-Z, a-z, 0-9, -, _
  return /^[A-Za-z0-9_-]+$/.test(str);
}
