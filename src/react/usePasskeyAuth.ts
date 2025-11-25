import { useState, useCallback } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import type { UsePasskeyAuthConfig, UsePasskeyAuthReturn } from './types';
import { PasskeyError, WebAuthnNotSupportedError, UserCancelledError } from './types';
import type { User } from '../core/types/user';

/**
 * React hook for passkey authentication
 *
 * Manages the complete WebAuthn authentication flow including:
 * - WebAuthn availability check
 * - API communication (start/finish)
 * - ArrayBuffer/base64url conversions
 * - Error handling and user feedback
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { authenticate, isAuthenticating, error, user } = usePasskeyAuth({
 *     apiUrl: '/api/auth',
 *     onSuccess: (user) => {
 *       console.log('Logged in!', user);
 *       // Redirect to dashboard
 *     }
 *   });
 *
 *   const [email, setEmail] = useState('');
 *
 *   return (
 *     <div>
 *       <input value={email} onChange={(e) => setEmail(e.target.value)} />
 *       <button onClick={() => authenticate({ email })} disabled={isAuthenticating}>
 *         Sign In
 *       </button>
 *       {error && <p>{error.message}</p>}
 *       {user && <p>Welcome, {user.email}!</p>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Autofill-style authentication (no email input needed)
 * function QuickLoginButton() {
 *   const { authenticate, isAuthenticating, error } = usePasskeyAuth({
 *     apiUrl: '/api/auth',
 *     onSuccess: (user) => console.log('Logged in!', user)
 *   });
 *
 *   return (
 *     <button onClick={() => authenticate()} disabled={isAuthenticating}>
 *       {isAuthenticating ? 'Signing in...' : 'Sign In with Passkey'}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePasskeyAuth(config: UsePasskeyAuthConfig): UsePasskeyAuthReturn {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<PasskeyError | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const reset = useCallback(() => {
    setIsAuthenticating(false);
    setError(null);
    setUser(null);
  }, []);

  const authenticate = useCallback(
    async (options?: { email?: string }) => {
      setIsAuthenticating(true);
      setError(null);
      setUser(null);

      try {
        // Check WebAuthn support
        if (!window.PublicKeyCredential) {
          throw new WebAuthnNotSupportedError();
        }

        // Step 1: Start authentication - get challenge from server
        const startResponse = await fetch(`${config.apiUrl}/authenticate/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(options?.email && { body: JSON.stringify({ email: options.email }) }),
        });

        if (!startResponse.ok) {
          const errorData = await startResponse.json();
          throw new PasskeyError(
            errorData.detail || 'Authentication start failed',
            errorData.type,
            errorData
          );
        }

        const startData = await startResponse.json();
        const webAuthnOptions = startData.data || startData;

        // Step 2: Get credential using WebAuthn API
        let assertion;
        try {
          assertion = await startAuthentication(webAuthnOptions);
        } catch (err: any) {
          // Handle user cancellation
          if (
            err.name === 'NotAllowedError' ||
            err.message?.includes('cancel') ||
            err.message?.includes('abort')
          ) {
            throw new UserCancelledError();
          }
          throw new PasskeyError(
            `WebAuthn ceremony failed: ${err.message}`,
            'WEBAUTHN_CEREMONY_FAILED',
            err
          );
        }

        // Step 3: Finish authentication - verify with server
        const finishResponse = await fetch(`${config.apiUrl}/authenticate/finish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: options?.email,
            credential: assertion,
          }),
        });

        if (!finishResponse.ok) {
          const errorData = await finishResponse.json();
          throw new PasskeyError(
            errorData.detail || 'Authentication verification failed',
            errorData.type,
            errorData
          );
        }

        const finishData = await finishResponse.json();
        const responsePayload = finishData?.data ?? finishData ?? {};
        const authenticatedUser = responsePayload?.user || finishData.user;

        setUser(authenticatedUser);

        // Call success callback with whichever payload contains additional metadata
        config.onSuccess?.(authenticatedUser, responsePayload);
      } catch (err: any) {
        const passkeyError =
          err instanceof PasskeyError
            ? err
            : new PasskeyError(err.message || 'Authentication failed', 'UNKNOWN_ERROR', err);

        setError(passkeyError);
        config.onError?.(passkeyError);
      } finally {
        setIsAuthenticating(false);
      }
    },
    [config]
  );

  return {
    authenticate,
    isAuthenticating,
    error,
    user,
    reset,
  };
}
