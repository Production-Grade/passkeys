import { describe, it, expect, beforeEach } from '@jest/globals';
import { PasskeyService } from '../../../src/core/services/PasskeyService';
import { createMockStorage, createMockPasskeyConfig } from '../../../src/testing';

describe('PasskeyService - Counter Edge Cases', () => {
  let passkeyService: PasskeyService;
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
    const config = createMockPasskeyConfig({ storage });
    passkeyService = new PasskeyService(storage, config);
  });

  // Note: Counter anomaly edge cases are already tested in PasskeyService-errors.test.ts
  // This file focuses on excludeCredentials and allowCredentials filtering

  describe('generateRegistrationOptions - excludeCredentials edge cases', () => {
    it('should exclude passkeys without transports', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      
      // Create passkey without transports
      await storage.createPasskey({
        userId: user.id,
        id: 'passkey-no-transports',
        publicKey: 'key-1',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
        transports: undefined, // No transports
      });

      // Create passkey with transports
      await storage.createPasskey({
        userId: user.id,
        id: 'passkey-with-transports',
        publicKey: 'key-2',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
        transports: ['internal'], // Has transports
      });

      const { options } = await passkeyService.generateRegistrationOptions(user.email);

      // Should only exclude passkeys with transports
      if (options.excludeCredentials) {
        const excludedIds = options.excludeCredentials.map(c => {
          if (Buffer.isBuffer(c.id)) {
            return c.id.toString('base64url');
          }
          return String(c.id);
        });
        expect(excludedIds).toContain('passkey-with-transports');
        expect(excludedIds).not.toContain('passkey-no-transports');
      }
    });
  });

  describe('generateAuthenticationOptions - allowCredentials edge cases', () => {
    it('should exclude passkeys without transports from allowCredentials', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      
      // Create passkey without transports
      await storage.createPasskey({
        userId: user.id,
        id: 'passkey-no-transports',
        publicKey: 'key-1',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
        transports: undefined, // No transports
      });

      // Create passkey with transports
      await storage.createPasskey({
        userId: user.id,
        id: 'passkey-with-transports',
        publicKey: 'key-2',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
        transports: ['internal'], // Has transports
      });

      const { options } = await passkeyService.generateAuthenticationOptions(user.email);

      // Should only include passkeys with transports
      if (options.allowCredentials) {
        const allowedIds = options.allowCredentials.map(c => {
          if (Buffer.isBuffer(c.id)) {
            return c.id.toString('base64url');
          }
          return String(c.id);
        });
        expect(allowedIds).toContain('passkey-with-transports');
        expect(allowedIds).not.toContain('passkey-no-transports');
      }
    });

    it('should return undefined allowCredentials when no passkeys with transports', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      
      // Create passkey without transports
      await storage.createPasskey({
        userId: user.id,
        id: 'passkey-no-transports',
        publicKey: 'key-1',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
        transports: undefined, // No transports
      });

      const { options } = await passkeyService.generateAuthenticationOptions(user.email);

      // Should be undefined when no passkeys have transports
      expect(options.allowCredentials).toBeUndefined();
    });
  });
});

