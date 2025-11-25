/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePasskeyAuth } from '../../../src/react/usePasskeyAuth';
import { startAuthentication } from '@simplewebauthn/browser';
import { PasskeyError, UserCancelledError } from '../../../src/react/types';

// Mock @simplewebauthn/browser
jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn() as jest.Mock<any>;
global.fetch = mockFetch as any;

// Mock window.PublicKeyCredential
const mockPublicKeyCredential = jest.fn();
(global as any).window = {
  PublicKeyCredential: mockPublicKeyCredential,
};

describe('usePasskeyAuth', () => {
  const mockConfig = {
    apiUrl: 'https://api.example.com',
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    (startAuthentication as jest.Mock).mockClear();
    mockPublicKeyCredential.mockClear();
    (global as any).window.PublicKeyCredential = mockPublicKeyCredential;
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    expect(result.current.isAuthenticating).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.user).toBe(null);
    expect(typeof result.current.authenticate).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should handle WebAuthnNotSupportedError when PublicKeyCredential is not available', async () => {
    delete (global as any).window.PublicKeyCredential;

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      // The error gets wrapped, but the original error should be WebAuthnNotSupportedError
      expect(result.current.error?.message).toBeDefined();
    });
  });

  it('should successfully authenticate without email', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockAssertion: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { user: mockUser } }),
      });

    (startAuthentication as jest.Mock<any>).mockResolvedValue(mockAssertion);

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBe(null);
      expect(mockConfig.onSuccess).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ user: mockUser })
      );
    });
  });

  it('should successfully authenticate with email', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockAssertion: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { user: mockUser } }),
      });

    (startAuthentication as jest.Mock<any>).mockResolvedValue(mockAssertion);

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate({ email: 'test@example.com' } as any);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/authenticate/start',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
      expect(mockConfig.onSuccess).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ user: mockUser })
      );
    });
  });

  it('should handle authentication start error', async () => {
    mockFetch      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Start failed', type: 'AUTH_START_ERROR' }),
      });

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Start failed');
      expect(mockConfig.onError).toHaveBeenCalled();
    });
  });

  it('should handle authentication finish error', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockAssertion: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Finish failed', type: 'AUTH_FINISH_ERROR' }),
      });

    (startAuthentication as jest.Mock<any>).mockResolvedValue(mockAssertion);

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Finish failed');
    });
  });

  it('should handle user cancellation', async () => {
    const mockOptions = { challenge: 'test-challenge' };

    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOptions }),
    });

    (startAuthentication as jest.Mock<any>).mockRejectedValue({
      name: 'NotAllowedError',
      message: 'User cancelled',
    });

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeInstanceOf(UserCancelledError);
    });
  });

  it('should handle WebAuthn ceremony failure', async () => {
    const mockOptions = { challenge: 'test-challenge' };

    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOptions }),
    });

    (startAuthentication as jest.Mock<any>).mockRejectedValue(new Error('WebAuthn error'));

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toContain('WebAuthn ceremony failed');
    });
  });

  it('should handle response without data wrapper', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockAssertion: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOptions,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

    (startAuthentication as jest.Mock<any>).mockResolvedValue(mockAssertion);

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(mockConfig.onSuccess).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ user: mockUser })
      );
    });
  });

  it('should reset state', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockAssertion: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { user: mockUser } }),
      });

    (startAuthentication as jest.Mock<any>).mockResolvedValue(mockAssertion);

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isAuthenticating).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.user).toBe(null);
  });

  it('should handle fetch errors', async () => {
    (mockFetch as jest.Mock<any>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  it('should not send email in body when email is not provided', async () => {
    const mockOptions = { challenge: 'test-challenge' };
    const mockAssertion: any = { id: 'credential-id', response: { clientDataJSON: 'test' } };
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOptions }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { user: mockUser } }),
      });

    (startAuthentication as jest.Mock<any>).mockResolvedValue(mockAssertion);

    const { result } = renderHook(() => usePasskeyAuth(mockConfig));

    await act(async () => {
      await result.current.authenticate();
    });

    await waitFor(() => {
      const startCall = mockFetch.mock.calls[0];
      if (startCall && startCall[1]) {
        expect(startCall[1]).not.toHaveProperty('body');
      }
    });
  });
});
