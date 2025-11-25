import type { PasskeyStorage, ChallengeStorage } from './storage';

/**
 * Main configuration interface for Passkeys library
 */
export interface PasskeyConfig {
  /** Relying Party ID (typically your domain, e.g., 'example.com') */
  rpId: string;

  /** Relying Party Name (human-readable app name) */
  rpName: string;

  /** Expected origin (e.g., 'https://example.com') */
  origin: string;

  /** Storage implementation for users and passkeys */
  storage: PasskeyStorage;

  /** Challenge storage implementation */
  challenges: ChallengeStorage;

  /** Recovery configuration (optional) */
  recovery?: RecoveryConfig;

  /** Security hooks for monitoring (optional) */
  hooks?: SecurityHooks;

  /** Timeout for authentication operations in milliseconds (default: 60000) */
  timeout?: number;

  /** User verification requirement (default: 'preferred') */
  userVerification?: UserVerificationRequirement;

  /** Attestation type (default: 'none') */
  attestationType?: AttestationConveyancePreference;
}

/**
 * Recovery mechanisms configuration
 */
export interface RecoveryConfig {
  /** Recovery codes configuration */
  codes?: {
    enabled: boolean;
    count?: number; // Default: 10
    length?: number; // Default: 8
  };

  /** Email recovery configuration */
  email?: {
    enabled: boolean;
    sendEmail: (_to: string, _token: string, _userId: string) => Promise<void>;
    tokenTTL?: number; // Minutes, default: 60
  };
}

/**
 * Security event hooks for monitoring
 */
export interface SecurityHooks {
  /** Called when passkey registration starts */
  onRegistrationStart?: (_userId: string, _email: string) => void | Promise<void>;

  /** Called when passkey registration succeeds */
  onRegistrationSuccess?: (_userId: string, _passkeyId: string) => void | Promise<void>;

  /** Called when passkey registration fails */
  onRegistrationFailure?: (_userId: string, _error: Error) => void | Promise<void>;

  /** Called when authentication starts */
  onAuthStart?: (_email: string) => void | Promise<void>;

  /** Called when authentication succeeds */
  onAuthSuccess?: (_userId: string, _passkeyId: string) => void | Promise<void>;

  /** Called when authentication fails */
  onAuthFailure?: (_email: string, _error: Error) => void | Promise<void>;

  /** Called when counter anomaly is detected (possible cloned credential) */
  onCounterAnomaly?: (
    _userId: string,
    _passkeyId: string,
    _expectedCounter: number,
    _receivedCounter: number
  ) => void | Promise<void>;

  /** Called when recovery code is used */
  onRecoveryCodeUsed?: (_userId: string) => void | Promise<void>;

  /** Called when email recovery is initiated */
  onEmailRecoveryRequested?: (_userId: string, _email: string) => void | Promise<void>;

  /** Called when email recovery is completed successfully */
  onEmailRecoveryCompleted?: (_userId: string) => void | Promise<void>;

  /** Called when recovery codes are regenerated */
  onRecoveryCodesRegenerated?: (_userId: string, _count: number) => void | Promise<void>;

  /** Called when a passkey is deleted */
  onPasskeyDeleted?: (_data: { userId: string; passkeyId: string }) => void | Promise<void>;
}

/**
 * WebAuthn user verification requirement
 */
export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged';

/**
 * WebAuthn attestation conveyance preference
 */
export type AttestationConveyancePreference = 'none' | 'indirect' | 'direct' | 'enterprise';
