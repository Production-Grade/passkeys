import { useState, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import type { UsePasskeyRegistrationConfig, UsePasskeyRegistrationReturn } from './types';
import { PasskeyError, WebAuthnNotSupportedError, UserCancelledError } from './types';
import type { User } from '../core/types/user';

/**
 * React hook for passkey registration
 *
 * Manages the complete WebAuthn registration flow including:
 * - WebAuthn availability check
 * - API communication (start/finish)
 * - ArrayBuffer/base64url conversions
 * - Error handling and user feedback
 * - Recovery code display
 *
 * @example
 * ```tsx
 * function RegisterForm() {
 *   const { register, isRegistering, error, recoveryCodes } = usePasskeyRegistration({
 *     apiUrl: '/api/auth',
 *     onSuccess: (user, passkey, codes) => {
 *       console.log('Registered!', user);
 *       // Navigate to recovery code display
 *     }
 *   });
 *
 *   const [email, setEmail] = useState('');
 *
 *   return (
 *     <div>
 *       <input value={email} onChange={(e) => setEmail(e.target.value)} />
 *       <button onClick={() => register({ email })} disabled={isRegistering}>
 *         Register
 *       </button>
 *       {error && <p>{error.message}</p>}
 *       {recoveryCodes && (
 *         <div>
 *           <h3>Save these recovery codes!</h3>
 *           {recoveryCodes.map(code => <div key={code}>{code}</div>)}
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePasskeyRegistration(
  config: UsePasskeyRegistrationConfig
): UsePasskeyRegistrationReturn {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<PasskeyError | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const reset = useCallback(() => {
    setIsRegistering(false);
    setError(null);
    setRecoveryCodes(null);
    setUser(null);
  }, []);

  const register = useCallback(
    async (options: { email: string; nickname?: string }) => {
      setIsRegistering(true);
      setError(null);
      setRecoveryCodes(null);
      setUser(null);

      try {
        // Check WebAuthn support
        if (!window.PublicKeyCredential) {
          throw new WebAuthnNotSupportedError();
        }

        // Step 1: Start registration - get challenge from server
        const startResponse = await fetch(`${config.apiUrl}/register/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: options.email,
            nickname: options.nickname,
          }),
        });

        if (!startResponse.ok) {
          const errorData = await startResponse.json();
          throw new PasskeyError(
            errorData.detail || 'Registration start failed',
            errorData.type,
            errorData
          );
        }

        const startData = await startResponse.json();
        const webAuthnOptions = startData.data || startData;
        const userId = startData.userId;

        // Step 2: Create credential using WebAuthn API
        let credential;
        try {
          credential = await startRegistration(webAuthnOptions);
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

        // Step 3: Finish registration - verify with server
        const finishResponse = await fetch(`${config.apiUrl}/register/finish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            credential,
          }),
        });

        if (!finishResponse.ok) {
          const errorData = await finishResponse.json();
          throw new PasskeyError(
            errorData.detail || 'Registration verification failed',
            errorData.type,
            errorData
          );
        }

        const finishData = await finishResponse.json();
        const registeredUser = finishData.data?.user || finishData.user;
        const passkey = finishData.data?.passkey || finishData.passkey;
        const codes = finishData.data?.recoveryCodes || finishData.recoveryCodes;

        setUser(registeredUser);
        setRecoveryCodes(codes || null);

        // Call success callback
        config.onSuccess?.(registeredUser, passkey, codes);
      } catch (err: any) {
        const passkeyError =
          err instanceof PasskeyError
            ? err
            : new PasskeyError(err.message || 'Registration failed', 'UNKNOWN_ERROR', err);

        setError(passkeyError);
        config.onError?.(passkeyError);
      } finally {
        setIsRegistering(false);
      }
    },
    [config]
  );

  return {
    register,
    isRegistering,
    error,
    recoveryCodes,
    user,
    reset,
  };
}
