import React from "react";
import { toast } from "sonner";

type NotificationOptions = {
  duration?: number;
  icon?: React.ReactNode;
};

const DEFAULT_DURATION = 4000;

/**
 * Toast notifications, shown by the app's sonner `Toaster`.
 */
export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.success(content, { duration: DEFAULT_DURATION, ...options });
  },
  info: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.info(content, { duration: DEFAULT_DURATION, ...options });
  },
  warning: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.warning(content, { duration: DEFAULT_DURATION, ...options });
  },
  error: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.error(content, { duration: DEFAULT_DURATION, ...options });
  },
  loading: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.loading(content, { duration: Infinity, ...options });
  },
  remove: (toastId: string | number) => {
    toast.dismiss(toastId);
  },
};
