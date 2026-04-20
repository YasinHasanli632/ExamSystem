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
  timeout
} from 'rxjs';
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
  private readonly ngZone = inject(NgZone);
  private readonly baseUrl = `${environment.apiUrl}/Notification`;

  private pollingSubscription: Subscription | null = null;
  private isRefreshing = false;

  private readonly notificationsSubject = new BehaviorSubject<TeacherNotificationItem[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  private buildNoCacheOptions(params?: Record<string, string>): {
    params: HttpParams;
    headers: HttpHeaders;
  } {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((key) => {
        const value = params[key];

        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, value);
        }
      });
    }

    httpParams = httpParams.set('_t', Date.now().toString());

    return {
      params: httpParams,
      headers: new HttpHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      })
    };
  }

  getMyNotifications(query?: TeacherNotificationListQuery): Observable<TeacherNotificationItem[]> {
    const params: Record<string, string> = {};

    if (query?.isRead !== undefined) {
      params['isRead'] = String(query.isRead);
    }

    if (query?.type !== undefined && query.type !== null) {
      params['type'] = String(query.type);
    }

    return this.http
      .get<TeacherNotificationItem[]>(
        `${this.baseUrl}/my`,
        this.buildNoCacheOptions(params)
      )
      .pipe(
        timeout(10000),
        map((items) => this.deduplicateNotifications(items ?? [])),
        catchError((error) => {
          console.error('Teacher getMyNotifications error:', error);
          return of([]);
        })
      );
  }

  getLatestNotifications(take = 5): Observable<TeacherNotificationItem[]> {
    return this.http
      .get<TeacherNotificationItem[]>(
        `${this.baseUrl}/my/latest`,
        this.buildNoCacheOptions({ take: String(take) })
      )
      .pipe(
        timeout(10000),
        map((items) => this.deduplicateNotifications(items ?? [])),
        catchError((error) => {
          console.error('Teacher getLatestNotifications error:', error);
          return of([]);
        })
      );
  }

  getUnreadCount(): Observable<TeacherNotificationUnreadCountResponse> {
    return this.http
      .get<TeacherNotificationUnreadCountResponse>(
        `${this.baseUrl}/my/unread-count`,
        this.buildNoCacheOptions()
      )
      .pipe(
        timeout(10000),
        map((dto) => ({
          unreadCount: Number(dto?.unreadCount ?? 0)
        })),
        catchError((error) => {
          console.error('Teacher getUnreadCount error:', error);
          return of({ unreadCount: 0 });
        })
      );
  }

  refreshAll(query?: TeacherNotificationListQuery): Observable<void> {
    if (this.isRefreshing) {
      return of(void 0);
    }

    this.isRefreshing = true;
    this.loadingSubject.next(true);

    return forkJoin({
      notifications: this.getMyNotifications(query),
      unread: this.getUnreadCount()
    }).pipe(
      map(({ notifications, unread }) => {
        this.ngZone.run(() => {
          this.notificationsSubject.next(this.deduplicateNotifications(notifications));
          this.unreadCountSubject.next(Number(unread?.unreadCount ?? 0));
        });

        return void 0;
      }),
      catchError((error) => {
        console.error('Teacher notifications refreshAll error:', error);
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

  startRealtimePolling(intervalMs = 1000, query?: TeacherNotificationListQuery): void {
    if (this.pollingSubscription) {
      return;
    }

    this.refreshAll(query).subscribe();

    this.pollingSubscription = interval(intervalMs)
      .pipe(
        switchMap(() =>
          this.refreshAll(query).pipe(
            catchError((error) => {
              console.error('Teacher notifications polling error:', error);
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

  markAsRead(notificationId: number): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(
        `${this.baseUrl}/${notificationId}/read`,
        {}
      )
      .pipe(
        timeout(10000),
        switchMap((response) =>
          this.refreshAll().pipe(
            map(() => response)
          )
        )
      );
  }

  markAllAsRead(): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(
        `${this.baseUrl}/read-all`,
        {}
      )
      .pipe(
        timeout(10000),
        switchMap((response) =>
          this.refreshAll().pipe(
            map(() => response)
          )
        )
      );
  }

  delete(notificationId: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${this.baseUrl}/${notificationId}`
      )
      .pipe(
        timeout(10000),
        switchMap((response) =>
          this.refreshAll().pipe(
            map(() => response)
          )
        )
      );
  }

  private deduplicateNotifications(items: TeacherNotificationItem[]): TeacherNotificationItem[] {
    const mapById = new Map<number, TeacherNotificationItem>();

    for (const item of items) {
      const id = Number(item?.id ?? 0);

      if (!id) {
        continue;
      }

      if (!mapById.has(id)) {
        mapById.set(id, item);
      }
    }

    return Array.from(mapById.values()).sort((a, b) => {
      const aTime = new Date((a as any)?.createdAt ?? 0).getTime();
      const bTime = new Date((b as any)?.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }
}