/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePasskeyRegistration } from '../../../src/react/usePasskeyRegistration';
import { startRegistration } from '@simplewebauthn/browser';
import { PasskeyError, UserCancelledError } from '../../../src/react/types';

// Mock @simplewebauthn/browser
jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn() as jest.Mock<any>;
global.fetch = mockFetch as any;

// Mock window.PublicKeyCredential
const mockPublicKeyCredential = jest.fn();
(global as any).window = {
  PublicKeyCredential: mockPublicKeyCredential,
};

describe('usePasskeyRegistration', () => {
  const mockConfig = {
    apiUrl: 'https://api.example.com',
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    (startRegistration as jest.Mock).mockClear();
    mockPublicKeyCredential.mockClear();
    (global as any).window.PublicKeyCredential = mockPublicKeyCredential;
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    expect(result.current.isRegistering).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.recoveryCodes).toBe(null);
    expect(result.current.user).toBe(null);
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should handle WebAuthnNotSupportedError when PublicKeyCredential is not available', async () => {
    delete (global as any).window.PublicKeyCredential;

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBeDefined();
    });
  });

  it('should successfully register with email', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockCredential: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockPasskey = { id: 'passkey-1', userId: 'user-1' };
    const mockRecoveryCodes = ['code1', 'code2'];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions, userId: 'user-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user: mockUser,
            passkey: mockPasskey,
            recoveryCodes: mockRecoveryCodes,
          },
        }),
      });

    (startRegistration as jest.Mock<any>).mockResolvedValue(mockCredential);

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.recoveryCodes).toEqual(mockRecoveryCodes);
      expect(result.current.error).toBe(null);
      expect(mockConfig.onSuccess).toHaveBeenCalledWith(mockUser, mockPasskey, mockRecoveryCodes);
    });
  });

  it('should successfully register with email and nickname', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockCredential: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions, userId: 'user-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { user: mockUser } }),
      });

    (startRegistration as jest.Mock<any>).mockResolvedValue(mockCredential);

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com', nickname: 'My Device' } as any);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/register/start',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', nickname: 'My Device' }),
        })
      );
    });
  });

  it('should handle registration start error', async () => {
    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Start failed', type: 'REGISTRATION_START_ERROR' }),
    });

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Start failed');
      expect(mockConfig.onError).toHaveBeenCalled();
    });
  });

  it('should handle registration finish error', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockCredential: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions, userId: 'user-1' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Finish failed', type: 'REGISTRATION_FINISH_ERROR' }),
      });

    (startRegistration as jest.Mock<any>).mockResolvedValue(mockCredential);

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Finish failed');
    });
  });

  it('should handle user cancellation', async () => {
    const mockOptions = { challenge: 'test-challenge' };

    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOptions, userId: 'user-1' }),
    });

    (startRegistration as jest.Mock<any>).mockRejectedValue({
      name: 'NotAllowedError',
      message: 'User cancelled',
    });

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.error).toBeInstanceOf(UserCancelledError);
    });
  });

  it('should handle WebAuthn ceremony failure', async () => {
    const mockOptions = { challenge: 'test-challenge' };

    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOptions, userId: 'user-1' }),
    });

    (startRegistration as jest.Mock<any>).mockRejectedValue(new Error('WebAuthn error'));

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toContain('WebAuthn ceremony failed');
    });
  });

  it('should handle response without data wrapper', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockCredential: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOptions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

    (startRegistration as jest.Mock<any>).mockResolvedValue(mockCredential);

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('should handle missing recovery codes in response', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockCredential: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions, userId: 'user-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { user: mockUser } }),
      });

    (startRegistration as jest.Mock<any>).mockResolvedValue(mockCredential);

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.recoveryCodes).toBe(null);
    });
  });

  it('should reset state', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockCredential: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockRecoveryCodes = ['code1', 'code2'];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions, userId: 'user-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user: mockUser,
            recoveryCodes: mockRecoveryCodes,
          },
        }),
      });

    (startRegistration as jest.Mock<any>).mockResolvedValue(mockCredential);

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.recoveryCodes).toEqual(mockRecoveryCodes);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isRegistering).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.recoveryCodes).toBe(null);
    expect(result.current.user).toBe(null);
  });

  it('should handle fetch errors', async () => {
    (mockFetch as jest.Mock<any>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePasskeyRegistration(mockConfig));

    await act(async () => {
      await result.current.register({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Network error');
    });
  });
});
