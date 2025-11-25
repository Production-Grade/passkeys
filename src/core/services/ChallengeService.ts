import type { ChallengeStorage } from '../types/storage';
import type { Challenge, CreateChallengeInput, ChallengeType } from '../types/challenge';
import { CHALLENGE_TTL_MS } from '../types/challenge';
import { InvalidChallengeError } from '../types/errors';
import { generateChallenge } from '../utils/crypto';

/**
 * Service for managing WebAuthn challenges
 * Handles creation, verification, and cleanup of challenges
 */
export class ChallengeService {
  constructor(private readonly storage: ChallengeStorage) {}

  /**
   * Generate and store a new challenge
   */
  async create(type: ChallengeType, userId?: string, email?: string): Promise<Challenge> {
    const challenge = generateChallenge();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    const input: CreateChallengeInput = {
      challenge,
      type,
      userId,
      email,
      expiresAt,
    };

    return this.storage.createChallenge(input);
  }

  /**
   * Store an existing challenge (e.g., from SimpleWebAuthn)
   */
  async store(
    challenge: string,
    type: ChallengeType,
    userId?: string,
    email?: string
  ): Promise<Challenge> {
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    const input: CreateChallengeInput = {
      challenge,
      type,
      userId,
      email,
      expiresAt,
    };

    return this.storage.createChallenge(input);
  }

  /**
   * Verify a challenge exists and is valid
   * @param clientDataJSON - Base64url-encoded client data JSON from WebAuthn response
   * @throws {InvalidChallengeError} if challenge is invalid or expired
   */
  async verify(clientDataJSON: string): Promise<Challenge> {
    // Decode clientDataJSON to extract the challenge
    const clientDataString = Buffer.from(clientDataJSON, 'base64url').toString('utf-8');
    const clientData = JSON.parse(clientDataString);
    const challenge = clientData.challenge;

    if (!challenge) {
      throw new InvalidChallengeError('Challenge not found in client data');
    }

    const storedChallenge = await this.storage.getChallengeByValue(challenge);

    if (!storedChallenge) {
      throw new InvalidChallengeError('Challenge not found');
    }

    // Check if expired
    if (storedChallenge.expiresAt < new Date()) {
      // Clean up expired challenge
      await this.storage.deleteChallenge(storedChallenge.id);
      throw new InvalidChallengeError('Challenge has expired');
    }

    return storedChallenge;
  }

  /**
   * Delete a challenge after successful use
   */
  async delete(challengeId: string): Promise<void> {
    await this.storage.deleteChallenge(challengeId);
  }

  /**
   * Clean up expired challenges (maintenance operation)
   */
  async cleanupExpired(): Promise<void> {
    await this.storage.deleteExpiredChallenges();
  }
}
