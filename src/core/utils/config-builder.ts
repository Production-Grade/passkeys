import type { PasskeyConfig } from '../types/config';

/**
 * Create PasskeyConfig with sensible defaults
 * Helper function to reduce boilerplate while still allowing full customization
 *
 * @param base - Required configuration fields
 * @param overrides - Optional overrides for defaults
 * @returns Complete PasskeyConfig with defaults applied
 *
 * @example
 * ```typescript
 * const config = createPasskeyConfig({
 *   rpId: 'example.com',
 *   rpName: 'My App',
 *   origin: 'https://example.com',
 *   storage: myStorage,
 *   challenges: myChallengeStorage,
 * }, {
 *   timeout: 120000, // Override default timeout
 *   userVerification: 'required', // Override default
 * });
 * ```
 */
export function createPasskeyConfig(
  base: Pick<PasskeyConfig, 'rpId' | 'rpName' | 'origin' | 'storage' | 'challenges'>,
  overrides?: Partial<PasskeyConfig>
): PasskeyConfig {
  return {
    ...base,
    // Sensible defaults
    timeout: 60000, // 60 seconds
    userVerification: 'preferred',
    attestationType: 'none',
    // Apply overrides
    ...overrides,
  };
}

