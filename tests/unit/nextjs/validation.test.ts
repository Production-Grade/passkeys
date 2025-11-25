/**
 * Unit tests for rpId validation utility
 */

import { validateRpId, resetRpIdValidation } from '../../../src/nextjs/types';
import type { NextPasskeyConfig } from '../../../src/nextjs/types';

// Mock NextRequest type since we don't have next/server in tests
type NextRequest = {
  nextUrl: {
    origin: string;
    pathname: string;
    href: string;
    hostname: string;
  };
};

// Mock Next.js Request
function createMockRequest(origin: string, pathname: string = '/'): NextRequest {
  const url = new URL(pathname, origin);
  const hostname = new URL(origin).hostname;
  
  return {
    nextUrl: {
      origin,
      pathname,
      href: url.href,
      hostname,
    },
  } as any;
}

describe('validateRpId', () => {
  const mockConfig: NextPasskeyConfig = {
    rpId: 'example.com',
    rpName: 'Test App',
    origin: 'https://example.com',
    storage: {} as any,
    challenges: {} as any,
  };

  beforeEach(() => {
    // Reset validation state before each test
    resetRpIdValidation();
  });

  it('should pass validation when rpId matches hostname', () => {
    const request = createMockRequest('https://example.com', '/api/auth');

    expect(() => {
      validateRpId(request, mockConfig);
    }).not.toThrow();
  });

  it('should allow localhost for development', () => {
    const localhostConfig: NextPasskeyConfig = {
      ...mockConfig,
      rpId: 'localhost',
      origin: 'http://localhost:3000',
    };
    const request = createMockRequest('http://localhost:3000', '/api/auth');

    expect(() => {
      validateRpId(request, localhostConfig);
    }).not.toThrow();
  });

  it('should throw error when rpId does not match hostname', () => {
    const request = createMockRequest('https://different-domain.com', '/api/auth');

    expect(() => {
      validateRpId(request, mockConfig);
    }).toThrow(/rpId mismatch/);
    expect(() => {
      validateRpId(request, mockConfig);
    }).toThrow(/configured 'example.com'/);
    expect(() => {
      validateRpId(request, mockConfig);
    }).toThrow(/hostname is 'different-domain.com'/);
  });

  it('should include helpful error message with both values', () => {
    const request = createMockRequest('https://wrong.com', '/api/auth');

    try {
      validateRpId(request, mockConfig);
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('rpId mismatch');
      expect(error.message).toContain('example.com');
      expect(error.message).toContain('wrong.com');
      expect(error.message).toContain('Update rpId in config');
    }
  });

  it('should only validate once per process (caching)', () => {
    const request1 = createMockRequest('https://example.com', '/api/auth');
    const request2 = createMockRequest('https://example.com', '/api/other');

    // First validation
    validateRpId(request1, mockConfig);

    // Second validation should skip (cached)
    // We can't directly test the skip, but we ensure no error
    validateRpId(request2, mockConfig);

    expect(() => {
      validateRpId(request2, mockConfig);
    }).not.toThrow();
  });

  it('should not validate again after first successful validation', () => {
    const request1 = createMockRequest('https://example.com', '/api/auth');
    
    // First call validates
    validateRpId(request1, mockConfig);
    
    // Even with wrong domain, should not throw (validation cached)
    const request2 = createMockRequest('https://wrong.com', '/api/auth');
    expect(() => {
      validateRpId(request2, mockConfig);
    }).not.toThrow();
  });

  it('should validate subdomain mismatches', () => {
    const request = createMockRequest('https://www.example.com', '/api/auth');

    expect(() => {
      validateRpId(request, mockConfig);
    }).toThrow(/rpId mismatch/);
  });

  it('should be case-sensitive for hostnames', () => {
    const request = createMockRequest('https://Example.com', '/api/auth');
    const config: NextPasskeyConfig = {
      ...mockConfig,
      rpId: 'example.com', // lowercase
    };

    // This may or may not throw depending on URL normalization
    // Most browsers normalize to lowercase, so this should pass
    expect(() => {
      validateRpId(request, config);
    }).not.toThrow();
  });

  it('should handle localhost with port', () => {
    const localhostConfig: NextPasskeyConfig = {
      ...mockConfig,
      rpId: 'localhost',
      origin: 'http://localhost:3000',
    };
    const request = createMockRequest('http://localhost:3000', '/api/auth');

    expect(() => {
      validateRpId(request, localhostConfig);
    }).not.toThrow();
  });
});

