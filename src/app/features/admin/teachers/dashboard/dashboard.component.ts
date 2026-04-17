import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TeacherPanelService } from '../../../admin/teachers/data/teacher-panel.service';
import { DashboardResponseModel } from '../../../../core/models/dashboard/dashboard.model';

interface TeacherDashboardStatCard {
  label: string;
  value: number | string;
  helper: string;
  icon: string;
}

interface TeacherDashboardClassCard {
  classRoomId: number;
  classRoomName: string;
  studentCount: number;
  examCount: number;
  averageScore: number;
  attendanceRate: number;
  subjectNames: string[];
  topStudentName?: string | null;
  topStudentScore?: number | null;
}

interface TeacherDashboardTaskCard {
  id: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  statusText: string;
  isCompleted: boolean;
}

interface TeacherQuickActionCard {
  title: string;
  description: string;
  buttonText: string;
  action: () => void;
}

interface TeacherStaticNotificationCard {
  title: string;
  description: string;
  timeText: string;
  type: 'info' | 'warning' | 'success';
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly router = inject(Router);

  isLoading = true;
  errorMessage = '';

  teacherFullName = '';
  teacherDepartment = '';
  teacherSpecialization = '';
  teacherPhotoUrl = '';
  teacherStatus = '';
  unreadNotificationsCount = 0;

  totalClasses = 0;
  totalStudents = 0;
  totalExams = 0;
  totalTasks = 0;
  pendingTasks = 0;
  completedTasks = 0;
  totalSubjects = 0;

  classCards: TeacherDashboardClassCard[] = [];
  recentTasks: TeacherDashboardTaskCard[] = [];

  staticNotifications: TeacherStaticNotificationCard[] = [
    {
      title: 'Bugünkü bildirişlər sahəsi',
      description:
        'Burada bu gün gələn bildirişlərin siyahısı görünəcək. Notification servisi bağlananda real məlumat gələcək.',
      timeText: 'Bu gün',
      type: 'info'
    },
    {
      title: 'İmtahan bildiriş axını',
      description:
        'Gələcək mərhələdə publish olunan imtahanlar və exam code bildirişləri bu hissədə göstəriləcək.',
      timeText: 'Hazır blok',
      type: 'warning'
    },
    {
      title: 'Teacher panel dashboard hazırdır',
      description:
        'Dashboard hissəsində əsas statistikalar backend məlumatları ilə göstərilir.',
      timeText: 'Aktiv',
      type: 'success'
    }
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  get statCards(): TeacherDashboardStatCard[] {
    return [
      {
        label: 'Ümumi sinif sayı',
        value: this.totalClasses,
        helper: 'Sizə bağlı siniflər',
        icon: '🏫'
      },
      {
        label: 'Ümumi şagird sayı',
        value: this.totalStudents,
        helper: 'Bütün siniflər üzrə cəm',
        icon: '👨‍🎓'
      },
      {
        label: 'Ümumi imtahan sayı',
        value: this.totalExams,
        helper: 'Teacher üzrə imtahanlar',
        icon: '📝'
      },
      {
        label: 'Ümumi tapşırıq sayı',
        value: this.totalTasks,
        helper: 'Teacher task qeydləri',
        icon: '📌'
      },
      {
        label: 'Gözləyən tapşırıqlar',
        value: this.pendingTasks,
        helper: 'Tamamlanmamış tasklar',
        icon: '⏳'
      },
      {
        label: 'Tamamlanmış tapşırıqlar',
        value: this.completedTasks,
        helper: 'Bitmiş tasklar',
        icon: '✅'
      },
      {
        label: 'Fənn sayı',
        value: this.totalSubjects,
        helper: 'Overview stats-dan gəlir',
        icon: '📚'
      },
      {
        label: 'Oxunmamış bildiriş',
        value: this.unreadNotificationsCount,
        helper: 'Dashboard unread count',
        icon: '🔔'
      }
    ];
  }

  get quickActions(): TeacherQuickActionCard[] {
    return [
      {
        title: 'Siniflərim',
        description: 'Sinifləri aç və ümumi gedişata bax.',
        buttonText: 'Siniflərə keç',
        action: () => this.router.navigate(['/teacher/classes'])
      },
      {
        title: 'İmtahanlar',
        description: 'Mövcud imtahanlara bax və yeni imtahan yarat.',
        buttonText: 'İmtahanlara keç',
        action: () => this.router.navigate(['/teacher/exams'])
      },
      {
        title: 'Tapşırıqlar',
        description: 'Tapşırıqları və yoxlama prosesini idarə et.',
        buttonText: 'Tapşırıqlara keç',
        action: () => this.router.navigate(['/teacher/tasks'])
      },
      {
        title: 'Profil',
        description: 'Profil məlumatları və gələcək şifrə dəyişmə hissəsi.',
        buttonText: 'Profilə keç',
        action: () => this.router.navigate(['/teacher/profile'])
      }
    ];
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      profile: this.teacherPanelService.getMyProfile(),
      dashboardResponse: this.teacherPanelService.getMyDashboard(),
      overviewStats: this.teacherPanelService.getMyOverviewStats(),
      tasks: this.teacherPanelService.getMyTasks()
    }).subscribe({
      next: ({ profile, dashboardResponse, overviewStats, tasks }) => {
        const dashboard = (dashboardResponse as DashboardResponseModel)?.teacher;

        this.teacherFullName = String(
          profile?.fullName ??
          dashboard?.fullName ??
          'Müəllim'
        );

        this.teacherDepartment = String(
          profile?.department ??
          dashboard?.department ??
          ''
        );

        this.teacherSpecialization = String(
          profile?.specialization ??
          dashboard?.specialization ??
          ''
        );

        this.teacherPhotoUrl = String(profile?.photoUrl ?? '');
        this.teacherStatus = this.mapTeacherStatus(
          profile?.status ?? dashboard?.teacherStatus
        );

        this.totalClasses = this.toNumber(dashboard?.totalClasses);
        this.totalStudents = this.toNumber(dashboard?.totalStudents);
        this.totalExams = this.toNumber(dashboard?.totalExams);
        this.totalTasks = this.toNumber(dashboard?.totalTasks);
        this.pendingTasks = this.toNumber(dashboard?.pendingTasks);
        this.unreadNotificationsCount = this.toNumber(dashboard?.unreadNotificationsCount);

        this.totalSubjects = this.toNumber(
          overviewStats?.subjectCount ?? dashboard?.totalSubjects
        );

        this.completedTasks = this.toNumber(
          overviewStats?.completedTaskCount ?? dashboard?.completedTasks
        );

        this.classCards = Array.isArray(dashboard?.classes)
          ? dashboard.classes.map((item: any) => this.mapClassCard(item))
          : [];

        this.recentTasks = Array.isArray(tasks) && tasks.length
          ? tasks
              .map((item: any) => this.mapTaskCard(item))
              .sort((a, b) => this.getDateValue(b.dueDate) - this.getDateValue(a.dueDate))
              .slice(0, 6)
          : Array.isArray(dashboard?.recentTasks)
            ? dashboard.recentTasks.map((item: any) => this.mapTaskCard(item))
            : [];

        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message ||
          error?.error?.title ||
          error?.message ||
          'Teacher dashboard məlumatları yüklənmədi.';
      }
    });
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  goToClassDetail(classItem: TeacherDashboardClassCard): void {
    this.router.navigate(['/teacher/classes', classItem.classRoomId]);
  }

  goToAttendance(classItem: TeacherDashboardClassCard): void {
    this.router.navigate(['/teacher/classes', classItem.classRoomId, 'attendance']);
  }

  goToExamCreate(classItem: TeacherDashboardClassCard): void {
    this.router.navigate(['/teacher/exams/create'], {
      queryParams: {
        classRoomId: classItem.classRoomId,
        className: classItem.classRoomName
      }
    });
  }

  goToTasks(): void {
    this.router.navigate(['/teacher/tasks']);
  }

  getAttendanceState(rate: number): 'good' | 'medium' | 'low' {
    if (rate >= 85) return 'good';
    if (rate >= 65) return 'medium';
    return 'low';
  }

  formatPercent(value: number | null | undefined): string {
    return `${this.roundNumber(this.toNumber(value))}%`;
  }

  formatScore(value: number | null | undefined): string {
    return `${this.roundNumber(this.toNumber(value))}%`;
  }

  formatTaskDueDate(value: string | null | undefined): string {
    if (!value) return 'Tarix qeyd edilməyib';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Tarix qeyd edilməyib';

    return new Intl.DateTimeFormat('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  trackByClass(index: number, item: TeacherDashboardClassCard): number {
    return item.classRoomId || index;
  }

  trackByTask(index: number, item: TeacherDashboardTaskCard): number {
    return item.id || index;
  }

  private mapClassCard(item: any): TeacherDashboardClassCard {
    return {
      classRoomId: this.toNumber(item?.classRoomId ?? item?.id),
      classRoomName: String(item?.classRoomName ?? item?.name ?? 'Adsız sinif'),
      studentCount: this.toNumber(item?.studentCount),
      examCount: this.toNumber(item?.examCount),
      averageScore: this.toNumber(item?.averageScore),
      attendanceRate: this.toNumber(item?.attendanceRate),
      subjectNames: Array.isArray(item?.subjectNames)
        ? item.subjectNames.filter((x: unknown) => typeof x === 'string')
        : [],
      topStudentName: item?.topStudentName ?? null,
      topStudentScore:
        item?.topStudentScore !== null && item?.topStudentScore !== undefined
          ? this.toNumber(item?.topStudentScore)
          : null
    };
  }

  private mapTaskCard(item: any): TeacherDashboardTaskCard {
    return {
      id: this.toNumber(item?.id),
      title: String(item?.title ?? 'Adsız tapşırıq'),
      description: item?.description ?? null,
      dueDate: item?.dueDate ?? null,
      statusText: this.mapTaskStatus(item?.status, item?.isCompleted),
      isCompleted: Boolean(item?.isCompleted)
    };
  }

  private mapTeacherStatus(value: unknown): string {
    const normalized = String(value ?? '').trim().toLowerCase();

    if (normalized === 'aktiv' || normalized === '1') return 'Aktiv';
    if (normalized === 'passiv' || normalized === '2') return 'Passiv';
    if (normalized === 'məzuniyyət' || normalized === 'mezuniyyet' || normalized === '3') {
      return 'Məzuniyyət';
    }

    return String(value ?? 'Status yoxdur');
  }

  private mapTaskStatus(status: unknown, isCompleted: unknown): string {
    if (Boolean(isCompleted)) {
      return 'Tamamlanıb';
    }

    const normalized = String(status ?? '').trim().toLowerCase();

    if (normalized === 'pending' || normalized === 'gözləyir' || normalized === 'gozleyir' || normalized === '0') {
      return 'Gözləyir';
    }

    if (normalized === 'completed' || normalized === 'tamamlanıb' || normalized === 'tamamlanib' || normalized === '1') {
      return 'Tamamlanıb';
    }

    if (normalized === 'overdue' || normalized === 'gecikir' || normalized === '2') {
      return 'Gecikir';
    }

    return 'Gözləyir';
  }

  private getDateValue(value: string | null | undefined): number {
    if (!value) return 0;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundNumber(value: number): number {
    return Math.round(value * 100) / 100;
  }
}