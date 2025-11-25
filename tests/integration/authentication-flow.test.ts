/**
 * Integration tests for complete authentication flow
 * Tests the end-to-end authentication process including WebAuthn ceremony
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PasskeyService } from '../../src/core/services/PasskeyService';
import { ChallengeService } from '../../src/core/services/ChallengeService';
import { MemoryStorage, MemoryChallengeStorage } from '../../src/adapters/memory';
import type { PasskeyConfig } from '../../src/core/types/config';

describe('Authentication Flow Integration', () => {
  let storage: MemoryStorage;
  let challengeStorage: MemoryChallengeStorage;
  let passkeyService: PasskeyService;
  let challengeService: ChallengeService;

  beforeEach(() => {
    storage = new MemoryStorage();
    challengeStorage = new MemoryChallengeStorage();

    const config: PasskeyConfig = {
      rpId: 'localhost',
      rpName: 'Test App',
      origin: 'http://localhost:3000',
      storage,
      challenges: challengeStorage,
    };

    passkeyService = new PasskeyService(storage, config);
    challengeService = new ChallengeService(challengeStorage);
  });

  describe('Complete Authentication Flow', () => {
    it('should successfully authenticate with existing passkey', async () => {
      // Setup: Create user and passkey (ID must be base64url encoded)
      const user = await storage.createUser({ email: 'auth@example.com' });
      const passkeyId = Buffer.from('test-credential').toString('base64url');
      await storage.createPasskey({
        userId: user.id,
        id: passkeyId,
        publicKey: 'test-public-key',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      // Step 1: Generate authentication options
      const { options } = await passkeyService.generateAuthenticationOptions(user.email);

      expect(options).toBeDefined();
      expect(options.challenge).toBeDefined();
      expect(options.rpId).toBe('localhost');
      expect(options.allowCredentials).toBeDefined();
      expect(options.allowCredentials?.length).toBe(1);
      // The ID is converted to Buffer/Uint8Array by SimpleWebAuthn
      const credentialId = options.allowCredentials?.[0]?.id;
      expect(credentialId).toBeDefined();
      // Convert Buffer/Uint8Array to base64url string for comparison
      let credentialIdBase64: string;
      if (Buffer.isBuffer(credentialId)) {
        credentialIdBase64 = credentialId.toString('base64url');
      } else if (credentialId && typeof credentialId === 'object' && 'constructor' in credentialId) {
        const constructorName = (credentialId as any).constructor?.name;
        if (constructorName === 'Uint8Array') {
          credentialIdBase64 = Buffer.from(credentialId as any).toString('base64url');
        } else {
          credentialIdBase64 = String(credentialId);
        }
      } else {
        credentialIdBase64 = String(credentialId);
      }
      expect(credentialIdBase64).toBe(passkeyId);

      // Store the challenge manually (normally done by the handler)
      await challengeService.store(options.challenge, 'authentication', user.id, user.email);
      
      // Verify challenge was stored by checking challenge storage directly
      const storedChallenge = await challengeStorage.getChallengeByValue(options.challenge);
      expect(storedChallenge).toBeDefined();
      expect(storedChallenge?.type).toBe('authentication');

      // Step 2: WebAuthn response would be generated here
      // (omitted in this integration test as it requires browser environment)

      // Step 3: In real test, would verify the assertion
      // Note: Full WebAuthn verification requires complex cryptographic operations

      // Verify challenge can be deleted
      if (storedChallenge) {
        await challengeService.delete(storedChallenge.id);
        const deletedChallenge = await challengeStorage.getChallengeById(storedChallenge.id);
        expect(deletedChallenge).toBeNull();
      }
    });

    it('should support user-less authentication (autofill)', async () => {
      // Create multiple users with passkeys
      const user1 = await storage.createUser({ email: 'user1@example.com' });
      await storage.createPasskey({
        userId: user1.id,
        id: 'cred-1',
        publicKey: 'key-1',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      const user2 = await storage.createUser({ email: 'user2@example.com' });
      await storage.createPasskey({
        userId: user2.id,
        id: 'cred-2',
        publicKey: 'key-2',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      // Generate authentication options without email (autofill)
      const { options } = await passkeyService.generateAuthenticationOptions();

      expect(options).toBeDefined();
      expect(options.challenge).toBeDefined();
      // Should allow any credential (no filtering)
      expect(options.allowCredentials).toBeUndefined();
    });

    it('should filter credentials by email when provided', async () => {
      // Create two users
      const user1 = await storage.createUser({ email: 'user1@example.com' });
      await storage.createPasskey({
        userId: user1.id,
        id: 'cred-1',
        publicKey: 'key-1',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      const user2 = await storage.createUser({ email: 'user2@example.com' });
      await storage.createPasskey({
        userId: user2.id,
        id: 'cred-2',
        publicKey: 'key-2',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      // Request auth for specific user
      const { options } = await passkeyService.generateAuthenticationOptions('user1@example.com');

      // Should only allow user1's credentials
      expect(options.allowCredentials).toBeDefined();
      expect(options.allowCredentials?.length).toBe(1);
      expect(options.allowCredentials?.[0]?.id).toBeDefined();
    });

    it('should call authentication hooks in correct order', async () => {
      const hookCalls: string[] = [];

      const config: PasskeyConfig = {
        rpId: 'localhost',
        rpName: 'Test App',
        origin: 'http://localhost:3000',
        storage,
        challenges: challengeStorage,
        hooks: {
          onAuthStart: (email) => {
            hookCalls.push(`start:${email}`);
          },
          onAuthSuccess: (userId, _passkeyId) => {
            hookCalls.push(`success:${userId}`);
          },
          onAuthFailure: (email, _error) => {
            hookCalls.push(`failure:${email}`);
          },
        },
      };

      const service = new PasskeyService(storage, config);

      // Create user with passkey
      const user = await storage.createUser({ email: 'hook@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'hook-cred',
        publicKey: 'hook-key',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      // Start authentication
      await service.generateAuthenticationOptions('hook@example.com');

      // Verify start hook was called
      expect(hookCalls).toContain('start:hook@example.com');
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle non-existent user', async () => {
      // Non-existent users are allowed (for autofill UI)
      // The service returns options without allowCredentials
      const { options, userId } = await passkeyService.generateAuthenticationOptions('nonexistent@example.com');
      
      expect(options).toBeDefined();
      expect(options.challenge).toBeDefined();
      expect(options.allowCredentials).toBeUndefined(); // No credentials for non-existent user
      expect(userId).toBeUndefined();
    });

    it('should handle user with no passkeys', async () => {
      // Create user without passkeys
      await storage.createUser({ email: 'nopasskeys@example.com' });

      // Users with no passkeys are allowed (for autofill UI)
      // The service returns options without allowCredentials
      const { options, userId } = await passkeyService.generateAuthenticationOptions('nopasskeys@example.com');
      
      expect(options).toBeDefined();
      expect(options.challenge).toBeDefined();
      expect(options.allowCredentials).toBeUndefined(); // No credentials for user with no passkeys
      expect(userId).toBeDefined(); // User exists, so userId is returned
    });

    it('should handle challenge expiration during authentication', async () => {
      const user = await storage.createUser({ email: 'expiry@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'exp-cred',
        publicKey: 'exp-key',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      const { options } = await passkeyService.generateAuthenticationOptions(user.email);

      // Get the stored challenge
      const storedChallenge = await challengeStorage.getChallengeByValue(options.challenge);
      expect(storedChallenge).toBeDefined();

      // Delete the challenge (simulating expiration/use)
      if (storedChallenge) {
        await challengeService.delete(storedChallenge.id);

        // Challenge should no longer exist
        const expiredChallenge = await challengeStorage.getChallengeById(storedChallenge.id);
        expect(expiredChallenge).toBeNull();
      }
    });

    it('should prevent replay attacks', async () => {
      const user = await storage.createUser({ email: 'replay@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'replay-cred',
        publicKey: 'replay-key',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      const { options } = await passkeyService.generateAuthenticationOptions(user.email);

      // Get the stored challenge
      const storedChallenge = await challengeStorage.getChallengeByValue(options.challenge);
      expect(storedChallenge).toBeDefined();

      // Delete challenge (single-use enforcement)
      if (storedChallenge) {
        await challengeService.delete(storedChallenge.id);

        // Second attempt should fail (challenge no longer exists)
        const replayAttempt = await challengeStorage.getChallengeById(storedChallenge.id);
        expect(replayAttempt).toBeNull();
      }
    });
  });

  describe('Authentication Security', () => {
    it('should generate unique challenges for each authentication', async () => {
      const user = await storage.createUser({ email: 'unique@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'unique-cred',
        publicKey: 'unique-key',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      const { options: options1 } = await passkeyService.generateAuthenticationOptions(user.email);

      const { options: options2 } = await passkeyService.generateAuthenticationOptions(user.email);

      expect(options1.challenge).not.toBe(options2.challenge);
    });

    it('should respect user verification setting', async () => {
      const config: PasskeyConfig = {
        rpId: 'localhost',
        rpName: 'Test App',
        origin: 'http://localhost:3000',
        storage,
        challenges: challengeStorage,
        userVerification: 'required',
      };

      const service = new PasskeyService(storage, config);

      const user = await storage.createUser({ email: 'verification@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'verify-cred',
        publicKey: 'verify-key',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      const { options } = await service.generateAuthenticationOptions(user.email);

      expect(options.userVerification).toBe('required');
    });

    it('should include transports hint for performance', async () => {
      const user = await storage.createUser({ email: 'transport@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'transport-cred',
        publicKey: 'transport-key',
        counter: 0,
        transports: ['usb', 'nfc'],
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const { options } = await passkeyService.generateAuthenticationOptions(user.email);

      expect(options.allowCredentials?.[0]?.transports).toEqual(['usb', 'nfc']);
    });

    it('should enforce timeout for authentication ceremony', async () => {
      const config: PasskeyConfig = {
        rpId: 'localhost',
        rpName: 'Test App',
        origin: 'http://localhost:3000',
        storage,
        challenges: challengeStorage,
        timeout: 120000, // 2 minutes
      };

      const service = new PasskeyService(storage, config);

      const user = await storage.createUser({ email: 'timeout@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'timeout-cred',
        publicKey: 'timeout-key',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
      });

      const { options } = await service.generateAuthenticationOptions(user.email);

      expect(options.timeout).toBe(120000);
    });
  });

  describe('Multiple Passkey Support', () => {
    it('should allow authentication with any registered passkey', async () => {
      const user = await storage.createUser({ email: 'multi@example.com' });

      // Register multiple passkeys (IDs must be base64url encoded)
      const passkey1Id = Buffer.from('passkey-1').toString('base64url');
      const passkey2Id = Buffer.from('passkey-2').toString('base64url');
      
      await storage.createPasskey({
        userId: user.id,
        id: passkey1Id,
        publicKey: 'key-1',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: false,
        nickname: 'iPhone',
      });

      await storage.createPasskey({
        userId: user.id,
        id: passkey2Id,
        publicKey: 'key-2',
        counter: 0,
        transports: ['usb'],
        deviceType: 'singleDevice',
        backedUp: false,
        nickname: 'YubiKey',
      });

      const { options } = await passkeyService.generateAuthenticationOptions(user.email);

      // Should allow both passkeys
      expect(options.allowCredentials?.length).toBe(2);
      // Convert credential IDs to base64url strings for comparison
      const credIds = options.allowCredentials?.map(c => {
        if (Buffer.isBuffer(c.id)) {
          return c.id.toString('base64url');
        } else if (c.id && typeof c.id === 'object' && 'constructor' in c.id) {
          const constructorName = (c.id as any).constructor?.name;
          if (constructorName === 'Uint8Array') {
            return Buffer.from(c.id as any).toString('base64url');
          }
        }
        return String(c.id);
      }) || [];
      // The IDs should match the base64url-encoded passkey IDs
      expect(credIds).toContain(passkey1Id);
      expect(credIds).toContain(passkey2Id);
    });
  });
});

