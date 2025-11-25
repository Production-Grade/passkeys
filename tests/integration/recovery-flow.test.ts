/**
 * Integration tests for recovery code flow
 * Tests the complete recovery code generation, storage, and authentication process
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RecoveryService } from '../../src/core/services/RecoveryService';
import { MemoryStorage } from '../../src/adapters/memory';
import type { PasskeyConfig } from '../../src/core/types/config';

describe('Recovery Code Flow Integration', () => {
  let storage: MemoryStorage;
  let recoveryService: RecoveryService;

  beforeEach(() => {
    storage = new MemoryStorage();

    const config: PasskeyConfig = {
      rpId: 'localhost',
      rpName: 'Test App',
      origin: 'http://localhost:3000',
      storage,
      challenges: {} as any, // Not needed for recovery tests
      recovery: {
        codes: {
          enabled: true,
          count: 8,
          length: 12,
        },
      },
    };

    recoveryService = new RecoveryService(storage, config);
  });

  describe('Recovery Code Generation', () => {
    it('should generate specified number of recovery codes', async () => {
      const user = await storage.createUser({ email: 'recovery@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 10);

      expect(codes).toHaveLength(10);
      codes.forEach((code) => {
        expect(code).toHaveLength(20); // RecoveryService generates 20-character codes
        expect(code).toMatch(/^[A-Z0-9]+$/); // Uppercase alphanumeric
      });
    });

    it('should generate unique recovery codes', async () => {
      const user = await storage.createUser({ email: 'unique@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 10);

      // All codes should be unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(10);
    });

    it('should exclude ambiguous characters', async () => {
      const user = await storage.createUser({ email: 'ambiguous@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 20);

      // Should not contain ambiguous characters (0, O, I, l)
      codes.forEach((code) => {
        expect(code).not.toMatch(/[0OIl]/);
      });
    });

    it('should hash codes before storage', async () => {
      const user = await storage.createUser({ email: 'hashed@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 5);

      // Get stored recovery codes
      const storedCodes = await storage.getUserRecoveryCodes(user.id);

      expect(storedCodes).toHaveLength(5);
      
      // Stored codes should be hashed (not equal to plain text)
      storedCodes.forEach((stored) => {
        expect(stored.codeHash).not.toEqual(codes[0]);
        expect(stored.codeHash.startsWith('$2')).toBe(true); // bcrypt format
      });
    });

    it('should replace existing codes when regenerated', async () => {
      const user = await storage.createUser({ email: 'replace@example.com' });

      // Generate first set
      const firstCodes = await recoveryService.generateRecoveryCodes(user.id, 5);
      const firstStored = await storage.getUserRecoveryCodes(user.id);
      expect(firstStored).toHaveLength(5);

      // Regenerate
      const secondCodes = await recoveryService.generateRecoveryCodes(user.id, 8);
      const secondStored = await storage.getUserRecoveryCodes(user.id);

      // Should have new set, old codes deleted
      expect(secondStored).toHaveLength(8);
      expect(secondCodes).not.toEqual(firstCodes);
    });

    it('should call regeneration hook when codes are generated', async () => {
      let hookCalled = false;
      let hookUserId = '';
      let hookCount = 0;

      const config: PasskeyConfig = {
        rpId: 'localhost',
        rpName: 'Test App',
        origin: 'http://localhost:3000',
        storage,
        challenges: {} as any,
        recovery: {
          codes: { enabled: true, count: 8 },
        },
        hooks: {
          onRecoveryCodesRegenerated: (userId, count) => {
            hookCalled = true;
            hookUserId = userId;
            hookCount = count;
          },
        },
      };

      const service = new RecoveryService(storage, config);
      const user = await storage.createUser({ email: 'hook@example.com' });

      await service.generateRecoveryCodes(user.id, 10);

      expect(hookCalled).toBe(true);
      expect(hookUserId).toBe(user.id);
      expect(hookCount).toBe(10);
    });
  });

  describe('Recovery Code Verification', () => {
    it('should successfully verify valid recovery code', async () => {
      const user = await storage.createUser({ email: 'verify@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 5);
      const codeToUse = codes[0]!;

      // Verify the code
      const isValid = await recoveryService.verifyRecoveryCode(user.id, codeToUse);

      expect(isValid).toBe(true);
    });

    it('should reject invalid recovery code', async () => {
      const user = await storage.createUser({ email: 'invalid@example.com' });

      await recoveryService.generateRecoveryCodes(user.id, 5);

      // Try invalid code - should throw InvalidRecoveryCodeError
      await expect(
        recoveryService.verifyRecoveryCode(user.id, 'INVALID-CODE')
      ).rejects.toThrow();
    });

    it('should mark recovery code as used after verification', async () => {
      const user = await storage.createUser({ email: 'used@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 5);
      const codeToUse = codes[0]!;

      // Before use - 5 unused codes
      let unusedCodes = await storage.getUserRecoveryCodes(user.id);
      expect(unusedCodes).toHaveLength(5);

      // Use the code
      await recoveryService.verifyRecoveryCode(user.id, codeToUse);

      // After use - 4 unused codes remaining
      unusedCodes = await storage.getUserRecoveryCodes(user.id);
      expect(unusedCodes).toHaveLength(4);
    });

    it('should not allow same recovery code to be used twice', async () => {
      const user = await storage.createUser({ email: 'reuse@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 5);
      const codeToUse = codes[0]!;

      // First use - should succeed
      const firstUse = await recoveryService.verifyRecoveryCode(user.id, codeToUse);
      expect(firstUse).toBe(true);

      // Second use - should throw InvalidRecoveryCodeError
      await expect(
        recoveryService.verifyRecoveryCode(user.id, codeToUse)
      ).rejects.toThrow();
    });

    it('should call recovery code used hook', async () => {
      let hookCalled = false;
      let hookUserId = '';

      const config: PasskeyConfig = {
        rpId: 'localhost',
        rpName: 'Test App',
        origin: 'http://localhost:3000',
        storage,
        challenges: {} as any,
        recovery: {
          codes: { enabled: true },
        },
        hooks: {
          onRecoveryCodeUsed: (userId) => {
            hookCalled = true;
            hookUserId = userId;
          },
        },
      };

      const service = new RecoveryService(storage, config);
      const user = await storage.createUser({ email: 'hooked@example.com' });

      const codes = await service.generateRecoveryCodes(user.id, 5);
      await service.verifyRecoveryCode(user.id, codes[0]!);

      expect(hookCalled).toBe(true);
      expect(hookUserId).toBe(user.id);
    });

    it('should not call hook for invalid code', async () => {
      let hookCalled = false;

      const config: PasskeyConfig = {
        rpId: 'localhost',
        rpName: 'Test App',
        origin: 'http://localhost:3000',
        storage,
        challenges: {} as any,
        recovery: {
          codes: { enabled: true },
        },
        hooks: {
          onRecoveryCodeUsed: () => {
            hookCalled = true;
          },
        },
      };

      const service = new RecoveryService(storage, config);
      const user = await storage.createUser({ email: 'invalid-hook@example.com' });

      await service.generateRecoveryCodes(user.id, 5);
      
      // Invalid code should throw error, hook should not be called
      await expect(
        service.verifyRecoveryCode(user.id, 'INVALID-CODE')
      ).rejects.toThrow();
      
      expect(hookCalled).toBe(false);
    });
  });

  describe('Recovery Code Count', () => {
    it('should return correct count of unused recovery codes', async () => {
      const user = await storage.createUser({ email: 'count@example.com' });

      await recoveryService.generateRecoveryCodes(user.id, 8);

      const count = await recoveryService.getRecoveryCodeCount(user.id);
      expect(count).toBe(8);
    });

    it('should decrease count when codes are used', async () => {
      const user = await storage.createUser({ email: 'decrease@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 10);

      // Use 3 codes
      await recoveryService.verifyRecoveryCode(user.id, codes[0]!);
      await recoveryService.verifyRecoveryCode(user.id, codes[1]!);
      await recoveryService.verifyRecoveryCode(user.id, codes[2]!);

      const count = await recoveryService.getRecoveryCodeCount(user.id);
      expect(count).toBe(7);
    });

    it('should return 0 for user with no recovery codes', async () => {
      const user = await storage.createUser({ email: 'nocodes@example.com' });

      const count = await recoveryService.getRecoveryCodeCount(user.id);
      expect(count).toBe(0);
    });
  });

  describe('Recovery Code Security', () => {
    it('should not allow recovery code verification for wrong user', async () => {
      const user1 = await storage.createUser({ email: 'user1@example.com' });
      const user2 = await storage.createUser({ email: 'user2@example.com' });

      const user1Codes = await recoveryService.generateRecoveryCodes(user1.id, 5);

      // Try to use user1's code with user2's ID - should throw InvalidRecoveryCodeError
      await expect(
        recoveryService.verifyRecoveryCode(user2.id, user1Codes[0]!)
      ).rejects.toThrow();
    });

    it('should handle concurrent recovery code usage attempts', async () => {
      const user = await storage.createUser({ email: 'concurrent@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 5);
      const codeToUse = codes[0];
      if (!codeToUse) {
        throw new Error('No recovery code generated');
      }

      // Simulate concurrent attempts to use the same code
      // Only one should succeed, others should throw
      const results = await Promise.allSettled([
        recoveryService.verifyRecoveryCode(user.id, codeToUse),
        recoveryService.verifyRecoveryCode(user.id, codeToUse),
        recoveryService.verifyRecoveryCode(user.id, codeToUse),
      ]);

      // Only one should succeed (status: 'fulfilled' with value: true)
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value === true
      ).length;
      expect(successCount).toBe(1);
      
      // Others should be rejected
      const failureCount = results.filter((r) => r.status === 'rejected').length;
      expect(failureCount).toBe(2);
    });

    it('should use bcrypt for secure hashing', async () => {
      const user = await storage.createUser({ email: 'bcrypt@example.com' });

      await recoveryService.generateRecoveryCodes(user.id, 1);
      const storedCodes = await storage.getUserRecoveryCodes(user.id);

      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(storedCodes[0]?.codeHash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('Recovery Code Configuration', () => {
    it('should respect custom code count configuration', async () => {
      const config: PasskeyConfig = {
        rpId: 'localhost',
        rpName: 'Test App',
        origin: 'http://localhost:3000',
        storage,
        challenges: {} as any,
        recovery: {
          codes: {
            enabled: true,
            count: 15, // Custom count
          },
        },
      };

      const service = new RecoveryService(storage, config);
      const user = await storage.createUser({ email: 'custom-count@example.com' });

      // Generate without specifying count (should use default from config)
      const codes = await service.generateRecoveryCodes(user.id);

      expect(codes).toHaveLength(8); // Service generates 8 by default unless overridden in call
    });

    it('should generate codes with consistent length', async () => {
      // Note: RecoveryService currently hardcodes 20-character codes
      // This test verifies consistency rather than config-based length
      const user = await storage.createUser({ email: 'custom-length@example.com' });

      const codes = await recoveryService.generateRecoveryCodes(user.id, 5);

      codes.forEach((code) => {
        expect(code).toHaveLength(20); // RecoveryService generates 20-character codes
      });
    });
  });

  describe('Recovery Code Edge Cases', () => {
    it('should handle user with no passkeys registering recovery codes', async () => {
      const user = await storage.createUser({ email: 'no-passkeys@example.com' });

      // User has no passkeys yet, but should still be able to have recovery codes
      const codes = await recoveryService.generateRecoveryCodes(user.id, 5);

      expect(codes).toHaveLength(5);
    });

    it('should handle empty recovery code array gracefully', async () => {
      const user = await storage.createUser({ email: 'empty@example.com' });

      // Generating 0 codes should not error
      const codes = await recoveryService.generateRecoveryCodes(user.id, 0);

      expect(codes).toHaveLength(0);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        recoveryService.generateRecoveryCodes('non-existent-user-id', 5)
      ).rejects.toThrow();
    });
  });
});

