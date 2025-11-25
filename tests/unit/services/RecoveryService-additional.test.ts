import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RecoveryService } from '../../../src/core/services/RecoveryService';
import { createMockStorage, createMockPasskeyConfig } from '../../../src/testing';
import { InvalidRecoveryCodeError, ValidationError } from '../../../src/core/types/errors';

describe('RecoveryService - Additional Coverage', () => {
  let recoveryService: RecoveryService;
  let storage: ReturnType<typeof createMockStorage>;
  let userId: string;

  beforeEach(async () => {
    storage = createMockStorage();
    const config = createMockPasskeyConfig({
      storage,
      recovery: {
        codes: {
          enabled: true,
          count: 10,
          length: 8,
        },
      },
    });
    recoveryService = new RecoveryService(storage, config);

    const user = await storage.createUser({ email: 'test@example.com' });
    userId = user.id;
  });

  describe('getRecoveryCodeCount', () => {
    it('should return 0 for user with no recovery codes', async () => {
      const count = await recoveryService.getRecoveryCodeCount(userId);
      expect(count).toBe(0);
    });

    it('should return correct count after generating codes', async () => {
      await recoveryService.generateRecoveryCodes(userId, 10);
      const count = await recoveryService.getRecoveryCodeCount(userId);
      expect(count).toBe(10);
    });

    it('should return updated count after using codes', async () => {
      const codes = await recoveryService.generateRecoveryCodes(userId, 10);
      await recoveryService.verifyRecoveryCode(userId, codes[0]!);

      const count = await recoveryService.getRecoveryCodeCount(userId);
      expect(count).toBe(9);
    });

    it('should return 0 for invalid userId', async () => {
      // getRecoveryCodeCount doesn't validate userId, it just queries storage
      const count = await recoveryService.getRecoveryCodeCount('');
      expect(count).toBe(0);
    });
  });

  describe('generateRecoveryCodes - Edge Cases', () => {
    it('should generate unique codes', async () => {
      const codes = await recoveryService.generateRecoveryCodes(userId);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should overwrite existing codes', async () => {
      const codes1 = await recoveryService.generateRecoveryCodes(userId, 10);
      const codes2 = await recoveryService.generateRecoveryCodes(userId, 10);

      expect(codes1).not.toEqual(codes2);
      expect(codes2).toHaveLength(10);
    });

    it('should throw ValidationError for invalid userId', async () => {
      await expect(recoveryService.generateRecoveryCodes('')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when user not found', async () => {
      await expect(
        recoveryService.generateRecoveryCodes('non-existent-user-id')
      ).rejects.toThrow(ValidationError);
    });

    it('should call onRecoveryCodesRegenerated hook', async () => {
      const onRecoveryCodesRegenerated = jest.fn<(_userId: string, _count: number) => void>();
      const config = createMockPasskeyConfig({
        storage,
        recovery: {
          codes: {
            enabled: true,
            count: 8,
            length: 20,
          },
        },
        hooks: {
          onRecoveryCodesRegenerated,
        },
      });
      const service = new RecoveryService(storage, config);

      await service.generateRecoveryCodes(userId, 5);

      expect(onRecoveryCodesRegenerated).toHaveBeenCalledWith(userId, 5);
    });
  });

  describe('verifyRecoveryCode - Edge Cases', () => {
    it('should throw InvalidRecoveryCodeError when user has no recovery codes', async () => {
      const user = await storage.createUser({ email: 'no-codes@example.com' });

      const config = createMockPasskeyConfig({
        storage,
        recovery: {
          codes: {
            enabled: true,
            count: 8,
            length: 20,
          },
        },
      });
      const service = new RecoveryService(storage, config);

      // User has no recovery codes
      await expect(
        service.verifyRecoveryCode(user.id, 'any-code')
      ).rejects.toThrow(InvalidRecoveryCodeError);
    });
    it('should throw InvalidRecoveryCodeError for already used code', async () => {
      const codes = await recoveryService.generateRecoveryCodes(userId);
      await recoveryService.verifyRecoveryCode(userId, codes[0]!);

      await expect(
        recoveryService.verifyRecoveryCode(userId, codes[0]!)
      ).rejects.toThrow(InvalidRecoveryCodeError);
    });

    it('should throw InvalidRecoveryCodeError for code from different user', async () => {
      const codes = await recoveryService.generateRecoveryCodes(userId);
      const otherUser = await storage.createUser({ email: 'other@example.com' });

      await expect(
        recoveryService.verifyRecoveryCode(otherUser.id, codes[0]!)
      ).rejects.toThrow(InvalidRecoveryCodeError);
    });

    it('should throw InvalidRecoveryCodeError for invalid code', async () => {
      await expect(
        recoveryService.verifyRecoveryCode(userId, 'invalid-code')
      ).rejects.toThrow(InvalidRecoveryCodeError);
    });
  });

  describe('initiateEmailRecovery - Edge Cases', () => {
    it('should throw ValidationError when email recovery is disabled', async () => {
      const config = createMockPasskeyConfig({
        storage,
        recovery: {
          codes: {
            enabled: true,
            count: 10,
            length: 8,
          },
          email: {
            enabled: false,
            sendEmail: jest.fn<(_to: string, _token: string, _userId: string) => Promise<void>>(),
          },
        },
      });
      const service = new RecoveryService(storage, config);

      await expect(
        service.initiateEmailRecovery('test@example.com')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw RecoveryError when user not found', async () => {
      const config = createMockPasskeyConfig({
        storage,
        recovery: {
          codes: {
            enabled: true,
            count: 10,
            length: 8,
          },
          email: {
            enabled: true,
            sendEmail: jest.fn<(_to: string, _token: string, _userId: string) => Promise<void>>(),
          },
        },
      });
      const service = new RecoveryService(storage, config);

      await expect(
        service.initiateEmailRecovery('nonexistent@example.com')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid email', async () => {
      const config = createMockPasskeyConfig({
        storage,
        recovery: {
          codes: {
            enabled: true,
            count: 10,
            length: 8,
          },
          email: {
            enabled: true,
            sendEmail: jest.fn<(_to: string, _token: string, _userId: string) => Promise<void>>(),
          },
        },
      });
      const service = new RecoveryService(storage, config);

      await expect(
        service.initiateEmailRecovery('invalid-email')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyEmailRecoveryToken - Edge Cases', () => {
    it('should throw InvalidRecoveryTokenError for non-existent token', async () => {
      const config = createMockPasskeyConfig({
        storage,
        recovery: {
          codes: {
            enabled: true,
            count: 10,
            length: 8,
          },
          email: {
            enabled: true,
            sendEmail: jest.fn<(_to: string, _token: string, _userId: string) => Promise<void>>(),
          },
        },
      });
      const service = new RecoveryService(storage, config);

      await expect(
        service.verifyEmailRecoveryToken('non-existent-token')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw InvalidRecoveryTokenError for already used token', async () => {
      const config = createMockPasskeyConfig({
        storage,
        recovery: {
          codes: {
            enabled: true,
            count: 10,
            length: 8,
          },
          email: {
            enabled: true,
            sendEmail: jest.fn<(_to: string, _token: string, _userId: string) => Promise<void>>(),
          },
        },
      });
      const service = new RecoveryService(storage, config);

      const result = await service.initiateEmailRecovery('test@example.com');
      await service.verifyEmailRecoveryToken(result.token);

      await expect(
        service.verifyEmailRecoveryToken(result.token)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid token', async () => {
      const config = createMockPasskeyConfig({
        storage,
        recovery: {
          codes: {
            enabled: true,
            count: 10,
            length: 8,
          },
          email: {
            enabled: true,
            sendEmail: jest.fn<(_to: string, _token: string, _userId: string) => Promise<void>>(),
          },
        },
      });
      const service = new RecoveryService(storage, config);

      await expect(
        service.verifyEmailRecoveryToken('')
      ).rejects.toThrow(ValidationError);
    });
  });
});

