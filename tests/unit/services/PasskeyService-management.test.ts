import { describe, it, expect, beforeEach } from '@jest/globals';
import { PasskeyService } from '../../../src/core/services/PasskeyService';
import { createMockStorage, createMockChallengeStorage, createMockPasskeyConfig } from '../../../src/testing';
import { PasskeyNotFoundError, ValidationError } from '../../../src/core/types/errors';

describe('PasskeyService - Management Operations', () => {
  let passkeyService: PasskeyService;
  let storage: ReturnType<typeof createMockStorage>;
  let userId: string;
  let passkeyId: string;

  beforeEach(async () => {
    storage = createMockStorage();
    const config = createMockPasskeyConfig({
      storage,
      challenges: createMockChallengeStorage(),
    });
    passkeyService = new PasskeyService(storage, config);

    const user = await storage.createUser({ email: 'test@example.com' });
    userId = user.id;

    const passkey = await storage.createPasskey({
      id: 'test-passkey-1',
      userId: user.id,
      publicKey: 'test-public-key',
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: false,
    });
    passkeyId = passkey.id;
  });

  describe('getUserPasskeys', () => {
    it('should return all passkeys for a user', async () => {
      await storage.createPasskey({
        id: 'test-passkey-2',
        userId,
        publicKey: 'test-public-key-2',
        counter: 0,
        deviceType: 'multiDevice',
        backedUp: true,
      });

      const passkeys = await storage.getUserPasskeys(userId);

      expect(passkeys).toHaveLength(2);
      expect(passkeys[0]?.id).toBe(passkeyId);
      expect(passkeys[1]?.id).toBe('test-passkey-2');
    });

    it('should return empty array for user with no passkeys', async () => {
      const newUser = await storage.createUser({ email: 'newuser@example.com' });
      const passkeys = await storage.getUserPasskeys(newUser.id);

      expect(passkeys).toHaveLength(0);
    });
  });

  describe('updatePasskeyNickname', () => {
    it('should update passkey nickname', async () => {
      const updated = await passkeyService.updatePasskeyNickname(userId, passkeyId, 'My Device');

      expect(updated.nickname).toBe('My Device');
      expect(updated.id).toBe(passkeyId);
    });

    it('should update nickname to empty string', async () => {
      await passkeyService.updatePasskeyNickname(userId, passkeyId, 'My Device');
      const updated = await passkeyService.updatePasskeyNickname(userId, passkeyId, '');

      expect(updated.nickname).toBe('');
    });

    it('should throw PasskeyNotFoundError for non-existent passkey', async () => {
      await expect(
        passkeyService.updatePasskeyNickname(userId, 'non-existent', 'My Device')
      ).rejects.toThrow(PasskeyNotFoundError);
    });

    it('should throw PasskeyNotFoundError for passkey belonging to different user', async () => {
      const otherUser = await storage.createUser({ email: 'other@example.com' });

      await expect(
        passkeyService.updatePasskeyNickname(otherUser.id, passkeyId, 'My Device')
      ).rejects.toThrow(PasskeyNotFoundError);
    });
  });

  describe('updatePasskeyCounter', () => {
    it('should update passkey counter', async () => {
      const updated = await passkeyService.updatePasskeyCounter(passkeyId, 100);

      expect(updated.counter).toBe(100);
      expect(updated.id).toBe(passkeyId);
    });

    it('should update counter to 0', async () => {
      await passkeyService.updatePasskeyCounter(passkeyId, 50);
      const updated = await passkeyService.updatePasskeyCounter(passkeyId, 0);

      expect(updated.counter).toBe(0);
    });

    it('should update counter to large number', async () => {
      const updated = await passkeyService.updatePasskeyCounter(passkeyId, 999999);

      expect(updated.counter).toBe(999999);
    });
  });

  describe('deletePasskey', () => {
    it('should delete a passkey when multiple exist', async () => {
      // Create second passkey first
      await storage.createPasskey({
        id: 'test-passkey-2',
        userId,
        publicKey: 'test-public-key-2',
        counter: 0,
        deviceType: 'multiDevice',
        backedUp: false,
      });

      await passkeyService.deletePasskey(userId, passkeyId);

      const passkeys = await storage.getUserPasskeys(userId);
      expect(passkeys).toHaveLength(1);
      expect(passkeys[0]?.id).toBe('test-passkey-2');
    });

    it('should throw PasskeyNotFoundError for non-existent passkey', async () => {
      await expect(
        passkeyService.deletePasskey(userId, 'non-existent')
      ).rejects.toThrow(PasskeyNotFoundError);
    });

    it('should throw PasskeyNotFoundError for passkey belonging to different user', async () => {
      const otherUser = await storage.createUser({ email: 'other@example.com' });

      await expect(
        passkeyService.deletePasskey(otherUser.id, passkeyId)
      ).rejects.toThrow(PasskeyNotFoundError);
    });

    it('should prevent deleting last passkey', async () => {
      await expect(
        passkeyService.deletePasskey(userId, passkeyId)
      ).rejects.toThrow(ValidationError);
    });
  });
});

