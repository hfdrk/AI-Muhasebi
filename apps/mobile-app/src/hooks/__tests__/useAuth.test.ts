import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../useAuth';
import { tokenStorage } from '../../storage/token-storage';

// Mock tokenStorage
jest.mock('../../storage/token-storage', () => ({
  tokenStorage: {
    getAuthData: vi.fn(),
    saveAuthData: vi.fn(),
    clearAuthData: vi.fn(),
  },
}));

// Mock authAPI
jest.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
  },
}));

import { authAPI } from '../../services/api';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null auth data when no token exists', async () => {
    (tokenStorage.getAuthData as any).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.authData).toBeNull();
  });

  it('should initialize with auth data when token exists', async () => {
    const mockAuthData = {
      accessToken: 'token',
      tenantId: 'tenant-1',
      user: { id: '1', email: 'test@test.com', fullName: 'Test', locale: 'tr' },
    };

    (tokenStorage.getAuthData as any).mockResolvedValue(mockAuthData);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.authData).toEqual(mockAuthData);
  });

  it('should handle login successfully', async () => {
    (tokenStorage.getAuthData as any).mockResolvedValue(null);
    (authAPI.login as any).mockResolvedValue({
      data: {
        user: { id: '1', email: 'test@test.com', fullName: 'Test', locale: 'tr' },
        accessToken: 'token',
        tenantId: 'tenant-1',
      },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const loginResult = await result.current.login('test@test.com', 'password');

    expect(authAPI.login).toHaveBeenCalledWith('test@test.com', 'password');
    expect(tokenStorage.saveAuthData).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle logout', async () => {
    const mockAuthData = {
      accessToken: 'token',
      tenantId: 'tenant-1',
      user: { id: '1', email: 'test@test.com', fullName: 'Test', locale: 'tr' },
    };

    (tokenStorage.getAuthData as any).mockResolvedValue(mockAuthData);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.logout();

    expect(tokenStorage.clearAuthData).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

