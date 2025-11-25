import type { PasskeyConfig } from '../core/types/config';
import type { ResponseTransformer, AuthenticationCompleteResponse } from './types';
import { PasskeyService } from '../core/services/PasskeyService';
import { ChallengeService } from '../core/services/ChallengeService';
import { RecoveryService } from '../core/services/RecoveryService';
import { PasskeyHandlers } from './handlers';
import { createRouter } from './router';
import { requireAuth, errorHandler } from './middleware';

/**
 * Express integration options
 */
export interface ExpressPasskeyOptions extends PasskeyConfig {
  /**
   * Optional response transformer for authentication endpoints
   * Allows customizing the response shape (e.g., adding session tokens)
   */
  onAuthenticationComplete?: ResponseTransformer<AuthenticationCompleteResponse, any>;
}

/**
 * Create passkey authentication instance for Express
 * This is the main entry point for Express integration
 */
export function createPasskeys(config: ExpressPasskeyOptions) {
  // Create services
  const passkeyService = new PasskeyService(config.storage, config);
  const challengeService = new ChallengeService(config.challenges);
  const recoveryService = new RecoveryService(config.storage, config);

  // Create handlers
  const handlers = new PasskeyHandlers(
    passkeyService,
    challengeService,
    recoveryService,
    config.storage
  );

  // Create router
  const router = createRouter(handlers);

  return {
    /** Express router with all authentication routes */
    router,

    /** Individual services for advanced usage */
    services: {
      passkey: passkeyService,
      challenge: challengeService,
      recovery: recoveryService,
    },

    /** Middleware utilities */
    middleware: {
      requireAuth,
      errorHandler,
    },

    /** Request handlers for custom routing */
    handlers,
  };
}
