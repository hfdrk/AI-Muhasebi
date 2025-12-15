export interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationPreferenceInput {
  tenantId: string;
  userId: string;
  email_enabled?: boolean;
  in_app_enabled?: boolean;
}






