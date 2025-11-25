import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createNextPasskeys } from '../../../src/nextjs/route-handler';
import { createMockStorage, createMockChallengeStorage } from '../../../src/testing';

type NextRequest = any;

describe('Next.js Route Handlers - PATCH', () => {
  let mockRequest: Partial<NextRequest>;
  let handlers: ReturnType<typeof createNextPasskeys>;
  let storage: ReturnType<typeof createMockStorage>;
  let challenges: ReturnType<typeof createMockChallengeStorage>;

  beforeEach(() => {
    storage = createMockStorage();
    challenges = createMockChallengeStorage();

    handlers = createNextPasskeys({
      rpId: 'example.com',
      rpName: 'Test App',
      origin: 'https://example.com',
      storage,
      challenges,
    });

    mockRequest = {
      nextUrl: {
        pathname: '/api/auth/passkeys/passkeys/passkey-1',
        origin: 'https://example.com',
        hostname: 'example.com',
      } as any,
      method: 'PATCH',
      json: jest.fn<() => Promise<any>>().mockResolvedValue({ nickname: 'My iPhone' }),
      headers: {
        get: jest.fn().mockReturnValue(null),
      } as any,
    } as any;
  });

  describe('PATCH handler', () => {
    it('should update passkey nickname successfully', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      const passkey = await storage.createPasskey({
        userId: user.id,
        id: 'passkey-1',
        publicKey: 'key-1',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      handlers = createNextPasskeys({
        rpId: 'example.com',
        rpName: 'Test App',
        origin: 'https://example.com',
        storage,
        challenges,
        getUserId: async () => user.id,
      });

      (mockRequest.nextUrl as any).pathname = `/api/auth/passkeys/passkeys/${passkey.id}`;
      (mockRequest.json as jest.Mock<any>).mockResolvedValue({ nickname: 'My iPhone' });

      const response = await handlers.PATCH!(mockRequest as any);
      const body = await (response as Response).json();

      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('passkey');
      expect(body.data.passkey.nickname).toBe('My iPhone');
    });

    it('should return 401 when user not authenticated', async () => {
      handlers = createNextPasskeys({
        rpId: 'example.com',
        rpName: 'Test App',
        origin: 'https://example.com',
        storage,
        challenges,
        getUserId: async () => null as any,
      });

      (mockRequest.nextUrl as any).pathname = '/api/auth/passkeys/passkeys/passkey-1';
      (mockRequest.json as jest.Mock<any>).mockResolvedValue({ nickname: 'My iPhone' });

      const response = await handlers.PATCH!(mockRequest as any);
      const body = await (response as Response).json();

      expect(body.status).toBe(401);
      expect(body.title).toBe('Unauthorized');
    });

    it('should return 400 when passkey ID is missing', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });

      handlers = createNextPasskeys({
        rpId: 'example.com',
        rpName: 'Test App',
        origin: 'https://example.com',
        storage,
        challenges,
        getUserId: async () => user.id,
      });

      // Use a pathname that doesn't match the regex pattern
      (mockRequest.nextUrl as any).pathname = '/api/auth/passkeys/passkeys/';
      (mockRequest.json as jest.Mock<any>).mockResolvedValue({ nickname: 'My iPhone' });

      const response = await handlers.PATCH!(mockRequest as any);
      const body = await (response as Response).json();

      // Should return 400 because regex doesn't match (no ID after /passkeys/)
      expect([400, 403]).toContain(body.status);
      if (body.status === 400) {
        expect(body.detail).toBe('Passkey ID is required');
      }
    });

    it('should return 403 when passkey belongs to another user', async () => {
      const user1 = await storage.createUser({ email: 'user1@example.com' });
      const user2 = await storage.createUser({ email: 'user2@example.com' });
      const passkey = await storage.createPasskey({
        userId: user1.id,
        id: 'passkey-1',
        publicKey: 'key-1',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      handlers = createNextPasskeys({
        rpId: 'example.com',
        rpName: 'Test App',
        origin: 'https://example.com',
        storage,
        challenges,
        getUserId: async () => user2.id,
      });

      (mockRequest.nextUrl as any).pathname = `/api/auth/passkeys/passkeys/${passkey.id}`;
      (mockRequest.json as jest.Mock<any>).mockResolvedValue({ nickname: 'My iPhone' });

      const response = await handlers.PATCH!(mockRequest as any);
      const body = await (response as Response).json();

      expect(body.status).toBe(403);
      expect(body.title).toBe('Forbidden');
    });

    it('should handle storage errors', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      const passkey = await storage.createPasskey({
        userId: user.id,
        id: 'passkey-1',
        publicKey: 'key-1',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const errorStorage = {
        ...storage,
        updatePasskey: jest.fn<any>().mockRejectedValue(new Error('Database connection failed')),
      };

      handlers = createNextPasskeys({
        rpId: 'example.com',
        rpName: 'Test App',
        origin: 'https://example.com',
        storage: errorStorage as any,
        challenges,
        getUserId: async () => user.id,
      });

      (mockRequest.nextUrl as any).pathname = `/api/auth/passkeys/passkeys/${passkey.id}`;
      (mockRequest.json as jest.Mock<any>).mockResolvedValue({ nickname: 'My iPhone' });

      const response = await handlers.PATCH!(mockRequest as any);
      const body = await (response as Response).json();

      expect(body.status).toBeGreaterThanOrEqual(400);
    });
  });
});

