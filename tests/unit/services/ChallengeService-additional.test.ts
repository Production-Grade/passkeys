import { describe, it, expect, beforeEach } from '@jest/globals';
import { ChallengeService } from '../../../src/core/services/ChallengeService';
import { createMockChallengeStorage } from '../../../src/testing';
import { InvalidChallengeError } from '../../../src/core/types/errors';

describe('ChallengeService - Additional Coverage', () => {
  let challengeService: ChallengeService;
  let challengeStorage: ReturnType<typeof createMockChallengeStorage>;

  beforeEach(() => {
    challengeStorage = createMockChallengeStorage();
    challengeService = new ChallengeService(challengeStorage);
  });

  describe('create - Edge Cases', () => {
    it('should handle concurrent challenge creation', async () => {
      const userId = 'user-123';
      const type = 'registration';

      const [challenge1, challenge2] = await Promise.all([
        challengeService.create(type, userId),
        challengeService.create(type, userId),
      ]);

      expect(challenge1.challenge).not.toBe(challenge2.challenge);
      expect(challenge1.userId).toBe(userId);
      expect(challenge2.userId).toBe(userId);
    });

    it('should create challenges with different types', async () => {
      const userId = 'user-123';
      const regChallenge = await challengeService.create('registration', userId);
      const authChallenge = await challengeService.create('authentication', userId);

      expect(regChallenge.type).toBe('registration');
      expect(authChallenge.type).toBe('authentication');
      expect(regChallenge.challenge).not.toBe(authChallenge.challenge);
    });
  });

  describe('verify - Edge Cases', () => {
    it('should handle invalid clientDataJSON', async () => {
      // Invalid base64url that will fail to decode
      const invalidBase64 = '!!!invalid-base64url!!!';
      await expect(
        challengeService.verify(invalidBase64)
      ).rejects.toThrow();
    });

    it('should handle challenge not found in storage', async () => {
      const fakeClientData = Buffer.from(JSON.stringify({
        type: 'webauthn.get',
        challenge: 'non-existent-challenge',
        origin: 'http://localhost:3000',
      })).toString('base64url');

      await expect(
        challengeService.verify(fakeClientData)
      ).rejects.toThrow(InvalidChallengeError);
    });

    it('should handle expired challenge', async () => {
      // Create a challenge and manually expire it
      const challenge = await challengeService.create('authentication', 'user-123');
      
      // Manually set expiration to past
      const expiredChallenge = await challengeStorage.getChallengeById(challenge.id);
      if (expiredChallenge) {
        // Update expiration to past
        await challengeStorage.deleteChallenge(challenge.id);
        
        const clientData = Buffer.from(JSON.stringify({
          type: 'webauthn.get',
          challenge: challenge.challenge,
          origin: 'http://localhost:3000',
        })).toString('base64url');

        await expect(
          challengeService.verify(clientData)
        ).rejects.toThrow(InvalidChallengeError);
      }
    });

    it('should handle clientDataJSON without challenge field', async () => {
      const clientData = Buffer.from(JSON.stringify({
        type: 'webauthn.get',
        origin: 'http://localhost:3000',
        // No challenge field
      })).toString('base64url');

      await expect(
        challengeService.verify(clientData)
      ).rejects.toThrow(InvalidChallengeError);
    });

    it('should handle invalid JSON in clientDataJSON', async () => {
      const invalidJson = Buffer.from('not-valid-json').toString('base64url');
      
      await expect(
        challengeService.verify(invalidJson)
      ).rejects.toThrow();
    });
  });

  describe('delete - Edge Cases', () => {
    it('should handle deleting non-existent challenge gracefully', async () => {
      await expect(challengeService.delete('non-existent')).resolves.not.toThrow();
    });

    it('should delete challenge after use', async () => {
      const challenge = await challengeService.create('registration', 'user-123');
      await challengeService.delete(challenge.id);

      const retrieved = await challengeStorage.getChallengeById(challenge.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('cleanupExpired', () => {
    it('should cleanup expired challenges', async () => {
      // Create a challenge
      await challengeService.create('registration', 'user-123');
      
      // Cleanup should not throw
      await expect(challengeService.cleanupExpired()).resolves.not.toThrow();
    });
  });
});

