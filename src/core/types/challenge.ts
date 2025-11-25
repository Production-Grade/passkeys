/**
 * Challenge entity for WebAuthn ceremonies
 * Used during both registration and authentication to prevent replay attacks
 */
export interface Challenge {
  /** Unique challenge identifier */
  id: string;

  /** Challenge value (base64url encoded random bytes) */
  challenge: string;

  /** User ID (for authentication challenges) or email (for registration) */
  userId?: string | undefined;

  /** Email address (for registration challenges) */
  email?: string | undefined;

  /** Challenge type */
  type: ChallengeType;

  /** Timestamp when challenge expires (5 minutes from creation) */
  expiresAt: Date;

  /** Timestamp when challenge was created */
  createdAt: Date;
}

/**
 * Challenge type enumeration
 */
export type ChallengeType = 'registration' | 'authentication';

/**
 * Challenge creation input
 */
export interface CreateChallengeInput {
  /** Challenge value (base64url encoded) */
  challenge: string;

  /** User ID for authentication, undefined for registration */
  userId?: string | undefined;

  /** Email for registration */
  email?: string | undefined;

  /** Challenge type */
  type: ChallengeType;

  /** Expiration timestamp (default: 5 minutes from now) */
  expiresAt?: Date | undefined;
}

/**
 * Fixed challenge TTL in milliseconds (5 minutes)
 * This is non-configurable per constitution decision
 */
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;
