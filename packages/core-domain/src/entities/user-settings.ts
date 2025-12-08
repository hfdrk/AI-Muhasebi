export interface UserSettings {
  id: string;
  userId: string;
  locale: string | null;
  timezone: string | null;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserSettingsInput {
  locale?: string | null;
  timezone?: string | null;
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
}

export interface EffectiveUserSettings {
  userSettings: UserSettings;
  effectiveLocale: string;
  effectiveTimezone: string;
  effectiveEmailNotificationsEnabled: boolean;
  effectiveInAppNotificationsEnabled: boolean;
}

