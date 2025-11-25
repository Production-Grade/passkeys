/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePasskeyManagement } from '../../../src/react/usePasskeyManagement';
import { PasskeyError } from '../../../src/react/types';

// Mock fetch
const mockFetch = jest.fn() as jest.Mock<any>;
global.fetch = mockFetch as any;

describe('usePasskeyManagement', () => {
  const mockConfig = {
    apiUrl: 'https://api.example.com',
    authToken: 'test-token',
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    expect(result.current.passkeys).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isOperating).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.updateNickname).toBe('function');
    expect(typeof result.current.deletePasskey).toBe('function');
  });

  it('should load passkeys on mount', async () => {
    const mockPasskeys = [
      { id: 'passkey-1', userId: 'user-1', nickname: 'Device 1' },
      { id: 'passkey-2', userId: 'user-1', nickname: 'Device 2' },
    ];

    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { passkeys: mockPasskeys } }),
    });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.passkeys).toEqual(mockPasskeys);
    });
  });

  it('should handle response without data wrapper', async () => {
    const mockPasskeys = [{ id: 'passkey-1', userId: 'user-1' }];

    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passkeys: mockPasskeys }),
    });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual(mockPasskeys);
    });
  });

  it('should handle empty passkeys array', async () => {
    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { passkeys: [] } }),
    });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual([]);
    });
  });

  it('should handle load error', async () => {
    (mockFetch as jest.Mock<any>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Load failed', type: 'LOAD_ERROR' }),
    });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Load failed');
      expect(mockConfig.onError).toHaveBeenCalled();
    });
  });

  it('should refresh passkeys', async () => {
    const mockPasskeys1 = [{ id: 'passkey-1', userId: 'user-1' }];
    const mockPasskeys2 = [
      { id: 'passkey-1', userId: 'user-1' },
      { id: 'passkey-2', userId: 'user-1' },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { passkeys: mockPasskeys1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { passkeys: mockPasskeys2 } }),
      });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual(mockPasskeys1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.passkeys).toEqual(mockPasskeys2);
    });
  });

  it('should update passkey nickname', async () => {
    const mockPasskeys = [
      { id: 'passkey-1', userId: 'user-1', nickname: 'Device 1' },
      { id: 'passkey-2', userId: 'user-1', nickname: 'Device 2' },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { passkeys: mockPasskeys } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual(mockPasskeys);
    });

    await act(async () => {
      await result.current.updateNickname('passkey-1', 'Updated Device');
    });

    await waitFor(() => {
      expect(result.current.isOperating).toBe(false);
      expect(result.current.passkeys?.[0]?.nickname).toBe('Updated Device');
      expect(result.current.passkeys?.[1]?.nickname).toBe('Device 2');
      expect(mockConfig.onSuccess).toHaveBeenCalled();
    });
  });

  it('should handle update nickname error', async () => {
    const mockPasskeys = [{ id: 'passkey-1', userId: 'user-1' }];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { passkeys: mockPasskeys } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Update failed', type: 'UPDATE_ERROR' }),
      });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual(mockPasskeys);
    });

    await act(async () => {
      await result.current.updateNickname('passkey-1', 'New Name');
    });

    await waitFor(() => {
      expect(result.current.isOperating).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Update failed');
    });
  });

  it('should delete passkey', async () => {
    const mockPasskeys = [
      { id: 'passkey-1', userId: 'user-1' },
      { id: 'passkey-2', userId: 'user-1' },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { passkeys: mockPasskeys } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual(mockPasskeys);
    });

    await act(async () => {
      await result.current.deletePasskey('passkey-1');
    });

    await waitFor(() => {
      expect(result.current.isOperating).toBe(false);
      expect(result.current.passkeys).toHaveLength(1);
      expect(result.current.passkeys?.[0]?.id).toBe('passkey-2');
      expect(mockConfig.onSuccess).toHaveBeenCalled();
    });
  });

  it('should handle delete error', async () => {
    const mockPasskeys = [{ id: 'passkey-1', userId: 'user-1' }];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { passkeys: mockPasskeys } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Delete failed', type: 'DELETE_ERROR' }),
      });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual(mockPasskeys);
    });

    await act(async () => {
      await result.current.deletePasskey('passkey-1');
    });

    await waitFor(() => {
      expect(result.current.isOperating).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Delete failed');
    });
  });

  it('should handle fetch errors', async () => {
    (mockFetch as jest.Mock<any>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(PasskeyError);
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  it('should handle update when passkeys is null', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { passkeys: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual([]);
    });

    // Manually set passkeys to null to test edge case
    act(() => {
      (result.current as any).passkeys = null;
    });

    await act(async () => {
      await result.current.updateNickname('passkey-1', 'New Name');
    });

    await waitFor(() => {
      expect(result.current.isOperating).toBe(false);
    });
  });

  it('should handle delete when passkeys is null', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { passkeys: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const { result } = renderHook(() => usePasskeyManagement(mockConfig));

    await waitFor(() => {
      expect(result.current.passkeys).toEqual([]);
    });

    // Manually set passkeys to null to test edge case
    act(() => {
      (result.current as any).passkeys = null;
    });

    await act(async () => {
      await result.current.deletePasskey('passkey-1');
    });

    await waitFor(() => {
      expect(result.current.isOperating).toBe(false);
    });
  });
});
