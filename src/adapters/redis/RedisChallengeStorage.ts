import { randomBytes } from 'crypto';
import type { RedisClientType } from 'redis';
import type { ChallengeStorage } from '../../core/types/storage';
import type { Challenge, CreateChallengeInput } from '../../core/types/challenge';

/**
 * Redis adapter implementing ChallengeStorage interface
 *
 * This is the recommended production implementation for challenge storage.
 * Redis provides automatic TTL expiration and high performance for ephemeral data.
 *
 * Features:
 * - Automatic expiration via Redis TTL
 * - Atomic single-use enforcement via DEL operation
 * - High performance for concurrent authentication requests
 * - Distributed storage for multi-server deployments
 *
 * @example
 * ```typescript
 * import { createClient } from 'redis';
 * import { RedisChallengeStorage } from '@productiongrade/passkeys/adapters/redis';
 *
 * const redis = createClient({ url: process.env.REDIS_URL });
 * await redis.connect();
 *
 * const challengeStorage = new RedisChallengeStorage(redis);
 * ```
 */
export class RedisChallengeStorage implements ChallengeStorage {
  private readonly keyPrefix: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly redis: RedisClientType,
    options?: {
      /** Key prefix for Redis keys (default: 'passkey:challenge:') */
      keyPrefix?: string;
      /** TTL in seconds (default: 300 = 5 minutes) */
      ttlSeconds?: number;
    }
  ) {
    this.keyPrefix = options?.keyPrefix || 'passkey:challenge:';
    this.ttlSeconds = options?.ttlSeconds || 300;
  }

  /**
   * Store a challenge with automatic TTL expiration
   */
  async createChallenge(input: CreateChallengeInput): Promise<Challenge> {
    const id = randomBytes(16).toString('hex');
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);

    const challenge: Challenge = {
      id,
      challenge: input.challenge,
      userId: input.userId,
      email: input.email,
      type: input.type,
      createdAt,
      expiresAt,
    };

    const key = this.getChallengeKey(challenge.challenge);
    const value = JSON.stringify({
      id: challenge.id,
      challenge: challenge.challenge,
      userId: challenge.userId,
      email: challenge.email,
      type: challenge.type,
      createdAt: challenge.createdAt.toISOString(),
      expiresAt: challenge.expiresAt.toISOString(),
    });

    // Use SETEX for atomic set-with-expiration
    await this.redis.setEx(key, this.ttlSeconds, value);

    return challenge;
  }

  /**
   * Get challenge by ID (not commonly used, included for interface compatibility)
   */
  async getChallengeById(id: string): Promise<Challenge | null> {
    // Note: This requires scanning all keys, which is inefficient in Redis
    // In production, you might want to maintain a secondary index if this method is used frequently
    const keys = await this.redis.keys(`${this.keyPrefix}*`);

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const data = JSON.parse(value);
        if (data.id === id) {
          return {
            ...data,
            createdAt: new Date(data.createdAt),
            expiresAt: new Date(data.expiresAt),
          };
        }
      }
    }

    return null;
  }

  /**
   * Get challenge by its value (primary lookup method)
   */
  async getChallengeByValue(challenge: string): Promise<Challenge | null> {
    const key = this.getChallengeKey(challenge);
    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    const data = JSON.parse(value);
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      expiresAt: new Date(data.expiresAt),
    };
  }

  /**
   * Delete a challenge by ID (single-use enforcement)
   * Note: This requires scanning all keys, which is inefficient in Redis.
   * Consider using deleteChallengeByValue for better performance.
   */
  async deleteChallenge(id: string): Promise<void> {
    // This is inefficient but required for interface compatibility
    const keys = await this.redis.keys(`${this.keyPrefix}*`);

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const data = JSON.parse(value);
        if (data.id === id) {
          await this.redis.del(key);
          return;
        }
      }
    }
  }

  /**
   * Delete a challenge by value (more efficient for Redis)
   */
  async deleteChallengeByValue(challenge: string): Promise<void> {
    const key = this.getChallengeKey(challenge);
    await this.redis.del(key);
  }

  /**
   * Delete expired challenges (handled automatically by Redis TTL)
   * This method is provided for interface compatibility but is essentially a no-op
   * since Redis automatically removes expired keys.
   */
  async deleteExpiredChallenges(): Promise<void> {
    // Redis handles expiration automatically via TTL
    // No action needed - this is one of the key benefits of using Redis
    return;
  }

  /**
   * Generate Redis key for a challenge
   */
  private getChallengeKey(challenge: string): string {
    return `${this.keyPrefix}${challenge}`;
  }

  /**
   * Cleanup method to disconnect from Redis
   * Call this when shutting down your application
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
