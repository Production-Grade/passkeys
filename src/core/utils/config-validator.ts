import type { PasskeyConfig } from '../types/config';
import type { PasskeyStorage, ChallengeStorage } from '../types/storage';
import { validateRpId, validateOrigin } from './validation';
import { ValidationError } from '../types/errors';

/**
 * Result of configuration validation
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: string[];
  /** List of warnings (non-blocking issues) */
  warnings: string[];
}

/**
 * Required methods that PasskeyStorage must implement
 */
const REQUIRED_STORAGE_METHODS: (keyof PasskeyStorage)[] = [
  'createUser',
  'getUserByEmail',
  'getUserById',
  'createPasskey',
  'getPasskeyById',
  'getUserPasskeys',
  'updatePasskey',
  'deletePasskey',
  'createRecoveryCodes',
  'getUserRecoveryCodes',
  'markRecoveryCodeUsed',
  'deleteUserRecoveryCodes',
  'createEmailRecoveryToken',
  'getEmailRecoveryToken',
  'getEmailRecoveryTokenByHash',
  'markEmailRecoveryTokenUsed',
  'deleteExpiredEmailRecoveryTokens',
];

/**
 * Required methods that ChallengeStorage must implement
 */
const REQUIRED_CHALLENGE_METHODS: (keyof ChallengeStorage)[] = [
  'createChallenge',
  'getChallengeById',
  'getChallengeByValue',
  'deleteChallenge',
  'deleteExpiredChallenges',
];

/**
 * Validate PasskeyConfig at startup
 * Catches configuration errors early with helpful error messages
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validatePasskeyConfig(config);
 * if (!result.valid) {
 *   console.error('Configuration errors:', result.errors);
 *   throw new Error('Invalid configuration');
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Configuration warnings:', result.warnings);
 * }
 * ```
 */
export function validatePasskeyConfig(config: PasskeyConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!config.rpId) {
    errors.push('rpId is required');
  } else {
    try {
      validateRpId(config.rpId);
    } catch (e) {
      errors.push(`Invalid rpId: ${(e as Error).message}`);
    }
  }

  if (!config.rpName) {
    errors.push('rpName is required');
  } else if (typeof config.rpName !== 'string') {
    errors.push('rpName must be a string');
  } else if (config.rpName.length === 0) {
    errors.push('rpName cannot be empty');
  } else if (config.rpName.length > 64) {
    warnings.push('rpName is longer than recommended (64 chars). Some authenticators may truncate it.');
  }

  if (!config.origin) {
    errors.push('origin is required');
  } else {
    try {
      validateOrigin(config.origin);
    } catch (e) {
      errors.push(`Invalid origin: ${(e as Error).message}`);
    }

    // Check origin matches rpId (warning, not error)
    if (config.rpId && config.origin) {
      try {
        const originUrl = new URL(config.origin);
        const originHost = originUrl.hostname;
        const rpId = config.rpId.toLowerCase();

        // localhost is special case
        if (rpId !== 'localhost' && originHost !== rpId && !originHost.endsWith(`.${rpId}`)) {
          warnings.push(
            `Origin hostname (${originHost}) does not match rpId (${rpId}). This may cause WebAuthn verification to fail.`
          );
        }
      } catch {
        // Already validated above, ignore
      }
    }
  }

  // Validate storage implementation
  if (!config.storage) {
    errors.push('storage is required');
  } else {
    for (const method of REQUIRED_STORAGE_METHODS) {
      if (typeof config.storage[method] !== 'function') {
        errors.push(`storage.${method}() must be implemented`);
      }
    }
  }

  // Validate challenge storage implementation
  if (!config.challenges) {
    errors.push('challenges is required');
  } else {
    for (const method of REQUIRED_CHALLENGE_METHODS) {
      if (typeof config.challenges[method] !== 'function') {
        errors.push(`challenges.${method}() must be implemented`);
      }
    }
  }

  // Validate optional fields
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number') {
      errors.push('timeout must be a number');
    } else if (config.timeout <= 0) {
      errors.push('timeout must be positive');
    } else if (config.timeout < 10000) {
      warnings.push('timeout is less than 10 seconds. WebAuthn operations may take longer.');
    } else if (config.timeout > 300000) {
      warnings.push('timeout is greater than 5 minutes. Consider reducing for better UX.');
    }
  }

  if (config.userVerification !== undefined) {
    const validValues: string[] = ['required', 'preferred', 'discouraged'];
    if (!validValues.includes(config.userVerification)) {
      errors.push(`userVerification must be one of: ${validValues.join(', ')}`);
    }
  }

  if (config.attestationType !== undefined) {
    const validValues: string[] = ['none', 'indirect', 'direct', 'enterprise'];
    if (!validValues.includes(config.attestationType)) {
      errors.push(`attestationType must be one of: ${validValues.join(', ')}`);
    }
  }

  // Validate recovery configuration
  if (config.recovery) {
    if (config.recovery.codes) {
      if (typeof config.recovery.codes.enabled !== 'boolean') {
        errors.push('recovery.codes.enabled must be a boolean');
      }
      if (config.recovery.codes.count !== undefined) {
        if (typeof config.recovery.codes.count !== 'number' || config.recovery.codes.count <= 0) {
          errors.push('recovery.codes.count must be a positive number');
        } else if (config.recovery.codes.count > 20) {
          warnings.push('recovery.codes.count is greater than 20. Consider reducing for better UX.');
        }
      }
      if (config.recovery.codes.length !== undefined) {
        if (typeof config.recovery.codes.length !== 'number' || config.recovery.codes.length <= 0) {
          errors.push('recovery.codes.length must be a positive number');
        } else if (config.recovery.codes.length < 6) {
          warnings.push('recovery.codes.length is less than 6. Consider increasing for better security.');
        } else if (config.recovery.codes.length > 20) {
          warnings.push('recovery.codes.length is greater than 20. Consider reducing for better UX.');
        }
      }
    }

    if (config.recovery.email) {
      if (typeof config.recovery.email.enabled !== 'boolean') {
        errors.push('recovery.email.enabled must be a boolean');
      }
      if (typeof config.recovery.email.sendEmail !== 'function') {
        errors.push('recovery.email.sendEmail must be a function');
      }
      if (config.recovery.email.tokenTTL !== undefined) {
        if (typeof config.recovery.email.tokenTTL !== 'number' || config.recovery.email.tokenTTL <= 0) {
          errors.push('recovery.email.tokenTTL must be a positive number (minutes)');
        } else if (config.recovery.email.tokenTTL < 5) {
          warnings.push('recovery.email.tokenTTL is less than 5 minutes. Users may not have time to click the link.');
        } else if (config.recovery.email.tokenTTL > 1440) {
          warnings.push('recovery.email.tokenTTL is greater than 24 hours. Consider reducing for better security.');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and throw if configuration is invalid
 * Convenience function that throws ValidationError if config is invalid
 *
 * @param config - Configuration to validate
 * @throws {ValidationError} if configuration is invalid
 *
 * @example
 * ```typescript
 * try {
 *   assertValidConfig(config);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Invalid configuration:', error.message);
 *   }
 * }
 * ```
 */
export function assertValidConfig(config: PasskeyConfig): void {
  const result = validatePasskeyConfig(config);
  if (!result.valid) {
    throw new ValidationError(
      `Invalid configuration: ${result.errors.join('; ')}`,
      { errors: result.errors, warnings: result.warnings }
    );
  }
  if (result.warnings.length > 0) {
    // Log warnings but don't throw
    console.warn('Configuration warnings:', result.warnings);
  }
}

