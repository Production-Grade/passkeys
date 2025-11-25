/**
 * TypeScript type compilation tests
 * These tests verify that types compile correctly and provide proper IntelliSense
 */

import type {
  NextPasskeyConfig,
  NextAuthPasskeyProviderConfig,
  RouteHandlerMethods,
  ErrorResponse,
  SuccessResponse,
  User as _User,
  Passkey as _Passkey,
  PasskeyConfig as _PasskeyConfig,
  PasskeyStorage,
  RecoveryConfig,
  SecurityHooks,
} from '../../../src/nextjs/types';
import { createMockStorage, createMockChallengeStorage } from '../../../src/testing';

// T052: Verify all public types are importable and compile
describe('Type Imports', () => {
  it('should successfully import all public types', () => {
    // This test passes if TypeScript compilation succeeds
    // No runtime assertions needed - this is a compile-time test
    expect(true).toBe(true);
  });
});

describe('NextPasskeyConfig Type', () => {
  it('should accept valid configuration', () => {
    const mockStorage = createMockStorage();
    const mockChallenges = createMockChallengeStorage();

    const validConfig: NextPasskeyConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: mockStorage,
      challenges: mockChallenges,
    };

    expect(validConfig).toBeDefined();
  });

  it('should accept optional getUserId callback', () => {
    const mockStorage = {} as PasskeyStorage;
    const mockChallenges = createMockChallengeStorage();

    const configWithCallback: NextPasskeyConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: mockStorage,
      challenges: mockChallenges,
      getUserId: async (_request) => {
        return 'user-123'; // Can return string
      },
    };

    const configWithSyncCallback: NextPasskeyConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: mockStorage,
      challenges: mockChallenges,
      getUserId: (_request) => {
        return 'user-123'; // Can return synchronously
      },
    };

    const configWithNullReturn: NextPasskeyConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: mockStorage,
      challenges: mockChallenges,
      getUserId: (_request) => null, // Can return null
    };

    expect(configWithCallback).toBeDefined();
    expect(configWithSyncCallback).toBeDefined();
    expect(configWithNullReturn).toBeDefined();
  });

  it('should extend PasskeyConfig', () => {
    // NextPasskeyConfig should be compatible with PasskeyConfig
    const mockStorage = {} as PasskeyStorage;

    const config: NextPasskeyConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: mockStorage,
      // PasskeyConfig optional fields (challenges is used instead of challengeStorage)
      challenges: createMockChallengeStorage(),
      timeout: 60000,
      userVerification: 'preferred',
      attestationType: 'none',
      recovery: {
        codeCount: 10,
        codeLength: 8,
      } as RecoveryConfig,
      hooks: {
        onRegistrationStart: async () => {},
      } as SecurityHooks,
    };

    expect(config).toBeDefined();
  });
});

describe('NextAuthPasskeyProviderConfig Type', () => {
  it('should accept configuration without getUserId', () => {
    const mockStorage = {} as PasskeyStorage;
    const mockChallenges = createMockChallengeStorage();

    const providerConfig: NextAuthPasskeyProviderConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: mockStorage,
      challenges: mockChallenges,
    };

    expect(providerConfig).toBeDefined();
  });

  it('should not have getUserId field', () => {
    // This is a compile-time test
    // NextAuthPasskeyProviderConfig should NOT have getUserId
    
    const mockStorage = {} as PasskeyStorage;
    const mockChallenges = createMockChallengeStorage();
    const config: NextAuthPasskeyProviderConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: mockStorage,
      challenges: mockChallenges,
      // @ts-expect-error getUserId should not exist on NextAuthPasskeyProviderConfig
      getUserId: async () => 'user-123',
    };

    // Runtime assertion
    expect(config).toBeDefined();
  });
});

describe('RouteHandlerMethods Type', () => {
  it('should accept all HTTP method handlers', () => {
    const methods: RouteHandlerMethods = {
      GET: async (_request) => new Response(),
      POST: async (_request) => new Response(),
      DELETE: async (_request) => new Response(),
      PATCH: async (_request) => new Response(),
    };

    expect(methods).toBeDefined();
  });

  it('should require POST handler', () => {
    // @ts-expect-error POST is required
    const invalidMethods: RouteHandlerMethods = {
      GET: async (_request) => new Response(),
    };

    expect(invalidMethods).toBeDefined();
  });

  it('should allow optional GET, DELETE, PATCH', () => {
    const minimalMethods: RouteHandlerMethods = {
      POST: async (_request) => new Response(),
    };

    expect(minimalMethods).toBeDefined();
  });
});

describe('Response Types', () => {
  it('should type ErrorResponse correctly', () => {
    const errorResponse: ErrorResponse = {
      type: 'https://example.com/errors/validation',
      title: 'Validation Error',
      status: 400,
      detail: 'Invalid input',
      instance: '/api/endpoint',
    };

    expect(errorResponse).toBeDefined();
  });

  it('should type SuccessResponse correctly', () => {
    const successResponse: SuccessResponse = {
      success: true,
      data: { message: 'Operation successful' },
    };

    const typedResponse: SuccessResponse<{ userId: string }> = {
      success: true,
      data: { userId: 'user-123' },
    };

    expect(successResponse).toBeDefined();
    expect(typedResponse).toBeDefined();
  });
});

// T054: Verify compile errors on incorrect usage
describe('Type Safety - Compile Errors', () => {
  it('should error on missing required config fields', () => {
    // @ts-expect-error Missing required fields
    const invalidConfig: NextPasskeyConfig = {
      rpId: 'example.com',
      // Missing rpName, origin, storage
    };

    expect(invalidConfig).toBeDefined();
  });

  it('should error on wrong getUserId return type', () => {
    const mockStorage = {} as PasskeyStorage;
    const mockChallenges = createMockChallengeStorage();

    const invalidConfig: NextPasskeyConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: mockStorage,
      challenges: mockChallenges,
      // @ts-expect-error getUserId must return string | null | Promise<string | null>
      getUserId: async (request) => {
        return 123; // number is not valid
      },
    };

    expect(invalidConfig).toBeDefined();
  });

  it('should error on invalid storage interface', () => {
    // @ts-expect-error Invalid storage implementation
    const invalidStorage: PasskeyStorage = {
      // Missing required methods
      getUserByEmail: async () => null,
    };
    const mockChallenges = createMockChallengeStorage();

    const config: NextPasskeyConfig = {
      rpId: 'example.com',
      rpName: 'My App',
      origin: 'https://example.com',
      storage: invalidStorage,
      challenges: mockChallenges,
    };

    expect(config).toBeDefined();
  });
});

