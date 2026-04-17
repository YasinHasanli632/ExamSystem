export type TeacherNotificationReadFilter = 'all' | 'read' | 'unread';

export interface TeacherNotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  actionUrl?: string | null;
  icon?: string | null;
}

export interface TeacherNotificationUnreadCountResponse {
  unreadCount: number;
}

export interface TeacherNotificationListQuery {
  isRead?: boolean;
  type?: number;
}

export interface TeacherNotificationTypeOption {
  label: string;
  value: number;
}