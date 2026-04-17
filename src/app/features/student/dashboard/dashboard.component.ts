import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../core/services/dashboard.service';
import {
  StudentDashboardExamItemModel,
  StudentDashboardModel,
  StudentDashboardTaskItemModel
} from '../../../core/models/dashboard/dashboard.model';

interface StudentStatCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  accent: 'purple' | 'blue' | 'green' | 'orange';
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  errorMessage = '';

  dashboard: StudentDashboardModel = {
    studentId: 0,
    userId: 0,
    fullName: '',
    studentNumber: '',
    studentStatus: 0,
    classRoomId: null,
    classRoomName: '',
    mySubjectsCount: 0,
    upcomingExamsCount: 0,
    completedExamsCount: 0,
    averageScore: 0,
    unreadNotificationsCount: 0,
    exams: [],
    recentTasks: []
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardService.getMyDashboard().subscribe({
      next: (response) => {
        this.dashboard = {
          ...(response?.student ?? this.dashboard),
          exams: [...(response?.student?.exams ?? [])],
          recentTasks: [...(response?.student?.recentTasks ?? [])]
        };
        this.isLoading = false;
        this.refreshView();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ||
          error?.error?.title ||
          error?.message ||
          'Tələbə dashboard məlumatları yüklənmədi.';
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  get statCards(): StudentStatCard[] {
    return [
      {
        title: 'Fənlərin sayı',
        value: this.dashboard.mySubjectsCount,
        subtitle: 'Qoşulduğun fənlər',
        icon: '📚',
        accent: 'purple'
      },
      {
        title: 'Yaxın imtahanlar',
        value: this.dashboard.upcomingExamsCount,
        subtitle: 'Gözləyən imtahanlar',
        icon: '📝',
        accent: 'blue'
      },
      {
        title: 'Tamamlanan imtahanlar',
        value: this.dashboard.completedExamsCount,
        subtitle: 'Bitirdiyin imtahanlar',
        icon: '✅',
        accent: 'green'
      },
      {
        title: 'Orta nəticə',
        value: this.formatAverageScore(this.dashboard.averageScore),
        subtitle: 'Ümumi orta bal',
        icon: '📈',
        accent: 'orange'
      }
    ];
  }

  formatAverageScore(value: number): string {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  formatDate(value?: string | null): string {
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

  formatDateTime(value?: string | null): string {
    if (!value) {
      return 'Tarix yoxdur';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Tarix yoxdur';
    }

    return date.toLocaleString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStudentStatusText(status: number): string {
    switch (status) {
      case 1:
        return 'Aktiv';
      case 2:
        return 'Passiv';
      case 3:
        return 'Məzun';
      default:
        return 'Naməlum';
    }
  }

  getTaskStatusText(status: number): string {
    switch (status) {
      case 4:
        return 'Yoxlanılıb';
      case 3:
        return 'Təhvil verilib';
      case 2:
        return 'Gecikib';
      case 1:
        return 'Buraxılıb';
      default:
        return 'Gözləyir';
    }
  }

  getTaskStatusClass(status: number): string {
    switch (status) {
      case 4:
        return 'status success';
      case 3:
        return 'status info';
      case 2:
        return 'status warning';
      case 1:
        return 'status danger';
      default:
        return 'status neutral';
    }
  }

  getWelcomeTitle(): string {
    return this.dashboard.fullName?.trim()
      ? `Xoş gəldin, ${this.dashboard.fullName}`
      : 'Xoş gəldin';
  }

  getClassName(): string {
    return this.dashboard.classRoomName?.trim()
      ? this.dashboard.classRoomName
      : 'Sinif məlumatı yoxdur';
  }

  trackByExam(_: number, item: StudentDashboardExamItemModel): number {
    return item.examId;
  }

  trackByTask(_: number, item: StudentDashboardTaskItemModel): number {
    return item.id;
  }
}