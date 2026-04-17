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
import { StudentNotificationService } from '../../features/student/data/student-notification.service';

interface StudentSidebarItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  templateUrl: './student-layout.component.html',
  styleUrls: ['./student-layout.component.css']
})
export class StudentLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly studentNotificationService = inject(StudentNotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  isCollapsed = false;
  searchText = '';
  unreadNotificationCount = 0;

  // YENI
  private previousUnreadCount = 0;
  private hasUserInteracted = false;
  private audioContext: AudioContext | null = null;

  menuItems: StudentSidebarItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: '⌂',
      route: '/student/dashboard'
    },
    {
      key: 'profile',
      label: 'Profilim',
      icon: '👤',
      route: '/student/profile'
    },
    {
      key: 'tasks',
      label: 'Tapşırıqlarım',
      icon: '☑',
      route: '/student/tasks'
    },
    {
      key: 'attendance',
      label: 'Davamiyyətim',
      icon: '◔',
      route: '/student/attendance'
    },
    {
      key: 'exams',
      label: 'İmtahanlarım',
      icon: '✎',
      route: '/student/exams'
    },
    {
      key: 'notifications',
      label: 'Bildirişlər',
      icon: '🔔',
      route: '/student/notifications'
    }
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateNotificationMenuBadge(this.unreadNotificationCount);
        this.safeDetectChanges();
      });
  }

  ngOnInit(): void {
    // YENI
    this.bindUserInteractionForSound();

    // Polling yalnız burada başlasın
    this.studentNotificationService.startRealtimePolling(1000);

    this.studentNotificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        const previousCount = this.previousUnreadCount;

        this.unreadNotificationCount = count;
        this.updateNotificationMenuBadge(count);

        // YENI
        if (this.shouldPlayNotificationSound(previousCount, count)) {
          this.playNotificationSound();
        }

        this.previousUnreadCount = count;
        this.safeDetectChanges();
      });

    // İlk açılışda bir dəfə force refresh
    this.studentNotificationService.refreshAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.safeDetectChanges();
        },
        error: (error) => {
          console.error('Student layout notification refresh error:', error);
          this.safeDetectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.studentNotificationService.stopRealtimePolling();

    // YENI
    window.removeEventListener('click', this.handleFirstUserInteraction);
    window.removeEventListener('keydown', this.handleFirstUserInteraction);
    window.removeEventListener('touchstart', this.handleFirstUserInteraction);

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('AudioContext close error:', error);
      }
      this.audioContext = null;
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentUserName(): string {
    return this.authService.getCurrentUser()?.fullName || 'Tələbə';
  }

  get currentUserRole(): string {
    return this.authService.getCurrentUser()?.role || 'Student';
  }

  get currentUserEmail(): string {
    return this.authService.getCurrentUser()?.email || 'student@exam.local';
  }

  get pageTitle(): string {
    const url = this.router.url;

    if (url.includes('/student/profile')) return 'Mənim profilim';
    if (url.includes('/student/tasks')) return 'Tapşırıqlarım';
    if (url.includes('/student/attendance')) return 'Davamiyyətim';
    if (url.includes('/student/exams')) return 'İmtahanlarım';
    if (url.includes('/student/notifications')) return 'Bildirişlər';

    return 'Student Dashboard';
  }

  get pageDescription(): string {
    const url = this.router.url;

    if (url.includes('/student/profile')) {
      return 'Şəxsi məlumatlar və tələbə profili detalları';
    }

    if (url.includes('/student/tasks')) {
      return 'Tapşırıqların siyahısı, detalları və cavab göndərilməsi';
    }

    if (url.includes('/student/attendance')) {
      return 'Dərslər üzrə davamiyyət qeydləri və ümumi statistika';
    }

    if (url.includes('/student/exams')) {
      return 'İmtahanlar, nəticələr və gələcək exam bildirişləri';
    }

    if (url.includes('/student/notifications')) {
      return 'Sistem bildirişləri və exam notification axını';
    }

    return 'Tələbə üçün ayrıca idarəetmə paneli';
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  isActive(route: string): boolean {
    if (route === '/student/dashboard') {
      return this.router.url === route;
    }

    return this.router.url.startsWith(route);
  }

  goToProfile(): void {
    this.router.navigate(['/student/profile']);
  }

  goToNotifications(): void {
    this.router.navigate(['/student/notifications']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private updateNotificationMenuBadge(count: number): void {
    this.menuItems = this.menuItems.map((item) =>
      item.key === 'notifications'
        ? {
            ...item,
            badge: count > 0 ? String(count) : undefined
          }
        : item
    );
  }

  // YENI
  private shouldPlayNotificationSound(previousCount: number, currentCount: number): boolean {
    if (!this.hasUserInteracted) {
      return false;
    }

    // İlk yüklənmədə səs çalmasın
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
        this.audioContext.resume().catch((error) => {
          console.warn('AudioContext resume error:', error);
        });
      }
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      console.warn('Web Audio API bu brauzerdə dəstəklənmir.');
      return;
    }

    try {
      this.audioContext = new AudioContextCtor();

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch((error) => {
          console.warn('AudioContext first resume error:', error);
        });
      }
    } catch (error) {
      console.warn('AudioContext create error:', error);
      this.audioContext = null;
    }
  }

  // YENI
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
      gainNode.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.22);
    } catch (error) {
      console.warn('Notification sound error:', error);
    }
  }
   
  // YENI
  private safeDetectChanges(): void {
    try {
      this.cdr.detectChanges();
    } catch {
      // Component destroy anında detectChanges xətası atmamaq üçün.
    }
  }
}