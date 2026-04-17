import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import {
  AdminDashboardActivityModel,
  AdminDashboardModel
} from '../../../core/models/dashboard/dashboard.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  errorMessage = '';

  dashboard: AdminDashboardModel = {
    activeTeacherCount: 0,
    todayAttendanceRate: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0,
    activeExams: 0,
    todayExamCount: 0,
    totalSubjects: 0,
    totalAdmins: 0,
    activities: []
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
    this.refreshView();

    this.dashboardService.getMyDashboard().subscribe({
      next: (response) => {
        this.dashboard = {
          ...(response?.admin ?? this.dashboard),
          activities: [...(response?.admin?.activities ?? [])]
        };
        this.isLoading = false;
        this.errorMessage = '';
        this.refreshView();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ||
          error?.error?.title ||
          error?.message ||
          'Admin dashboard məlumatları yüklənmədi.';
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  goToCreateExam(): void {
    this.router.navigate(['/admin/exams/create']);
  }

  goToReports(): void {
    this.router.navigate(['/admin/reports']);
  }

  goToAdmins(): void {
    this.router.navigate(['/admin/users/admins']);
  }

  goToClasses(): void {
    this.router.navigate(['/admin/classes']);
  }

  goToSubjects(): void {
    this.router.navigate(['/admin/subjects']);
  }

  goToExams(): void {
    this.router.navigate(['/admin/exams/list']);
  }

  trackByActivity(_: number, item: AdminDashboardActivityModel): number {
    return item.id;
  }

  formatTime(value?: string | null): string {
    if (!value) {
      return 'Naməlum vaxt';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Naməlum vaxt';
    }

    return date.toLocaleString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
} 