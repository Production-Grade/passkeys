import { createPasskeyConfig } from '../../../src/core/utils/config-builder';
import { createMockStorage, createMockChallengeStorage } from '../../../src/testing';

describe('Config Builder', () => {
  const baseConfig = {
    rpId: 'example.com',
    rpName: 'Test App',
    origin: 'https://example.com',
    storage: createMockStorage(),
    challenges: createMockChallengeStorage(),
  };

  it('should create config with defaults', () => {
    const config = createPasskeyConfig(baseConfig);

    expect(config.rpId).toBe('example.com');
    expect(config.rpName).toBe('Test App');
    expect(config.origin).toBe('https://example.com');
    expect(config.storage).toBe(baseConfig.storage);
    expect(config.challenges).toBe(baseConfig.challenges);
    expect(config.timeout).toBe(60000);
    expect(config.userVerification).toBe('preferred');
    expect(config.attestationType).toBe('none');
  });

  it('should allow overriding defaults', () => {
    const config = createPasskeyConfig(baseConfig, {
      timeout: 120000,
      userVerification: 'required',
      attestationType: 'direct',
    });

    expect(config.timeout).toBe(120000);
    expect(config.userVerification).toBe('required');
    expect(config.attestationType).toBe('direct');
  });

  it('should preserve base config when overriding', () => {
    const config = createPasskeyConfig(baseConfig, {
      timeout: 90000,
    });

    expect(config.rpId).toBe('example.com');
    expect(config.rpName).toBe('Test App');
    expect(config.origin).toBe('https://example.com');
    expect(config.timeout).toBe(90000);
    expect(config.userVerification).toBe('preferred'); // Still default
  });
});

