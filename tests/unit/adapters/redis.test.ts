import { describe, it, expect, beforeEach } from '@jest/globals';
import { RedisChallengeStorage } from '../../../src/adapters/redis/RedisChallengeStorage';

// Mock Redis client
const mockRedis = {
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
} as any;

describe('RedisChallengeStorage', () => {
  let storage: RedisChallengeStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new RedisChallengeStorage(mockRedis);
  });

  describe('createChallenge', () => {
    it('should create challenge with TTL', async () => {
      const challenge = await storage.createChallenge({
        challenge: 'test-challenge',
        userId: 'user-123',
        email: 'test@example.com',
        type: 'registration',
      });

      expect(challenge.challenge).toBe('test-challenge');
      expect(challenge.userId).toBe('user-123');
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining('test-challenge'),
        300, // Default TTL
        expect.stringContaining('test-challenge')
      );
    });

    it('should use custom TTL', async () => {
      const customStorage = new RedisChallengeStorage(mockRedis, { ttlSeconds: 600 });
      
      await customStorage.createChallenge({
        challenge: 'test-challenge',
        userId: 'user-123',
        email: 'test@example.com',
        type: 'registration',
      });

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.any(String),
        600,
        expect.any(String)
      );
    });

    it('should use custom key prefix', async () => {
      const customStorage = new RedisChallengeStorage(mockRedis, { keyPrefix: 'custom:' });
      
      await customStorage.createChallenge({
        challenge: 'test-challenge',
        userId: 'user-123',
        email: 'test@example.com',
        type: 'registration',
      });

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining('custom:'),
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('getChallengeByValue', () => {
    it('should get challenge by value', async () => {
      const mockData = JSON.stringify({
        id: 'challenge-id',
        challenge: 'test-challenge',
        userId: 'user-123',
        email: 'test@example.com',
        type: 'registration',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      });
      mockRedis.get.mockResolvedValue(mockData);

      const result = await storage.getChallengeByValue('test-challenge');

      expect(result).not.toBeNull();
      expect(result?.challenge).toBe('test-challenge');
      expect(result?.userId).toBe('user-123');
    });

    it('should return null if challenge not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await storage.getChallengeByValue('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getChallengeById', () => {
    it('should get challenge by ID', async () => {
      const mockData = JSON.stringify({
        id: 'challenge-id',
        challenge: 'test-challenge',
        userId: 'user-123',
        email: 'test@example.com',
        type: 'registration',
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      });
      mockRedis.keys.mockResolvedValue(['key1', 'key2']);
      mockRedis.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockData);

      const result = await storage.getChallengeById('challenge-id');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('challenge-id');
    });

    it('should return null if challenge not found', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await storage.getChallengeById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteChallenge', () => {
    it('should delete challenge by ID', async () => {
      const mockData = JSON.stringify({ id: 'challenge-id' });
      mockRedis.keys.mockResolvedValue(['key1']);
      mockRedis.get.mockResolvedValue(mockData);
      mockRedis.del.mockResolvedValue(1);

      await storage.deleteChallenge('challenge-id');

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('deleteExpiredChallenges', () => {
    it('should be a no-op (Redis handles TTL automatically)', async () => {
      await storage.deleteExpiredChallenges();

      // Should not call any Redis methods
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(mockRedis.keys).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      await storage.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});

