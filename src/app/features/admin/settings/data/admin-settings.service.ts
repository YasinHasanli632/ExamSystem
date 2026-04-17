import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  ADMIN_SETTINGS_DEFAULT,
  AdminSettingsApiModel,
  AdminSettingsModel,
  UpdateAdminSettingsApiModel
} from '../../../../core/models/settings/admin-settings.model';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminSettingsService {
  private readonly http = inject(HttpClient);

  // YENI
  private readonly apiUrl = `${environment.apiUrl}/Settings`;

  // YENI
  getSettings(): Observable<AdminSettingsModel> {
    return this.http
      .get<AdminSettingsApiModel>(this.apiUrl)
      .pipe(map((response) => this.mapFromApi(response)));
  }

  // YENI
  updateSettings(model: AdminSettingsModel): Observable<AdminSettingsModel> {
    const payload = this.mapToApi(model);

    return this.http
      .put<AdminSettingsApiModel>(this.apiUrl, payload)
      .pipe(map((response) => this.mapFromApi(response)));
  }

  // YENI
  resetToDefaults(): Observable<AdminSettingsModel> {
    return this.http
      .post<AdminSettingsApiModel>(`${this.apiUrl}/reset-defaults`, {})
      .pipe(map((response) => this.mapFromApi(response)));
  }

  // YENI
  private mapFromApi(api: AdminSettingsApiModel | null | undefined): AdminSettingsModel {
    if (!api) {
      return structuredClone(ADMIN_SETTINGS_DEFAULT);
    }

    return {
      general: {
        systemName: api.systemName ?? '',
        schoolName: api.schoolName ?? '',
        academicYear: api.academicYear ?? '',
        defaultLanguage: api.defaultLanguage ?? 'az'
      },
      exam: {
        defaultExamDurationMinutes: api.defaultExamDurationMinutes ?? 90,
        accessCodeActivationMinutes: api.accessCodeActivationMinutes ?? 5,
        lateEntryToleranceMinutes: api.lateEntryToleranceMinutes ?? 10,
        defaultPassScore: api.defaultPassScore ?? 51,
        autoSubmitOnEndTime: api.autoSubmitOnEndTime ?? true,
        allowEarlySubmit: api.allowEarlySubmit ?? true,
        autoPublishResults: api.autoPublishResults ?? false,
        showScoreImmediately: api.showScoreImmediately ?? true,
        showCorrectAnswersAfterCompletion: api.showCorrectAnswersAfterCompletion ?? false
      },
      notification: {
        examPublishNotificationEnabled: api.examPublishNotificationEnabled ?? true,
        examRescheduleNotificationEnabled: api.examRescheduleNotificationEnabled ?? true,
        examStartNotificationEnabled: api.examStartNotificationEnabled ?? true,
        resultNotificationEnabled: api.resultNotificationEnabled ?? true,
        attendanceNotificationEnabled: api.attendanceNotificationEnabled ?? true,
        taskNotificationEnabled: api.taskNotificationEnabled ?? true
      },
      security: {
        autoSaveIntervalSeconds: api.autoSaveIntervalSeconds ?? 30,
        sessionTimeoutMinutes: api.sessionTimeoutMinutes ?? 20,
        maxAccessCodeAttempts: api.maxAccessCodeAttempts ?? 5,
        allowReEntry: api.allowReEntry ?? true
      },
      updatedAt: api.updatedAt ?? null
    };
  }

  // YENI
  private mapToApi(model: AdminSettingsModel): UpdateAdminSettingsApiModel {
    return {
      systemName: model.general.systemName,
      schoolName: model.general.schoolName,
      academicYear: model.general.academicYear,
      defaultLanguage: model.general.defaultLanguage,

      defaultExamDurationMinutes: model.exam.defaultExamDurationMinutes,
      accessCodeActivationMinutes: model.exam.accessCodeActivationMinutes,
      lateEntryToleranceMinutes: model.exam.lateEntryToleranceMinutes,
      defaultPassScore: model.exam.defaultPassScore,

      autoSubmitOnEndTime: model.exam.autoSubmitOnEndTime,
      allowEarlySubmit: model.exam.allowEarlySubmit,
      autoPublishResults: model.exam.autoPublishResults,
      showScoreImmediately: model.exam.showScoreImmediately,
      showCorrectAnswersAfterCompletion: model.exam.showCorrectAnswersAfterCompletion,

      examPublishNotificationEnabled: model.notification.examPublishNotificationEnabled,
      examRescheduleNotificationEnabled: model.notification.examRescheduleNotificationEnabled,
      examStartNotificationEnabled: model.notification.examStartNotificationEnabled,
      resultNotificationEnabled: model.notification.resultNotificationEnabled,
      attendanceNotificationEnabled: model.notification.attendanceNotificationEnabled,
      taskNotificationEnabled: model.notification.taskNotificationEnabled,

      autoSaveIntervalSeconds: model.security.autoSaveIntervalSeconds,
      sessionTimeoutMinutes: model.security.sessionTimeoutMinutes,
      maxAccessCodeAttempts: model.security.maxAccessCodeAttempts,
      allowReEntry: model.security.allowReEntry
    };
  }
}