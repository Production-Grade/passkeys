/**
 * Express adapter for @productiongrade/passkeys
 * Provides ready-to-use Express integration
 */

export { createPasskeys } from './createPasskeys';
export { requireAuth, errorHandler } from './middleware';
export { PasskeyHandlers } from './handlers';
export type {
  AuthenticatedRequest,
  SuccessResponse,
  RegistrationStartResponse,
  RegistrationCompleteResponse,
  AuthenticationStartResponse,
  AuthenticationCompleteResponse,
  ResponseTransformer,
} from './types';
