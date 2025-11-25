/**
 * NextAuth Provider for Passkey Authentication
 *
 * Provides a NextAuth CredentialsProvider for seamless session integration
 */

// NextAuth types - will be available when next-auth is installed (peer dependency)
type CredentialsConfig = any;
import { PasskeyService } from '../core/services/PasskeyService';
import { ChallengeService } from '../core/services/ChallengeService';
import type { NextAuthPasskeyProviderConfig } from './types';

/**
 * Create a NextAuth Credentials Provider for passkey authentication
 *
 * This provider integrates with NextAuth to handle passkey authentication
 * and automatically create NextAuth sessions on successful login.
 *
 * @param config - Provider configuration (subset of NextPasskeyConfig)
 * @returns NextAuth CredentialsProvider configuration
 *
 * @example
 * ```typescript
 * // app/api/auth/[...nextauth]/route.ts
 * import NextAuth from 'next-auth';
 * import { PasskeyProvider } from '@productiongrade/passkeys/nextjs/provider';
 * import { storage } from '@/lib/storage';
 *
 * const handler = NextAuth({
 *   providers: [
 *     PasskeyProvider({
 *       rpId: 'example.com',
 *       rpName: 'My App',
 *       origin: 'https://example.com',
 *       storage,
 *     }),
 *   ],
 * });
 *
 * export { handler as GET, handler as POST };
 * ```
 *
 * @example
 * ```typescript
 * // With Redis challenge storage
 * import { PasskeyProvider } from '@productiongrade/passkeys/nextjs/provider';
 * import { RedisChallengeStorage } from '@productiongrade/passkeys/adapters/redis';
 *
 * const handler = NextAuth({
 *   providers: [
 *     PasskeyProvider({
 *       rpId: 'example.com',
 *       rpName: 'My App',
 *       origin: 'https://example.com',
 *       storage,
 *       challengeStorage: new RedisChallengeStorage(redisClient),
 *     }),
 *   ],
 * });
 * ```
 */
export function PasskeyProvider(config: NextAuthPasskeyProviderConfig): CredentialsConfig {
  // Initialize services
  const challengeStorage = config.challenges;
  const configWithChallenges = { ...config, challenges: challengeStorage };
  const passkeyService = new PasskeyService(config.storage, configWithChallenges as any);
  const challengeService = new ChallengeService(challengeStorage);

  return {
    id: 'passkey',
    name: 'Passkey',
    type: 'credentials',
    credentials: {
      credential: {
        label: 'WebAuthn Credential',
        type: 'text',
        placeholder: 'Passkey credential response',
      },
    },
    /**
     * T033: Authorize callback that verifies passkey authentication
     *
     * This callback is called by NextAuth when a user attempts to sign in.
     * It receives the WebAuthn credential response and verifies it using
     * the PasskeyService.
     *
     * @param credentials - Credentials object containing the WebAuthn credential
     * @param req - NextAuth request object (not used)
     * @returns User object on success, null on failure (NextAuth convention)
     */
    async authorize(credentials: any, _req: any) {
      try {
        // T035: Parse JSON-stringified credential
        if (!credentials?.credential) {
          console.error('[PasskeyProvider] No credential provided');
          return null; // T034: Return null on failure
        }

        let parsedCredential;
        try {
          // Credential may be JSON string or already parsed object
          parsedCredential =
            typeof credentials.credential === 'string'
              ? JSON.parse(credentials.credential)
              : credentials.credential;
        } catch (error) {
          console.error('[PasskeyProvider] Failed to parse credential JSON:', error);
          return null; // T034: Return null on parsing failure
        }

        // Verify the challenge
        const challenge = await challengeService.verify(parsedCredential.response.clientDataJSON);

        // T033: Verify authentication using PasskeyService
        const { userId } = await passkeyService.verifyAuthentication(
          parsedCredential,
          challenge.challenge
        );

        // Get user information
        const user = await config.storage.getUserById(userId);

        if (!user) {
          console.error('[PasskeyProvider] User not found after authentication:', userId);
          return null;
        }

        // Delete the challenge after successful use
        await challengeService.delete(challenge.id);

        // Return user object in NextAuth format
        // NextAuth will use this to create the session
        return {
          id: user.id,
          email: user.email,
          // Add any other user fields you want in the session
        };
      } catch (error) {
        // T034: Handle errors by returning null (NextAuth convention)
        console.error('[PasskeyProvider] Authentication failed:', error);
        return null;
      }
    },
  };
}
