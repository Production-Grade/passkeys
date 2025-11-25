import type { PrismaClient } from '@prisma/client';
import type { PasskeyStorage } from '../../core/types/storage';
import type { User, CreateUserInput } from '../../core/types/user';
import type { Passkey, CreatePasskeyInput } from '../../core/types/passkey';
import type { RecoveryCode, CreateRecoveryCodeInput } from '../../core/types/recovery';
import type { EmailRecoveryToken, CreateEmailRecoveryTokenInput } from '../../core/types/recovery';

/**
 * Prisma adapter implementing PasskeyStorage interface
 *
 * This is a reference implementation for PostgreSQL using Prisma ORM.
 * Demonstrates how to implement the storage interface for production use.
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { PrismaAdapter } from '@productiongrade/passkeys/adapters/prisma';
 *
 * const prisma = new PrismaClient();
 * const storage = new PrismaAdapter(prisma);
 * ```
 */
export class PrismaAdapter implements PasskeyStorage {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================================================
  // User Operations
  // ============================================================================

  async createUser(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email,
      },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: updates,
    });
  }

  async deleteUser(id: string): Promise<void> {
    // Delete user's passkeys, recovery codes, and email recovery tokens first
    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { userId: id } }),
      this.prisma.emailRecoveryToken.deleteMany({ where: { userId: id } }),
      this.prisma.passkey.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
  }

  // ============================================================================
  // Passkey Operations
  // ============================================================================

  async createPasskey(input: CreatePasskeyInput): Promise<Passkey> {
    return this.prisma.passkey.create({
      data: {
        id: input.id,
        userId: input.userId,
        publicKey: input.publicKey,
        counter: input.counter,
        transports: input.transports,
        deviceType: input.deviceType,
        backedUp: input.backedUp,
        nickname: input.nickname,
      },
    });
  }

  async getPasskeyById(id: string): Promise<Passkey | null> {
    return this.prisma.passkey.findUnique({
      where: { id },
    });
  }

  async getPasskeyByCredentialId(credentialId: string): Promise<Passkey | null> {
    return this.prisma.passkey.findUnique({
      where: { id: credentialId },
    });
  }

  async getUserPasskeys(userId: string): Promise<Passkey[]> {
    return this.prisma.passkey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePasskey(id: string, updates: Partial<Passkey>): Promise<Passkey> {
    return this.prisma.passkey.update({
      where: { id },
      data: updates,
    });
  }

  async deletePasskey(id: string): Promise<void> {
    await this.prisma.passkey.delete({
      where: { id },
    });
  }

  // ============================================================================
  // Recovery Code Operations
  // ============================================================================

  async createRecoveryCodes(inputs: CreateRecoveryCodeInput[]): Promise<RecoveryCode[]> {
    // Use transaction to ensure all codes are created atomically
    return this.prisma.$transaction(
      inputs.map((input) =>
        this.prisma.recoveryCode.create({
          data: {
            userId: input.userId,
            codeHash: input.codeHash,
          },
        })
      )
    );
  }

  async getUserRecoveryCodes(userId: string): Promise<RecoveryCode[]> {
    return this.prisma.recoveryCode.findMany({
      where: {
        userId,
        usedAt: null, // Only return unused codes
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecoveryCodeByHash(userId: string, codeHash: string): Promise<RecoveryCode | null> {
    return this.prisma.recoveryCode.findFirst({
      where: {
        userId,
        codeHash,
        usedAt: null, // Only return if unused
      },
    });
  }

  async markRecoveryCodeUsed(id: string): Promise<void> {
    await this.prisma.recoveryCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteUserRecoveryCodes(userId: string): Promise<void> {
    await this.prisma.recoveryCode.deleteMany({
      where: { userId },
    });
  }

  // ============================================================================
  // Email Recovery Token Operations
  // ============================================================================

  async createEmailRecoveryToken(
    input: CreateEmailRecoveryTokenInput
  ): Promise<EmailRecoveryToken> {
    return this.prisma.emailRecoveryToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async getEmailRecoveryToken(id: string): Promise<EmailRecoveryToken | null> {
    return this.prisma.emailRecoveryToken.findUnique({
      where: { id },
    });
  }

  async getEmailRecoveryTokenByHash(tokenHash: string): Promise<EmailRecoveryToken | null> {
    const now = new Date();
    return this.prisma.emailRecoveryToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
    });
  }

  async markEmailRecoveryTokenUsed(id: string): Promise<void> {
    await this.prisma.emailRecoveryToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpiredEmailRecoveryTokens(): Promise<void> {
    const now = new Date();
    await this.prisma.emailRecoveryToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
  }
}
