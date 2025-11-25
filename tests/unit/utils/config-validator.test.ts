import { validatePasskeyConfig, assertValidConfig } from '../../../src/core/utils/config-validator';
import { ValidationError } from '../../../src/core/types/errors';
import { createMockStorage, createMockChallengeStorage } from '../../../src/testing';

describe('Config Validator', () => {
  const baseConfig = {
    rpId: 'example.com',
    rpName: 'Test App',
    origin: 'https://example.com',
    storage: createMockStorage(),
    challenges: createMockChallengeStorage(),
  };

  describe('validatePasskeyConfig', () => {
    it('should validate correct config', () => {
      const result = validatePasskeyConfig(baseConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require rpId', () => {
      const result = validatePasskeyConfig({ ...baseConfig, rpId: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rpId is required');
    });

    it('should validate rpId format', () => {
      const result = validatePasskeyConfig({ ...baseConfig, rpId: 'invalid..domain' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid rpId'))).toBe(true);
    });

    it('should require rpName', () => {
      const result1 = validatePasskeyConfig({ ...baseConfig, rpName: '' });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('rpName'))).toBe(true);
      
      const result2 = validatePasskeyConfig({ ...baseConfig, rpName: undefined as any });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('rpName is required');
    });

    it('should warn about long rpName', () => {
      const longName = 'a'.repeat(65);
      const result = validatePasskeyConfig({ ...baseConfig, rpName: longName });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('longer than recommended'))).toBe(true);
    });

    it('should require origin', () => {
      const result = validatePasskeyConfig({ ...baseConfig, origin: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('origin is required');
    });

    it('should validate origin format', () => {
      const result = validatePasskeyConfig({ ...baseConfig, origin: 'not-a-url' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid origin'))).toBe(true);
    });

    it('should warn about origin/rpId mismatch', () => {
      const result = validatePasskeyConfig({
        ...baseConfig,
        rpId: 'example.com',
        origin: 'https://other.com',
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('does not match rpId'))).toBe(true);
    });

    it('should require storage', () => {
      const result = validatePasskeyConfig({ ...baseConfig, storage: null as any });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('storage is required');
    });

    it('should validate storage methods', () => {
      const incompleteStorage = {
        createUser: jest.fn(),
        // Missing other methods
      };
      const result = validatePasskeyConfig({
        ...baseConfig,
        storage: incompleteStorage as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('storage.'))).toBe(true);
    });

    it('should require challenges', () => {
      const result = validatePasskeyConfig({ ...baseConfig, challenges: null as any });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('challenges is required');
    });

    it('should validate challenge storage methods', () => {
      const incompleteChallenges = {
        createChallenge: jest.fn(),
        // Missing other methods
      };
      const result = validatePasskeyConfig({
        ...baseConfig,
        challenges: incompleteChallenges as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('challenges.'))).toBe(true);
    });

    it('should validate timeout', () => {
      const result1 = validatePasskeyConfig({ ...baseConfig, timeout: -1 });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('timeout'))).toBe(true);

      const result2 = validatePasskeyConfig({ ...baseConfig, timeout: 5000 });
      expect(result2.valid).toBe(true);
      expect(result2.warnings.some(w => w.includes('less than 10 seconds'))).toBe(true);

      const result3 = validatePasskeyConfig({ ...baseConfig, timeout: 400000 });
      expect(result3.valid).toBe(true);
      expect(result3.warnings.some(w => w.includes('greater than 5 minutes'))).toBe(true);
    });

    it('should validate userVerification', () => {
      const result = validatePasskeyConfig({
        ...baseConfig,
        userVerification: 'invalid' as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('userVerification'))).toBe(true);
    });

    it('should validate attestationType', () => {
      const result = validatePasskeyConfig({
        ...baseConfig,
        attestationType: 'invalid' as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('attestationType'))).toBe(true);
    });

    it('should validate recovery codes config', () => {
      const result1 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          codes: {
            enabled: 'not-boolean' as any,
          },
        },
      });
      expect(result1.valid).toBe(false);

      const result2 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          codes: {
            enabled: true,
            count: -1,
          },
        },
      });
      expect(result2.valid).toBe(false);

      const result3 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          codes: {
            enabled: true,
            count: 25,
          },
        },
      });
      expect(result3.valid).toBe(true);
      expect(result3.warnings.some(w => w.includes('greater than 20'))).toBe(true);
    });

    it('should validate email recovery config', () => {
      const result1 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          email: {
            enabled: true,
            sendEmail: 'not-function' as any,
          },
        },
      });
      expect(result1.valid).toBe(false);

      const result2 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          email: {
            enabled: true,
            sendEmail: jest.fn(),
            tokenTTL: -1,
          },
        },
      });
      expect(result2.valid).toBe(false);

      const result3 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          email: {
            enabled: true,
            sendEmail: jest.fn(),
            tokenTTL: 2,
          },
        },
      });
      expect(result3.valid).toBe(true);
      expect(result3.warnings.some(w => w.includes('less than 5 minutes'))).toBe(true);

      const result4 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          email: {
            enabled: true,
            sendEmail: jest.fn(),
            tokenTTL: 2000,
          },
        },
      });
      expect(result4.valid).toBe(true);
      expect(result4.warnings.some(w => w.includes('greater than 24 hours'))).toBe(true);
    });

    it('should warn about recovery code length', () => {
      const result1 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          codes: {
            enabled: true,
            length: 4,
          },
        },
      });
      expect(result1.valid).toBe(true);
      expect(result1.warnings.some(w => w.includes('less than 6'))).toBe(true);

      const result2 = validatePasskeyConfig({
        ...baseConfig,
        recovery: {
          codes: {
            enabled: true,
            length: 25,
          },
        },
      });
      expect(result2.valid).toBe(true);
      expect(result2.warnings.some(w => w.includes('greater than 20'))).toBe(true);
    });
  });

  describe('assertValidConfig', () => {
    it('should not throw for valid config', () => {
      expect(() => assertValidConfig(baseConfig)).not.toThrow();
    });

    it('should throw ValidationError for invalid config', () => {
      expect(() => {
        assertValidConfig({ ...baseConfig, rpId: '' });
      }).toThrow(ValidationError);
    });

    it('should include errors in thrown ValidationError', () => {
      try {
        assertValidConfig({ ...baseConfig, rpId: '' });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details?.errors).toBeDefined();
      }
    });
  });
});

