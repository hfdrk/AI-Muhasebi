/**
 * Toast notification utilities
 * Provides easy-to-use functions for showing toast notifications
 */

import { toast as hotToast } from "react-hot-toast";

export const toast = {
  success: (message: string) => {
    hotToast.success(message, {
      duration: 4000,
    });
  },
  
  error: (message: string) => {
    hotToast.error(message, {
      duration: 5000,
    });
  },
  
  warning: (message: string) => {
    hotToast(message, {
      icon: "⚠️",
      duration: 4000,
      style: {
        borderLeft: "4px solid #f59e0b",
      },
    });
  },
  
  info: (message: string, options?: { duration?: number }) => {
    hotToast(message, {
      icon: "ℹ️",
      duration: options?.duration || 6000,
      style: {
        borderLeft: "4px solid #06b6d4",
      },
    });
  },
  
  loading: (message: string) => {
    return hotToast.loading(message);
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return hotToast.promise(promise, messages);
  },
};

