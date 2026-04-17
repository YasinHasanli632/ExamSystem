import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TeacherNotificationItem,
  TeacherNotificationListQuery,
  TeacherNotificationUnreadCountResponse
} from '../../../core/models/notification/teacher-notification.model';

@Injectable({
  providedIn: 'root'
})
export class TeacherNotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Notification`;

  getMyNotifications(query?: TeacherNotificationListQuery): Observable<TeacherNotificationItem[]> {
    const params: Record<string, string> = {};

    if (query?.isRead !== undefined) {
      params['isRead'] = String(query.isRead);
    }

    if (query?.type !== undefined && query.type !== null) {
      params['type'] = String(query.type);
    }

    return this.http.get<TeacherNotificationItem[]>(`${this.baseUrl}/my`, { params }).pipe(
      timeout(10000)
    );
  }

  getLatestNotifications(take = 5): Observable<TeacherNotificationItem[]> {
    return this.http.get<TeacherNotificationItem[]>(`${this.baseUrl}/my/latest`, {
      params: { take: String(take) }
    }).pipe(
      timeout(10000)
    );
  }

  getUnreadCount(): Observable<TeacherNotificationUnreadCountResponse> {
    return this.http.get<TeacherNotificationUnreadCountResponse>(`${this.baseUrl}/my/unread-count`).pipe(
      timeout(10000)
    );
  }

  markAsRead(notificationId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/${notificationId}/read`,
      {}
    ).pipe(
      timeout(10000)
    );
  }

  markAllAsRead(): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/read-all`,
      {}
    ).pipe(
      timeout(10000)
    );
  }

  delete(notificationId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/${notificationId}`
    ).pipe(
      timeout(10000)
    );
  }
}