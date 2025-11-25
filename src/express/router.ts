import { Router } from 'express';
import type { PasskeyHandlers } from './handlers';
import { errorHandler, requireAuth } from './middleware';

/**
 * Create Express router with all passkey authentication routes
 */
export function createRouter(handlers: PasskeyHandlers): Router {
  const router = Router();

  // Registration routes (public - no auth required)
  router.post('/register/start', handlers.startRegistration);
  router.post('/register/finish', handlers.finishRegistration);

  // Authentication routes (public - no auth required)
  router.post('/authenticate/start', handlers.startAuthentication);
  router.post('/authenticate/finish', handlers.finishAuthentication);

  // Recovery authentication routes (public - alternative auth method)
  router.post('/recovery/codes/authenticate', handlers.authenticateWithRecoveryCode);
  router.post('/recovery/email/initiate', handlers.initiateEmailRecovery);
  router.post('/recovery/email/verify', handlers.verifyEmailRecoveryToken);

  // Protected routes - require authentication (req.user must be set by your session middleware)
  router.get('/passkeys', requireAuth, handlers.listPasskeys);
  router.delete('/passkeys/:id', requireAuth, handlers.deletePasskey);
  router.post('/recovery/codes/generate', requireAuth, handlers.generateRecoveryCodes);
  router.get('/recovery/codes/count', requireAuth, handlers.getRecoveryCodeCount);

  // Error handler (must be last)
  router.use(errorHandler);

  return router;
}
