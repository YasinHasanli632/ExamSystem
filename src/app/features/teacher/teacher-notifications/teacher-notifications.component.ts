import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import {
  TeacherNotificationItem,
  TeacherNotificationReadFilter,
  TeacherNotificationTypeOption
} from '../../../core/models/notification/teacher-notification.model';
import { TeacherNotificationService } from '../../teacher/services/teacher-notification.service';

@Component({
  selector: 'app-teacher-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-notifications.component.html',
  styleUrls: ['./teacher-notifications.component.css']
})
export class TeacherNotificationsComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(TeacherNotificationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  notifications: TeacherNotificationItem[] = [];
  filteredNotifications: TeacherNotificationItem[] = [];

  isLoading = false;
  isMarkingAll = false;
  unreadCount = 0;

  errorMessage = '';
  successMessage = '';

  searchText = '';
  readFilter: TeacherNotificationReadFilter = 'all';
  selectedType = '';

  readonly typeOptions: TeacherNotificationTypeOption[] = [
    { label: 'Sistem', value: 1 },
    { label: 'İmtahan', value: 2 },
    { label: 'Tapşırıq', value: 3 },
    { label: 'Davamiyyət', value: 4 },
    { label: 'İstifadəçi', value: 5 },
    { label: 'Elan', value: 6 }
  ];

  ngOnInit(): void {
    this.loadPage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalCount(): number {
    return this.notifications.length;
  }

  get readCount(): number {
    return this.notifications.filter(item => item.isRead).length;
  }

  get unreadListCount(): number {
    return this.notifications.filter(item => !item.isRead).length;
  }

  loadPage(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.notificationService.getUnreadCount().subscribe({
      next: response => {
        this.unreadCount = response?.unreadCount ?? 0;
        this.cdr.detectChanges();
      },
      error: () => {
        this.unreadCount = 0;
        this.cdr.detectChanges();
      }
    });

    this.notificationService.getMyNotifications().subscribe({
      next: response => {
        this.notifications = (response ?? []).slice().sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        this.applyClientFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.notifications = [];
        this.filteredNotifications = [];
        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(
          error,
          'Bildirişlər yüklənərkən xəta baş verdi.'
        );
        this.cdr.detectChanges();
      }
    });
  }

  refresh(): void {
    this.loadPage();
  }

  onSearchChange(): void {
    this.applyClientFilters();
  }

  onReadFilterChange(): void {
    this.applyClientFilters();
  }

  onTypeFilterChange(): void {
    this.applyClientFilters();
  }

  applyClientFilters(): void {
    const normalizedSearch = this.searchText.trim().toLowerCase();
    const selectedTypeName = this.mapTypeValueToApiTypeName(this.selectedType);

    this.filteredNotifications = this.notifications.filter(item => {
      const matchesRead =
        this.readFilter === 'all' ||
        (this.readFilter === 'read' && item.isRead) ||
        (this.readFilter === 'unread' && !item.isRead);

      const matchesType =
        !selectedTypeName ||
        (item.type ?? '').toLowerCase() === selectedTypeName.toLowerCase();

      const searchableText = [
        item.title,
        item.message,
        item.type,
        item.category,
        item.priority,
        item.relatedEntityType,
        item.actionUrl,
        item.icon
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesRead && matchesType && matchesSearch;
    });
  }

  markAsRead(item: TeacherNotificationItem): void {
    if (!item || item.isRead) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    this.notificationService.markAsRead(item.id).subscribe({
      next: response => {
        item.isRead = true;
        item.readAt = new Date().toISOString();
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.successMessage = response?.message || 'Bildiriş oxundu kimi qeyd edildi.';
        this.applyClientFilters();
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(
          error,
          'Bildiriş oxundu kimi qeyd edilə bilmədi.'
        );
        this.cdr.detectChanges();
      }
    });
  }

  markAllAsRead(): void {
    if (!this.notifications.length || this.unreadListCount === 0) {
      return;
    }

    this.isMarkingAll = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.notificationService.markAllAsRead().subscribe({
      next: response => {
        const readAt = new Date().toISOString();

        this.notifications = this.notifications.map(item => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? readAt
        }));

        this.unreadCount = 0;
        this.successMessage = response?.message || 'Bütün bildirişlər oxundu kimi qeyd edildi.';
        this.applyClientFilters();
        this.isMarkingAll = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.isMarkingAll = false;
        this.errorMessage = this.extractErrorMessage(
          error,
          'Bütün bildirişlər oxundu kimi qeyd edilə bilmədi.'
        );
        this.cdr.detectChanges();
      }
    });
  }

  deleteNotification(item: TeacherNotificationItem): void {
    const confirmed = window.confirm(`"${item.title}" bildirişi silinsin?`);

    if (!confirmed) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    this.notificationService.delete(item.id).subscribe({
      next: response => {
        if (!item.isRead) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }

        this.notifications = this.notifications.filter(x => x.id !== item.id);
        this.applyClientFilters();
        this.successMessage = response?.message || 'Bildiriş silindi.';
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(
          error,
          'Bildiriş silinərkən xəta baş verdi.'
        );
        this.cdr.detectChanges();
      }
    });
  }

  openNotification(item: TeacherNotificationItem): void {
    if (!item.isRead) {
      this.markAsRead(item);
    }

    const normalizedRoute = this.normalizeActionUrl(item.actionUrl);

    if (normalizedRoute) {
      this.router.navigateByUrl(normalizedRoute);
      return;
    }

    const fallbackRoute = this.buildFallbackRoute(item);
    this.router.navigateByUrl(fallbackRoute);
  }

  getTypeLabel(type: string | null | undefined): string {
    const value = (type ?? '').toLowerCase();

    switch (value) {
      case 'exam':
        return 'İmtahan';
      case 'task':
        return 'Tapşırıq';
      case 'attendance':
        return 'Davamiyyət';
      case 'user':
        return 'İstifadəçi';
      case 'announcement':
        return 'Elan';
      default:
        return 'Sistem';
    }
  }

  getCategoryLabel(category: string | null | undefined): string {
    const value = (category ?? '').toLowerCase();

    switch (value) {
      case 'tasksubmitted':
        return 'Tapşırıq göndərildi';
      case 'userstatuschanged':
        return 'Hesab statusu';
      case 'exampublished':
        return 'İmtahan yayımlandı';
      case 'examrescheduled':
        return 'İmtahan vaxtı dəyişdi';
      case 'examcompleted':
        return 'İmtahan tamamlandı';
      case 'openquestionreviewpending':
        return 'Yoxlama gözləyir';
      case 'rolechanged':
        return 'Rol dəyişdi';
      case 'profileupdated':
        return 'Profil yeniləndi';
      case 'systemwarning':
        return 'Sistem xəbərdarlığı';
      case 'systemerror':
        return 'Sistem xətası';
      default:
        return category || 'Ümumi';
    }
  }

  getPriorityLabel(priority: string | null | undefined): string {
    const value = (priority ?? '').toLowerCase();

    switch (value) {
      case 'critical':
        return 'Kritik';
      case 'high':
        return 'Yüksək';
      case 'medium':
        return 'Orta';
      default:
        return 'Aşağı';
    }
  }

  getPriorityBadgeClass(priority: string | null | undefined): string {
    const value = (priority ?? '').toLowerCase();

    if (value === 'critical') return 'priority-critical';
    if (value === 'high') return 'priority-high';
    if (value === 'medium') return 'priority-medium';
    return 'priority-low';
  }

  getTypeBadgeClass(type: string | null | undefined): string {
    const value = (type ?? '').toLowerCase();

    if (value === 'exam') return 'type-exam';
    if (value === 'task') return 'type-task';
    if (value === 'attendance') return 'type-attendance';
    if (value === 'user') return 'type-user';
    if (value === 'announcement') return 'type-announcement';
    return 'type-system';
  }

  getRelativeDate(dateValue: string | null | undefined): string {
    if (!dateValue) {
      return '-';
    }

    const now = new Date().getTime();
    const date = new Date(dateValue).getTime();

    if (Number.isNaN(date)) {
      return dateValue;
    }

    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return 'İndi';
    if (diffMin < 60) return `${diffMin} dəq əvvəl`;
    if (diffHour < 24) return `${diffHour} saat əvvəl`;
    if (diffDay < 7) return `${diffDay} gün əvvəl`;

    return new Date(dateValue).toLocaleString('az-AZ');
  }

  trackByNotificationId(_index: number, item: TeacherNotificationItem): number {
    return item.id;
  }

  private normalizeActionUrl(actionUrl?: string | null): string {
    if (!actionUrl || !actionUrl.trim()) {
      return '';
    }

    const url = actionUrl.trim();

    if (url === '/profile') {
      return '/teacher/profile';
    }

    if (url.startsWith('/teacher/tasks/detail/')) {
      return url;
    }

    if (url.startsWith('/teacher/tasks/')) {
      const taskGroupKey = url.split('/teacher/tasks/')[1];

      if (taskGroupKey) {
        return `/teacher/tasks/detail/${taskGroupKey}`;
      }
    }

    if (url.startsWith('/teacher')) {
      return url;
    }

    if (url.startsWith('/student') || url.startsWith('/admin')) {
      return '/teacher/notifications';
    }

    return '';
  }

  private buildFallbackRoute(item: TeacherNotificationItem): string {
    const entityType = (item.relatedEntityType ?? '').toLowerCase();
    const entityId = item.relatedEntityId;

    if (entityType.includes('studenttask')) {
      return '/teacher/tasks';
    }

    if (entityType.includes('exam') && entityId) {
      return `/teacher/exams/${entityId}`;
    }

    if (entityType.includes('user')) {
      return '/teacher/profile';
    }

    return '/teacher/notifications';
  }

  private mapTypeValueToApiTypeName(typeValue: string): string {
    switch (Number(typeValue)) {
      case 1:
        return 'System';
      case 2:
        return 'Exam';
      case 3:
        return 'Task';
      case 4:
        return 'Attendance';
      case 5:
        return 'User';
      case 6:
        return 'Announcement';
      default:
        return '';
    }
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error;

      if (typeof serverError === 'string' && serverError.trim()) {
        return serverError;
      }

      if (serverError?.message && typeof serverError.message === 'string') {
        return serverError.message;
      }

      if (serverError?.errors) {
        const firstKey = Object.keys(serverError.errors)[0];
        const firstMessage = serverError.errors[firstKey]?.[0];

        if (firstMessage) {
          return firstMessage;
        }
      }
    }

    return fallbackMessage;
  }
}