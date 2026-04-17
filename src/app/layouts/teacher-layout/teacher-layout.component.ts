import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet
} from '@angular/router';
import { Subject, interval } from 'rxjs';
import { filter, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { TeacherNotificationService } from '../../features/teacher/services/teacher-notification.service';

interface TeacherSidebarItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  templateUrl: './teacher-layout.component.html',
  styleUrls: ['./teacher-layout.component.css']
})
export class TeacherLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly teacherNotificationService = inject(TeacherNotificationService);
  private readonly destroy$ = new Subject<void>();

  isCollapsed = false;
  searchText = '';

  notificationCount = 0;
  previousNotificationCount = 0;

  menuItems: TeacherSidebarItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: '⌂',
      route: '/teacher/dashboard'
    },
    {
      key: 'profile',
      label: 'Profilim',
      icon: '👤',
      route: '/teacher/profile'
    },
    {
      key: 'classes',
      label: 'Siniflərim',
      icon: '▣',
      route: '/teacher/classes'
    },
    {
      key: 'exams',
      label: 'İmtahanlar',
      icon: '✎',
      route: '/teacher/exams'
    },
    {
      key: 'tasks',
      label: 'Tapşırıqlar',
      icon: '☑',
      route: '/teacher/tasks'
    },
    {
      key: 'notifications',
      label: 'Bildirişlər',
      icon: '🔔',
      route: '/teacher/notifications',
      badge: ''
    }
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.loadNotificationCount();

    interval(15000)
      .pipe(
        startWith(0),
        switchMap(() => this.teacherNotificationService.getUnreadCount()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: response => {
          const newCount = response?.unreadCount ?? 0;

          if (this.previousNotificationCount > 0 && newCount > this.previousNotificationCount) {
            this.playNotificationSound();
          }

          this.notificationCount = newCount;
          this.previousNotificationCount = newCount;
          this.updateNotificationBadge();
        },
        error: () => {
          this.notificationCount = 0;
          this.updateNotificationBadge();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentUserName(): string {
    return this.authService.getCurrentUser()?.fullName || 'Müəllim';
  }

  get currentUserRole(): string {
    return this.authService.getCurrentUser()?.role || 'Teacher';
  }

  get currentUserEmail(): string {
    return this.authService.getCurrentUser()?.email || 'teacher@exam.local';
  }

  get pageTitle(): string {
    const url = this.router.url;

    if (url.includes('/teacher/profile')) return 'Mənim profilim';
    if (url.includes('/teacher/classes')) return 'Siniflərim';
    if (url.includes('/teacher/exams')) return 'İmtahanlar';
    if (url.includes('/teacher/tasks')) return 'Tapşırıqlar';
    if (url.includes('/teacher/notifications')) return 'Bildirişlər';

    return 'Teacher Dashboard';
  }

  get pageDescription(): string {
    const url = this.router.url;

    if (url.includes('/teacher/profile')) {
      return 'Şəxsi məlumatlar, status və müəllim profili detalları';
    }

    if (url.includes('/teacher/classes')) {
      return 'Sizə bağlı siniflər və həmin siniflər üzrə fənn bölgüsü';
    }

    if (url.includes('/teacher/exams')) {
      return 'İmtahan idarəetməsi üçün ayrıca müəllim paneli';
    }

    if (url.includes('/teacher/tasks')) {
      return 'Cari tapşırıqlar, göndərilən cavablar və yoxlama axını';
    }

    if (url.includes('/teacher/notifications')) {
      return 'Task submit, hesab statusu və gələcək exam bildiriş axını';
    }

    return 'Müəllim üçün ayrıca idarəetmə paneli';
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  goToProfile(): void {
    this.router.navigate(['/teacher/profile']);
  }

  goToNotifications(): void {
    this.router.navigate(['/teacher/notifications']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadNotificationCount(): void {
    this.teacherNotificationService.getUnreadCount().subscribe({
      next: response => {
        const unreadCount = response?.unreadCount ?? 0;
        this.notificationCount = unreadCount;
        this.previousNotificationCount = unreadCount;
        this.updateNotificationBadge();
      },
      error: () => {
        this.notificationCount = 0;
        this.previousNotificationCount = 0;
        this.updateNotificationBadge();
      }
    });
  }

  private updateNotificationBadge(): void {
    const notificationItem = this.menuItems.find(item => item.key === 'notifications');

    if (notificationItem) {
      notificationItem.badge = this.notificationCount > 0
        ? (this.notificationCount > 99 ? '99+' : String(this.notificationCount))
        : '';
    }
  }

  private playNotificationSound(): void {
    try {
      const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.35);
    } catch {
      // brauzer bloklasa səssiz keç
    }
  }
}