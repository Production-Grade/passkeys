import { describe, it, expect } from '@jest/globals';
import { createNextPasskeys } from '../../../src/nextjs/route-handler';
import { createMockStorage, createMockChallengeStorage } from '../../../src/testing';

describe('Next.js Storage Error Detection', () => {
  it('should detect storage errors and return 503', async () => {
    const storage = createMockStorage();
    const challenges = createMockChallengeStorage();

    // Create a storage that throws storage-related errors
    const errorStorage = {
      ...storage,
      getUserByEmail: jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      ) as any,
    };

    const handlers = createNextPasskeys({
      rpId: 'example.com',
      rpName: 'Test App',
      origin: 'https://example.com',
      storage: errorStorage as any,
      challenges,
    });

    const mockRequest = {
      nextUrl: {
        pathname: '/api/auth/passkeys/register/start',
        origin: 'https://example.com',
        hostname: 'example.com',
      } as any,
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
      headers: {
        get: jest.fn().mockReturnValue(null),
      } as any,
    } as any;

    const response = await handlers.POST(mockRequest);
    const body = await (response as Response).json();

    // Should detect storage error and return 503
    expect(body.status).toBe(503);
    expect(body.title).toBe('Service Unavailable');
  });

  it('should detect connection timeout errors', async () => {
    const storage = createMockStorage();
    const challenges = createMockChallengeStorage();

    const errorStorage = {
      ...storage,
      getUserByEmail: jest.fn().mockRejectedValue(
        new Error('Connection timeout')
      ),
    };

    const handlers = createNextPasskeys({
      rpId: 'example.com',
      rpName: 'Test App',
      origin: 'https://example.com',
      storage: errorStorage as any,
      challenges,
    });

    const mockRequest = {
      nextUrl: {
        pathname: '/api/auth/passkeys/register/start',
        origin: 'https://example.com',
        hostname: 'example.com',
      } as any,
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
      headers: {
        get: jest.fn().mockReturnValue(null),
      } as any,
    } as any;

    const response = await handlers.POST(mockRequest);
    const body = await (response as Response).json();

    expect(body.status).toBe(503);
  });

  it('should detect ECONNREFUSED errors', async () => {
    const storage = createMockStorage();
    const challenges = createMockChallengeStorage();

    const connectionError: any = new Error('Connection refused');
    connectionError.code = 'ECONNREFUSED';

    const errorStorage = {
      ...storage,
      getUserByEmail: jest.fn().mockRejectedValue(connectionError),
    };

    const handlers = createNextPasskeys({
      rpId: 'example.com',
      rpName: 'Test App',
      origin: 'https://example.com',
      storage: errorStorage as any,
      challenges,
    });

    const mockRequest = {
      nextUrl: {
        pathname: '/api/auth/passkeys/register/start',
        origin: 'https://example.com',
        hostname: 'example.com',
      } as any,
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
      headers: {
        get: jest.fn().mockReturnValue(null),
      } as any,
    } as any;

    const response = await handlers.POST(mockRequest);
    const body = await (response as Response).json();

    expect(body.status).toBe(503);
  });

  it('should detect ETIMEDOUT errors', async () => {
    const storage = createMockStorage();
    const challenges = createMockChallengeStorage();

    const timeoutError: any = new Error('Operation timed out');
    timeoutError.code = 'ETIMEDOUT';

    const errorStorage = {
      ...storage,
      getUserByEmail: jest.fn().mockRejectedValue(timeoutError),
    };

    const handlers = createNextPasskeys({
      rpId: 'example.com',
      rpName: 'Test App',
      origin: 'https://example.com',
      storage: errorStorage as any,
      challenges,
    });

    const mockRequest = {
      nextUrl: {
        pathname: '/api/auth/passkeys/register/start',
        origin: 'https://example.com',
        hostname: 'example.com',
      } as any,
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
      headers: {
        get: jest.fn().mockReturnValue(null),
      } as any,
    } as any;

    const response = await handlers.POST(mockRequest);
    const body = await (response as Response).json();

    expect(body.status).toBe(503);
  });
});

