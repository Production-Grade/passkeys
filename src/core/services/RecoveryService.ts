import type { PasskeyStorage } from '../types/storage';
import type { PasskeyConfig } from '../types/config';
import {
  hashValue,
  compareHash,
  generateRecoveryCode,
  generateEmailRecoveryToken,
  sha256Hash,
} from '../utils/crypto';
import { InvalidRecoveryCodeError, ValidationError } from '../types/errors';

/**
 * Service for managing account recovery mechanisms
 * Handles recovery codes and email-based recovery
 */
export class RecoveryService {
  constructor(
    private readonly storage: PasskeyStorage,
    private readonly config: PasskeyConfig
  ) {}

  /**
   * Generate recovery codes for a user
   * @param userId - User ID to generate codes for
   * @param count - Number of codes to generate (default: 8)
   * @returns Array of plaintext recovery codes (only time they're visible)
   */
  async generateRecoveryCodes(userId: string, count = 8): Promise<string[]> {
    // Verify user exists
    const user = await this.storage.getUserById(userId);
    if (!user) {
      throw new ValidationError('User not found');
    }

    // Delete any existing recovery codes
    await this.storage.deleteUserRecoveryCodes(userId);

    // Generate new codes
    const codes: string[] = [];
    const codeInputs: Array<{ userId: string; codeHash: string }> = [];

    for (let i = 0; i < count; i++) {
      const code = generateRecoveryCode(20); // 20-character codes
      codes.push(code);

      const codeHash = await hashValue(code);
      codeInputs.push({ userId, codeHash });
    }

    // Store hashed codes
    await this.storage.createRecoveryCodes(codeInputs);

    // Call hook if configured
    await this.config.hooks?.onRecoveryCodesRegenerated?.(userId, count);

    // Return plaintext codes (only time they're visible)
    return codes;
  }

  /**
   * Verify a recovery code and mark it as used
   * @param userId - User ID attempting recovery
   * @param code - Plaintext recovery code
   * @returns true if code is valid
   * @throws InvalidRecoveryCodeError if code is invalid or already used
   */
  async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    // Get all unused recovery codes for user
    const recoveryCodes = await this.storage.getUserRecoveryCodes(userId);

    if (recoveryCodes.length === 0) {
      throw new InvalidRecoveryCodeError();
    }

    // Check each code
    for (const recoveryCode of recoveryCodes) {
      const isValid = await compareHash(code, recoveryCode.codeHash);

      if (isValid) {
        // Mark as used
        await this.storage.markRecoveryCodeUsed(recoveryCode.id);

        // Call hook
        await this.config.hooks?.onRecoveryCodeUsed?.(userId);

        return true;
      }
    }

    // No matching code found
    throw new InvalidRecoveryCodeError();
  }

  /**
   * Initiate email recovery process
   * Generates a token and stores it (caller must send email)
   * @param email - User's email address
   * @returns Recovery token (plaintext, for email link)
   */
  async initiateEmailRecovery(email: string): Promise<{
    token: string;
    userId: string;
    expiresAt: Date;
  }> {
    if (!this.config.recovery?.email?.enabled) {
      throw new ValidationError('Email recovery is not enabled in configuration.');
    }

    // Find user by email
    const user = await this.storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not (security)
      // Still return a fake response with reasonable timing
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw new ValidationError('If this email exists, a recovery link has been sent');
    }

    // Generate recovery token
    const token = generateEmailRecoveryToken();
    const tokenHash = sha256Hash(token); // Use deterministic hash for searchability
    const tokenTTL = this.config.recovery?.email?.tokenTTL ?? 60; // Default 60 minutes
    const expiresAt = new Date(Date.now() + tokenTTL * 60 * 1000);

    // Store token
    await this.storage.createEmailRecoveryToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Send email if configured
    if (this.config.recovery?.email?.sendEmail) {
      await this.config.recovery.email.sendEmail(email, token, user.id);
    }

    // Call hook
    await this.config.hooks?.onEmailRecoveryRequested?.(user.id, email);

    return {
      token,
      userId: user.id,
      expiresAt,
    };
  }

  /**
   * Verify email recovery token
   * @param token - Plaintext recovery token from email link
   * @returns User ID if token is valid
   * @throws ValidationError if token is invalid, expired, or already used
   */
  async verifyEmailRecoveryToken(token: string): Promise<string> {
    if (!this.config.recovery?.email?.enabled) {
      throw new ValidationError('Email recovery is not enabled in configuration.');
    }

    // Hash the token to search in storage (using deterministic hash)
    const tokenHash = sha256Hash(token);

    // Find token by hash
    const emailRecoveryToken = await this.storage.getEmailRecoveryTokenByHash(tokenHash);

    if (!emailRecoveryToken) {
      throw new ValidationError('Invalid or expired recovery token');
    }

    // Mark token as used
    await this.storage.markEmailRecoveryTokenUsed(emailRecoveryToken.id);

    // Call hook
    await this.config.hooks?.onEmailRecoveryCompleted?.(emailRecoveryToken.userId);

    return emailRecoveryToken.userId;
  }

  /**
   * Get recovery code count for a user
   * @param userId - User ID
   * @returns Number of unused recovery codes
   */
  async getRecoveryCodeCount(userId: string): Promise<number> {
    const codes = await this.storage.getUserRecoveryCodes(userId);
    return codes.length;
  }
}
