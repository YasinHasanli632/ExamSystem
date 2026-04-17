export type StudentNotificationType =
  | 'System'
  | 'Exam'
  | 'Task'
  | 'Attendance'
  | 'User'
  | string;

export type StudentNotificationPriority =
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical'
  | string;

export type StudentNotificationColorKey =
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export type StudentNotificationFilterType =
  | ''
  | 'System'
  | 'Exam'
  | 'Task'
  | 'Attendance'
  | 'User';

export interface StudentNotificationModel {
  id: number;
  title: string;
  message: string;
  type: StudentNotificationType;
  category: string;
  priority: StudentNotificationPriority;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  actionUrl: string | null;
  icon: string | null;

  // UI üçün hazır fieldlər
  typeLabel: string;
  priorityLabel: string;
  timeText: string;
  iconText: string;
  colorKey: StudentNotificationColorKey;
}

export interface StudentNotificationUnreadCountModel {
  unreadCount: number;
}

export interface StudentNotificationFilterModel {
  searchText: string;
  type: StudentNotificationFilterType;
  isRead: '' | 'true' | 'false';
}