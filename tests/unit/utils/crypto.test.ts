import { describe, it, expect } from '@jest/globals';
import {
  generateChallenge,
  generateRecoveryCode,
  generateEmailRecoveryToken,
  hashValue,
  compareHash,
  sha256Hash,
  bufferToBase64url,
  base64urlToBuffer,
} from '../../../src/core/utils/crypto';

describe('Crypto Utilities', () => {
  describe('generateChallenge', () => {
    it('should generate a base64url string', () => {
      const challenge = generateChallenge();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should generate different challenges each time', () => {
      const challenge1 = generateChallenge();
      const challenge2 = generateChallenge();
      expect(challenge1).not.toBe(challenge2);
    });

    it('should respect length parameter', () => {
      const challenge16 = generateChallenge(16);
      const challenge32 = generateChallenge(32);
      // Base64url encoding: 16 bytes = ~22 chars, 32 bytes = ~43 chars
      expect(challenge32.length).toBeGreaterThan(challenge16.length);
    });

    it('should generate valid base64url (no padding)', () => {
      const challenge = generateChallenge();
      expect(challenge).not.toContain('=');
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
    });
  });

  describe('generateRecoveryCode', () => {
    it('should generate a string of specified length', () => {
      const code = generateRecoveryCode(8);
      expect(code).toHaveLength(8);
    });

    it('should generate different codes each time', () => {
      const code1 = generateRecoveryCode(8);
      const code2 = generateRecoveryCode(8);
      expect(code1).not.toBe(code2);
    });

    it('should only contain valid characters (no ambiguous)', () => {
      const code = generateRecoveryCode(100);
      // Should not contain: 0, O, 1, I, l
      expect(code).not.toMatch(/[0O1Il]/);
      // Should only contain: 2-9, A-Z (except I, O)
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
    });

    it('should respect length parameter', () => {
      const code8 = generateRecoveryCode(8);
      const code16 = generateRecoveryCode(16);
      expect(code16.length).toBe(16);
      expect(code8.length).toBe(8);
    });
  });

  describe('generateEmailRecoveryToken', () => {
    it('should generate a hex string', () => {
      const token = generateEmailRecoveryToken();
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate 64-character hex string (32 bytes)', () => {
      const token = generateEmailRecoveryToken();
      expect(token).toHaveLength(64);
    });

    it('should generate different tokens each time', () => {
      const token1 = generateEmailRecoveryToken();
      const token2 = generateEmailRecoveryToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashValue', () => {
    it('should hash a value using bcrypt', async () => {
      const hash = await hashValue('test-value');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).toMatch(/^\$2[aby]\$/); // Bcrypt hash format
    });

    it('should generate different hashes for same value (salt)', async () => {
      const hash1 = await hashValue('test-value');
      const hash2 = await hashValue('test-value');
      // Bcrypt uses random salt, so hashes should differ
      expect(hash1).not.toBe(hash2);
    });

    it('should respect rounds parameter', async () => {
      const hash10 = await hashValue('test-value', 10);
      const hash12 = await hashValue('test-value', 12);
      // Both should be valid bcrypt hashes
      expect(hash10).toMatch(/^\$2[aby]\$/);
      expect(hash12).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('compareHash', () => {
    it('should verify correct value against hash', async () => {
      const value = 'test-value';
      const hash = await hashValue(value);
      const isValid = await compareHash(value, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect value against hash', async () => {
      const value = 'test-value';
      const hash = await hashValue(value);
      const isValid = await compareHash('wrong-value', hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty strings', async () => {
      const hash = await hashValue('');
      const isValid = await compareHash('', hash);
      expect(isValid).toBe(true);
    });
  });

  describe('sha256Hash', () => {
    it('should generate SHA-256 hash', () => {
      const hash = sha256Hash('test-value');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // 64 hex characters
    });

    it('should generate deterministic hashes', () => {
      const hash1 = sha256Hash('test-value');
      const hash2 = sha256Hash('test-value');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different values', () => {
      const hash1 = sha256Hash('value1');
      const hash2 = sha256Hash('value2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = sha256Hash('');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('bufferToBase64url', () => {
    it('should convert Buffer to base64url', () => {
      const buffer = Buffer.from('Hello World');
      const result = bufferToBase64url(buffer);
      expect(typeof result).toBe('string');
      expect(result).not.toContain('=');
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
    });

    it('should handle empty Buffer', () => {
      const buffer = Buffer.from('');
      const result = bufferToBase64url(buffer);
      expect(result).toBe('');
    });
  });

  describe('base64urlToBuffer', () => {
    it('should convert base64url to Buffer', () => {
      const base64url = 'SGVsbG8gV29ybGQ';
      const result = base64urlToBuffer(base64url);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('Hello World');
    });

    it('should handle padding correctly', () => {
      const base64url = 'SGVsbG8'; // No padding
      const result = base64urlToBuffer(base64url);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should round-trip correctly', () => {
      const original = Buffer.from('Hello World');
      const base64url = bufferToBase64url(original);
      const result = base64urlToBuffer(base64url);
      expect(result.toString()).toBe(original.toString());
    });
  });
});
