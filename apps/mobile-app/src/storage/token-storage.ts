import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@ai_muhasebi:access_token';
const TENANT_ID_KEY = '@ai_muhasebi:tenant_id';
const USER_INFO_KEY = '@ai_muhasebi:user_info';

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  locale: string;
}

export interface AuthData {
  accessToken: string;
  tenantId?: string;
  user: UserInfo;
}

export const tokenStorage = {
  async saveAuthData(data: AuthData): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken),
      data.tenantId && AsyncStorage.setItem(TENANT_ID_KEY, data.tenantId),
      AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user)),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async getTenantId(): Promise<string | null> {
    return AsyncStorage.getItem(TENANT_ID_KEY);
  },

  async getUserInfo(): Promise<UserInfo | null> {
    const data = await AsyncStorage.getItem(USER_INFO_KEY);
    return data ? JSON.parse(data) : null;
  },

  async getAuthData(): Promise<AuthData | null> {
    const [accessToken, tenantId, userInfo] = await Promise.all([
      this.getAccessToken(),
      this.getTenantId(),
      this.getUserInfo(),
    ]);

    if (!accessToken || !userInfo) {
      return null;
    }

    return {
      accessToken,
      tenantId: tenantId || undefined,
      user: userInfo,
    };
  },

  async clearAuthData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(TENANT_ID_KEY),
      AsyncStorage.removeItem(USER_INFO_KEY),
    ]);
  },
};





