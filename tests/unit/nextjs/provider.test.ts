import { describe, it, expect } from '@jest/globals';
import { PasskeyProvider } from '../../../src/nextjs/provider';

describe('Next.js PasskeyProvider', () => {
  it('should export PasskeyProvider', () => {
    expect(PasskeyProvider).toBeDefined();
    expect(typeof PasskeyProvider).toBe('function');
  });

  // Note: Full NextAuth provider testing requires NextAuth setup
  // These tests verify the provider is exported and can be imported
  // For full integration testing, use E2E tests with NextAuth
});
