/**
 * React hooks for passkey authentication
 *
 * Provides ready-to-use React hooks for building passkey authentication UIs.
 * All hooks handle WebAuthn complexity, error states, and loading states automatically.
 *
 * @module @productiongrade/passkeys/react
 *
 * @example
 * ```tsx
 * import {
 *   usePasskeyRegistration,
 *   usePasskeyAuth,
 *   usePasskeyManagement,
 *   isWebAuthnSupported
 * } from '@productiongrade/passkeys/react';
 *
 * function App() {
 *   if (!isWebAuthnSupported()) {
 *     return <p>Passkeys not supported in this browser</p>;
 *   }
 *
 *   return <PasskeyAuthFlow />;
 * }
 * ```
 */

// Hooks
export { usePasskeyRegistration } from './usePasskeyRegistration';
export { usePasskeyAuth } from './usePasskeyAuth';
export { usePasskeyManagement } from './usePasskeyManagement';

// Types
export type {
  HookConfig,
  UsePasskeyRegistrationConfig,
  UsePasskeyRegistrationReturn,
  UsePasskeyAuthConfig,
  UsePasskeyAuthReturn,
  UsePasskeyManagementConfig,
  UsePasskeyManagementReturn,
} from './types';

// Error classes
export { PasskeyError, WebAuthnNotSupportedError, UserCancelledError } from './types';

// Utilities
export {
  isWebAuthnSupported,
  formatPasskeyError,
  getDeviceTypeLabel,
  formatTransports,
  formatDate,
} from './utils';
