import {useState, useEffect} from 'react';
import {tokenStorage, type AuthData} from '../storage/token-storage';
import {authAPI} from '../services/api';

export function useAuth() {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await tokenStorage.getAuthData();
      setAuthData(data);
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthData(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const data: AuthData = {
        accessToken: response.data.accessToken,
        tenantId: response.data.tenantId,
        user: response.data.user,
      };
      await tokenStorage.saveAuthData(data);
      setAuthData(data);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Giriş başarısız.');
    }
  };

  const logout = async () => {
    await tokenStorage.clearAuthData();
    setAuthData(null);
  };

  return {
    authData,
    loading,
    isAuthenticated: !!authData,
    login,
    logout,
    checkAuth,
  };
}



