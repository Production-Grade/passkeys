/**
 * Recovery code entity for account recovery
 */
export interface RecoveryCode {
  /** Unique recovery code identifier */
  id: string;

  /** User ID this recovery code belongs to */
  userId: string;

  /** Hashed recovery code (bcrypt) */
  codeHash: string;

  /** Whether this code has been used */
  used: boolean;

  /** Timestamp when code was used (if applicable) */
  usedAt?: Date | undefined;

  /** Timestamp when code was created */
  createdAt: Date;
}

/**
 * Email recovery token entity
 */
export interface EmailRecoveryToken {
  /** Unique token identifier */
  id: string;

  /** User ID this token belongs to */
  userId: string;

  /** Hashed token value (bcrypt) */
  tokenHash: string;

  /** Timestamp when token expires */
  expiresAt: Date;

  /** Whether token has been used */
  used: boolean;

  /** Timestamp when token was used (if applicable) */
  usedAt?: Date | undefined;

  /** Timestamp when token was created */
  createdAt: Date;
}

/**
 * Recovery code creation input
 */
export interface CreateRecoveryCodeInput {
  /** User ID */
  userId: string;

  /** Hashed code */
  codeHash: string;
}

/**
 * Email recovery token creation input
 */
export interface CreateEmailRecoveryTokenInput {
  /** User ID */
  userId: string;

  /** Hashed token */
  tokenHash: string;

  /** Expiration timestamp */
  expiresAt: Date;
}

/**
 * Default recovery code configuration
 */
export const DEFAULT_RECOVERY_CODE_COUNT = 10;
export const DEFAULT_RECOVERY_CODE_LENGTH = 8;
export const DEFAULT_EMAIL_RECOVERY_TTL_MINUTES = 60;
