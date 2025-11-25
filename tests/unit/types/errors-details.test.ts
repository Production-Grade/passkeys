import { describe, it, expect } from '@jest/globals';
import {
  PasskeyError,
  AuthenticationError,
  RegistrationError,
} from '../../../src/core/types/errors';

describe('Error Details and Problem Details', () => {
  describe('PasskeyError.toProblemDetails', () => {
    it('should convert error to Problem Details format without details', () => {
      const error = new PasskeyError('Test error', 'TEST_ERROR', 400);
      const problemDetails = error.toProblemDetails();

      expect(problemDetails.type).toBe('https://productiongrade.dev/errors/TEST_ERROR');
      expect(problemDetails.title).toBe('PasskeyError');
      expect(problemDetails.status).toBe(400);
      expect(problemDetails.detail).toBe('Test error');
      // Details should not be spread when undefined
      expect(Object.keys(problemDetails).length).toBe(4);
    });

    it('should convert error to Problem Details format with details', () => {
      const error = new PasskeyError('Test error', 'TEST_ERROR', 400, {
        field: 'value',
        nested: { data: 'test' },
      });
      const problemDetails = error.toProblemDetails();

      expect(problemDetails.type).toBe('https://productiongrade.dev/errors/TEST_ERROR');
      expect(problemDetails.title).toBe('PasskeyError');
      expect(problemDetails.status).toBe(400);
      expect(problemDetails.detail).toBe('Test error');
      expect((problemDetails as any).field).toBe('value');
      expect((problemDetails as any).nested).toEqual({ data: 'test' });
    });

    it('should handle undefined details', () => {
      const error = new PasskeyError('Test error', 'TEST_ERROR', 400, undefined);
      const problemDetails = error.toProblemDetails();

      expect(problemDetails).not.toHaveProperty('details');
      expect(problemDetails.detail).toBe('Test error');
    });
  });

  describe('AuthenticationError with troubleshooting details', () => {
    it('should include troubleshooting information in details', () => {
      const error = new AuthenticationError('Auth failed', {
        troubleshooting: 'https://example.com/help',
        commonCauses: ['Wrong password', 'Expired session'],
        solutions: ['Try again', 'Clear cache'],
      });

      expect(error.details).toBeDefined();
      expect((error.details as any).troubleshooting).toBe('https://example.com/help');
      expect((error.details as any).commonCauses).toEqual(['Wrong password', 'Expired session']);
      expect((error.details as any).solutions).toEqual(['Try again', 'Clear cache']);
    });
  });

  describe('RegistrationError with troubleshooting details', () => {
    it('should include troubleshooting information in details', () => {
      const error = new RegistrationError('Registration failed', {
        troubleshooting: 'https://example.com/help',
        commonCauses: ['Invalid email'],
        solutions: ['Use valid email'],
      });

      expect(error.details).toBeDefined();
      expect((error.details as any).troubleshooting).toBe('https://example.com/help');
    });
  });
});

