import type { AuthenticatorDevice } from '@simplewebauthn/server/script/deps';

/**
 * WebAuthn authenticator transport types
 */
export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid';

/**
 * Passkey (WebAuthn credential) entity
 */
export interface Passkey {
  /** Unique passkey identifier (credential ID, base64url encoded) */
  id: string;

  /** User ID this passkey belongs to */
  userId: string;

  /** Public key (base64url encoded) */
  publicKey: string;

  /** Signature counter for replay attack detection */
  counter: number;

  /** Device type information */
  deviceType: 'singleDevice' | 'multiDevice';

  /** Whether credential is backed up to cloud */
  backedUp: boolean;

  /** Transports supported by this authenticator */
  transports?: AuthenticatorTransport[] | undefined;

  /** User-friendly nickname for this passkey */
  nickname?: string | undefined;

  /** Timestamp of last use */
  lastUsedAt?: Date | undefined;

  /** Timestamp when passkey was created */
  createdAt: Date;

  /** Timestamp when passkey was last updated */
  updatedAt: Date;
}

/**
 * Passkey creation input
 */
export interface CreatePasskeyInput {
  /** Credential ID (base64url encoded) */
  id: string;

  /** User ID */
  userId: string;

  /** Public key (base64url encoded) */
  publicKey: string;

  /** Initial counter value */
  counter: number;

  /** Device type */
  deviceType: 'singleDevice' | 'multiDevice';

  /** Backup eligibility */
  backedUp: boolean;

  /** Transports */
  transports?: AuthenticatorTransport[] | undefined;

  /** Optional nickname */
  nickname?: string | undefined;
}

/**
 * Passkey update input
 */
export interface UpdatePasskeyInput {
  /** Updated counter value */
  counter?: number;

  /** Updated nickname */
  nickname?: string;

  /** Updated last used timestamp */
  lastUsedAt?: Date;
}

/**
 * Helper type for authenticator device conversion
 */
export type PasskeyDevice = AuthenticatorDevice;
