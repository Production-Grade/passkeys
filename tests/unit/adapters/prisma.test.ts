import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaAdapter } from '../../../src/adapters/prisma/PrismaAdapter';

// Mock Prisma Client
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  passkey: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  recoveryCode: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  emailRecoveryToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

describe('PrismaAdapter', () => {
  let adapter: PrismaAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PrismaAdapter(mockPrisma as any);
  });

  describe('User Operations', () => {
    it('should create user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await adapter.createUser({ email: 'test@example.com' });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should get user by ID', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.getUserById('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should get user by email', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.getUserByEmail('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should update user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await adapter.updateUser('user-123', { email: 'new@example.com' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { email: 'new@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should delete user with cascade', async () => {
      mockPrisma.$transaction.mockResolvedValue([null, null, null, null]);

      await adapter.deleteUser('user-123');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      const transactionCalls = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionCalls.length).toBe(4);
    });
  });

  describe('Passkey Operations', () => {
    it('should create passkey', async () => {
      const mockPasskey = {
        id: 'cred-123',
        userId: 'user-123',
        publicKey: 'key',
        counter: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.passkey.create.mockResolvedValue(mockPasskey);

      const result = await adapter.createPasskey({
        id: 'cred-123',
        userId: 'user-123',
        publicKey: 'key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      expect(mockPrisma.passkey.create).toHaveBeenCalled();
      expect(result).toEqual(mockPasskey);
    });

    it('should get passkey by ID', async () => {
      const mockPasskey = { id: 'cred-123', userId: 'user-123' };
      mockPrisma.passkey.findUnique.mockResolvedValue(mockPasskey);

      const result = await adapter.getPasskeyById('cred-123');

      expect(mockPrisma.passkey.findUnique).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
      });
      expect(result).toEqual(mockPasskey);
    });

    it('should get user passkeys', async () => {
      const mockPasskeys = [{ id: 'cred-1' }, { id: 'cred-2' }];
      mockPrisma.passkey.findMany.mockResolvedValue(mockPasskeys);

      const result = await adapter.getUserPasskeys('user-123');

      expect(mockPrisma.passkey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockPasskeys);
    });

    it('should update passkey', async () => {
      const mockPasskey = { id: 'cred-123', counter: 1 };
      mockPrisma.passkey.update.mockResolvedValue(mockPasskey);

      const result = await adapter.updatePasskey('cred-123', { counter: 1 });

      expect(mockPrisma.passkey.update).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
        data: { counter: 1 },
      });
      expect(result).toEqual(mockPasskey);
    });

    it('should delete passkey', async () => {
      mockPrisma.passkey.delete.mockResolvedValue(null);

      await adapter.deletePasskey('cred-123');

      expect(mockPrisma.passkey.delete).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
      });
    });
  });

  describe('Recovery Code Operations', () => {
    it('should create recovery codes', async () => {
      const mockCodes = [{ id: 'code-1' }, { id: 'code-2' }];
      mockPrisma.$transaction.mockResolvedValue(mockCodes);

      const result = await adapter.createRecoveryCodes([
        { userId: 'user-123', codeHash: 'hash1' },
        { userId: 'user-123', codeHash: 'hash2' },
      ]);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockCodes);
    });

    it('should get user recovery codes', async () => {
      const mockCodes = [{ id: 'code-1' }];
      mockPrisma.recoveryCode.findMany.mockResolvedValue(mockCodes);

      const result = await adapter.getUserRecoveryCodes('user-123');

      expect(mockPrisma.recoveryCode.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', usedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCodes);
    });

    it('should mark recovery code as used', async () => {
      mockPrisma.recoveryCode.update.mockResolvedValue(null);

      await adapter.markRecoveryCodeUsed('code-123');

      expect(mockPrisma.recoveryCode.update).toHaveBeenCalledWith({
        where: { id: 'code-123' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should delete user recovery codes', async () => {
      mockPrisma.recoveryCode.deleteMany.mockResolvedValue({ count: 5 });

      await adapter.deleteUserRecoveryCodes('user-123');

      expect(mockPrisma.recoveryCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });

  describe('Email Recovery Token Operations', () => {
    it('should create email recovery token', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        tokenHash: 'hash',
        expiresAt: new Date(),
      };
      mockPrisma.emailRecoveryToken.create.mockResolvedValue(mockToken);

      const result = await adapter.createEmailRecoveryToken({
        userId: 'user-123',
        tokenHash: 'hash',
        expiresAt: new Date(),
      });

      expect(mockPrisma.emailRecoveryToken.create).toHaveBeenCalled();
      expect(result).toEqual(mockToken);
    });

    it('should get email recovery token by hash', async () => {
      const mockToken = { id: 'token-123', tokenHash: 'hash' };
      mockPrisma.emailRecoveryToken.findFirst.mockResolvedValue(mockToken);

      const result = await adapter.getEmailRecoveryTokenByHash('hash');

      expect(mockPrisma.emailRecoveryToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: 'hash',
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(result).toEqual(mockToken);
    });

    it('should mark email recovery token as used', async () => {
      mockPrisma.emailRecoveryToken.update.mockResolvedValue(null);

      await adapter.markEmailRecoveryTokenUsed('token-123');

      expect(mockPrisma.emailRecoveryToken.update).toHaveBeenCalledWith({
        where: { id: 'token-123' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should delete expired email recovery tokens', async () => {
      mockPrisma.emailRecoveryToken.deleteMany.mockResolvedValue({ count: 3 });

      await adapter.deleteExpiredEmailRecoveryTokens();

      expect(mockPrisma.emailRecoveryToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });
});

