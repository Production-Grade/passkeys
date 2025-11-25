/**
 * Base error class for all Passkeys library errors
 */
export class PasskeyError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(message: string, code: string, statusCode = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PasskeyError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to RFC 7807 Problem Details format
   */
  toProblemDetails(): ProblemDetails {
    return {
      type: `https://productiongrade.dev/errors/${this.code}`,
      title: this.name,
      status: this.statusCode,
      detail: this.message,
      ...(this.details && { ...this.details }),
    };
  }
}

/**
 * Enhanced error details with troubleshooting information
 */
export interface ErrorDetailsWithTroubleshooting extends Record<string, unknown> {
  /** Link to troubleshooting documentation */
  troubleshooting?: string;
  /** Common causes of this error */
  commonCauses?: string[];
  /** Suggested solutions */
  solutions?: string[];
}

/**
 * Authentication-specific errors
 */
export class AuthenticationError extends PasskeyError {
  constructor(
    message: string,
    details?: ErrorDetailsWithTroubleshooting | Record<string, unknown>
  ) {
    super(message, 'AUTHENTICATION_FAILED', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Registration-specific errors
 */
export class RegistrationError extends PasskeyError {
  constructor(
    message: string,
    details?: ErrorDetailsWithTroubleshooting | Record<string, unknown>
  ) {
    super(message, 'REGISTRATION_FAILED', 400, details);
    this.name = 'RegistrationError';
  }
}

/**
 * Challenge-related errors
 */
export class ChallengeError extends PasskeyError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, 400, details);
    this.name = 'ChallengeError';
  }
}

/**
 * Invalid challenge error
 */
export class InvalidChallengeError extends ChallengeError {
  constructor(message = 'Challenge is invalid or expired') {
    super(message, 'INVALID_CHALLENGE');
    this.name = 'InvalidChallengeError';
  }
}

/**
 * User-related errors
 */
export class UserNotFoundError extends PasskeyError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`, 'USER_NOT_FOUND', 404);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Duplicate user error
 */
export class DuplicateUserError extends PasskeyError {
  constructor(email: string) {
    super(`User with email ${email} already exists`, 'DUPLICATE_USER', 409);
    this.name = 'DuplicateUserError';
  }
}

/**
 * Passkey-related errors
 */
export class PasskeyNotFoundError extends PasskeyError {
  constructor(passkeyId: string) {
    super(`Passkey not found: ${passkeyId}`, 'PASSKEY_NOT_FOUND', 404);
    this.name = 'PasskeyNotFoundError';
  }
}

/**
 * Counter anomaly detection error
 */
export class CounterAnomalyError extends PasskeyError {
  constructor(expected: number, received: number) {
    super(
      `Counter anomaly detected: expected ${expected}, received ${received}`,
      'COUNTER_ANOMALY',
      401,
      { expected, received }
    );
    this.name = 'CounterAnomalyError';
  }
}

/**
 * Recovery-related errors
 */
export class RecoveryError extends PasskeyError {
  constructor(message: string, code: string) {
    super(message, code, 400);
    this.name = 'RecoveryError';
  }
}

/**
 * Invalid recovery code error
 */
export class InvalidRecoveryCodeError extends RecoveryError {
  constructor() {
    super('Invalid or already used recovery code', 'INVALID_RECOVERY_CODE');
    this.name = 'InvalidRecoveryCodeError';
  }
}

/**
 * Invalid recovery token error
 */
export class InvalidRecoveryTokenError extends RecoveryError {
  constructor() {
    super('Invalid or expired recovery token', 'INVALID_RECOVERY_TOKEN');
    this.name = 'InvalidRecoveryTokenError';
  }
}

/**
 * Validation error for input validation
 */
export class ValidationError extends PasskeyError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * RFC 7807 Problem Details format
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type */
  type: string;

  /** Short, human-readable summary */
  title: string;

  /** HTTP status code */
  status: number;

  /** Human-readable explanation */
  detail: string;

  /** URI reference identifying the specific occurrence */
  instance?: string;

  /** Additional extension members */
  [key: string]: unknown;
}
