export type NotificationReadFilter = 'all' | 'read' | 'unread';

export type NotificationTypeName =
  | 'System'
  | 'Exam'
  | 'Task'
  | 'Attendance'
  | 'User'
  | 'Announcement';

export interface NotificationListItem {
  id: number;
  title: string;
  message: string;
  type: NotificationTypeName | string;
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

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

export interface NotificationListQuery {
  isRead?: boolean;
  type?: number;
}

export interface NotificationTypeOption {
  label: string;
  value: number;
}