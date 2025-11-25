import {
  isPasskeyError,
  isAuthenticationError,
  isRegistrationError,
  isValidationError,
  isUserNotFoundError,
  isPasskeyNotFoundError,
  isCounterAnomalyError,
  isRecoveryError,
  isInvalidRecoveryCodeError,
  isInvalidRecoveryTokenError,
  isInvalidChallengeError,
  getErrorDetails,
} from '../../../src/core/utils/type-guards';
import {
  PasskeyError,
  AuthenticationError,
  RegistrationError,
  ValidationError,
  UserNotFoundError,
  PasskeyNotFoundError,
  CounterAnomalyError,
  RecoveryError,
  InvalidRecoveryCodeError,
  InvalidRecoveryTokenError,
  InvalidChallengeError,
} from '../../../src/core/types/errors';

describe('Type Guards', () => {
  describe('isPasskeyError', () => {
    it('should return true for PasskeyError', () => {
      const error = new PasskeyError('Test error', 'TEST_ERROR', 400);
      expect(isPasskeyError(error)).toBe(true);
    });

    it('should return false for non-PasskeyError', () => {
      expect(isPasskeyError(new Error('Regular error'))).toBe(false);
      expect(isPasskeyError('string')).toBe(false);
      expect(isPasskeyError(null)).toBe(false);
      expect(isPasskeyError(undefined)).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('should return true for AuthenticationError', () => {
      const error = new AuthenticationError('Auth failed');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isAuthenticationError(new RegistrationError('Reg failed'))).toBe(false);
      expect(isAuthenticationError(new Error('Regular error'))).toBe(false);
    });
  });

  describe('isRegistrationError', () => {
    it('should return true for RegistrationError', () => {
      const error = new RegistrationError('Reg failed');
      expect(isRegistrationError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isRegistrationError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for ValidationError', () => {
      const error = new ValidationError('Invalid input');
      expect(isValidationError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isValidationError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('isUserNotFoundError', () => {
    it('should return true for UserNotFoundError', () => {
      const error = new UserNotFoundError('user@example.com');
      expect(isUserNotFoundError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isUserNotFoundError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('isPasskeyNotFoundError', () => {
    it('should return true for PasskeyNotFoundError', () => {
      const error = new PasskeyNotFoundError('credential-id');
      expect(isPasskeyNotFoundError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isPasskeyNotFoundError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('isCounterAnomalyError', () => {
    it('should return true for CounterAnomalyError', () => {
      const error = new CounterAnomalyError(5, 3);
      expect(isCounterAnomalyError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isCounterAnomalyError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('isRecoveryError', () => {
    it('should return true for RecoveryError', () => {
      const error = new RecoveryError('Recovery failed', 'RECOVERY_ERROR');
      expect(isRecoveryError(error)).toBe(true);
    });

    it('should return true for InvalidRecoveryCodeError', () => {
      const error = new InvalidRecoveryCodeError();
      expect(isRecoveryError(error)).toBe(true);
    });

    it('should return true for InvalidRecoveryTokenError', () => {
      const error = new InvalidRecoveryTokenError();
      expect(isRecoveryError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isRecoveryError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('isInvalidRecoveryCodeError', () => {
    it('should return true for InvalidRecoveryCodeError', () => {
      const error = new InvalidRecoveryCodeError();
      expect(isInvalidRecoveryCodeError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isInvalidRecoveryCodeError(new InvalidRecoveryTokenError())).toBe(false);
      expect(isInvalidRecoveryCodeError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('isInvalidRecoveryTokenError', () => {
    it('should return true for InvalidRecoveryTokenError', () => {
      const error = new InvalidRecoveryTokenError();
      expect(isInvalidRecoveryTokenError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isInvalidRecoveryTokenError(new InvalidRecoveryCodeError())).toBe(false);
      expect(isInvalidRecoveryTokenError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('isInvalidChallengeError', () => {
    it('should return true for InvalidChallengeError', () => {
      const error = new InvalidChallengeError();
      expect(isInvalidChallengeError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isInvalidChallengeError(new AuthenticationError('Auth failed'))).toBe(false);
    });
  });

  describe('getErrorDetails', () => {
    it('should extract details from PasskeyError', () => {
      const error = new AuthenticationError('Auth failed', { userId: '123' });
      const details = getErrorDetails(error);

      expect(details).toEqual({
        code: 'AUTHENTICATION_FAILED',
        message: 'Auth failed',
        statusCode: 401,
        details: { userId: '123' },
      });
    });

    it('should handle error without details', () => {
      const error = new AuthenticationError('Auth failed');
      const details = getErrorDetails(error);

      expect(details).toEqual({
        code: 'AUTHENTICATION_FAILED',
        message: 'Auth failed',
        statusCode: 401,
      });
    });

    it('should return null for non-PasskeyError', () => {
      expect(getErrorDetails(new Error('Regular error'))).toBeNull();
      expect(getErrorDetails('string')).toBeNull();
      expect(getErrorDetails(null)).toBeNull();
      expect(getErrorDetails(undefined)).toBeNull();
    });
  });
});

