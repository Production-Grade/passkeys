import type {
  PasskeyError,
  AuthenticationError,
  RegistrationError,
  ValidationError,
  UserNotFoundError,
  PasskeyNotFoundError,
  CounterAnomalyError,
  RecoveryError,
  InvalidRecoveryCodeError,
  InvalidRecoveryTokenError,
  InvalidChallengeError,
} from '../types/errors';
import {
  PasskeyError as PasskeyErrorClass,
  AuthenticationError as AuthenticationErrorClass,
  RegistrationError as RegistrationErrorClass,
  ValidationError as ValidationErrorClass,
  UserNotFoundError as UserNotFoundErrorClass,
  PasskeyNotFoundError as PasskeyNotFoundErrorClass,
  CounterAnomalyError as CounterAnomalyErrorClass,
  RecoveryError as RecoveryErrorClass,
  InvalidRecoveryCodeError as InvalidRecoveryCodeErrorClass,
  InvalidRecoveryTokenError as InvalidRecoveryTokenErrorClass,
  InvalidChallengeError as InvalidChallengeErrorClass,
} from '../types/errors';

/**
 * Type guard to check if error is a PasskeyError
 * @param error - Error to check
 * @returns True if error is a PasskeyError
 *
 * @example
 * ```typescript
 * try {
 *   await passkeyService.authenticate(...);
 * } catch (error) {
 *   if (isPasskeyError(error)) {
 *     console.log(error.code, error.statusCode);
 *   }
 * }
 * ```
 */
export function isPasskeyError(error: unknown): error is PasskeyError {
  return error instanceof PasskeyErrorClass;
}

/**
 * Type guard to check if error is an AuthenticationError
 * @param error - Error to check
 * @returns True if error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationErrorClass;
}

/**
 * Type guard to check if error is a RegistrationError
 * @param error - Error to check
 * @returns True if error is a RegistrationError
 */
export function isRegistrationError(error: unknown): error is RegistrationError {
  return error instanceof RegistrationErrorClass;
}

/**
 * Type guard to check if error is a ValidationError
 * @param error - Error to check
 * @returns True if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationErrorClass;
}

/**
 * Type guard to check if error is a UserNotFoundError
 * @param error - Error to check
 * @returns True if error is a UserNotFoundError
 */
export function isUserNotFoundError(error: unknown): error is UserNotFoundError {
  return error instanceof UserNotFoundErrorClass;
}

/**
 * Type guard to check if error is a PasskeyNotFoundError
 * @param error - Error to check
 * @returns True if error is a PasskeyNotFoundError
 */
export function isPasskeyNotFoundError(error: unknown): error is PasskeyNotFoundError {
  return error instanceof PasskeyNotFoundErrorClass;
}

/**
 * Type guard to check if error is a CounterAnomalyError
 * @param error - Error to check
 * @returns True if error is a CounterAnomalyError
 */
export function isCounterAnomalyError(error: unknown): error is CounterAnomalyError {
  return error instanceof CounterAnomalyErrorClass;
}

/**
 * Type guard to check if error is a RecoveryError
 * @param error - Error to check
 * @returns True if error is a RecoveryError
 */
export function isRecoveryError(error: unknown): error is RecoveryError {
  return error instanceof RecoveryErrorClass;
}

/**
 * Type guard to check if error is an InvalidRecoveryCodeError
 * @param error - Error to check
 * @returns True if error is an InvalidRecoveryCodeError
 */
export function isInvalidRecoveryCodeError(error: unknown): error is InvalidRecoveryCodeError {
  return error instanceof InvalidRecoveryCodeErrorClass;
}

/**
 * Type guard to check if error is an InvalidRecoveryTokenError
 * @param error - Error to check
 * @returns True if error is an InvalidRecoveryTokenError
 */
export function isInvalidRecoveryTokenError(error: unknown): error is InvalidRecoveryTokenError {
  return error instanceof InvalidRecoveryTokenErrorClass;
}

/**
 * Type guard to check if error is an InvalidChallengeError
 * @param error - Error to check
 * @returns True if error is an InvalidChallengeError
 */
export function isInvalidChallengeError(error: unknown): error is InvalidChallengeError {
  return error instanceof InvalidChallengeErrorClass;
}

/**
 * Extract error details from unknown error in a type-safe way
 * @param error - Error to extract details from
 * @returns Error details if PasskeyError, null otherwise
 *
 * @example
 * ```typescript
 * try {
 *   await passkeyService.authenticate(...);
 * } catch (error) {
 *   const details = getErrorDetails(error);
 *   if (details) {
 *     console.log(`Error ${details.code}: ${details.message}`);
 *   }
 * }
 * ```
 */
export function getErrorDetails(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
} | null {
  if (isPasskeyError(error)) {
    const result: {
      code: string;
      message: string;
      statusCode: number;
      details?: Record<string, unknown>;
    } = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
    if (error.details !== undefined) {
      result.details = error.details;
    }
    return result;
  }
  return null;
}

