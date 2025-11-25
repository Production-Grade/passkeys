import { useState, useCallback, useEffect } from 'react';
import type { UsePasskeyManagementConfig, UsePasskeyManagementReturn } from './types';
import { PasskeyError } from './types';
import type { Passkey } from '../core/types/passkey';

/**
 * React hook for managing user's passkeys
 *
 * Provides CRUD operations for passkeys:
 * - List all passkeys for a user
 * - Update passkey nicknames
 * - Delete passkeys (with last-passkey prevention)
 * - Auto-refresh on mount
 *
 * @example
 * ```tsx
 * function PasskeyManager({ userId }: { userId: string }) {
 *   const {
 *     passkeys,
 *     isLoading,
 *     error,
 *     updateNickname,
 *     deletePasskey,
 *     isOperating
 *   } = usePasskeyManagement({
 *     apiUrl: '/api/auth',
 *     userId,
 *     onSuccess: () => console.log('Operation successful!')
 *   });
 *
 *   if (isLoading) return <p>Loading passkeys...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *
 *   return (
 *     <div>
 *       <h2>Your Passkeys</h2>
 *       {passkeys?.map(passkey => (
 *         <div key={passkey.id}>
 *           <p>{passkey.nickname || passkey.deviceType}</p>
 *           <p>Created: {new Date(passkey.createdAt).toLocaleDateString()}</p>
 *           <button onClick={() => updateNickname(passkey.id, 'My iPhone')}>
 *             Rename
 *           </button>
 *           <button
 *             onClick={() => deletePasskey(passkey.id)}
 *             disabled={passkeys.length === 1}
 *           >
 *             Delete
 *           </button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePasskeyManagement(
  config: UsePasskeyManagementConfig
): UsePasskeyManagementReturn {
  const { apiUrl, authToken, onError, onSuccess } = config;
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);
  const [error, setError] = useState<PasskeyError | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiUrl}/passkeys`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new PasskeyError(
          errorData.detail || 'Failed to load passkeys',
          errorData.type,
          errorData
        );
      }

      const data = await response.json();
      const passkeyList = data.data?.passkeys || data.passkeys || [];
      setPasskeys(passkeyList);
    } catch (err: any) {
      const passkeyError =
        err instanceof PasskeyError
          ? err
          : new PasskeyError(err.message || 'Failed to load passkeys', 'UNKNOWN_ERROR', err);

      setError(passkeyError);
      onError?.(passkeyError);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, authToken]); // Remove onError from dependencies

  const updateNickname = useCallback(
    async (passkeyId: string, nickname: string) => {
      setIsOperating(true);
      setError(null);

      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${apiUrl}/passkeys/${passkeyId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ nickname }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new PasskeyError(
            errorData.detail || 'Failed to update passkey nickname',
            errorData.type,
            errorData
          );
        }

        // Update local state
        setPasskeys((prev: Passkey[] | null) =>
          prev ? prev.map((p: Passkey) => (p.id === passkeyId ? { ...p, nickname } : p)) : null
        );

        onSuccess?.();
      } catch (err: any) {
        const passkeyError =
          err instanceof PasskeyError
            ? err
            : new PasskeyError(
                err.message || 'Failed to update passkey nickname',
                'UNKNOWN_ERROR',
                err
              );

        setError(passkeyError);
        onError?.(passkeyError);
      } finally {
        setIsOperating(false);
      }
    },
    [apiUrl, authToken, onError, onSuccess]
  );

  const deletePasskey = useCallback(
    async (passkeyId: string) => {
      setIsOperating(true);
      setError(null);

      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${apiUrl}/passkeys/${passkeyId}`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new PasskeyError(
            errorData.detail || 'Failed to delete passkey',
            errorData.type,
            errorData
          );
        }

        // Remove from local state
        setPasskeys((prev: Passkey[] | null) =>
          prev ? prev.filter((p: Passkey) => p.id !== passkeyId) : null
        );

        onSuccess?.();
      } catch (err: any) {
        const passkeyError =
          err instanceof PasskeyError
            ? err
            : new PasskeyError(err.message || 'Failed to delete passkey', 'UNKNOWN_ERROR', err);

        setError(passkeyError);
        onError?.(passkeyError);
      } finally {
        setIsOperating(false);
      }
    },
    [apiUrl, authToken, onError, onSuccess]
  );

  // Auto-load passkeys on mount
  useEffect(() => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    
    let mounted = true;
    
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${apiUrl}/passkeys`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new PasskeyError(
            errorData.detail || 'Failed to load passkeys',
            errorData.type,
            errorData
          );
        }

        const data = await response.json();
        const passkeyList = data.data?.passkeys || data.passkeys || [];
        
        if (mounted) {
          setPasskeys(passkeyList);
        }
      } catch (err: any) {
        if (mounted) {
          const passkeyError =
            err instanceof PasskeyError
              ? err
              : new PasskeyError(err.message || 'Failed to load passkeys', 'UNKNOWN_ERROR', err);

          setError(passkeyError);
          onError?.(passkeyError);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    load();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, authToken]);

  return {
    passkeys,
    isLoading,
    error,
    refresh,
    updateNickname,
    deletePasskey,
    isOperating,
  };
}
