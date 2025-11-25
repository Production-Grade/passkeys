import {
  generateRegistrationOptions as generateWebAuthnRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions as generateWebAuthnAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
} from '@simplewebauthn/server';

import type { PasskeyStorage } from '../types/storage';
import type { PasskeyConfig } from '../types/config';
import type { Passkey } from '../types/passkey';
import {
  AuthenticationError,
  RegistrationError,
  CounterAnomalyError,
  PasskeyNotFoundError,
  ValidationError,
} from '../types/errors';
import { validateEmail } from '../utils/validation';
import { uint8ArrayToBase64url } from '../utils/encoding';

// Use any for WebAuthn response types as they're validated by SimpleWebAuthn
type RegistrationResponse = any;
type AuthenticationResponse = any;

/**
 * Service for managing passkey registration and authentication
 * Wraps SimpleWebAuthn with our storage and hooks
 */
export class PasskeyService {
  constructor(
    private readonly storage: PasskeyStorage,
    private readonly config: PasskeyConfig
  ) {}

  /**
   * Generate registration options for a new passkey
   * Step 1 of WebAuthn registration ceremony
   */
  async generateRegistrationOptions(email: string): Promise<{
    options: Awaited<ReturnType<typeof generateWebAuthnRegistrationOptions>>;
    userId: string;
  }> {
    validateEmail(email);

    // Call registration start hook
    await this.config.hooks?.onRegistrationStart?.(email, email);

    // Get or create user
    let user = await this.storage.getUserByEmail(email);
    if (!user) {
      user = await this.storage.createUser({ email });
    }

    // Get existing passkeys for this user
    const existingPasskeys = await this.storage.getUserPasskeys(user.id);

    const opts: GenerateRegistrationOptionsOpts = {
      rpName: this.config.rpName,
      rpID: this.config.rpId,
      userID: user.id,
      userName: user.email,
      userDisplayName: user.email,
      attestationType: this.config.attestationType || 'none',
      authenticatorSelection: {
        userVerification: this.config.userVerification || 'preferred',
        residentKey: 'preferred',
      },
      excludeCredentials: existingPasskeys
        .filter((passkey) => passkey.transports)
        .map((passkey) => ({
          id: Buffer.from(passkey.id, 'base64url') as any,
          type: 'public-key' as const,
          transports: passkey.transports as any,
        })),
      timeout: this.config.timeout || 60000,
    };

    const options = await generateWebAuthnRegistrationOptions(opts);

    return { options, userId: user.id };
  }

  /**
   * Verify and complete passkey registration
   * Step 2 of WebAuthn registration ceremony
   */
  async verifyRegistration(
    response: RegistrationResponse,
    expectedChallenge: string,
    userId: string,
    nickname?: string | undefined
  ): Promise<Passkey> {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.config.origin,
        expectedRPID: this.config.rpId,
        requireUserVerification: this.config.userVerification === 'required',
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new RegistrationError('Registration verification failed', {
          troubleshooting: 'https://productiongrade.dev/docs/troubleshooting#registration-verification',
          commonCauses: [
            'Browser not supporting WebAuthn',
            'HTTPS required in production (localhost exception for development)',
            'Origin mismatch between rpId and request origin',
            'User cancelled the registration',
            'Authenticator error or timeout',
          ],
          solutions: [
            'Ensure you are using HTTPS in production',
            'Verify rpId matches your domain',
            'Check browser console for WebAuthn errors',
            'Try a different browser or device',
          ],
        });
      }

      const {
        credentialID,
        credentialPublicKey,
        counter,
        credentialDeviceType,
        credentialBackedUp,
      } = verification.registrationInfo;

      // Store the passkey
      const passkey = await this.storage.createPasskey({
        id: uint8ArrayToBase64url(credentialID),
        userId,
        publicKey: uint8ArrayToBase64url(credentialPublicKey),
        counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: response.response?.transports,
        nickname,
      });

      // Call success hook
      await this.config.hooks?.onRegistrationSuccess?.(userId, passkey.id);

      return passkey;
    } catch (error) {
      // Call failure hook
      await this.config.hooks?.onRegistrationFailure?.(userId, error as Error);
      throw error instanceof RegistrationError
        ? error
        : new RegistrationError((error as Error).message);
    }
  }

  /**
   * Generate authentication options for passkey login
   * Step 1 of WebAuthn authentication ceremony
   */
  async generateAuthenticationOptions(email?: string): Promise<{
    options: Awaited<ReturnType<typeof generateWebAuthnAuthenticationOptions>>;
    userId?: string | undefined;
  }> {
    // Call auth start hook
    if (email) {
      await this.config.hooks?.onAuthStart?.(email);
    }

    let allowCredentials: Array<{ id: string; type: 'public-key'; transports?: string[] }> = [];
    let userId: string | undefined;

    // If email provided, get user's passkeys
    if (email) {
      validateEmail(email);
      const user = await this.storage.getUserByEmail(email);

      if (user) {
        userId = user.id;
        const passkeys = await this.storage.getUserPasskeys(user.id);
        allowCredentials = passkeys
          .filter((passkey) => passkey.transports)
          .map((passkey) => ({
            id: Buffer.from(passkey.id, 'base64url') as any,
            type: 'public-key' as const,
            transports: passkey.transports as any,
          }));
      }
    }

    const opts: GenerateAuthenticationOptionsOpts = {
      rpID: this.config.rpId,
      userVerification: this.config.userVerification || 'preferred',
      timeout: this.config.timeout || 60000,
      allowCredentials: allowCredentials.length > 0 ? (allowCredentials as any) : undefined,
    };

    const options = await generateWebAuthnAuthenticationOptions(opts);

    return { options, userId };
  }

  /**
   * Verify and complete passkey authentication
   * Step 2 of WebAuthn authentication ceremony
   */
  async verifyAuthentication(
    response: AuthenticationResponse,
    expectedChallenge: string
  ): Promise<{ userId: string; passkey: Passkey }> {
    try {
      // Get the passkey credential
      const credentialId = response.id;
      const passkey = await this.storage.getPasskeyById(credentialId);

      if (!passkey) {
        throw new AuthenticationError('Passkey not found', {
          troubleshooting: 'https://productiongrade.dev/docs/troubleshooting#passkey-not-found',
          commonCauses: [
            'Passkey was deleted',
            'User is using a different device',
            'Browser cleared stored credentials',
            'Passkey ID mismatch',
          ],
          solutions: [
            'Ask user to register a new passkey',
            'Check if passkey exists in storage',
            'Verify passkey ID is correct',
          ],
        });
      }

      // Verify the authentication response
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.config.origin,
        expectedRPID: this.config.rpId,
        requireUserVerification: this.config.userVerification === 'required',
        authenticator: {
          credentialID: Buffer.from(passkey.id, 'base64url'),
          credentialPublicKey: Buffer.from(passkey.publicKey, 'base64url'),
          counter: passkey.counter,
          transports: passkey.transports as any,
        } as any,
      });

      if (!verification.verified) {
        const user = await this.storage.getUserById(passkey.userId);
        await this.config.hooks?.onAuthFailure?.(
          user?.email || 'unknown',
          new AuthenticationError('Verification failed')
        );
        throw new AuthenticationError('Authentication verification failed', {
          troubleshooting: 'https://productiongrade.dev/docs/troubleshooting#authentication-verification',
          commonCauses: [
            'Browser not supporting WebAuthn',
            'HTTPS required in production',
            'Origin mismatch between rpId and request origin',
            'User cancelled the authentication',
            'Challenge expired (5 minute TTL)',
            'Counter anomaly detected (possible cloned credential)',
          ],
          solutions: [
            'Ensure you are using HTTPS in production',
            'Verify rpId matches your domain',
            'Check browser console for WebAuthn errors',
            'Try a different browser or device',
            'Generate a new challenge if expired',
          ],
        });
      }

      const { newCounter } = verification.authenticationInfo;

      // Counter anomaly detection
      // Only check if both counters are > 0 (some authenticators don't support counters)
      if (passkey.counter > 0 && newCounter > 0 && newCounter <= passkey.counter) {
        await this.config.hooks?.onCounterAnomaly?.(
          passkey.userId,
          passkey.id,
          passkey.counter,
          newCounter
        );
        throw new CounterAnomalyError(passkey.counter, newCounter);
      }

      // Update passkey counter and last used timestamp
      const updatedPasskey = await this.storage.updatePasskey(passkey.id, {
        counter: newCounter,
        lastUsedAt: new Date(),
      });

      // Call success hook
      await this.config.hooks?.onAuthSuccess?.(passkey.userId, passkey.id);

      return {
        userId: passkey.userId,
        passkey: updatedPasskey,
      };
    } catch (error) {
      throw error instanceof AuthenticationError || error instanceof CounterAnomalyError
        ? error
        : new AuthenticationError((error as Error).message, {
            troubleshooting: 'https://productiongrade.dev/docs/troubleshooting#authentication-errors',
            commonCauses: ['Unexpected error during authentication'],
          });
    }
  }

  /**
   * Get all passkeys for a user
   */
  async getUserPasskeys(userId: string): Promise<Passkey[]> {
    return this.storage.getUserPasskeys(userId);
  }

  /**
   * Update passkey counter (for manual counter updates)
   */
  async updatePasskeyCounter(passkeyId: string, counter: number): Promise<Passkey> {
    return this.storage.updatePasskey(passkeyId, { counter });
  }

  /**
   * Update passkey nickname with ownership validation
   */
  async updatePasskeyNickname(
    userId: string,
    passkeyId: string,
    nickname: string
  ): Promise<Passkey> {
    const passkey = await this.storage.getPasskeyById(passkeyId);
    if (!passkey || passkey.userId !== userId) {
      // Don't reveal if passkey exists but belongs to another user
      throw new PasskeyNotFoundError(passkeyId);
    }
    return this.storage.updatePasskey(passkeyId, { nickname });
  }

  /**
   * Delete a passkey with last-passkey prevention and ownership validation
   */
  async deletePasskey(userId: string, passkeyId: string): Promise<void> {
    const passkey = await this.storage.getPasskeyById(passkeyId);
    if (!passkey || passkey.userId !== userId) {
      // Don't reveal if passkey exists but belongs to another user
      throw new PasskeyNotFoundError(passkeyId);
    }

    // Prevent deletion of last passkey
    const userPasskeys = await this.storage.getUserPasskeys(userId);
    if (userPasskeys.length <= 1) {
      throw new ValidationError(
        'Cannot delete last passkey. User must have at least one authentication method.'
      );
    }

    await this.storage.deletePasskey(passkeyId);
    await this.config.hooks?.onPasskeyDeleted?.({ userId, passkeyId });
  }
}
