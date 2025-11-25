import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createNextPasskeys } from '../../../src/nextjs/route-handler';
import { createMockStorage, createMockChallengeStorage } from '../../../src/testing';

// Mock Next.js types
type NextRequest = {
  nextUrl: {
    pathname: string;
    origin: string;
    hostname: string;
  };
  method: string;
  json: () => Promise<any>;
  headers: {
    get: (name: string) => string | null;
  };
};

describe('Next.js Route Handlers', () => {
  let mockRequest: Partial<NextRequest>;
  let handlers: ReturnType<typeof createNextPasskeys>;

  beforeEach(() => {
    const storage = createMockStorage();
    const challenges = createMockChallengeStorage();

    handlers = createNextPasskeys({
      rpId: 'example.com',
      rpName: 'Test App',
      origin: 'https://example.com',
      storage,
      challenges,
    });

    mockRequest = {
    nextUrl: {
        pathname: '/api/auth/passkeys/register/start',
        origin: 'https://example.com',
        hostname: 'example.com',
      },
      method: 'POST',
      json: jest.fn<() => Promise<any>>().mockResolvedValue({ email: 'test@example.com' }),
      headers: {
        get: jest.fn().mockReturnValue(null),
    },
  } as any;
  });

  describe('POST handler', () => {
    it('should handle registration start', async () => {
      (mockRequest.nextUrl as any).pathname = '/api/auth/passkeys/register/start';

      const response = await handlers.POST(mockRequest as any);

      expect(response).toBeDefined();
      // Response is a NextResponse or Response object
      const body = await (response as any).json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('challenge');
    });

    it('should handle authentication start', async () => {
      const storage = createMockStorage();
      await storage.createUser({ email: 'test@example.com' });

      handlers = createNextPasskeys({
        rpId: 'example.com',
        rpName: 'Test App',
        origin: 'https://example.com',
        storage,
        challenges: createMockChallengeStorage(),
      });

      (mockRequest.nextUrl as any).pathname = '/api/auth/passkeys/authenticate/start';
      (mockRequest.json as jest.Mock<() => Promise<{ email: string }>>).mockResolvedValue({ email: 'test@example.com' });

      const response = await handlers.POST(mockRequest as any);

      expect(response).toBeDefined();
      const body = await (response as any).json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET handler', () => {
    it('should handle get passkeys', async () => {
      const storage = createMockStorage();
      const user = await storage.createUser({ email: 'test@example.com' });

      handlers = createNextPasskeys({
        rpId: 'example.com',
        rpName: 'Test App',
        origin: 'https://example.com',
        storage,
        challenges: createMockChallengeStorage(),
        getUserId: async () => user.id,
      });

      (mockRequest.nextUrl as any).pathname = '/api/auth/passkeys/passkeys';
      (mockRequest.method as any) = 'GET';

      const response = await handlers.GET!(mockRequest as any);

      expect(response).toBeDefined();
      const body = await (response as any).json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('passkeys');
    });
  });

  describe('DELETE handler', () => {
    it('should handle delete passkey', async () => {
      const storage = createMockStorage();
      const user = await storage.createUser({ email: 'test@example.com' });
      // Create two passkeys so we can delete one (can't delete the last passkey)
      const passkey1 = await storage.createPasskey({
        id: 'passkey-1',
        userId: user.id,
        publicKey: 'key-1',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });
      await storage.createPasskey({
        id: 'passkey-2',
        userId: user.id,
        publicKey: 'key-2',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      handlers = createNextPasskeys({
        rpId: 'example.com',
        rpName: 'Test App',
        origin: 'https://example.com',
        storage,
        challenges: createMockChallengeStorage(),
        getUserId: async () => user.id,
      });

      (mockRequest.nextUrl as any).pathname = `/api/auth/passkeys/passkeys/${passkey1.id}`;
      (mockRequest.method as any) = 'DELETE';

      const response = await handlers.DELETE!(mockRequest as any);

      expect(response).toBeDefined();
      // NextResponse.json() returns a Response object
      // We need to parse the response body
      const responseText = await (response as Response).text();
      const body = JSON.parse(responseText);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ deleted: true });
    });
  });
});
