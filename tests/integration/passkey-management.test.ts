import { PasskeyService } from '../../src/core/services/PasskeyService';
import { MemoryStorage } from '../../src/adapters/memory/MemoryStorage';
import { MemoryChallengeStorage } from '../../src/adapters/memory/MemoryChallengeStorage';
import type { PasskeyConfig } from '../../src/core/types/config';
import { PasskeyNotFoundError, ValidationError } from '../../src/core/types/errors';

/**
 * Integration tests for passkey management functionality
 * Tests the complete flow of listing, updating, and deleting passkeys
 */
describe('Passkey Management Integration', () => {
  let storage: MemoryStorage;
  let challengeStorage: MemoryChallengeStorage;
  let config: PasskeyConfig;
  let passkeyService: PasskeyService;
  let userId: string;
  let passkey1Id: string;
  let passkey2Id: string;
  let passkey3Id: string;

  beforeEach(async () => {
    storage = new MemoryStorage();
    challengeStorage = new MemoryChallengeStorage();
    
    config = {
      rpName: 'Test App',
      rpId: 'localhost',
      origin: 'http://localhost:3000',
      storage,
      challenges: challengeStorage,
      hooks: {
        onPasskeyDeleted: jest.fn(),
      },
    };

    passkeyService = new PasskeyService(storage, config);

    // Create a user and register multiple passkeys
    const user = await storage.createUser({ email: 'test@example.com' });
    userId = user.id;

    // Create three passkeys for testing
    const passkey1 = await storage.createPasskey({
      userId,
      id: 'credential-1',
      publicKey: 'public-key-1',
      counter: 0,
      deviceType: 'multiDevice',
      backedUp: true,
      nickname: 'iPhone 15',
    });
    passkey1Id = passkey1.id;

    const passkey2 = await storage.createPasskey({
      userId,
      id: 'credential-2',
      publicKey: 'public-key-2',
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: false,
      nickname: 'MacBook Pro',
    });
    passkey2Id = passkey2.id;

    const passkey3 = await storage.createPasskey({
      userId,
      id: 'credential-3',
      publicKey: 'public-key-3',
      counter: 0,
      deviceType: 'multiDevice',
      backedUp: true,
    });
    passkey3Id = passkey3.id;
  });

  describe('List Passkeys', () => {
    it('should list all passkeys for a user with metadata', async () => {
      const passkeys = await passkeyService.getUserPasskeys(userId);

      expect(passkeys).toHaveLength(3);
      expect(passkeys[0]).toHaveProperty('id');
      expect(passkeys[0]).toHaveProperty('nickname');
      expect(passkeys[0]).toHaveProperty('deviceType');
      expect(passkeys[0]).toHaveProperty('createdAt');
      expect(passkeys[0]).toHaveProperty('publicKey');
      expect(passkeys[0]).toHaveProperty('counter');
      // lastUsedAt is optional - only set when passkey is actually used
      expect(passkeys[0]?.lastUsedAt).toBeUndefined();
    });

    it('should return empty array for user with no passkeys', async () => {
      const newUser = await storage.createUser({ email: 'empty@example.com' });
      const passkeys = await passkeyService.getUserPasskeys(newUser.id);

      expect(passkeys).toHaveLength(0);
    });
  });

  describe('Update Passkey Nickname', () => {
    it('should update passkey nickname successfully', async () => {
      await passkeyService.updatePasskeyNickname(userId, passkey1Id, 'My New iPhone');

      const passkeys = await passkeyService.getUserPasskeys(userId);
      const updated = passkeys.find(p => p.id === passkey1Id);

      expect(updated?.nickname).toBe('My New iPhone');
    });

    it('should allow updating to empty nickname', async () => {
      await passkeyService.updatePasskeyNickname(userId, passkey1Id, '');

      const passkeys = await passkeyService.getUserPasskeys(userId);
      const updated = passkeys.find(p => p.id === passkey1Id);

      expect(updated?.nickname).toBe('');
    });

    it('should throw error when updating another user\'s passkey', async () => {
      const otherUser = await storage.createUser({ email: 'other@example.com' });

      await expect(
        passkeyService.updatePasskeyNickname(otherUser.id, passkey1Id, 'Stolen Device')
      ).rejects.toThrow(PasskeyNotFoundError);
    });

    it('should throw error for non-existent passkey', async () => {
      await expect(
        passkeyService.updatePasskeyNickname(userId, 'nonexistent-id', 'Test')
      ).rejects.toThrow(PasskeyNotFoundError);
    });
  });

  describe('Delete Passkey', () => {
    it('should delete a passkey successfully when multiple exist', async () => {
      await passkeyService.deletePasskey(userId, passkey1Id);

      const passkeys = await passkeyService.getUserPasskeys(userId);
      expect(passkeys).toHaveLength(2);
      expect(passkeys.find(p => p.id === passkey1Id)).toBeUndefined();
      expect(config.hooks?.onPasskeyDeleted).toHaveBeenCalledWith({
        userId,
        passkeyId: passkey1Id,
      });
    });

    it('should prevent deleting the last passkey', async () => {
      // Delete all but one
      await passkeyService.deletePasskey(userId, passkey1Id);
      await passkeyService.deletePasskey(userId, passkey2Id);

      // Should fail to delete the last one
      await expect(
        passkeyService.deletePasskey(userId, passkey3Id)
      ).rejects.toThrow(ValidationError);

      // Verify passkey still exists
      const passkeys = await passkeyService.getUserPasskeys(userId);
      expect(passkeys).toHaveLength(1);
      expect(passkeys[0]!.id).toBe(passkey3Id);
    });

    it('should throw error when deleting another user\'s passkey', async () => {
      const otherUser = await storage.createUser({ email: 'other@example.com' });

      await expect(
        passkeyService.deletePasskey(otherUser.id, passkey1Id)
      ).rejects.toThrow(PasskeyNotFoundError);
    });

    it('should throw error for non-existent passkey', async () => {
      await expect(
        passkeyService.deletePasskey(userId, 'nonexistent-id')
      ).rejects.toThrow(PasskeyNotFoundError);
    });
  });

  describe('Complete Passkey Management Flow', () => {
    it('should support a complete management workflow', async () => {
      // 1. List initial passkeys
      let passkeys = await passkeyService.getUserPasskeys(userId);
      expect(passkeys).toHaveLength(3);

      // 2. Update nicknames
      await passkeyService.updatePasskeyNickname(userId, passkey1Id, 'Personal iPhone');
      await passkeyService.updatePasskeyNickname(userId, passkey2Id, 'Work MacBook');

      // 3. Verify updates
      passkeys = await passkeyService.getUserPasskeys(userId);
      expect(passkeys.find(p => p.id === passkey1Id)?.nickname).toBe('Personal iPhone');
      expect(passkeys.find(p => p.id === passkey2Id)?.nickname).toBe('Work MacBook');

      // 4. Delete one passkey
      await passkeyService.deletePasskey(userId, passkey3Id);
      passkeys = await passkeyService.getUserPasskeys(userId);
      expect(passkeys).toHaveLength(2);

      // 5. Delete another passkey
      await passkeyService.deletePasskey(userId, passkey1Id);
      passkeys = await passkeyService.getUserPasskeys(userId);
      expect(passkeys).toHaveLength(1);

      // 6. Verify last passkey protection
      await expect(
        passkeyService.deletePasskey(userId, passkey2Id)
      ).rejects.toThrow(ValidationError);

      // 7. Verify final state
      passkeys = await passkeyService.getUserPasskeys(userId);
      expect(passkeys).toHaveLength(1);
      expect(passkeys[0]!.id).toBe(passkey2Id);
      expect(passkeys[0]!.nickname).toBe('Work MacBook');
    });
  });
});

