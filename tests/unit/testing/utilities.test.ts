import { describe, it, expect } from '@jest/globals';
import {
  createMockStorage,
  createMockChallengeStorage,
  createMockPasskeyConfig,
  testFixtures,
} from '../../../src/testing';

describe('Testing Utilities', () => {
  describe('createMockStorage', () => {
    it('should create a mock storage instance', () => {
      const storage = createMockStorage();
      expect(storage).toBeDefined();
      expect(typeof storage.createUser).toBe('function');
      expect(typeof storage.getUserById).toBe('function');
      expect(typeof storage.getUserByEmail).toBe('function');
    });

    it('should allow creating and retrieving users', async () => {
      const storage = createMockStorage();
      const user = await storage.createUser({ email: 'test@example.com' });
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');

      const retrieved = await storage.getUserById(user.id);
      expect(retrieved).toEqual(user);
    });
  });

  describe('createMockChallengeStorage', () => {
    it('should create a mock challenge storage instance', () => {
      const challenges = createMockChallengeStorage();
      expect(challenges).toBeDefined();
      expect(typeof challenges.createChallenge).toBe('function');
      expect(typeof challenges.getChallengeById).toBe('function');
    });

    it('should allow creating and retrieving challenges', async () => {
      const challenges = createMockChallengeStorage();
      const challenge = await challenges.createChallenge({
        challenge: 'test-challenge',
        type: 'registration',
        userId: 'user-1',
        email: 'test@example.com',
      });
      expect(challenge).toBeDefined();
      expect(challenge.challenge).toBe('test-challenge');

      const retrieved = await challenges.getChallengeById(challenge.id);
      expect(retrieved).toEqual(challenge);
    });
  });

  describe('createMockPasskeyConfig', () => {
    it('should create a mock config with defaults', () => {
      const config = createMockPasskeyConfig();
      expect(config.rpId).toBe('localhost');
      expect(config.rpName).toBe('Test App');
      expect(config.origin).toBe('http://localhost:3000');
      expect(config.storage).toBeDefined();
      expect(config.challenges).toBeDefined();
    });

    it('should allow overriding default values', () => {
      const config = createMockPasskeyConfig({
        rpId: 'example.com',
        rpName: 'Custom App',
      });
      expect(config.rpId).toBe('example.com');
      expect(config.rpName).toBe('Custom App');
      expect(config.origin).toBe('http://localhost:3000'); // Still default
    });

    it('should allow overriding storage and challenges', () => {
      const customStorage = createMockStorage();
      const customChallenges = createMockChallengeStorage();
      const config = createMockPasskeyConfig({
        storage: customStorage,
        challenges: customChallenges,
      });
      expect(config.storage).toBe(customStorage);
      expect(config.challenges).toBe(customChallenges);
    });
  });

  describe('testFixtures', () => {
    describe('createTestUser', () => {
      it('should create a test user with defaults', () => {
        const user = testFixtures.createTestUser();
        expect(user).toBeDefined();
        expect(user.id).toBeDefined();
        expect(user.email).toBe('test@example.com');
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);
      });

      it('should allow overriding user properties', () => {
        const user = testFixtures.createTestUser({
          email: 'custom@example.com',
          id: 'custom-id',
        });
        expect(user.email).toBe('custom@example.com');
        expect(user.id).toBe('custom-id');
      });
    });

    describe('createTestPasskey', () => {
      it('should create a test passkey with defaults', () => {
        const passkey = testFixtures.createTestPasskey();
        expect(passkey).toBeDefined();
        expect(passkey.id).toBe('test-passkey-id');
        expect(passkey.userId).toBeDefined();
        expect(passkey.publicKey).toBe('test-public-key');
        expect(passkey.counter).toBe(0);
        expect(passkey.deviceType).toBe('singleDevice');
        expect(passkey.backedUp).toBe(false);
        expect(passkey.transports).toEqual(['internal']);
        expect(passkey.createdAt).toBeInstanceOf(Date);
        expect(passkey.updatedAt).toBeInstanceOf(Date);
        expect(passkey.nickname).toBe('Test Passkey');
      });

      it('should allow overriding passkey properties', () => {
        const passkey = testFixtures.createTestPasskey({
          id: 'custom-id',
          nickname: 'Custom Name',
          counter: 5,
        });
        expect(passkey.id).toBe('custom-id');
        expect(passkey.nickname).toBe('Custom Name');
        expect(passkey.counter).toBe(5);
      });
    });

    describe('createTestChallenge', () => {
      it('should create a test challenge with defaults', () => {
        const challenge = testFixtures.createTestChallenge();
        expect(challenge).toBeDefined();
        expect(challenge.id).toBeDefined();
        expect(challenge.challenge).toBe('test-challenge-value');
        expect(challenge.type).toBe('registration');
        expect(challenge.userId).toBeDefined();
        expect(challenge.expiresAt).toBeInstanceOf(Date);
        expect(challenge.createdAt).toBeInstanceOf(Date);
      });

      it('should allow overriding challenge properties', () => {
        const challenge = testFixtures.createTestChallenge({
          type: 'authentication',
          challenge: 'custom-challenge',
        });
        expect(challenge.type).toBe('authentication');
        expect(challenge.challenge).toBe('custom-challenge');
      });
    });
  });
});

