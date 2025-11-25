import { MemoryStorage } from '../../src/adapters/memory/MemoryStorage';
import { MemoryChallengeStorage } from '../../src/adapters/memory/MemoryChallengeStorage';
import type { PasskeyStorage, ChallengeStorage } from '../../src/core/types/storage';
import type { User } from '../../src/core/types/user';
import type { CreatePasskeyInput } from '../../src/core/types/passkey';

/**
 * Contract tests for PasskeyStorage implementations
 * These tests verify that any storage implementation meets the contract requirements
 */
describe('PasskeyStorage Contract', () => {
  let storage: PasskeyStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe('User operations', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a user', async () => {
      const user = await storage.createUser({ email: mockUser.email });

      expect(user.email).toBe(mockUser.email);
      expect(user).toHaveProperty('id');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should get user by ID', async () => {
      const created = await storage.createUser({ email: mockUser.email });
      const user = await storage.getUserById(created.id);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(created.id);
      expect(user?.email).toBe(mockUser.email);
    });

    it('should return null for non-existent user ID', async () => {
      const user = await storage.getUserById('nonexistent');
      expect(user).toBeNull();
    });

    it('should get user by email', async () => {
      await storage.createUser({ email: mockUser.email });
      const user = await storage.getUserByEmail(mockUser.email);

      expect(user).not.toBeNull();
      expect(user?.email).toBe(mockUser.email);
    });

    it('should return null for non-existent email', async () => {
      const user = await storage.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should enforce email uniqueness', async () => {
      await storage.createUser({ email: mockUser.email });

      await expect(storage.createUser({ email: mockUser.email })).rejects.toThrow(
        /email.*already exists/i
      );
    });

    it('should update user', async () => {
      const created = await storage.createUser({ email: mockUser.email });

      const updatedUser = await storage.updateUser(created.id, {
        email: 'updated@example.com',
      });

      expect(updatedUser.email).toBe('updated@example.com');
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime()
      );
    });
  });

  describe('Passkey operations', () => {
    const mockUser: User = {
      id: 'user-passkey',
      email: 'passkey@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPasskey: CreatePasskeyInput = {
      id: 'passkey-123',
      userId: 'user-passkey',
      publicKey: 'base64url-encoded-public-key-data',
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: false,
    };

    beforeEach(async () => {
      await storage.createUser({ email: mockUser.email });
    });

    it('should create a passkey', async () => {
      const passkey = await storage.createPasskey(mockPasskey);

      expect(passkey).toMatchObject({
        id: mockPasskey.id,
        userId: mockPasskey.userId,
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });
      expect(passkey.publicKey).toBe(mockPasskey.publicKey);
    });

    it('should get passkey by ID', async () => {
      await storage.createPasskey(mockPasskey);
      const passkey = await storage.getPasskeyById(mockPasskey.id);

      expect(passkey).not.toBeNull();
      expect(passkey?.id).toBe(mockPasskey.id);
    });

    it('should return null for non-existent passkey', async () => {
      const passkey = await storage.getPasskeyById('nonexistent');
      expect(passkey).toBeNull();
    });

    it('should get all passkeys for a user', async () => {
      await storage.createPasskey(mockPasskey);
      await storage.createPasskey({
        ...mockPasskey,
        id: 'passkey-456',
      });

      const passkeys = await storage.getUserPasskeys(mockUser.id);

      expect(passkeys).toHaveLength(2);
      expect(passkeys.map(p => p.id)).toContain('passkey-123');
      expect(passkeys.map(p => p.id)).toContain('passkey-456');
    });

    it('should return empty array for user with no passkeys', async () => {
      const passkeys = await storage.getUserPasskeys(mockUser.id);
      expect(passkeys).toEqual([]);
    });

    it('should update passkey', async () => {
      await storage.createPasskey(mockPasskey);

      const updated = await storage.updatePasskey(mockPasskey.id, {
        counter: 5,
        nickname: 'My Device',
        lastUsedAt: new Date(),
      });

      expect(updated.counter).toBe(5);
      expect(updated.nickname).toBe('My Device');
      expect(updated.lastUsedAt).toBeInstanceOf(Date);
    });

    it('should delete passkey', async () => {
      await storage.createPasskey(mockPasskey);
      await storage.deletePasskey(mockPasskey.id);

      const passkey = await storage.getPasskeyById(mockPasskey.id);
      expect(passkey).toBeNull();
    });
  });

  describe('Recovery operations', () => {
    const mockUser: User = {
      id: 'user-recovery',
      email: 'recovery@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      await storage.createUser({ email: mockUser.email });
    });

    it('should create recovery codes', async () => {
      const codes = [
        { userId: mockUser.id, codeHash: 'hashed-code-1' },
        { userId: mockUser.id, codeHash: 'hashed-code-2' },
      ];

      await storage.createRecoveryCodes(codes);

      const retrievedCodes = await storage.getUserRecoveryCodes(mockUser.id);
      expect(retrievedCodes).toHaveLength(2);
    });

    it('should get recovery codes for user', async () => {
      const codes = [{ userId: mockUser.id, codeHash: 'hashed-code' }];
      await storage.createRecoveryCodes(codes);

      const retrieved = await storage.getUserRecoveryCodes(mockUser.id);

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]!.userId).toBe(mockUser.id);
      expect(retrieved[0]!.usedAt).toBeUndefined();
    });

    it('should mark recovery code as used', async () => {
      const codes = [
        { userId: mockUser.id, codeHash: 'hashed-code-use' },
        { userId: mockUser.id, codeHash: 'hashed-code-unused' },
      ];
      await storage.createRecoveryCodes(codes);

      const retrievedCodes = await storage.getUserRecoveryCodes(mockUser.id);
      expect(retrievedCodes).toHaveLength(2);
      
      const codeToUse = retrievedCodes[0]!;
      await storage.markRecoveryCodeUsed(codeToUse.id);

      // After marking as used, only the unused code should be returned
      const remaining = await storage.getUserRecoveryCodes(mockUser.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).not.toBe(codeToUse.id);
    });

    it('should delete all recovery codes for user', async () => {
      const codes = [
        { userId: mockUser.id, codeHash: 'code-hash-1' },
        { userId: mockUser.id, codeHash: 'code-hash-2' },
      ];
      await storage.createRecoveryCodes(codes);

      await storage.deleteUserRecoveryCodes(mockUser.id);

      const remaining = await storage.getUserRecoveryCodes(mockUser.id);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Email recovery operations', () => {
    const mockUser: User = {
      id: 'user-email-recovery',
      email: 'emailrecovery@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      await storage.createUser({ email: mockUser.email });
    });

    it('should create email recovery token', async () => {
      const token = await storage.createEmailRecoveryToken({
        userId: mockUser.id,
        tokenHash: 'hashed-token-value',
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(token.userId).toBe(mockUser.id);
      expect(token.tokenHash).toBe('hashed-token-value');
      expect(token.expiresAt).toBeInstanceOf(Date);
    });

    it('should get email recovery token', async () => {
      const tokenData = {
        userId: mockUser.id,
        tokenHash: 'hashed-token-get',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const created = await storage.createEmailRecoveryToken(tokenData);
      const retrieved = await storage.getEmailRecoveryToken(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe(mockUser.id);
    });

    it('should return null for non-existent token', async () => {
      const token = await storage.getEmailRecoveryToken('nonexistent');
      expect(token).toBeNull();
    });

    it('should find email recovery token by hash', async () => {
      const tokenData = {
        userId: mockUser.id,
        tokenHash: 'unique-hash-for-search',
        expiresAt: new Date(Date.now() + 3600000),
      };

      await storage.createEmailRecoveryToken(tokenData);
      const retrieved = await storage.getEmailRecoveryTokenByHash('unique-hash-for-search');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe(mockUser.id);
      expect(retrieved?.tokenHash).toBe('unique-hash-for-search');
    });

    it('should return null for non-existent token hash', async () => {
      const token = await storage.getEmailRecoveryTokenByHash('nonexistent-hash');
      expect(token).toBeNull();
    });

    it('should not return expired token by hash', async () => {
      const expiredToken = {
        userId: mockUser.id,
        tokenHash: 'expired-hash',
        expiresAt: new Date(Date.now() - 1000),
      };

      await storage.createEmailRecoveryToken(expiredToken);
      const retrieved = await storage.getEmailRecoveryTokenByHash('expired-hash');

      expect(retrieved).toBeNull();
    });

    it('should not return used token by hash', async () => {
      const tokenData = {
        userId: mockUser.id,
        tokenHash: 'used-hash',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const created = await storage.createEmailRecoveryToken(tokenData);
      await storage.markEmailRecoveryTokenUsed(created.id);

      const retrieved = await storage.getEmailRecoveryTokenByHash('used-hash');
      expect(retrieved).toBeNull();
    });

    it('should mark email recovery token as used', async () => {
      const tokenData = {
        userId: mockUser.id,
        tokenHash: 'hashed-token-mark',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const created = await storage.createEmailRecoveryToken(tokenData);
      await storage.markEmailRecoveryTokenUsed(created.id);

      const retrieved = await storage.getEmailRecoveryToken(created.id);
      expect(retrieved?.usedAt).toBeInstanceOf(Date);
    });

    it('should delete expired email recovery tokens', async () => {
      // Create valid token
      const validToken = await storage.createEmailRecoveryToken({
        userId: mockUser.id,
        tokenHash: 'valid-token-hash',
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Create expired token
      const expiredToken = await storage.createEmailRecoveryToken({
        userId: mockUser.id,
        tokenHash: 'expired-token-hash',
        expiresAt: new Date(Date.now() - 3600000),
      });

      await storage.deleteExpiredEmailRecoveryTokens();

      // Valid token should remain
      const validResult = await storage.getEmailRecoveryToken(validToken.id);
      expect(validResult).not.toBeNull();

      // Expired token should be removed
      const expiredResult = await storage.getEmailRecoveryToken(expiredToken.id);
      expect(expiredResult).toBeNull();
    });
  });
});

/**
 * Contract tests for ChallengeStorage implementations
 */
describe('ChallengeStorage Contract', () => {
  let storage: ChallengeStorage;

  beforeEach(() => {
    storage = new MemoryChallengeStorage();
  });

  describe('Challenge operations', () => {
    const mockChallengeInput = {
      challenge: 'random-challenge-string',
      type: 'registration' as const,
      userId: 'user-123',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('should create a challenge', async () => {
      const challenge = await storage.createChallenge(mockChallengeInput);

      expect(challenge).toHaveProperty('id');
      expect(challenge.challenge).toBe(mockChallengeInput.challenge);
      expect(challenge.type).toBe('registration');
      expect(challenge.userId).toBe('user-123');
      expect(challenge.expiresAt).toBeInstanceOf(Date);
      expect(challenge.createdAt).toBeInstanceOf(Date);
    });

    it('should get challenge by ID', async () => {
      const created = await storage.createChallenge(mockChallengeInput);
      const retrieved = await storage.getChallengeById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.challenge).toBe(mockChallengeInput.challenge);
      expect(retrieved?.userId).toBe(mockChallengeInput.userId);
    });

    it('should get challenge by value', async () => {
      const created = await storage.createChallenge(mockChallengeInput);
      const retrieved = await storage.getChallengeByValue(created.challenge);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.challenge).toBe(mockChallengeInput.challenge);
    });

    it('should return null for non-existent challenge ID', async () => {
      const challenge = await storage.getChallengeById('nonexistent-id');
      expect(challenge).toBeNull();
    });

    it('should return null for non-existent challenge value', async () => {
      const challenge = await storage.getChallengeByValue('nonexistent-value');
      expect(challenge).toBeNull();
    });

    it('should delete a challenge', async () => {
      const created = await storage.createChallenge(mockChallengeInput);
      await storage.deleteChallenge(created.id);

      const retrieved = await storage.getChallengeById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should handle authentication challenges without userId', async () => {
      const authChallengeInput = {
        challenge: 'auth-challenge-string',
        type: 'authentication' as const,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const created = await storage.createChallenge(authChallengeInput);
      const retrieved = await storage.getChallengeByValue(created.challenge);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.type).toBe('authentication');
      expect(retrieved?.email).toBe('test@example.com');
      expect(retrieved?.userId).toBeUndefined();
    });

    it('should handle challenges with both userId and email', async () => {
      const fullChallengeInput = {
        challenge: 'full-challenge-string',
        type: 'registration' as const,
        userId: 'user-456',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const created = await storage.createChallenge(fullChallengeInput);
      const retrieved = await storage.getChallengeByValue(created.challenge);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe('user-456');
      expect(retrieved?.email).toBe('user@example.com');
    });

    it('should delete expired challenges', async () => {
      // Create valid challenge
      const validChallenge = await storage.createChallenge({
        challenge: 'valid-challenge',
        type: 'registration',
        userId: 'user-valid',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      // Create expired challenge
      const expiredChallenge = await storage.createChallenge({
        challenge: 'expired-challenge',
        type: 'registration',
        userId: 'user-expired',
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      });

      await storage.deleteExpiredChallenges();

      // Valid challenge should remain
      const validResult = await storage.getChallengeById(validChallenge.id);
      expect(validResult).not.toBeNull();

      // Expired challenge should be removed
      const expiredResult = await storage.getChallengeById(expiredChallenge.id);
      expect(expiredResult).toBeNull();
    });
  });
});

