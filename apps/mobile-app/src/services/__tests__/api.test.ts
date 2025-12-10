import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { authAPI, mobileAPI, riskAPI, notificationAPI } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock fetch
global.fetch = vi.fn();

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AsyncStorage.getItem as any).mockResolvedValue('test-token');
  });

  describe('authAPI', () => {
    it('should call login endpoint with correct data', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user: { id: '1', email: 'test@test.com', fullName: 'Test User', locale: 'tr' },
            accessToken: 'token',
            tenantId: 'tenant-1',
          },
        }),
      });

      const result = await authAPI.login('test@test.com', 'password');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
        })
      );
      expect(result.data.accessToken).toBe('token');
    });
  });

  describe('mobileAPI', () => {
    it('should call dashboard endpoint', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            totalClientCompanies: 10,
            openRiskAlerts: 5,
            pendingDocuments: 2,
            todayInvoices: 3,
            recentNotifications: [],
          },
        }),
      });

      const result = await mobileAPI.getDashboard();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/mobile/dashboard'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result.data.totalClientCompanies).toBe(10);
    });
  });

  describe('riskAPI', () => {
    it('should call risk alerts endpoint with params', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            data: [],
            total: 0,
            page: 1,
            pageSize: 20,
            totalPages: 0,
          },
        }),
      });

      await riskAPI.listAlerts({ page: 1, pageSize: 20 });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/risk/alerts'),
        expect.anything()
      );
    });
  });

  describe('notificationAPI', () => {
    it('should call notifications list endpoint', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, limit: 50, offset: 0 },
        }),
      });

      await notificationAPI.list();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/notifications'),
        expect.anything()
      );
    });

    it('should call mark as read endpoint', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await notificationAPI.markAsRead('notification-id');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/notifications/notification-id/read'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});


