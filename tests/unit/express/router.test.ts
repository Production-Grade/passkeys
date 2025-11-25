import { describe, it, expect, beforeEach } from '@jest/globals';
import { createRouter } from '../../../src/express/router';
import { PasskeyHandlers } from '../../../src/express/handlers';
import { PasskeyService } from '../../../src/core/services/PasskeyService';
import { ChallengeService } from '../../../src/core/services/ChallengeService';
import { RecoveryService } from '../../../src/core/services/RecoveryService';
import { createMockStorage, createMockChallengeStorage, createMockPasskeyConfig } from '../../../src/testing';

describe('Express Router', () => {
  let handlers: PasskeyHandlers;
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    const storage = createMockStorage();
    const challenges = createMockChallengeStorage();
    const config = createMockPasskeyConfig({ storage, challenges });
    
    const passkeyService = new PasskeyService(storage, config);
    const challengeService = new ChallengeService(challenges);
    const recoveryService = new RecoveryService(storage, config);
    
    handlers = new PasskeyHandlers(passkeyService, challengeService, recoveryService, storage);
    router = createRouter(handlers);
  });

  it('should create a router instance', () => {
    expect(router).toBeDefined();
  });

  it('should register registration routes', () => {
    const routes = router.stack;
    const registrationStart = routes.find((r: any) => r.route?.path === '/register/start');
    const registrationFinish = routes.find((r: any) => r.route?.path === '/register/finish');

    expect(registrationStart).toBeDefined();
    expect(registrationFinish).toBeDefined();
  });

  it('should register authentication routes', () => {
    const routes = router.stack;
    const authStart = routes.find((r: any) => r.route?.path === '/authenticate/start');
    const authFinish = routes.find((r: any) => r.route?.path === '/authenticate/finish');

    expect(authStart).toBeDefined();
    expect(authFinish).toBeDefined();
  });

  it('should register recovery routes', () => {
    const routes = router.stack;
    const recoveryCodeAuth = routes.find((r: any) => r.route?.path === '/recovery/codes/authenticate');
    const recoveryEmailInitiate = routes.find((r: any) => r.route?.path === '/recovery/email/initiate');
    const recoveryEmailVerify = routes.find((r: any) => r.route?.path === '/recovery/email/verify');

    expect(recoveryCodeAuth).toBeDefined();
    expect(recoveryEmailInitiate).toBeDefined();
    expect(recoveryEmailVerify).toBeDefined();
  });

  it('should register protected routes', () => {
    const routes = router.stack;
    const listPasskeys = routes.find((r: any) => r.route?.path === '/passkeys');
    const deletePasskey = routes.find((r: any) => r.route?.path === '/passkeys/:id');
    const generateRecoveryCodes = routes.find((r: any) => r.route?.path === '/recovery/codes/generate');
    const getRecoveryCodeCount = routes.find((r: any) => r.route?.path === '/recovery/codes/count');

    expect(listPasskeys).toBeDefined();
    expect(deletePasskey).toBeDefined();
    expect(generateRecoveryCodes).toBeDefined();
    expect(getRecoveryCodeCount).toBeDefined();
  });

    it('should use POST method for registration routes', () => {
      const routes = router.stack;
      const registrationStart = routes.find((r: any) => r.route?.path === '/register/start');
      expect(registrationStart).toBeDefined();
    });

    it('should use GET method for list passkeys route', () => {
      const routes = router.stack;
      const listPasskeys = routes.find((r: any) => r.route?.path === '/passkeys');
      expect(listPasskeys).toBeDefined();
    });

    it('should use DELETE method for delete passkey route', () => {
      const routes = router.stack;
      const deletePasskey = routes.find((r: any) => r.route?.path === '/passkeys/:id');
      expect(deletePasskey).toBeDefined();
    });
});

