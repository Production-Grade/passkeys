import { randomUUID } from 'crypto';
import type { ChallengeStorage } from '../../core/types/storage';
import type { Challenge, CreateChallengeInput } from '../../core/types/challenge';

/**
 * In-memory challenge storage for testing and development
 * NOT suitable for production (use Redis or similar with TTL support)
 */
export class MemoryChallengeStorage implements ChallengeStorage {
  private challenges: Map<string, Challenge> = new Map();
  private challengesByValue: Map<string, Challenge> = new Map();

  async createChallenge(input: CreateChallengeInput): Promise<Challenge> {
    const challenge: Challenge = {
      id: randomUUID(),
      challenge: input.challenge,
      userId: input.userId,
      email: input.email,
      type: input.type,
      expiresAt: input.expiresAt || new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    };

    this.challenges.set(challenge.id, challenge);
    this.challengesByValue.set(challenge.challenge, challenge);

    return challenge;
  }

  async getChallengeById(id: string): Promise<Challenge | null> {
    const challenge = this.challenges.get(id);

    if (!challenge) {
      return null;
    }

    // Check if expired
    if (challenge.expiresAt < new Date()) {
      this.deleteChallenge(id);
      return null;
    }

    return challenge;
  }

  async getChallengeByValue(challenge: string): Promise<Challenge | null> {
    const storedChallenge = this.challengesByValue.get(challenge);

    if (!storedChallenge) {
      return null;
    }

    // Check if expired
    if (storedChallenge.expiresAt < new Date()) {
      this.deleteChallenge(storedChallenge.id);
      return null;
    }

    return storedChallenge;
  }

  async deleteChallenge(id: string): Promise<void> {
    const challenge = this.challenges.get(id);
    if (challenge) {
      this.challenges.delete(id);
      this.challengesByValue.delete(challenge.challenge);
    }
  }

  async deleteExpiredChallenges(): Promise<void> {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, challenge] of this.challenges.entries()) {
      if (challenge.expiresAt < now) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.deleteChallenge(id);
    }
  }
}
