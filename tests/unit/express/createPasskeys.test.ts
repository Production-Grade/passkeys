import { describe, it, expect } from '@jest/globals';
import { createPasskeys } from '../../../src/express/createPasskeys';
import { createMockStorage, createMockChallengeStorage, createMockPasskeyConfig } from '../../../src/testing';

describe('createPasskeys', () => {
  it('should create router and middleware', () => {
    const storage = createMockStorage();
    const challenges = createMockChallengeStorage();
    const config = createMockPasskeyConfig({
      storage,
      challenges,
    });

    const result = createPasskeys(config);

    expect(result.router).toBeDefined();
    expect(result.middleware).toBeDefined();
    expect(result.handlers).toBeDefined();
  });

  it('should include all handlers', () => {
    const storage = createMockStorage();
    const challenges = createMockChallengeStorage();
    const config = createMockPasskeyConfig({
      storage,
      challenges,
    });

    const { handlers } = createPasskeys(config);

    expect(handlers.startRegistration).toBeDefined();
    expect(handlers.finishRegistration).toBeDefined();
    expect(handlers.startAuthentication).toBeDefined();
    expect(handlers.finishAuthentication).toBeDefined();
    expect(handlers.listPasskeys).toBeDefined();
    expect(handlers.deletePasskey).toBeDefined();
    expect(handlers.generateRecoveryCodes).toBeDefined();
    expect(handlers.authenticateWithRecoveryCode).toBeDefined();
    expect(handlers.getRecoveryCodeCount).toBeDefined();
    expect(handlers.initiateEmailRecovery).toBeDefined();
    expect(handlers.verifyEmailRecoveryToken).toBeDefined();
  });
});

