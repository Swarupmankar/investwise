export type RawNotificationItem = {
  id: number;
  userId: number;
  notificationId: number;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  notification: {
    id: number;
    title: string;
    description: string;
    fileAttachedUrl: string | null;
    type:
      | "SECURITY"
      | "UPDATE"
      | "PROMOTION"
      | "ALERT"
      | "MAINTENANCE"
      | string;
    createdAt: string;
    updatedAt: string;
  };
};

export type GetAllNotificationsResponse = {
  unreadCount: number;
  notifications: RawNotificationItem[];
};
