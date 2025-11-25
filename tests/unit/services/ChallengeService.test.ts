import { ChallengeService } from '../../../src/core/services/ChallengeService';
import { MemoryChallengeStorage } from '../../../src/adapters/memory/MemoryChallengeStorage';
import { InvalidChallengeError } from '../../../src/core/types/errors';

describe('ChallengeService', () => {
  let service: ChallengeService;
  let storage: MemoryChallengeStorage;

  beforeEach(() => {
    storage = new MemoryChallengeStorage();
    service = new ChallengeService(storage);
  });

  // Helper to create clientDataJSON for testing
  const createClientDataJSON = (challenge: string): string => {
    const clientData = { challenge, type: 'webauthn.create', origin: 'http://localhost' };
    return Buffer.from(JSON.stringify(clientData)).toString('base64url');
  };

  describe('create', () => {
    it('should create a registration challenge with userId', async () => {
      const challenge = await service.create('registration', 'user-123');

      expect(challenge).toHaveProperty('id');
      expect(challenge).toHaveProperty('challenge');
      expect(challenge.type).toBe('registration');
      expect(challenge.userId).toBe('user-123');
      expect(challenge.expiresAt).toBeInstanceOf(Date);
      expect(challenge.createdAt).toBeInstanceOf(Date);
    });

    it('should create an authentication challenge with email', async () => {
      const challenge = await service.create('authentication', undefined, 'test@example.com');

      expect(challenge.type).toBe('authentication');
      expect(challenge.email).toBe('test@example.com');
      expect(challenge.userId).toBeUndefined();
    });

    it('should create challenge with both userId and email', async () => {
      const challenge = await service.create('registration', 'user-456', 'user@example.com');

      expect(challenge.userId).toBe('user-456');
      expect(challenge.email).toBe('user@example.com');
    });

    it('should set expiry time 5 minutes in the future', async () => {
      const before = Date.now();
      const challenge = await service.create('registration', 'user-123');
      const after = Date.now();

      const expectedExpiry = 5 * 60 * 1000; // 5 minutes in ms
      const actualExpiry = challenge.expiresAt.getTime() - challenge.createdAt.getTime();

      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - (after - before));
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + (after - before));
    });

    it('should generate unique challenge strings', async () => {
      const challenge1 = await service.create('registration', 'user-1');
      const challenge2 = await service.create('registration', 'user-2');

      expect(challenge1.challenge).not.toBe(challenge2.challenge);
    });
  });

  describe('verify', () => {
    it('should verify a valid challenge', async () => {
      const created = await service.create('registration', 'user-123');
      const clientDataJSON = createClientDataJSON(created.challenge);
      const verified = await service.verify(clientDataJSON);

      expect(verified.id).toBe(created.id);
      expect(verified.challenge).toBe(created.challenge);
      expect(verified.userId).toBe('user-123');
    });

    it('should throw InvalidChallengeError for non-existent challenge', async () => {
      const clientDataJSON = createClientDataJSON('nonexistent-challenge');
      await expect(service.verify(clientDataJSON)).rejects.toThrow(
        InvalidChallengeError
      );
      await expect(service.verify(clientDataJSON)).rejects.toThrow(
        'Challenge not found'
      );
    });

    it('should throw InvalidChallengeError for expired challenge', async () => {
      // Create challenge with past expiry by directly using storage
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const expiredChallenge = await storage.createChallenge({
        challenge: 'expired-challenge-string',
        type: 'registration',
        userId: 'user-123',
        expiresAt: pastDate,
      });

      // Storage automatically filters out expired challenges, so service sees it as "not found"
      await expect(service.verify(createClientDataJSON(expiredChallenge.challenge))).rejects.toThrow(
        InvalidChallengeError
      );
      await expect(service.verify(createClientDataJSON(expiredChallenge.challenge))).rejects.toThrow(
        'Challenge not found'
      );
    });

    it('should delete expired challenge after verification attempt', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      const expiredChallenge = await storage.createChallenge({
        challenge: 'expired-to-delete',
        type: 'registration',
        userId: 'user-123',
        expiresAt: pastDate,
      });

      try {
        await service.verify(createClientDataJSON(expiredChallenge.challenge));
      } catch (error) {
        // Expected to throw
      }

      // Challenge should be deleted
      const retrieved = await storage.getChallengeById(expiredChallenge.id);
      expect(retrieved).toBeNull();
    });

    it('should return challenge metadata', async () => {
      const created = await service.create('authentication', undefined, 'test@example.com');
      const verified = await service.verify(createClientDataJSON(created.challenge));

      expect(verified.type).toBe('authentication');
      expect(verified.email).toBe('test@example.com');
      expect(verified.expiresAt).toBeInstanceOf(Date);
      expect(verified.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    it('should delete a challenge by ID', async () => {
      const challenge = await service.create('registration', 'user-123');
      
      await service.delete(challenge.id);

      const retrieved = await storage.getChallengeById(challenge.id);
      expect(retrieved).toBeNull();
    });

    it('should not throw when deleting non-existent challenge', async () => {
      await expect(service.delete('nonexistent-id')).resolves.not.toThrow();
    });

    it('should prevent reuse of deleted challenge', async () => {
      const challenge = await service.create('registration', 'user-999');
      
      await service.verify(createClientDataJSON(challenge.challenge)); // Verify once
      await service.delete(challenge.id); // Then delete

      await expect(service.verify(createClientDataJSON(challenge.challenge))).rejects.toThrow(
        InvalidChallengeError
      );
    });
  });

  describe('challenge lifecycle', () => {
    it('should handle multiple challenges for same user', async () => {
      const challenge1 = await service.create('registration', 'user-multi');
      const challenge2 = await service.create('authentication', 'user-multi');

      const verified1 = await service.verify(createClientDataJSON(challenge1.challenge));
      const verified2 = await service.verify(createClientDataJSON(challenge2.challenge));

      expect(verified1.type).toBe('registration');
      expect(verified2.type).toBe('authentication');
      expect(verified1.userId).toBe('user-multi');
      expect(verified2.userId).toBe('user-multi');
    });

    it('should handle challenges with different types', async () => {
      const regChallenge = await service.create('registration', 'user-1');
      const authChallenge = await service.create('authentication', undefined, 'user@example.com');

      expect(regChallenge.type).toBe('registration');
      expect(regChallenge.userId).toBe('user-1');
      
      expect(authChallenge.type).toBe('authentication');
      expect(authChallenge.email).toBe('user@example.com');
    });

    it('should maintain challenge isolation', async () => {
      const challenge1 = await service.create('registration', 'user-a');
      const challenge2 = await service.create('registration', 'user-b');

      await service.delete(challenge1.id);

      // Challenge 2 should still be valid
      const verified = await service.verify(createClientDataJSON(challenge2.challenge));
      expect(verified.userId).toBe('user-b');
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired challenges', async () => {
      // Create valid challenge
      const validChallenge = await service.create('registration', 'user-valid');

      // Create expired challenge directly
      const expiredChallenge = await storage.createChallenge({
        challenge: 'expired-cleanup-test',
        type: 'registration',
        userId: 'user-expired',
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      });

      await service.cleanupExpired();

      // Valid challenge should remain
      const validResult = await storage.getChallengeById(validChallenge.id);
      expect(validResult).not.toBeNull();

      // Expired challenge should be removed
      const expiredResult = await storage.getChallengeById(expiredChallenge.id);
      expect(expiredResult).toBeNull();
    });

    it('should not affect valid challenges during cleanup', async () => {
      const challenge1 = await service.create('registration', 'user-1');
      const challenge2 = await service.create('authentication', undefined, 'test@example.com');

      await service.cleanupExpired();

      const verified1 = await service.verify(createClientDataJSON(challenge1.challenge));
      const verified2 = await service.verify(createClientDataJSON(challenge2.challenge));

      expect(verified1.userId).toBe('user-1');
      expect(verified2.email).toBe('test@example.com');
    });
  });

  describe('edge cases', () => {
    it('should handle challenge strings of varying lengths', async () => {
      const challenge = await service.create('registration', 'user-123');
      
      // Challenge should be a reasonable length (base64url encoded)
      expect(challenge.challenge.length).toBeGreaterThan(20);
      expect(challenge.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should handle rapid successive challenge creation', async () => {
      const challenges = await Promise.all([
        service.create('registration', 'user-1'),
        service.create('registration', 'user-2'),
        service.create('registration', 'user-3'),
      ]);

      // All should be unique
      const challengeStrings = challenges.map(c => c.challenge);
      const uniqueStrings = new Set(challengeStrings);
      expect(uniqueStrings.size).toBe(3);

      // All should be verifiable
      for (const challenge of challenges) {
        const verified = await service.verify(createClientDataJSON(challenge.challenge));
        expect(verified.id).toBe(challenge.id);
      }
    });
  });
});
