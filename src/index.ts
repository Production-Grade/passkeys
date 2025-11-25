/**
 * @productiongrade/passkeys - Production-ready passkey authentication library
 *
 * Framework-agnostic core with adapters for Express, React, and more
 */

// Core types
export type { PasskeyConfig, RecoveryConfig, SecurityHooks } from './core/types/config';
export type { User, CreateUserInput, UpdateUserInput } from './core/types/user';
export type {
  Passkey,
  CreatePasskeyInput,
  UpdatePasskeyInput,
  AuthenticatorTransport,
} from './core/types/passkey';
export type { Challenge, ChallengeType, CreateChallengeInput } from './core/types/challenge';
export type { RecoveryCode, EmailRecoveryToken } from './core/types/recovery';
export type { PasskeyStorage, ChallengeStorage } from './core/types/storage';

// Error types
export {
  PasskeyError,
  AuthenticationError,
  RegistrationError,
  ChallengeError,
  InvalidChallengeError,
  UserNotFoundError,
  DuplicateUserError,
  PasskeyNotFoundError,
  CounterAnomalyError,
  RecoveryError,
  InvalidRecoveryCodeError,
  InvalidRecoveryTokenError,
  ValidationError,
} from './core/types/errors';
export type { ProblemDetails } from './core/types/errors';

// Core services (for advanced usage)
export { PasskeyService } from './core/services/PasskeyService';
export { ChallengeService } from './core/services/ChallengeService';
export { RecoveryService } from './core/services/RecoveryService';

// Utilities
export {
  generateChallenge,
  generateRecoveryCode,
  generateEmailRecoveryToken,
  hashValue,
  compareHash,
  sha256Hash,
  bufferToBase64url,
  base64urlToBuffer,
} from './core/utils/crypto';

export {
  uint8ArrayToBase64url,
  base64urlToUint8Array,
  bufferToBase64url as encodeBase64url,
  base64urlToBuffer as decodeBase64url,
  isValidBase64url,
} from './core/utils/encoding';

export {
  validateEmail,
  validateUuid,
  validatePasskeyNickname,
  validateRecoveryCode,
  validateBase64url,
  validatePositiveInteger,
  validateRpId,
  validateOrigin,
  sanitizeString,
} from './core/utils/validation';

// Type guards
export {
  isPasskeyError,
  isAuthenticationError,
  isRegistrationError,
  isValidationError,
  isUserNotFoundError,
  isPasskeyNotFoundError,
  isCounterAnomalyError,
  isRecoveryError,
  isInvalidRecoveryCodeError,
  isInvalidRecoveryTokenError,
  isInvalidChallengeError,
  getErrorDetails,
} from './core/utils/type-guards';

// Configuration utilities
export {
  validatePasskeyConfig,
  assertValidConfig,
} from './core/utils/config-validator';
export type { ConfigValidationResult } from './core/utils/config-validator';

export { createPasskeyConfig } from './core/utils/config-builder';

// Debug utilities
export { debugLog, debugError } from './core/utils/debug';
export type { DebugCategory } from './core/utils/debug';
