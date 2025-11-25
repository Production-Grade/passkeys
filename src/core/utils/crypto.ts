import { randomBytes, createHash } from 'crypto';
import { hash as bcryptHash, compare as bcryptCompare } from 'bcrypt';

/**
 * Generate a cryptographically secure random challenge
 * @param length - Number of bytes (default: 32)
 * @returns Base64url encoded random bytes
 */
export function generateChallenge(length = 32): string {
  const buffer = randomBytes(length);
  return bufferToBase64url(buffer);
}

/**
 * Generate a random recovery code
 * @param length - Number of characters (default: 8)
 * @returns Random alphanumeric code (uppercase, no ambiguous characters)
 */
export function generateRecoveryCode(length = 8): string {
  // Use character set without ambiguous characters (0, O, 1, I, l)
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(length);
  let code = '';

  for (let i = 0; i < length; i++) {
    // Use modulo to map byte value to charset index
    code += charset[bytes[i]! % charset.length];
  }

  return code;
}

/**
 * Generate a random token for email recovery
 * @returns URL-safe random token
 */
export function generateEmailRecoveryToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a password/code/token using bcrypt
 * @param value - Value to hash
 * @param rounds - Bcrypt rounds (default: 10)
 * @returns Hashed value
 */
export async function hashValue(value: string, rounds = 10): Promise<string> {
  return bcryptHash(value, rounds);
}

/**
 * Compare a plaintext value with a hash
 * @param value - Plaintext value
 * @param hash - Hashed value
 * @returns True if match
 */
export async function compareHash(value: string, hash: string): Promise<boolean> {
  return bcryptCompare(value, hash);
}

/**
 * Create a deterministic SHA-256 hash (for searchable tokens)
 * @param value - Value to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256Hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Convert Buffer to base64url encoding
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
  // Add padding
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, 'base64');
}
