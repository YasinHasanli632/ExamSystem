export interface GeneralSettingsModel {
  systemName: string;
  schoolName: string;
  academicYear: string;
  defaultLanguage: string;
}

export interface ExamSettingsModel {
  defaultExamDurationMinutes: number;
  accessCodeActivationMinutes: number;
  lateEntryToleranceMinutes: number;
  defaultPassScore: number;
  autoSubmitOnEndTime: boolean;
  allowEarlySubmit: boolean;
  autoPublishResults: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswersAfterCompletion: boolean;
}

export interface NotificationSettingsModel {
  examPublishNotificationEnabled: boolean;
  examRescheduleNotificationEnabled: boolean;
  examStartNotificationEnabled: boolean;
  resultNotificationEnabled: boolean;
  attendanceNotificationEnabled: boolean;
  taskNotificationEnabled: boolean;
}

export interface SecuritySettingsModel {
  autoSaveIntervalSeconds: number;
  sessionTimeoutMinutes: number;
  maxAccessCodeAttempts: number;
  allowReEntry: boolean;
}

export interface AdminSettingsModel {
  general: GeneralSettingsModel;
  exam: ExamSettingsModel;
  notification: NotificationSettingsModel;
  security: SecuritySettingsModel;
  updatedAt?: string | null;
}

export interface AdminSettingsApiModel {
  id?: number;
  systemName: string;
  schoolName: string;
  academicYear: string;
  defaultLanguage: string;

  defaultExamDurationMinutes: number;
  accessCodeActivationMinutes: number;
  lateEntryToleranceMinutes: number;
  defaultPassScore: number;

  autoSubmitOnEndTime: boolean;
  allowEarlySubmit: boolean;
  autoPublishResults: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswersAfterCompletion: boolean;

  examPublishNotificationEnabled: boolean;
  examRescheduleNotificationEnabled: boolean;
  examStartNotificationEnabled: boolean;
  resultNotificationEnabled: boolean;
  attendanceNotificationEnabled: boolean;
  taskNotificationEnabled: boolean;

  autoSaveIntervalSeconds: number;
  sessionTimeoutMinutes: number;
  maxAccessCodeAttempts: number;
  allowReEntry: boolean;

  updatedAt?: string | null;
}

export interface UpdateAdminSettingsApiModel {
  systemName: string;
  schoolName: string;
  academicYear: string;
  defaultLanguage: string;

  defaultExamDurationMinutes: number;
  accessCodeActivationMinutes: number;
  lateEntryToleranceMinutes: number;
  defaultPassScore: number;

  autoSubmitOnEndTime: boolean;
  allowEarlySubmit: boolean;
  autoPublishResults: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswersAfterCompletion: boolean;

  examPublishNotificationEnabled: boolean;
  examRescheduleNotificationEnabled: boolean;
  examStartNotificationEnabled: boolean;
  resultNotificationEnabled: boolean;
  attendanceNotificationEnabled: boolean;
  taskNotificationEnabled: boolean;

  autoSaveIntervalSeconds: number;
  sessionTimeoutMinutes: number;
  maxAccessCodeAttempts: number;
  allowReEntry: boolean;
}

export const ADMIN_SETTINGS_DEFAULT: AdminSettingsModel = {
  general: {
    systemName: 'Exam Management System',
    schoolName: 'Məktəb İdarəetmə Sistemi',
    academicYear: '2025-2026',
    defaultLanguage: 'az'
  },
  exam: {
    defaultExamDurationMinutes: 90,
    accessCodeActivationMinutes: 5,
    lateEntryToleranceMinutes: 10,
    defaultPassScore: 51,
    autoSubmitOnEndTime: true,
    allowEarlySubmit: true,
    autoPublishResults: false,
    showScoreImmediately: true,
    showCorrectAnswersAfterCompletion: false
  },
  notification: {
    examPublishNotificationEnabled: true,
    examRescheduleNotificationEnabled: true,
    examStartNotificationEnabled: true,
    resultNotificationEnabled: true,
    attendanceNotificationEnabled: true,
    taskNotificationEnabled: true
  },
  security: {
    autoSaveIntervalSeconds: 30,
    sessionTimeoutMinutes: 20,
    maxAccessCodeAttempts: 5,
    allowReEntry: true
  },
  updatedAt: null
};

export interface SettingsLanguageOptionModel {
  label: string;
  value: string;
}