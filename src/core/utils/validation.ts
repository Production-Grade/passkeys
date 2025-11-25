import { ValidationError } from '../types/errors';

/**
 * Validate email address format
 * @param email - Email to validate
 * @throws {ValidationError} if invalid
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required');
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  if (email.length > 255) {
    throw new ValidationError('Email too long (max 255 characters)');
  }
}

/**
 * Validate UUID v4 format
 * @param uuid - UUID to validate
 * @throws {ValidationError} if invalid
 */
export function validateUuid(uuid: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuid || typeof uuid !== 'string') {
    throw new ValidationError('UUID is required');
  }

  if (!uuidRegex.test(uuid)) {
    throw new ValidationError('Invalid UUID format');
  }
}

/**
 * Validate passkey nickname
 * @param nickname - Nickname to validate
 * @throws {ValidationError} if invalid
 */
export function validatePasskeyNickname(nickname: string): void {
  if (!nickname || typeof nickname !== 'string') {
    throw new ValidationError('Nickname is required');
  }

  if (nickname.length < 1) {
    throw new ValidationError('Nickname too short (min 1 character)');
  }

  if (nickname.length > 100) {
    throw new ValidationError('Nickname too long (max 100 characters)');
  }
}

/**
 * Validate recovery code format
 * @param code - Recovery code to validate
 * @throws {ValidationError} if invalid
 */
export function validateRecoveryCode(code: string): void {
  if (!code || typeof code !== 'string') {
    throw new ValidationError('Recovery code is required');
  }

  // Recovery codes should be alphanumeric, no special chars
  if (!/^[A-Z0-9]+$/.test(code)) {
    throw new ValidationError('Invalid recovery code format');
  }

  if (code.length < 6 || code.length > 20) {
    throw new ValidationError('Invalid recovery code length');
  }
}

/**
 * Validate base64url string
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {ValidationError} if invalid
 */
export function validateBase64url(value: string, fieldName = 'value'): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`);
  }

  // Base64url should only contain: A-Z, a-z, 0-9, -, _
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new ValidationError(`${fieldName} must be valid base64url`);
  }
}

/**
 * Validate positive integer
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {ValidationError} if invalid
 */
export function validatePositiveInteger(value: number, fieldName = 'value'): void {
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`);
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }

  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be positive`);
  }
}

/**
 * Validate RP ID (Relying Party ID)
 * @param rpId - RP ID to validate
 * @throws {ValidationError} if invalid
 */
export function validateRpId(rpId: string): void {
  if (!rpId || typeof rpId !== 'string') {
    throw new ValidationError('RP ID is required');
  }

  // RP ID should be a valid domain or localhost
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$|^localhost$/i;

  if (!domainRegex.test(rpId)) {
    throw new ValidationError('RP ID must be a valid domain');
  }
}

/**
 * Validate origin URL
 * @param origin - Origin to validate
 * @throws {ValidationError} if invalid
 */
export function validateOrigin(origin: string): void {
  if (!origin || typeof origin !== 'string') {
    throw new ValidationError('Origin is required');
  }

  try {
    const url = new URL(origin);

    // Origin must be http or https
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new ValidationError('Origin must use http or https protocol');
    }
  } catch {
    throw new ValidationError('Invalid origin URL');
  }
}

/**
 * Sanitize string input (remove control characters)
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  // Remove control characters and trim
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
}
