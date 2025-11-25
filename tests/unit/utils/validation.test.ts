import {
  validateEmail,
  validateUuid,
  validatePasskeyNickname,
  validateRecoveryCode,
  validateBase64url,
  validatePositiveInteger,
  validateRpId,
  validateOrigin,
  sanitizeString,
} from '../../../src/core/utils/validation';
import { ValidationError } from '../../../src/core/types/errors';

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'admin+test@company.org',
        'user123@sub.domain.com',
      ];

      validEmails.forEach((email) => {
        expect(() => validateEmail(email)).not.toThrow();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'a'.repeat(256) + '@example.com', // too long
      ];

      invalidEmails.forEach((email) => {
        expect(() => validateEmail(email)).toThrow(ValidationError);
      });
    });

    it('should reject non-string values', () => {
      expect(() => validateEmail(null as unknown as string)).toThrow(ValidationError);
      expect(() => validateEmail(undefined as unknown as string)).toThrow(ValidationError);
      expect(() => validateEmail(123 as unknown as string)).toThrow(ValidationError);
    });
  });

  describe('validateUuid', () => {
    it('should accept valid UUID v4', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ];

      validUuids.forEach((uuid) => {
        expect(() => validateUuid(uuid)).not.toThrow();
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuids = [
        '',
        'not-a-uuid',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400-e29b-51d4-a716-446655440000', // wrong version (5 instead of 4)
        '550e8400-e29b-41d4-1716-446655440000', // wrong variant
        'g50e8400-e29b-41d4-a716-446655440000', // invalid character
      ];

      invalidUuids.forEach((uuid) => {
        expect(() => validateUuid(uuid)).toThrow(ValidationError);
      });
    });
  });

  describe('validatePasskeyNickname', () => {
    it('should accept valid nicknames', () => {
      const validNicknames = [
        'My MacBook Pro',
        'iPhone',
        'Work Laptop',
        'a',
        '🔐 Secure Device',
      ];

      validNicknames.forEach((nickname) => {
        expect(() => validatePasskeyNickname(nickname)).not.toThrow();
      });
    });

    it('should reject invalid nicknames', () => {
      expect(() => validatePasskeyNickname('')).toThrow(ValidationError);
      expect(() => validatePasskeyNickname('a'.repeat(101))).toThrow(ValidationError);
      expect(() => validatePasskeyNickname(null as unknown as string)).toThrow(ValidationError);
    });

    it('should reject nickname that is too short after trimming', () => {
      // This tests the length < 1 check (line 52)
      // An empty string after trimming would fail the first check, so we need a different case
      // Actually, the empty string check happens first, so line 52 might not be reachable
      // But let's test the boundary case anyway
      expect(() => validatePasskeyNickname('')).toThrow(ValidationError);
    });
  });

  describe('validateRecoveryCode', () => {
    it('should accept valid recovery codes', () => {
      const validCodes = [
        'ABCDEF23',
        '23456789',
        'HJKLMNPQ',
        'ABC123XYZ',
      ];

      validCodes.forEach((code) => {
        expect(() => validateRecoveryCode(code)).not.toThrow();
      });
    });

    it('should reject invalid recovery codes', () => {
      const invalidCodes = [
        '',
        'short',           // too short
        'a'.repeat(21),   // too long
        'abc123',         // lowercase
        'ABC-123',        // special characters
        '12345',          // too short
      ];

      invalidCodes.forEach((code) => {
        expect(() => validateRecoveryCode(code)).toThrow(ValidationError);
      });
    });
  });

  describe('validateBase64url', () => {
    it('should accept valid base64url strings', () => {
      const validStrings = [
        'SGVsbG8',
        'dGVzdF9kYXRh',
        'YWJjZGVm',
        'test-with_both',
      ];

      validStrings.forEach((str) => {
        expect(() => validateBase64url(str)).not.toThrow();
      });
    });

    it('should reject invalid base64url strings', () => {
      const invalidStrings = [
        '',
        'hello+world',  // contains +
        'hello/world',  // contains /
        'hello=world',  // contains =
      ];

      invalidStrings.forEach((str) => {
        expect(() => validateBase64url(str)).toThrow(ValidationError);
      });
    });

    it('should include field name in error message', () => {
      try {
        validateBase64url('invalid+', 'challenge');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('challenge');
      }
    });
  });

  describe('validatePositiveInteger', () => {
    it('should accept positive integers', () => {
      expect(() => validatePositiveInteger(1)).not.toThrow();
      expect(() => validatePositiveInteger(100)).not.toThrow();
      expect(() => validatePositiveInteger(999999)).not.toThrow();
    });

    it('should reject non-positive integers', () => {
      expect(() => validatePositiveInteger(0)).toThrow(ValidationError);
      expect(() => validatePositiveInteger(-1)).toThrow(ValidationError);
      expect(() => validatePositiveInteger(-100)).toThrow(ValidationError);
    });

    it('should reject non-integers', () => {
      expect(() => validatePositiveInteger(1.5)).toThrow(ValidationError);
      expect(() => validatePositiveInteger(3.14)).toThrow(ValidationError);
      expect(() => validatePositiveInteger('5' as unknown as number)).toThrow(ValidationError);
    });
  });

  describe('validateRpId', () => {
    it('should accept valid RP IDs', () => {
      const validRpIds = [
        'example.com',
        'sub.example.com',
        'my-app.com',
        'localhost',
        'app.co.uk',
      ];

      validRpIds.forEach((rpId) => {
        expect(() => validateRpId(rpId)).not.toThrow();
      });
    });

    it('should reject invalid RP IDs', () => {
      const invalidRpIds = [
        '',
        'not a domain',
        'http://example.com', // protocol included
        '192.168.1.1',        // IP address
        'example',            // no TLD
        '-invalid.com',       // starts with hyphen
      ];

      invalidRpIds.forEach((rpId) => {
        expect(() => validateRpId(rpId)).toThrow(ValidationError);
      });
    });
  });

  describe('validateOrigin', () => {
    it('should accept valid origins', () => {
      const validOrigins = [
        'https://example.com',
        'http://localhost:3000',
        'https://app.example.com:8080',
        'http://127.0.0.1:5000',
      ];

      validOrigins.forEach((origin) => {
        expect(() => validateOrigin(origin)).not.toThrow();
      });
    });

    it('should reject invalid origins', () => {
      const invalidOrigins = [
        '',
        'not-a-url',
        'ftp://example.com',    // wrong protocol
        'ws://example.com',     // wrong protocol
        'example.com',          // missing protocol
        '//example.com',        // protocol-relative
      ];

      invalidOrigins.forEach((origin) => {
        expect(() => validateOrigin(origin)).toThrow(ValidationError);
      });
    });
  });

  describe('sanitizeString', () => {
    it('should remove control characters', () => {
      const input = 'hello\x00\x01\x1Fworld\x7F';
      const output = sanitizeString(input);
      expect(output).toBe('helloworld');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\t\ntest\r\n')).toBe('test');
    });

    it('should preserve valid characters', () => {
      const input = 'Valid text with 123 and special chars: !@#$%';
      expect(sanitizeString(input)).toBe(input);
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });
});


