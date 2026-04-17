import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TeacherPanelService } from '../../../features/admin/teachers/data/teacher-panel.service';
import { DashboardResponseModel } from '../../../core/models/dashboard/dashboard.model';

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
  private readonly cdr = inject(ChangeDetectorRef);

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
        'Dashboard hissəsində əsas statistikalar unified dashboard endpointindən göstərilir.',
      timeText: 'Aktiv',
      type: 'success'
    }
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
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
        helper: 'Dashboard summary',
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

    this.teacherPanelService.getMyDashboard().subscribe({
      next: (response: DashboardResponseModel) => {
        const dashboard = response?.teacher;

        this.teacherFullName = dashboard?.fullName ?? 'Müəllim';
        this.teacherDepartment = dashboard?.department ?? '';
        this.teacherSpecialization = dashboard?.specialization ?? '';
        this.teacherPhotoUrl = '';
        this.teacherStatus = this.mapTeacherStatus(dashboard?.teacherStatus);

        this.totalClasses = this.toNumber(dashboard?.totalClasses);
        this.totalStudents = this.toNumber(dashboard?.totalStudents);
        this.totalExams = this.toNumber(dashboard?.totalExams);
        this.totalTasks = this.toNumber(dashboard?.totalTasks);
        this.pendingTasks = this.toNumber(dashboard?.pendingTasks);
        this.completedTasks = this.toNumber(dashboard?.completedTasks);
        this.totalSubjects = this.toNumber(dashboard?.totalSubjects);
        this.unreadNotificationsCount = this.toNumber(dashboard?.unreadNotificationsCount);

        this.classCards = Array.isArray(dashboard?.classes)
          ? [...dashboard!.classes.map((item) => this.mapClassCard(item))]
          : [];

        this.recentTasks = Array.isArray(dashboard?.recentTasks)
          ? [...dashboard!.recentTasks.map((item) => this.mapTaskCard(item))]
          : [];

        this.isLoading = false;
        this.refreshView();
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message ||
          error?.error?.title ||
          error?.message ||
          'Teacher dashboard məlumatları yüklənmədi.';
        this.refreshView();
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
    return this.toNumber(value).toFixed(1);
  }

  formatTaskDueDate(value?: string | null): string {
    if (!value) {
      return 'Tarix yoxdur';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Tarix yoxdur';
    }

    return date.toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  trackByClass(_: number, item: TeacherDashboardClassCard): number {
    return item.classRoomId;
  }

  trackByTask(_: number, item: TeacherDashboardTaskCard): number {
    return item.id;
  }

  private mapTeacherStatus(value: unknown): string {
    const statusNumber = this.toNumber(value);

    switch (statusNumber) {
      case 1:
        return 'Aktiv';
      case 2:
        return 'Passiv';
      case 3:
        return 'Məzuniyyət';
      default:
        return 'Naməlum';
    }
  }

  private mapClassCard(item: any): TeacherDashboardClassCard {
    return {
      classRoomId: this.toNumber(item?.classRoomId),
      classRoomName: String(item?.classRoomName ?? 'Sinif'),
      studentCount: this.toNumber(item?.studentCount),
      examCount: this.toNumber(item?.examCount),
      averageScore: this.toNumber(item?.averageScore),
      attendanceRate: this.toNumber(item?.attendanceRate),
      subjectNames: Array.isArray(item?.subjectNames) ? [...item.subjectNames] : [],
      topStudentName: item?.topStudentName ?? null,
      topStudentScore: item?.topStudentScore ?? null
    };
  }

  private mapTaskCard(item: any): TeacherDashboardTaskCard {
    return {
      id: this.toNumber(item?.id),
      title: String(item?.title ?? 'Tapşırıq'),
      description: item?.description ?? null,
      dueDate: item?.dueDate ?? null,
      statusText: item?.isCompleted ? 'Tamamlanıb' : 'Gözləyir',
      isCompleted: !!item?.isCompleted
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundNumber(value: number): number {
    return Math.round(this.toNumber(value));
  }
}