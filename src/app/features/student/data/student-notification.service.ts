import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  catchError,
  finalize,
  forkJoin,
  interval,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  StudentNotificationModel,
  StudentNotificationUnreadCountModel
} from '../../../core/models/notification/student-notification.model';

interface NotificationListItemDto {
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

interface NotificationUnreadCountDto {
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class StudentNotificationService {
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);
  private readonly baseUrl = `${environment.apiUrl}/Notification`;

  private pollingSubscription: Subscription | null = null;
  private isRefreshing = false;

  private readonly notificationsSubject = new BehaviorSubject<StudentNotificationModel[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  private buildNoCacheOptions(params?: HttpParams) {
    const noCacheParams = (params ?? new HttpParams()).set('_t', Date.now().toString());

    return {
      params: noCacheParams,
      headers: new HttpHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      })
    };
  }

  getMyNotifications(
    isRead?: boolean | null,
    type?: number | null
  ): Observable<StudentNotificationModel[]> {
    let params = new HttpParams();

    if (isRead !== null && isRead !== undefined) {
      params = params.set('isRead', String(isRead));
    }

    if (type !== null && type !== undefined) {
      params = params.set('type', String(type));
    }

    return this.http
      .get<NotificationListItemDto[]>(
        `${this.baseUrl}/my`,
        this.buildNoCacheOptions(params)
      )
      .pipe(
        map((items) => (items ?? []).map((item) => this.mapNotification(item))),
        catchError((error) => {
          console.error('Student getMyNotifications error:', error);
          return of([]);
        })
      );
  }

  getMyLatestNotifications(take = 5): Observable<StudentNotificationModel[]> {
    const params = new HttpParams().set('take', String(take));

    return this.http
      .get<NotificationListItemDto[]>(
        `${this.baseUrl}/my/latest`,
        this.buildNoCacheOptions(params)
      )
      .pipe(
        map((items) => (items ?? []).map((item) => this.mapNotification(item))),
        catchError((error) => {
          console.error('Student getMyLatestNotifications error:', error);
          return of([]);
        })
      );
  }

  getMyUnreadCount(): Observable<StudentNotificationUnreadCountModel> {
    return this.http
      .get<NotificationUnreadCountDto>(
        `${this.baseUrl}/my/unread-count`,
        this.buildNoCacheOptions()
      )
      .pipe(
        map((dto) => ({
          unreadCount: Number(dto?.unreadCount ?? 0)
        })),
        catchError((error) => {
          console.error('Student getMyUnreadCount error:', error);
          return of({ unreadCount: 0 });
        })
      );
  }

  refreshAll(): Observable<void> {
    if (this.isRefreshing) {
      return of(void 0);
    }

    this.isRefreshing = true;
    this.loadingSubject.next(true);

    return forkJoin({
      notifications: this.getMyNotifications(),
      unread: this.getMyUnreadCount()
    }).pipe(
      tap(({ notifications, unread }) => {
        this.ngZone.run(() => {
          this.notificationsSubject.next(notifications);
          this.unreadCountSubject.next(unread.unreadCount);
        });
      }),
      map(() => void 0),
      catchError((error) => {
        console.error('Student notifications refresh error:', error);
        return of(void 0);
      }),
      finalize(() => {
        this.ngZone.run(() => {
          this.loadingSubject.next(false);
          this.isRefreshing = false;
        });
      })
    );
  }

  startRealtimePolling(intervalMs = 1000): void {
    if (this.pollingSubscription) {
      return;
    }

    this.refreshAll().subscribe();

    this.pollingSubscription = interval(intervalMs)
      .pipe(
        switchMap(() =>
          this.refreshAll().pipe(
            catchError((error) => {
              console.error('Student notifications polling error:', error);
              return of(void 0);
            })
          )
        )
      )
      .subscribe();
  }

  stopRealtimePolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
  }

  markAsRead(notificationId: number): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/${notificationId}/read`, {})
      .pipe(
        switchMap(() => this.refreshAll()),
        map(() => void 0)
      );
  }

  markAllAsRead(): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/read-all`, {})
      .pipe(
        switchMap(() => this.refreshAll()),
        map(() => void 0)
      );
  }

  deleteNotification(notificationId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${notificationId}`)
      .pipe(
        switchMap(() => this.refreshAll()),
        map(() => void 0)
      );
  }

  private mapNotification(item: NotificationListItemDto): StudentNotificationModel {
    const type = (item?.type ?? '').trim() || 'System';
    const priority = (item?.priority ?? '').trim() || 'Medium';

    return {
      id: Number(item?.id ?? 0),
      title: (item?.title ?? '').trim() || 'Bildiriş',
      message: (item?.message ?? '').trim() || '',
      type,
      category: (item?.category ?? '').trim() || 'General',
      priority,
      isRead: !!item?.isRead,
      createdAt: item?.createdAt ?? '',
      readAt: item?.readAt ?? null,
      relatedEntityType: item?.relatedEntityType ?? null,
      relatedEntityId:
        item?.relatedEntityId !== null && item?.relatedEntityId !== undefined
          ? Number(item.relatedEntityId)
          : null,
      actionUrl: (item?.actionUrl ?? '').trim() || null,
      icon: (item?.icon ?? '').trim() || null,
      typeLabel: this.getTypeLabel(type),
      priorityLabel: this.getPriorityLabel(priority),
      timeText: this.getRelativeTimeText(item?.createdAt),
      iconText: this.getIconText(type, item?.icon),
      colorKey: this.getColorKey(type, priority)
    };
  }

  private getTypeLabel(type: string): string {
    switch ((type ?? '').toLowerCase()) {
      case 'exam':
        return 'İmtahan';
      case 'task':
        return 'Tapşırıq';
      case 'attendance':
        return 'Davamiyyət';
      case 'user':
        return 'İstifadəçi';
      default:
        return 'Sistem';
    }
  }

  private getPriorityLabel(priority: string): string {
    switch ((priority ?? '').toLowerCase()) {
      case 'critical':
        return 'Kritik';
      case 'high':
        return 'Yüksək';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Aşağı';
      default:
        return 'Orta';
    }
  }

  private getColorKey(
    type: string,
    priority: string
  ): 'default' | 'info' | 'success' | 'warning' | 'danger' {
    const normalizedPriority = (priority ?? '').toLowerCase();
    const normalizedType = (type ?? '').toLowerCase();

    if (normalizedPriority === 'critical' || normalizedPriority === 'high') {
      return 'danger';
    }

    if (normalizedType === 'attendance') {
      return 'warning';
    }

    if (normalizedType === 'task') {
      return 'success';
    }

    if (normalizedType === 'exam') {
      return 'info';
    }

    return 'default';
  }

  private getIconText(type: string, icon?: string | null): string {
    const normalizedIcon = (icon ?? '').toLowerCase();

    if (normalizedIcon.includes('exam')) return '✎';
    if (normalizedIcon.includes('task')) return '☑';
    if (normalizedIcon.includes('attendance')) return '◔';
    if (normalizedIcon.includes('user')) return '👤';
    if (normalizedIcon.includes('warning')) return '⚠';
    if (normalizedIcon.includes('success')) return '✓';

    switch ((type ?? '').toLowerCase()) {
      case 'exam':
        return '✎';
      case 'task':
        return '☑';
      case 'attendance':
        return '◔';
      case 'user':
        return '👤';
      default:
        return '🔔';
    }
  }

  private getRelativeTimeText(dateValue?: string | null): string {
    if (!dateValue) {
      return 'Tarix yoxdur';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'Tarix yoxdur';
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'İndi';
    if (diffMinutes < 60) return `${diffMinutes} dəq əvvəl`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} saat əvvəl`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} gün əvvəl`;

    return date.toLocaleString('az-Latn-AZ', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
} 