/**
 * Type definitions for React hooks
 * @module @productiongrade/passkeys/react
 */

import type { User } from '../core/types/user';
import type { Passkey } from '../core/types/passkey';

/**
 * Base configuration for all hooks
 */
export interface HookConfig {
  /** Base URL for the API (e.g., '/api/auth') */
  apiUrl: string;
}

/**
 * Configuration for usePasskeyRegistration hook
 */
export interface UsePasskeyRegistrationConfig extends HookConfig {
  /** Called when registration succeeds */
  onSuccess?: (user: User, passkey: Passkey, recoveryCodes?: string[]) => void;
  /** Called when registration fails */
  onError?: (error: PasskeyError) => void;
}

/**
 * Return type for usePasskeyRegistration hook
 */
export interface UsePasskeyRegistrationReturn {
  /** Function to start registration process */
  register: (options: { email: string; nickname?: string }) => Promise<void>;
  /** Whether registration is in progress */
  isRegistering: boolean;
  /** Current error if any */
  error: PasskeyError | null;
  /** Recovery codes generated during registration */
  recoveryCodes: string[] | null;
  /** User created during registration */
  user: User | null;
  /** Reset the hook state */
  reset: () => void;
}

/**
 * Configuration for usePasskeyAuth hook
 */
export interface UsePasskeyAuthConfig extends HookConfig {
  /** Called when authentication succeeds */
  onSuccess?: (user: User, data?: any) => void;
  /** Called when authentication fails */
  onError?: (error: PasskeyError) => void;
}

/**
 * Return type for usePasskeyAuth hook
 */
export interface UsePasskeyAuthReturn {
  /** Function to start authentication process */
  authenticate: (options?: { email?: string }) => Promise<void>;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Current error if any */
  error: PasskeyError | null;
  /** Authenticated user */
  user: User | null;
  /** Reset the hook state */
  reset: () => void;
}

/**
 * Configuration for usePasskeyManagement hook
 */
export interface UsePasskeyManagementConfig extends HookConfig {
  /** Optional authentication token to include in requests */
  authToken?: string;
  /** Called when a passkey operation succeeds */
  onSuccess?: () => void;
  /** Called when a passkey operation fails */
  onError?: (error: PasskeyError) => void;
}

/**
 * Return type for usePasskeyManagement hook
 */
export interface UsePasskeyManagementReturn {
  /** List of user's passkeys */
  passkeys: Passkey[] | null;
  /** Whether passkeys are being loaded */
  isLoading: boolean;
  /** Current error if any */
  error: PasskeyError | null;
  /** Refresh the passkey list */
  refresh: () => Promise<void>;
  /** Update a passkey's nickname */
  updateNickname: (passkeyId: string, nickname: string) => Promise<void>;
  /** Delete a passkey */
  deletePasskey: (passkeyId: string) => Promise<void>;
  /** Whether an operation is in progress */
  isOperating: boolean;
}

/**
 * Custom error type for passkey operations
 */
export class PasskeyError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'PasskeyError';
  }
}

/**
 * Error thrown when WebAuthn is not supported
 */
export class WebAuthnNotSupportedError extends PasskeyError {
  constructor() {
    super(
      'WebAuthn is not supported in this browser. Please use Chrome, Safari, Edge, or Firefox.',
      'WEBAUTHN_NOT_SUPPORTED'
    );
    this.name = 'WebAuthnNotSupportedError';
  }
}

/**
 * Error thrown when user cancels the WebAuthn ceremony
 */
export class UserCancelledError extends PasskeyError {
  constructor() {
    super('User cancelled the passkey operation', 'USER_CANCELLED');
    this.name = 'UserCancelledError';
  }
}
