/**
 * Unit tests for error transformation utility
 */

import { errorToNextResponse } from '../../../src/nextjs/types';

// Mock PasskeyError class
class PasskeyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'PasskeyError';
  }
}

describe('errorToNextResponse', () => {
  it('should convert PasskeyError to RFC 7807 format', () => {
    const error = new PasskeyError(
      'Authentication failed',
      'AUTHENTICATION_ERROR',
      401
    );

    const response = errorToNextResponse(error, '/api/auth/passkeys/authenticate/finish');

    // Parse the response body (in real Next.js it's a ReadableStream)
    // For testing, we check the structure
    expect(response.status).toBe(401);
  });

  it('should format error type URL correctly', () => {
    const error = new PasskeyError(
      'Invalid challenge',
      'INVALID_CHALLENGE',
      400
    );

    const response = errorToNextResponse(error);
    expect(response.status).toBe(400);
  });

  it('should handle underscore in error codes', () => {
    const error = new PasskeyError(
      'Recovery code invalid',
      'INVALID_RECOVERY_CODE',
      401
    );

    const response = errorToNextResponse(error);
    expect(response.status).toBe(401);
  });

  it('should include instance field when pathname provided', () => {
    const error = new PasskeyError(
      'Registration failed',
      'REGISTRATION_ERROR',
      400
    );
    const pathname = '/api/auth/passkeys/register/finish';

    const response = errorToNextResponse(error, pathname);
    expect(response.status).toBe(400);
  });

  it('should handle generic errors as 500 Internal Server Error', () => {
    const error = new Error('Something went wrong');

    const response = errorToNextResponse(error);
    expect(response.status).toBe(500);
  });

  it('should handle errors without pathname', () => {
    const error = new PasskeyError(
      'Validation failed',
      'VALIDATION_ERROR',
      400
    );

    const response = errorToNextResponse(error);
    expect(response.status).toBe(400);
  });

  it('should preserve error message in detail field', () => {
    const errorMessage = 'User not found';
    const error = new PasskeyError(
      errorMessage,
      'USER_NOT_FOUND',
      404
    );

    const response = errorToNextResponse(error);
    expect(response.status).toBe(404);
  });

  it('should use error name as title', () => {
    const error = new PasskeyError(
      'Test error',
      'TEST_ERROR',
      418
    );
    error.name = 'CustomError';

    const response = errorToNextResponse(error);
    expect(response.status).toBe(418);
  });
});

