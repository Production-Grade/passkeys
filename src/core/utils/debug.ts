/**
 * Debug logging utility
 * Only logs when DEBUG environment variable includes '@productiongrade/passkeys'
 *
 * @example
 * ```bash
 * DEBUG=@productiongrade/passkeys:* node app.js
 * ```
 *
 * @example
 * ```typescript
 * debugLog('PasskeyService', 'Starting registration', { userId, email });
 * ```
 */

/**
 * Check if debug logging is enabled
 */
function isDebugEnabled(): boolean {
  const debugEnv = process.env.DEBUG;
  if (!debugEnv) return false;
  return debugEnv.includes('@productiongrade/passkeys') || debugEnv === '*';
}

/**
 * Debug log categories
 */
export type DebugCategory =
  | 'PasskeyService'
  | 'ChallengeService'
  | 'RecoveryService'
  | 'Storage'
  | 'WebAuthn'
  | 'Config'
  | 'Error';

/**
 * Log debug message
 * Only logs when DEBUG environment variable is set
 *
 * @param category - Debug category
 * @param message - Debug message
 * @param data - Optional data to log
 *
 * @example
 * ```typescript
 * debugLog('PasskeyService', 'Starting registration', { userId, email });
 * ```
 */
export function debugLog(category: DebugCategory, message: string, data?: unknown): void {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${category}]`;

  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Log debug error
 * Only logs when DEBUG environment variable is set
 *
 * @param category - Debug category
 * @param message - Error message
 * @param error - Error object
 *
 * @example
 * ```typescript
 * debugError('PasskeyService', 'Registration failed', error);
 * ```
 */
export function debugError(category: DebugCategory, message: string, error: unknown): void {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${category}]`;

  if (error instanceof Error) {
    console.error(`${prefix} ${message}`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(`${prefix} ${message}`, error);
  }
}

