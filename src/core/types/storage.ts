import type { User, CreateUserInput, UpdateUserInput } from './user';
import type { Passkey, CreatePasskeyInput, UpdatePasskeyInput } from './passkey';
import type { Challenge, CreateChallengeInput } from './challenge';
import type {
  RecoveryCode,
  EmailRecoveryToken,
  CreateRecoveryCodeInput,
  CreateEmailRecoveryTokenInput,
} from './recovery';

/**
 * Storage interface for users and passkeys
 * Developers implement this interface to integrate with their database
 */
export interface PasskeyStorage {
  // ============================================
  // User Operations
  // ============================================

  /**
   * Create a new user
   * @throws {DuplicateUserError} if email already exists
   */
  createUser(input: CreateUserInput): Promise<User>;

  /**
   * Find user by ID
   * @returns User or null if not found
   */
  getUserById(id: string): Promise<User | null>;

  /**
   * Find user by email
   * @returns User or null if not found
   */
  getUserByEmail(email: string): Promise<User | null>;

  /**
   * Update user
   * @throws {UserNotFoundError} if user doesn't exist
   * @throws {DuplicateUserError} if new email already exists
   */
  updateUser(id: string, input: UpdateUserInput): Promise<User>;

  /**
   * Delete user and all associated data (passkeys, recovery codes, etc.)
   * @throws {UserNotFoundError} if user doesn't exist
   */
  deleteUser(id: string): Promise<void>;

  // ============================================
  // Passkey Operations
  // ============================================

  /**
   * Create a new passkey
   * @throws {ValidationError} if userId doesn't exist
   */
  createPasskey(input: CreatePasskeyInput): Promise<Passkey>;

  /**
   * Find passkey by ID (credential ID)
   * @returns Passkey or null if not found
   */
  getPasskeyById(id: string): Promise<Passkey | null>;

  /**
   * Get all passkeys for a user
   */
  getUserPasskeys(userId: string): Promise<Passkey[]>;

  /**
   * Update passkey (counter, nickname, lastUsedAt)
   * @throws {PasskeyNotFoundError} if passkey doesn't exist
   */
  updatePasskey(id: string, input: UpdatePasskeyInput): Promise<Passkey>;

  /**
   * Delete a specific passkey
   * @throws {PasskeyNotFoundError} if passkey doesn't exist
   */
  deletePasskey(id: string): Promise<void>;

  // ============================================
  // Recovery Code Operations
  // ============================================

  /**
   * Create recovery codes (batch operation)
   */
  createRecoveryCodes(inputs: CreateRecoveryCodeInput[]): Promise<RecoveryCode[]>;

  /**
   * Get all unused recovery codes for a user
   */
  getUserRecoveryCodes(userId: string): Promise<RecoveryCode[]>;

  /**
   * Mark a recovery code as used
   * @throws {InvalidRecoveryCodeError} if code already used
   */
  markRecoveryCodeUsed(id: string): Promise<void>;

  /**
   * Delete all recovery codes for a user (used during regeneration)
   */
  deleteUserRecoveryCodes(userId: string): Promise<void>;

  // ============================================
  // Email Recovery Operations
  // ============================================

  /**
   * Create an email recovery token
   */
  createEmailRecoveryToken(input: CreateEmailRecoveryTokenInput): Promise<EmailRecoveryToken>;

  /**
   * Find email recovery token by ID
   * @returns Token or null if not found or expired
   */
  getEmailRecoveryToken(id: string): Promise<EmailRecoveryToken | null>;

  /**
   * Find email recovery token by token hash
   * @returns Token or null if not found, expired, or already used
   */
  getEmailRecoveryTokenByHash(tokenHash: string): Promise<EmailRecoveryToken | null>;

  /**
   * Mark email recovery token as used
   */
  markEmailRecoveryTokenUsed(id: string): Promise<void>;

  /**
   * Delete expired email recovery tokens (cleanup operation)
   */
  deleteExpiredEmailRecoveryTokens(): Promise<void>;
}

/**
 * Storage interface for WebAuthn challenges
 * Separate interface to allow different storage strategies (Redis for TTL, etc.)
 */
export interface ChallengeStorage {
  /**
   * Store a challenge
   */
  createChallenge(input: CreateChallengeInput): Promise<Challenge>;

  /**
   * Retrieve a challenge by ID
   * @returns Challenge or null if not found or expired
   */
  getChallengeById(id: string): Promise<Challenge | null>;

  /**
   * Retrieve a challenge by the challenge value
   * @returns Challenge or null if not found or expired
   */
  getChallengeByValue(challenge: string): Promise<Challenge | null>;

  /**
   * Delete a challenge (after verification)
   */
  deleteChallenge(id: string): Promise<void>;

  /**
   * Delete all expired challenges (cleanup operation)
   */
  deleteExpiredChallenges(): Promise<void>;
}
