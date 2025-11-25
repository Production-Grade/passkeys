import { randomUUID } from 'crypto';
import type { PasskeyStorage } from '../../core/types/storage';
import type { User, CreateUserInput, UpdateUserInput } from '../../core/types/user';
import type { Passkey, CreatePasskeyInput, UpdatePasskeyInput } from '../../core/types/passkey';
import type {
  RecoveryCode,
  EmailRecoveryToken,
  CreateRecoveryCodeInput,
  CreateEmailRecoveryTokenInput,
} from '../../core/types/recovery';
import {
  UserNotFoundError,
  DuplicateUserError,
  PasskeyNotFoundError,
  InvalidRecoveryCodeError,
} from '../../core/types/errors';

/**
 * In-memory storage implementation for testing and development
 * NOT suitable for production use
 */
export class MemoryStorage implements PasskeyStorage {
  private users: Map<string, User> = new Map();
  private usersByEmail: Map<string, User> = new Map();
  private passkeys: Map<string, Passkey> = new Map();
  private passkeysByUser: Map<string, Set<string>> = new Map();
  private recoveryCodes: Map<string, RecoveryCode> = new Map();
  private recoveryCodesByUser: Map<string, Set<string>> = new Map();
  private emailRecoveryTokens: Map<string, EmailRecoveryToken> = new Map();

  // ============================================
  // User Operations
  // ============================================

  async createUser(input: CreateUserInput): Promise<User> {
    // Check for duplicate email
    if (this.usersByEmail.has(input.email)) {
      throw new DuplicateUserError(input.email);
    }

    const now = new Date();
    const user: User = {
      id: randomUUID(),
      email: input.email,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user);

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.usersByEmail.get(email) || null;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    // If email is being updated, check for duplicates
    if (input.email && input.email !== user.email) {
      if (this.usersByEmail.has(input.email)) {
        throw new DuplicateUserError(input.email);
      }
      // Remove old email mapping
      this.usersByEmail.delete(user.email);
      user.email = input.email;
      this.usersByEmail.set(user.email, user);
    }

    user.updatedAt = new Date();
    this.users.set(id, user);

    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    // Delete user's passkeys
    const userPasskeys = this.passkeysByUser.get(id) || new Set();
    for (const passkeyId of userPasskeys) {
      this.passkeys.delete(passkeyId);
    }
    this.passkeysByUser.delete(id);

    // Delete user's recovery codes
    const userRecoveryCodes = this.recoveryCodesByUser.get(id) || new Set();
    for (const codeId of userRecoveryCodes) {
      this.recoveryCodes.delete(codeId);
    }
    this.recoveryCodesByUser.delete(id);

    // Delete user's email recovery tokens
    for (const [tokenId, token] of this.emailRecoveryTokens.entries()) {
      if (token.userId === id) {
        this.emailRecoveryTokens.delete(tokenId);
      }
    }

    // Delete user
    this.usersByEmail.delete(user.email);
    this.users.delete(id);
  }

  // ============================================
  // Passkey Operations
  // ============================================

  async createPasskey(input: CreatePasskeyInput): Promise<Passkey> {
    const now = new Date();
    const passkey: Passkey = {
      id: input.id,
      userId: input.userId,
      publicKey: input.publicKey,
      counter: input.counter,
      deviceType: input.deviceType,
      backedUp: input.backedUp,
      transports: input.transports,
      nickname: input.nickname,
      createdAt: now,
      updatedAt: now,
    };

    this.passkeys.set(passkey.id, passkey);

    // Track user's passkeys
    if (!this.passkeysByUser.has(input.userId)) {
      this.passkeysByUser.set(input.userId, new Set());
    }
    this.passkeysByUser.get(input.userId)!.add(passkey.id);

    return passkey;
  }

  async getPasskeyById(id: string): Promise<Passkey | null> {
    return this.passkeys.get(id) || null;
  }

  async getUserPasskeys(userId: string): Promise<Passkey[]> {
    const passkeyIds = this.passkeysByUser.get(userId) || new Set();
    const passkeys: Passkey[] = [];

    for (const passkeyId of passkeyIds) {
      const passkey = this.passkeys.get(passkeyId);
      if (passkey) {
        passkeys.push(passkey);
      }
    }

    return passkeys;
  }

  async updatePasskey(id: string, input: UpdatePasskeyInput): Promise<Passkey> {
    const passkey = this.passkeys.get(id);
    if (!passkey) {
      throw new PasskeyNotFoundError(id);
    }

    if (input.counter !== undefined) {
      passkey.counter = input.counter;
    }
    if (input.nickname !== undefined) {
      passkey.nickname = input.nickname;
    }
    if (input.lastUsedAt !== undefined) {
      passkey.lastUsedAt = input.lastUsedAt;
    }

    passkey.updatedAt = new Date();
    this.passkeys.set(id, passkey);

    return passkey;
  }

  async deletePasskey(id: string): Promise<void> {
    const passkey = this.passkeys.get(id);
    if (!passkey) {
      throw new PasskeyNotFoundError(id);
    }

    // Remove from user's passkey set
    const userPasskeys = this.passkeysByUser.get(passkey.userId);
    if (userPasskeys) {
      userPasskeys.delete(id);
    }

    this.passkeys.delete(id);
  }

  // ============================================
  // Recovery Code Operations
  // ============================================

  async createRecoveryCodes(inputs: CreateRecoveryCodeInput[]): Promise<RecoveryCode[]> {
    const codes: RecoveryCode[] = [];
    const now = new Date();

    for (const input of inputs) {
      const code: RecoveryCode = {
        id: randomUUID(),
        userId: input.userId,
        codeHash: input.codeHash,
        used: false,
        usedAt: undefined,
        createdAt: now,
      };

      this.recoveryCodes.set(code.id, code);

      // Track user's recovery codes
      if (!this.recoveryCodesByUser.has(input.userId)) {
        this.recoveryCodesByUser.set(input.userId, new Set());
      }
      this.recoveryCodesByUser.get(input.userId)!.add(code.id);

      codes.push(code);
    }

    return codes;
  }

  async getUserRecoveryCodes(userId: string): Promise<RecoveryCode[]> {
    const codeIds = this.recoveryCodesByUser.get(userId) || new Set();
    const codes: RecoveryCode[] = [];

    for (const codeId of codeIds) {
      const code = this.recoveryCodes.get(codeId);
      if (code && !code.used) {
        codes.push(code);
      }
    }

    return codes;
  }

  async markRecoveryCodeUsed(id: string): Promise<void> {
    const code = this.recoveryCodes.get(id);
    if (!code) {
      throw new InvalidRecoveryCodeError();
    }

    if (code.used) {
      throw new InvalidRecoveryCodeError();
    }

    code.used = true;
    code.usedAt = new Date();
    this.recoveryCodes.set(id, code);
  }

  async deleteUserRecoveryCodes(userId: string): Promise<void> {
    const codeIds = this.recoveryCodesByUser.get(userId) || new Set();

    for (const codeId of codeIds) {
      this.recoveryCodes.delete(codeId);
    }

    this.recoveryCodesByUser.delete(userId);
  }

  // ============================================
  // Email Recovery Operations
  // ============================================

  async createEmailRecoveryToken(
    input: CreateEmailRecoveryTokenInput
  ): Promise<EmailRecoveryToken> {
    const token: EmailRecoveryToken = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      used: false,
      usedAt: undefined,
      createdAt: new Date(),
    };

    this.emailRecoveryTokens.set(token.id, token);
    return token;
  }

  async getEmailRecoveryToken(id: string): Promise<EmailRecoveryToken | null> {
    const token = this.emailRecoveryTokens.get(id);

    if (!token) {
      return null;
    }

    // Check if expired
    if (token.expiresAt < new Date()) {
      this.emailRecoveryTokens.delete(id);
      return null;
    }

    return token;
  }

  async getEmailRecoveryTokenByHash(tokenHash: string): Promise<EmailRecoveryToken | null> {
    const now = new Date();

    for (const token of this.emailRecoveryTokens.values()) {
      // Skip if expired
      if (token.expiresAt < now) {
        continue;
      }

      // Skip if already used
      if (token.used) {
        continue;
      }

      // Check if hash matches
      if (token.tokenHash === tokenHash) {
        return token;
      }
    }

    return null;
  }

  async markEmailRecoveryTokenUsed(id: string): Promise<void> {
    const token = this.emailRecoveryTokens.get(id);
    if (token) {
      token.used = true;
      token.usedAt = new Date();
      this.emailRecoveryTokens.set(id, token);
    }
  }

  async deleteExpiredEmailRecoveryTokens(): Promise<void> {
    const now = new Date();
    for (const [id, token] of this.emailRecoveryTokens.entries()) {
      if (token.expiresAt < now) {
        this.emailRecoveryTokens.delete(id);
      }
    }
  }
}
