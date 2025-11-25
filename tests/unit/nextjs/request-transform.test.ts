/**
 * Unit tests for request transformation utility
 */

import { transformRequest } from '../../../src/nextjs/types';
import type { NextPasskeyConfig, NextRequest } from '../../../src/nextjs/types';

// Mock Next.js Request
function createMockRequest(options: {
  method: string;
  pathname: string;
  origin: string;
  body?: any;
}): NextRequest {
  const url = new URL(options.pathname, options.origin);
  
  return {
    method: options.method,
    nextUrl: {
      pathname: options.pathname,
      origin: options.origin,
      href: url.href,
    },
    json: async () => options.body,
    headers: new Headers(),
  } as any;
}

describe('transformRequest', () => {
  const mockConfig: NextPasskeyConfig = {
    rpId: 'localhost',
    rpName: 'Test App',
    origin: 'http://localhost:3000',
    storage: {} as any,
    challenges: {} as any,
  };

  it('should extract body, pathname, origin, and method from POST request', async () => {
    const mockBody = { email: 'test@example.com' };
    const request = createMockRequest({
      method: 'POST',
      pathname: '/api/auth/passkeys/register/start',
      origin: 'http://localhost:3000',
      body: mockBody,
    });

    const result = await transformRequest(request, mockConfig);

    expect(result.body).toEqual(mockBody);
    expect(result.pathname).toBe('/api/auth/passkeys/register/start');
    expect(result.origin).toBe('http://localhost:3000');
    expect(result.method).toBe('POST');
    expect(result.userId).toBeNull();
  });

  it('should not parse body for GET requests', async () => {
    const request = createMockRequest({
      method: 'GET',
      pathname: '/api/auth/passkeys/passkeys',
      origin: 'http://localhost:3000',
    });

    const result = await transformRequest(request, mockConfig);

    expect(result.body).toBeUndefined();
    expect(result.pathname).toBe('/api/auth/passkeys/passkeys');
    expect(result.method).toBe('GET');
  });

  it('should not parse body for DELETE requests', async () => {
    const request = createMockRequest({
      method: 'DELETE',
      pathname: '/api/auth/passkeys/passkeys/123',
      origin: 'http://localhost:3000',
    });

    const result = await transformRequest(request, mockConfig);

    expect(result.body).toBeUndefined();
    expect(result.method).toBe('DELETE');
  });

  it('should call getUserId callback if provided', async () => {
    const mockUserId = 'user-123';
    const getUserId = jest.fn().mockResolvedValue(mockUserId);
    
    const configWithCallback: NextPasskeyConfig = {
      ...mockConfig,
      getUserId,
    };

    const request = createMockRequest({
      method: 'GET',
      pathname: '/api/auth/passkeys/passkeys',
      origin: 'http://localhost:3000',
    });

    const result = await transformRequest(request, configWithCallback);

    expect(getUserId).toHaveBeenCalledWith(request);
    expect(result.userId).toBe(mockUserId);
  });

  it('should return null userId if getUserId callback returns null', async () => {
    const getUserId = jest.fn().mockResolvedValue(null);
    
    const configWithCallback: NextPasskeyConfig = {
      ...mockConfig,
      getUserId,
    };

    const request = createMockRequest({
      method: 'GET',
      pathname: '/api/auth/passkeys/passkeys',
      origin: 'http://localhost:3000',
    });

    const result = await transformRequest(request, configWithCallback);

    expect(result.userId).toBeNull();
  });

  it('should handle synchronous getUserId callback', async () => {
    const mockUserId = 'user-456';
    const getUserId = jest.fn().mockReturnValue(mockUserId); // Synchronous
    
    const configWithCallback: NextPasskeyConfig = {
      ...mockConfig,
      getUserId,
    };

    const request = createMockRequest({
      method: 'GET',
      pathname: '/api/auth/passkeys/passkeys',
      origin: 'http://localhost:3000',
    });

    const result = await transformRequest(request, configWithCallback);

    expect(result.userId).toBe(mockUserId);
  });

  it('should handle invalid JSON gracefully', async () => {
    const request = {
      method: 'POST',
      nextUrl: {
        pathname: '/api/auth/passkeys/register/start',
        origin: 'http://localhost:3000',
      },
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as any;

    const result = await transformRequest(request, mockConfig);

    expect(result.body).toBeUndefined();
  });
});

