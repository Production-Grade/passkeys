import { RecoveryService } from '../../../src/core/services/RecoveryService';
import { MemoryStorage } from '../../../src/adapters/memory/MemoryStorage';
import { MemoryChallengeStorage } from '../../../src/adapters/memory/MemoryChallengeStorage';
import type { PasskeyConfig } from '../../../src/core/types/config';
import { InvalidRecoveryCodeError, ValidationError } from '../../../src/core/types/errors';

describe('RecoveryService', () => {
  let storage: MemoryStorage;
  let config: PasskeyConfig;
  let service: RecoveryService;

  beforeEach(() => {
    storage = new MemoryStorage();
    config = {
      rpName: 'Test App',
      rpId: 'localhost',
      origin: 'http://localhost:3000',
      storage,
      challenges: new MemoryChallengeStorage(),
      recovery: {
        codes: {
          enabled: true,
          count: 10,
          length: 16,
        },
        email: {
          enabled: true,
          sendEmail: async () => {}, // Mock email sender
          tokenTTL: 60, // 60 minutes
        },
      },
      hooks: {
        onRecoveryCodesRegenerated: jest.fn(),
        onRecoveryCodeUsed: jest.fn(),
        onEmailRecoveryRequested: jest.fn(),
        onEmailRecoveryCompleted: jest.fn(),
      },
    };
    service = new RecoveryService(storage, config);
  });

  describe('generateRecoveryCodes', () => {
    it('should generate recovery codes for a user', async () => {
      // Create a user first
      const user = await storage.createUser({ email: 'test@example.com' });

      const codes = await service.generateRecoveryCodes(user.id);

      expect(codes).toHaveLength(8); // Default count
      expect(codes[0]).toHaveLength(20); // Default length in service
      expect(new Set(codes).size).toBe(codes.length); // All unique

      // Verify hook was called
      expect(config.hooks?.onRecoveryCodesRegenerated).toHaveBeenCalledWith(user.id, 8);
    });

    it('should generate specified number of codes', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });

      const codes = await service.generateRecoveryCodes(user.id, 12);

      expect(codes).toHaveLength(12);
    });

    it('should replace existing recovery codes', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });

      // Generate first set
      const codes1 = await service.generateRecoveryCodes(user.id);
      expect(codes1).toHaveLength(8);

      // Check storage
      let storedCodes = await storage.getUserRecoveryCodes(user.id);
      expect(storedCodes).toHaveLength(8);

      // Generate second set (should replace)
      const codes2 = await service.generateRecoveryCodes(user.id);
      expect(codes2).toHaveLength(8);

      // Verify old codes are deleted
      storedCodes = await storage.getUserRecoveryCodes(user.id);
      expect(storedCodes).toHaveLength(8);
      
      // Verify hook was called twice
      expect(config.hooks?.onRecoveryCodesRegenerated).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationError if user does not exist', async () => {
      await expect(service.generateRecoveryCodes('nonexistent')).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyRecoveryCode', () => {
    it('should verify a valid recovery code', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      const codes = await service.generateRecoveryCodes(user.id);
      const validCode = codes[0]!;

      const result = await service.verifyRecoveryCode(user.id, validCode);

      expect(result).toBe(true);
      expect(config.hooks?.onRecoveryCodeUsed).toHaveBeenCalledWith(user.id);
    });

    it('should mark code as used after verification', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      const codes = await service.generateRecoveryCodes(user.id);
      const validCode = codes[0]!;

      // First use should succeed
      await service.verifyRecoveryCode(user.id, validCode);

      // Second use should fail
      await expect(service.verifyRecoveryCode(user.id, validCode)).rejects.toThrow(InvalidRecoveryCodeError);
    });

    it('should throw InvalidRecoveryCodeError for invalid code', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      await service.generateRecoveryCodes(user.id);

      await expect(service.verifyRecoveryCode(user.id, 'INVALID-CODE')).rejects.toThrow(InvalidRecoveryCodeError);
    });

    it('should throw InvalidRecoveryCodeError if user has no recovery codes', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });

      await expect(service.verifyRecoveryCode(user.id, 'ANY-CODE')).rejects.toThrow(InvalidRecoveryCodeError);
    });
  });

  describe('getRecoveryCodeCount', () => {
    it('should return count of unused recovery codes', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      const codes = await service.generateRecoveryCodes(user.id);

      let count = await service.getRecoveryCodeCount(user.id);
      expect(count).toBe(8);

      // Use one code
      await service.verifyRecoveryCode(user.id, codes[0]!);

      // Count should decrease
      count = await service.getRecoveryCodeCount(user.id);
      expect(count).toBe(7);
    });

    it('should return 0 if user has no codes', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });

      const count = await service.getRecoveryCodeCount(user.id);
      expect(count).toBe(0);
    });
  });

  describe('initiateEmailRecovery', () => {
    it('should generate email recovery token for valid email', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });

      const result = await service.initiateEmailRecovery('test@example.com');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('userId', user.id);
      expect(result).toHaveProperty('expiresAt');
      expect(result.token).toHaveLength(64); // Default token length from generateEmailRecoveryToken
      expect(config.hooks?.onEmailRecoveryRequested).toHaveBeenCalledWith(user.id, 'test@example.com');
    });

    it('should throw ValidationError for nonexistent email', async () => {
      await expect(service.initiateEmailRecovery('nonexistent@example.com')).rejects.toThrow(ValidationError);
    });

    it('should store token hash, not plaintext token', async () => {
      await storage.createUser({ email: 'test@example.com' });

      const result = await service.initiateEmailRecovery('test@example.com');

      // Verify token is stored (can't directly check the hash without accessing storage internals)
      const storedToken = await storage.getEmailRecoveryToken(result.token);
      expect(storedToken).toBeNull(); // Because we store hash, not plaintext
    });

    it('should set expiry time correctly', async () => {
      await storage.createUser({ email: 'test@example.com' });

      const before = new Date(Date.now() + 60 * 60 * 1000);
      const result = await service.initiateEmailRecovery('test@example.com');
      const after = new Date(Date.now() + 60 * 60 * 1000);

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe('verifyEmailRecoveryToken', () => {
    it('should verify valid email recovery token', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      const { token } = await service.initiateEmailRecovery('test@example.com');

      const userId = await service.verifyEmailRecoveryToken(token);

      expect(userId).toBe(user.id);
      expect(config.hooks?.onEmailRecoveryCompleted).toHaveBeenCalledWith(user.id);
    });

    it('should throw ValidationError for invalid token', async () => {
      await storage.createUser({ email: 'test@example.com' });
      await service.initiateEmailRecovery('test@example.com');

      await expect(service.verifyEmailRecoveryToken('INVALID-TOKEN')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for expired token', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      
      // Create an already-expired token directly in storage
      const expiredToken = 'expired-test-token';
      const { sha256Hash: sha256HashFn } = await import('../../../src/core/utils/crypto');
      const expiredTokenHash = sha256HashFn(expiredToken);
      
      await storage.createEmailRecoveryToken({
        userId: user.id,
        tokenHash: expiredTokenHash,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      await expect(service.verifyEmailRecoveryToken(expiredToken)).rejects.toThrow(ValidationError);
    });

    it('should mark token as used after verification', async () => {
      await storage.createUser({ email: 'test@example.com' });
      const { token } = await service.initiateEmailRecovery('test@example.com');

      // First use should succeed
      await service.verifyEmailRecoveryToken(token);

      // Second use should fail
      await expect(service.verifyEmailRecoveryToken(token)).rejects.toThrow(ValidationError);
    });
  });
});

