import { describe, it, expect, jest } from '@jest/globals';
import { requireAuth, errorHandler } from '../../../src/express/middleware';
import { AuthenticationError } from '../../../src/core/types/errors';

describe('Express Middleware', () => {
  describe('requireAuth', () => {
    it('should pass if user is authenticated', () => {
      const mockReq = {
        user: { id: 'user-123' },
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;
      const mockNext = jest.fn();

      requireAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      const mockReq = {
        user: undefined,
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;
      const mockNext = jest.fn();

      requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('UNAUTHORIZED'),
          status: 401,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('should handle PasskeyError and convert to RFC 7807 format', () => {
      const mockReq = {} as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;
      const mockNext = jest.fn();

      const error = new AuthenticationError('Test error', { test: 'detail' });

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          title: expect.any(String),
          status: 401,
          detail: 'Test error',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle generic Error and convert to RFC 7807 format', () => {
      const mockReq = {} as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;
      const mockNext = jest.fn();

      const error = new Error('Generic error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('INTERNAL_ERROR'),
          title: 'Internal Server Error',
          status: 500,
          detail: 'Generic error',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle Error without message', () => {
      const mockReq = {} as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;
      const mockNext = jest.fn();

      const error = new Error();

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('INTERNAL_ERROR'),
          title: 'Internal Server Error',
          status: 500,
          detail: 'An unexpected error occurred',
        })
      );
    });
  });
});

