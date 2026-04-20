import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet
} from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
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
  private readonly cdr = inject(ChangeDetectorRef); // YENI
  private readonly destroy$ = new Subject<void>();

  isCollapsed = false;
  searchText = '';

  notificationCount = 0;
  previousNotificationCount = 0;

  // YENI
  private hasUserInteracted = false;
  private audioContext: AudioContext | null = null;

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
      .subscribe(() => {
        this.updateNotificationBadge();
        this.safeDetectChanges();
      });
  }

  ngOnInit(): void {
    // YENI
    this.bindUserInteractionForSound();

    // YENI
    // Realtime polling service üzərindən başlasın
    this.teacherNotificationService.startRealtimePolling(1000);

    // YENI
    this.teacherNotificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          const newCount = Number(count ?? 0);

          if (this.shouldPlayNotificationSound(this.previousNotificationCount, newCount)) {
            this.playNotificationSound();
          }

          this.notificationCount = newCount;
          this.previousNotificationCount = newCount;
          this.updateNotificationBadge();
          this.safeDetectChanges();
        },
        error: () => {
          this.notificationCount = 0;
          this.previousNotificationCount = 0;
          this.updateNotificationBadge();
          this.safeDetectChanges();
        }
      });

    // YENI
    // İlk açılışda bir dəfə məcburi refresh
    this.teacherNotificationService.refreshAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.safeDetectChanges();
        },
        error: () => {
          this.safeDetectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    // YENI
    this.teacherNotificationService.stopRealtimePolling();

    // YENI
    window.removeEventListener('click', this.handleFirstUserInteraction);
    window.removeEventListener('keydown', this.handleFirstUserInteraction);
    window.removeEventListener('touchstart', this.handleFirstUserInteraction);

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // səssiz keç
      }
      this.audioContext = null;
    }

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
    if (route === '/teacher/dashboard') {
      return this.router.url === route;
    }

    return this.router.url.startsWith(route);
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
        const unreadCount = Number(response?.unreadCount ?? 0);
        this.notificationCount = unreadCount;
        this.previousNotificationCount = unreadCount;
        this.updateNotificationBadge();
        this.safeDetectChanges();
      },
      error: () => {
        this.notificationCount = 0;
        this.previousNotificationCount = 0;
        this.updateNotificationBadge();
        this.safeDetectChanges();
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

  // YENI
  private shouldPlayNotificationSound(previousCount: number, currentCount: number): boolean {
    if (!this.hasUserInteracted) {
      return false;
    }

    if (previousCount === 0 && currentCount > 0) {
      return false;
    }

    return currentCount > previousCount;
  }

  // YENI
  private bindUserInteractionForSound(): void {
    window.addEventListener('click', this.handleFirstUserInteraction, { passive: true });
    window.addEventListener('keydown', this.handleFirstUserInteraction, { passive: true });
    window.addEventListener('touchstart', this.handleFirstUserInteraction, { passive: true });
  }

  // YENI
  private readonly handleFirstUserInteraction = (): void => {
    if (this.hasUserInteracted) {
      return;
    }

    this.hasUserInteracted = true;
    this.ensureAudioContext();

    window.removeEventListener('click', this.handleFirstUserInteraction);
    window.removeEventListener('keydown', this.handleFirstUserInteraction);
    window.removeEventListener('touchstart', this.handleFirstUserInteraction);
  };

  // YENI
  private ensureAudioContext(): void {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {
          // səssiz keç
        });
      }
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    try {
      this.audioContext = new AudioContextCtor();

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {
          // səssiz keç
        });
      }
    } catch {
      this.audioContext = null;
    }
  }

  private playNotificationSound(): void {
    this.ensureAudioContext();

    if (!this.audioContext) {
      return;
    }

    try {
      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);

      gainNode.gain.setValueAtTime(0.0001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.35);
    } catch {
      // brauzer bloklasa səssiz keç
    }
  }

  // YENI
  private safeDetectChanges(): void {
    try {
      this.cdr.detectChanges();
    } catch {
      // destroy anında detectChanges xətası atmamaq üçün
    }
  }
}