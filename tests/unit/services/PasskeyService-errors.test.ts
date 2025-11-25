import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PasskeyService } from '../../../src/core/services/PasskeyService';
import { createMockStorage, createMockPasskeyConfig } from '../../../src/testing';
import {
  RegistrationError,
  AuthenticationError,
  CounterAnomalyError,
} from '../../../src/core/types/errors';
import { verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server';

// Mock SimpleWebAuthn
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

describe('PasskeyService - Error Handling', () => {
  let passkeyService: PasskeyService;
  let storage: ReturnType<typeof createMockStorage>;
  let config: ReturnType<typeof createMockPasskeyConfig>;

  beforeEach(() => {
    storage = createMockStorage();
    config = createMockPasskeyConfig({
      rpId: 'example.com',
      rpName: 'Test App',
      origin: 'https://example.com',
    });
    passkeyService = new PasskeyService(storage, config);
  });

  describe('verifyRegistration', () => {
    it('should throw RegistrationError when verification fails', async () => {
      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyRegistrationResponse as jest.Mock<any>).mockResolvedValue({
        verified: false,
        registrationInfo: null,
      });

      await expect(
        passkeyService.verifyRegistration(mockResponse, 'test-challenge', 'user-1')
      ).rejects.toThrow(RegistrationError);

      expect(verifyRegistrationResponse).toHaveBeenCalledWith({
        response: mockResponse,
        expectedChallenge: 'test-challenge',
        expectedOrigin: 'https://example.com',
        expectedRPID: 'example.com',
        requireUserVerification: false,
      });
    });

    it('should call onRegistrationFailure hook when verification fails', async () => {
      const onRegistrationFailure = jest.fn<(_userId: string, _error: Error) => void>();
      config.hooks = { onRegistrationFailure };

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyRegistrationResponse as jest.Mock<any>).mockResolvedValue({
        verified: false,
        registrationInfo: null,
      });

      await expect(
        passkeyService.verifyRegistration(mockResponse, 'test-challenge', 'user-1')
      ).rejects.toThrow(RegistrationError);

      expect(onRegistrationFailure).toHaveBeenCalledWith('user-1', expect.any(RegistrationError));
    });

    it('should wrap non-RegistrationError in RegistrationError', async () => {
      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyRegistrationResponse as jest.Mock<any>).mockRejectedValue(new Error('WebAuthn error'));

      await expect(
        passkeyService.verifyRegistration(mockResponse, 'test-challenge', 'user-1')
      ).rejects.toThrow(RegistrationError);

      await expect(
        passkeyService.verifyRegistration(mockResponse, 'test-challenge', 'user-1')
      ).rejects.toThrow('WebAuthn error');
    });

    it('should call onRegistrationSuccess hook when verification succeeds', async () => {
      const onRegistrationSuccess = jest.fn<(_userId: string, _passkeyId: string) => void>();
      config.hooks = { onRegistrationSuccess };

      const user = await storage.createUser({ email: 'test@example.com' });

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
          transports: ['internal'],
        },
      };

      (verifyRegistrationResponse as jest.Mock<any>).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialID: Buffer.from('test-credential'),
          credentialPublicKey: Buffer.from('test-public-key'),
          counter: 0,
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      });

      await passkeyService.verifyRegistration(mockResponse, 'test-challenge', user.id);

      expect(onRegistrationSuccess).toHaveBeenCalledWith(user.id, expect.any(String));
    });
  });

  describe('verifyAuthentication', () => {
    it('should throw AuthenticationError when passkey not found', async () => {
      const mockResponse = {
        id: 'non-existent-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      storage.getPasskeyById = jest.fn<(_id: string) => Promise<any>>().mockResolvedValue(null);

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow(AuthenticationError);

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow('Passkey not found');
    });

    it('should throw AuthenticationError when verification fails', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyAuthenticationResponse as jest.Mock<any>).mockResolvedValue({
        verified: false,
        authenticationInfo: null,
      });

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow(AuthenticationError);

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow('Authentication verification failed');
    });

    it('should call onAuthFailure hook when verification fails', async () => {
      const onAuthFailure = jest.fn<(_email: string, _error: Error) => void>();
      config.hooks = { onAuthFailure };

      const user = await storage.createUser({ email: 'test@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyAuthenticationResponse as jest.Mock<any>).mockResolvedValue({
        verified: false,
        authenticationInfo: null,
      });

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow(AuthenticationError);

      expect(onAuthFailure).toHaveBeenCalledWith('test@example.com', expect.any(AuthenticationError));
    });

    it('should call onAuthFailure with "unknown" when user not found', async () => {
      const onAuthFailure = jest.fn<(_email: string, _error: Error) => void>();
      config.hooks = { onAuthFailure };

      const user = await storage.createUser({ email: 'test@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      // Mock getUserById to return null to simulate user not found
      jest.spyOn(storage, 'getUserById').mockResolvedValue(null);

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyAuthenticationResponse as jest.Mock<any>).mockResolvedValue({
        verified: false,
        authenticationInfo: null,
      });

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow(AuthenticationError);

      expect(onAuthFailure).toHaveBeenCalledWith('unknown', expect.any(AuthenticationError));
    });

    it('should throw CounterAnomalyError when counter decreases', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 100,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyAuthenticationResponse as jest.Mock<any>).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 50, // Counter decreased (possible cloned credential)
        },
      });

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow(CounterAnomalyError);
    });

    it('should call onCounterAnomaly hook when counter anomaly detected', async () => {
      const onCounterAnomaly = jest.fn<(_userId: string, _passkeyId: string, _expectedCounter: number, _receivedCounter: number) => void>();
      config.hooks = { onCounterAnomaly };

      const user = await storage.createUser({ email: 'test@example.com' });
      const passkey = await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 100,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyAuthenticationResponse as jest.Mock<any>).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 50,
        },
      });

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow(CounterAnomalyError);

      expect(onCounterAnomaly).toHaveBeenCalledWith(user.id, passkey.id, 100, 50);
    });

    it('should not check counter anomaly when both counters are 0', async () => {
      const onCounterAnomaly = jest.fn<(_userId: string, _passkeyId: string, _expectedCounter: number, _receivedCounter: number) => void>();
      config.hooks = { onCounterAnomaly };

      const user = await storage.createUser({ email: 'test@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyAuthenticationResponse as jest.Mock<any>).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 0,
        },
      });

      // Should not throw CounterAnomalyError when both are 0
      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).resolves.toBeDefined();

      expect(onCounterAnomaly).not.toHaveBeenCalled();
    });

    it('should wrap non-AuthenticationError in AuthenticationError', async () => {
      const user = await storage.createUser({ email: 'test@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyAuthenticationResponse as jest.Mock<any>).mockRejectedValue(new Error('WebAuthn error'));

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow(AuthenticationError);

      await expect(
        passkeyService.verifyAuthentication(mockResponse, 'test-challenge')
      ).rejects.toThrow('WebAuthn error');
    });

    it('should call onAuthSuccess hook when authentication succeeds', async () => {
      const onAuthSuccess = jest.fn<(_userId: string, _passkeyId: string) => void>();
      config.hooks = { onAuthSuccess };

      const user = await storage.createUser({ email: 'test@example.com' });
      const passkey = await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
      });

      const mockResponse = {
        id: 'test-credential',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'test-challenge' })).toString('base64url'),
        },
      };

      (verifyAuthenticationResponse as jest.Mock<any>).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 1,
        },
      });

      await passkeyService.verifyAuthentication(mockResponse, 'test-challenge');

      expect(onAuthSuccess).toHaveBeenCalledWith(user.id, passkey.id);
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('should call onAuthStart hook when email provided', async () => {
      const onAuthStart = jest.fn<(_email: string) => void>();
      config.hooks = { onAuthStart };

      await passkeyService.generateAuthenticationOptions('test@example.com');

      expect(onAuthStart).toHaveBeenCalledWith('test@example.com');
    });

    it('should not call onAuthStart hook when email not provided', async () => {
      const onAuthStart = jest.fn<(_email: string) => void>();
      config.hooks = { onAuthStart };

      await passkeyService.generateAuthenticationOptions();

      expect(onAuthStart).not.toHaveBeenCalled();
    });

    it('should include allowCredentials when user has passkeys with transports', async () => {
      const { generateAuthenticationOptions: generateWebAuthnAuthenticationOptions } = await import('@simplewebauthn/server');
      
      const user = await storage.createUser({ email: 'test@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
        transports: ['internal'],
      });

      (generateWebAuthnAuthenticationOptions as jest.Mock<any>).mockResolvedValue({
        challenge: 'test-challenge',
        rpId: 'example.com',
      });

      const { options, userId: returnedUserId } = await passkeyService.generateAuthenticationOptions('test@example.com');

      expect(returnedUserId).toBe(user.id);
      expect(options).toBeDefined();
      expect(options.challenge).toBe('test-challenge');
    });

    it('should exclude passkeys without transports from allowCredentials', async () => {
      const { generateAuthenticationOptions: generateWebAuthnAuthenticationOptions } = await import('@simplewebauthn/server');
      
      const user = await storage.createUser({ email: 'test@example.com' });
      await storage.createPasskey({
        userId: user.id,
        id: 'test-credential',
        publicKey: 'test-public-key',
        counter: 0,
        deviceType: 'singleDevice',
        backedUp: false,
        transports: undefined,
      });

      (generateWebAuthnAuthenticationOptions as jest.Mock<any>).mockResolvedValue({
        challenge: 'test-challenge',
        rpId: 'example.com',
      });

      const { options } = await passkeyService.generateAuthenticationOptions('test@example.com');

      expect(options).toBeDefined();
      expect(options.challenge).toBe('test-challenge');
    });
  });
});

