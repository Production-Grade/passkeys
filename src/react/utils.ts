import type { PasskeyError } from './types';

/**
 * Utility functions for React hooks
 * @module @productiongrade/passkeys/react
 */

/**
 * Check if WebAuthn is supported in the current browser
 *
 * @returns true if WebAuthn is supported, false otherwise
 *
 * @example
 * ```tsx
 * import { isWebAuthnSupported } from '@productiongrade/passkeys/react';
 *
 * function LoginPage() {
 *   if (!isWebAuthnSupported()) {
 *     return <p>Your browser doesn't support passkeys. Please use a modern browser.</p>;
 *   }
 *
 *   return <PasskeyLoginForm />;
 * }
 * ```
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Format a PasskeyError for user display
 *
 * Converts technical error messages into user-friendly text.
 *
 * @param error - The PasskeyError to format
 * @returns User-friendly error message
 *
 * @example
 * ```tsx
 * import { formatPasskeyError } from '@productiongrade/passkeys/react';
 *
 * function ErrorDisplay({ error }: { error: PasskeyError }) {
 *   const message = formatPasskeyError(error);
 *   return <p className="error">{message}</p>;
 * }
 * ```
 */
export function formatPasskeyError(error: PasskeyError): string {
  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    WEBAUTHN_NOT_SUPPORTED:
      'Your browser does not support passkeys. Please use Chrome, Safari, Edge, or Firefox.',
    USER_CANCELLED: 'You cancelled the passkey operation. Please try again.',
    WEBAUTHN_CEREMONY_FAILED: 'Failed to complete the passkey operation. Please try again.',
    INVALID_CHALLENGE: 'The security challenge expired. Please try again.',
    AUTHENTICATION_ERROR: 'Authentication failed. Please try again.',
    REGISTRATION_ERROR: 'Registration failed. Please try again.',
    PASSKEY_NOT_FOUND: 'Passkey not found. It may have been deleted.',
    VALIDATION_ERROR: 'Invalid input. Please check your details and try again.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  };

  if (error.code && errorMessages[error.code]) {
    return errorMessages[error.code]!;
  }

  // Fall back to the original error message
  return error.message || 'An error occurred. Please try again.';
}

/**
 * Get a user-friendly device type label
 *
 * @param deviceType - The device type from the passkey
 * @returns User-friendly device type label
 *
 * @example
 * ```tsx
 * import { getDeviceTypeLabel } from '@productiongrade/passkeys/react';
 *
 * function PasskeyCard({ passkey }: { passkey: Passkey }) {
 *   return (
 *     <div>
 *       <p>{getDeviceTypeLabel(passkey.deviceType)}</p>
 *       <p>{passkey.nickname || 'Unnamed device'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function getDeviceTypeLabel(deviceType: string): string {
  const labels: Record<string, string> = {
    singleDevice: 'Single Device (e.g., Security Key)',
    multiDevice: 'Synced Device (e.g., Phone, Computer)',
    platform: 'This Device',
    crossPlatform: 'External Device',
  };

  return labels[deviceType] || 'Unknown Device';
}

/**
 * Format a transport array into a readable string
 *
 * @param transports - Array of transport types
 * @returns User-friendly transport description
 *
 * @example
 * ```tsx
 * import { formatTransports } from '@productiongrade/passkeys/react';
 *
 * function PasskeyDetails({ passkey }: { passkey: Passkey }) {
 *   return <p>Connection: {formatTransports(passkey.transports)}</p>;
 * }
 * ```
 */
export function formatTransports(transports: string[]): string {
  if (!transports || transports.length === 0) {
    return 'Unknown';
  }

  const transportLabels: Record<string, string> = {
    usb: 'USB',
    nfc: 'NFC',
    ble: 'Bluetooth',
    internal: 'Built-in',
    hybrid: 'Hybrid',
  };

  const labels = transports.map((t) => transportLabels[t] || t).filter(Boolean);

  if (labels.length === 0) {
    return 'Unknown';
  }

  if (labels.length === 1) {
    return labels[0]!;
  }

  const last = labels.pop()!;
  return `${labels.join(', ')} and ${last}`;
}

/**
 * Format a date for passkey display
 *
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 *
 * @example
 * ```tsx
 * import { formatDate } from '@productiongrade/passkeys/react';
 *
 * function PasskeyCard({ passkey }: { passkey: Passkey }) {
 *   return (
 *     <div>
 *       <p>Created: {formatDate(passkey.createdAt)}</p>
 *       <p>Last used: {formatDate(passkey.lastUsedAt, { dateStyle: 'short' })}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) {
    return 'Never';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  };

  return dateObj.toLocaleString(undefined, options || defaultOptions);
}
