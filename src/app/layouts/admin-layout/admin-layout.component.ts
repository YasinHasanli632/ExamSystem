import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy
} from '@angular/router';
import { Subject, forkJoin, interval } from 'rxjs';
import { filter, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AdminNotificationService } from '../../features/admin/notifications/data/admin-notification.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardResponseModel } from '../../core/models/dashboard/dashboard.model';

interface SidebarChildItem {
  label: string;
  route: string;
  badge?: string;
}

interface SidebarItem {
  key: string;
  label: string;
  icon: string;
  route?: string;
  children?: SidebarChildItem[];
  bottom?: boolean;
  badge?: string;
}

interface QuickStatItem {
  label: string;
  value: string;
}

class NoReuseStrategy implements RouteReuseStrategy {
  shouldDetach(_route: ActivatedRouteSnapshot): boolean {
    return false;
  }

  store(_route: ActivatedRouteSnapshot, _handle: DetachedRouteHandle | null): void {}

  shouldAttach(_route: ActivatedRouteSnapshot): boolean {
    return false;
  }

  retrieve(_route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return null;
  }

  shouldReuseRoute(_future: ActivatedRouteSnapshot, _curr: ActivatedRouteSnapshot): boolean {
    return false;
  }
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: NoReuseStrategy
    }
  ]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly adminNotificationService = inject(AdminNotificationService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroy$ = new Subject<void>();

  isCollapsed = false;
  searchText = '';

  // YENI
  notificationCount = 0;

  // YENI
  previousNotificationCount = 0;

  // YENI
  activeUserCount = 0;

  // YENI
  todayExamCount = 0;

  openMenus: Record<string, boolean> = {
    users: false,
    classes: false,
    exams: false,
    analytics: false
  };

  menuItems: SidebarItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: '⌂',
      route: '/admin/dashboard'
    },
    {
      key: 'users',
      label: 'İstifadəçilər',
      icon: '👥',
      children: [
        { label: 'Adminlər', route: '/admin/users/admins' },
        { label: 'Müəllimlər', route: '/admin/users/teachers' },
        { label: 'Şagirdlər', route: '/admin/users/students', badge: 'New' }
      ]
    },
    {
      key: 'classes',
      label: 'Siniflər',
      icon: '▣',
      children: [
        { label: 'Sinif siyahısı', route: '/admin/classes' },
        { label: 'Yeni sinif', route: '/admin/classes/add' }
      ]
    },
    {
      key: 'subjects',
      label: 'Fənlər',
      icon: '◫',
      route: '/admin/subjects'
    },
    {
      key: 'exams',
      label: 'İmtahanlar',
      icon: '✎',
      children: [
        { label: 'İmtahan siyahısı', route: '/admin/exams/list' },
        { label: 'İmtahan yarat', route: '/admin/exams/create', badge: '+' }
      ]
    },
    {
      key: 'settings',
      label: 'Ayarlar',
      icon: '⚙',
      route: '/admin/settings',
      bottom: true
    }
  ];

  quickStats: QuickStatItem[] = [
    { label: 'Aktiv istifadəçi', value: '0' },
    { label: 'Bugünkü imtahan', value: '0' },
    { label: 'Yeni bildiriş', value: '00' }
  ];

  constructor() {
    this.syncOpenMenusWithRoute();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.syncOpenMenusWithRoute();
      });
  }

  ngOnInit(): void {
    this.loadSidebarSummary();

    interval(15000)
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            unread: this.adminNotificationService.getUnreadCount(),
            dashboard: this.dashboardService.getMyDashboard()
          })
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ unread, dashboard }) => {
          const newCount = unread?.unreadCount ?? 0;

          if (this.previousNotificationCount > 0 && newCount > this.previousNotificationCount) {
            this.playNotificationSound();
          }

          this.notificationCount = newCount;
          this.previousNotificationCount = newCount;

          this.applyAdminDashboardData(dashboard);
          this.updateNotificationBadge();
          this.updateQuickStats();
        },
        error: () => {
          this.notificationCount = 0;
          this.activeUserCount = 0;
          this.todayExamCount = 0;
          this.previousNotificationCount = 0;
          this.updateNotificationBadge();
          this.updateQuickStats();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentUserName(): string {
    return this.authService.getCurrentUser()?.fullName || 'Super Admin';
  }

  get currentUserRole(): string {
    return this.authService.getCurrentUser()?.role || 'Admin';
  }

  get currentUserEmail(): string {
    return this.authService.getCurrentUser()?.email || 'admin@exam.local';
  }

  get topMenuItems(): SidebarItem[] {
    return this.menuItems.filter(item => !item.bottom);
  }

  get bottomMenuItems(): SidebarItem[] {
    return this.menuItems.filter(item => item.bottom);
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      this.closeAllMenus();
    } else {
      this.syncOpenMenusWithRoute();
    }
  }

  toggleMenu(key: string): void {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      this.closeAllMenus();
      this.openMenus[key] = true;
      return;
    }

    this.openMenus[key] = !this.openMenus[key];
  }

  isMenuOpen(key: string): boolean {
    return this.openMenus[key] ?? false;
  }

  isChildActive(route: string): boolean {
    return this.router.url === route;
  }

  isParentActive(item: SidebarItem): boolean {
    if (item.route) {
      return this.router.url === item.route;
    }

    if (item.children?.length) {
      return item.children.some(child => this.router.url === child.route);
    }

    return false;
  }

  goToProfile(): void {
    this.router.navigate(['/admin/profile']);
  }

  goToNotifications(): void {
    this.router.navigate(['/admin/notifications']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // YENI
  loadSidebarSummary(): void {
    forkJoin({
      unread: this.adminNotificationService.getUnreadCount(),
      dashboard: this.dashboardService.getMyDashboard()
    }).subscribe({
      next: ({ unread, dashboard }) => {
        const unreadCount = unread?.unreadCount ?? 0;
        this.notificationCount = unreadCount;
        this.previousNotificationCount = unreadCount;

        this.applyAdminDashboardData(dashboard);
        this.updateNotificationBadge();
        this.updateQuickStats();
      },
      error: () => {
        this.notificationCount = 0;
        this.previousNotificationCount = 0;
        this.activeUserCount = 0;
        this.todayExamCount = 0;
        this.updateNotificationBadge();
        this.updateQuickStats();
      }
    });
  }

  private closeAllMenus(): void {
    Object.keys(this.openMenus).forEach(key => {
      this.openMenus[key] = false;
    });
  }

  private syncOpenMenusWithRoute(): void {
    this.openMenus['users'] = this.router.url.startsWith('/admin/users');
    this.openMenus['classes'] = this.router.url.startsWith('/admin/classes');
    this.openMenus['exams'] = this.router.url.startsWith('/admin/exams');
    this.openMenus['analytics'] =
      this.router.url.startsWith('/admin/reports') ||
      this.router.url.startsWith('/admin/notifications');
  }

  private updateNotificationBadge(): void {
    const analyticsMenu = this.menuItems.find(item => item.key === 'analytics');
    const notificationChild = analyticsMenu?.children?.find(child => child.route === '/admin/notifications');

    if (notificationChild) {
      notificationChild.badge = this.notificationCount > 0
        ? (this.notificationCount > 99 ? '99+' : String(this.notificationCount))
        : '';
    }
  }

  // YENI
  private applyAdminDashboardData(response: DashboardResponseModel): void {
    const admin = response?.admin;

    if (!admin) {
      this.activeUserCount = 0;
      this.todayExamCount = 0;
      return;
    }

    this.activeUserCount =
      this.toNumber(admin.totalTeachers) +
      this.toNumber(admin.totalStudents) +
      this.toNumber(admin.totalAdmins);

    this.todayExamCount = this.toNumber(admin.todayExamCount);
  }

  private updateQuickStats(): void {
    const activeUserStat = this.quickStats.find(item => item.label === 'Aktiv istifadəçi');
    if (activeUserStat) {
      activeUserStat.value = this.formatCount(this.activeUserCount);
    }

    const todayExamStat = this.quickStats.find(item => item.label === 'Bugünkü imtahan');
    if (todayExamStat) {
      todayExamStat.value = this.formatCount(this.todayExamCount);
    }

    const notificationStat = this.quickStats.find(item => item.label === 'Yeni bildiriş');
    if (notificationStat) {
      notificationStat.value = this.notificationCount > 99
        ? '99+'
        : String(this.notificationCount).padStart(2, '0');
    }
  }

  // YENI
  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // YENI
  private formatCount(value: number): string {
    const safeValue = this.toNumber(value);
    return safeValue.toLocaleString('az-AZ');
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
    }
  }
}