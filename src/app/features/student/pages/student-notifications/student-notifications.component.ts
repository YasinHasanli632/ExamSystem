import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import {
  StudentNotificationFilterModel,
  StudentNotificationModel
} from '../../../../core/models/notification/student-notification.model';
import { StudentNotificationService } from '../../data/student-notification.service';

@Component({
  selector: 'app-student-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-notifications.component.html',
  styleUrls: ['./student-notifications.component.css']
})
export class StudentNotificationsComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly notificationService = inject(StudentNotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly notifications = signal<StudentNotificationModel[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly isLoading = signal<boolean>(false);
  readonly isActionLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly filter = signal<StudentNotificationFilterModel>({
    searchText: '',
    type: '',
    isRead: ''
  });

  readonly filteredNotifications = computed(() => {
    const currentFilter = this.filter();
    const search = currentFilter.searchText.trim().toLowerCase();

    return this.notifications().filter((item) => {
     const matchesSearch =
  !search ||
  item.title.toLowerCase().includes(search) ||
  item.message.toLowerCase().includes(search) ||
  item.typeLabel.toLowerCase().includes(search);

      const matchesType =
        !currentFilter.type ||
        item.type.toLowerCase() === currentFilter.type.toLowerCase();

      const matchesRead =
        !currentFilter.isRead ||
        (currentFilter.isRead === 'true' ? item.isRead : !item.isRead);

      return matchesSearch && matchesType && matchesRead;
    });
  });

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.notifications.set(items);
      });

    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.unreadCount.set(count);
      });

    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.notificationService
      .refreshAll()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: () => {
          this.errorMessage.set('Bildirişlər yüklənərkən xəta baş verdi.');
        }
      });
  }

  setSearchText(value: string): void {
    this.filter.update((state) => ({
      ...state,
      searchText: value
    }));
  }

  setType(value: string): void {
    this.filter.update((state) => ({
      ...state,
      type: value as StudentNotificationFilterModel['type']
    }));
  }

  setReadFilter(value: string): void {
    this.filter.update((state) => ({
      ...state,
      isRead: value as StudentNotificationFilterModel['isRead']
    }));
  }

  markAsRead(item: StudentNotificationModel): void {
    if (item.isRead || this.isActionLoading()) {
      return;
    }

    this.isActionLoading.set(true);

    this.notificationService
      .markAsRead(item.id)
      .pipe(
        finalize(() => this.isActionLoading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: () => {
          this.errorMessage.set('Bildiriş oxunmuş kimi qeyd edilə bilmədi.');
        }
      });
  }

  markAllAsRead(): void {
    if (!this.unreadCount() || this.isActionLoading()) {
      return;
    }

    this.isActionLoading.set(true);

    this.notificationService
      .markAllAsRead()
      .pipe(
        finalize(() => this.isActionLoading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: () => {
          this.errorMessage.set('Bütün bildirişlər oxunmuş kimi qeyd edilə bilmədi.');
        }
      });
  }

  remove(item: StudentNotificationModel): void {
    if (this.isActionLoading()) {
      return;
    }

    this.isActionLoading.set(true);

    this.notificationService
      .deleteNotification(item.id)
      .pipe(
        finalize(() => this.isActionLoading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: () => {
          this.errorMessage.set('Bildiriş silinərkən xəta baş verdi.');
        }
      });
  }

  openNotification(item: StudentNotificationModel): void {
    if (!item.isRead) {
      this.markAsRead(item);
    }

    if (item.actionUrl) {
      this.router.navigateByUrl(item.actionUrl);
    }
  }

  trackByNotificationId(_: number, item: StudentNotificationModel): number {
    return item.id;
  }
}