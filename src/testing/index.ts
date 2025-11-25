/**
 * Testing utilities for @productiongrade/passkeys
 *
 * These utilities help with testing passkey authentication flows
 * without requiring a real database or WebAuthn authenticator.
 *
 * @example
 * ```typescript
 * import { createMockStorage, createMockChallengeStorage } from '@productiongrade/passkeys/testing';
 *
 * const storage = createMockStorage();
 * const challenges = createMockChallengeStorage();
 * ```
 */

import { MemoryStorage } from '../adapters/memory/MemoryStorage';
import { MemoryChallengeStorage } from '../adapters/memory/MemoryChallengeStorage';
import type { PasskeyStorage, ChallengeStorage } from '../core/types/storage';
import type { PasskeyConfig } from '../core/types/config';
import { randomUUID } from 'crypto';
import type { User } from '../core/types/user';
import type { Passkey } from '../core/types/passkey';
import type { Challenge } from '../core/types/challenge';

/**
 * Create a mock PasskeyStorage implementation
 * Uses in-memory storage for testing
 *
 * @returns Mock PasskeyStorage instance
 *
 * @example
 * ```typescript
 * const storage = createMockStorage();
 * const user = await storage.createUser({ email: 'test@example.com' });
 * ```
 */
export function createMockStorage(): PasskeyStorage {
  return new MemoryStorage();
}

/**
 * Create a mock ChallengeStorage implementation
 * Uses in-memory storage for testing
 *
 * @returns Mock ChallengeStorage instance
 *
 * @example
 * ```typescript
 * const challenges = createMockChallengeStorage();
 * const challenge = await challenges.createChallenge({
 *   challenge: 'test-challenge',
 *   type: 'registration',
 * });
 * ```
 */
export function createMockChallengeStorage(): ChallengeStorage {
  return new MemoryChallengeStorage();
}

/**
 * Create a mock PasskeyConfig for testing
 * Uses in-memory storage with sensible defaults
 *
 * @param overrides - Optional overrides for default config
 * @returns Mock PasskeyConfig
 *
 * @example
 * ```typescript
 * const config = createMockPasskeyConfig({
 *   rpId: 'test.example.com',
 *   rpName: 'Test App',
 * });
 * ```
 */
export function createMockPasskeyConfig(
  overrides?: Partial<PasskeyConfig>
): PasskeyConfig {
  const storage = createMockStorage();
  const challenges = createMockChallengeStorage();

  return {
    rpId: 'localhost',
    rpName: 'Test App',
    origin: 'http://localhost:3000',
    storage,
    challenges,
    ...overrides,
  };
}

/**
 * Test fixtures for common test scenarios
 */
export const testFixtures = {
  /**
   * Create a test user
   */
  createTestUser(overrides?: Partial<User>): User {
    return {
      id: randomUUID(),
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create a test passkey
   */
  createTestPasskey(overrides?: Partial<Passkey>): Passkey {
    return {
      id: 'test-passkey-id',
      userId: randomUUID(),
      publicKey: 'test-public-key',
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: false,
      transports: ['internal'],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: undefined,
      nickname: 'Test Passkey',
      ...overrides,
    };
  },

  /**
   * Create a test challenge
   */
  createTestChallenge(overrides?: Partial<Challenge>): Challenge {
    return {
      id: randomUUID(),
      challenge: 'test-challenge-value',
      type: 'registration',
      userId: randomUUID(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      createdAt: new Date(),
      ...overrides,
    };
  },
};

