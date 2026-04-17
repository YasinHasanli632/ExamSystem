import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TeacherPanelService } from '../../../teachers/data/teacher-panel.service';

@Component({
  selector: 'app-teacher-class-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './teacher-class-detail.component.html',
  styleUrls: ['./teacher-class-detail.component.css']
})
export class TeacherClassDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly cdr = inject(ChangeDetectorRef);

  classId = 0;
  loading = false;
  errorMessage = '';
  classDetail: any = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id || Number.isNaN(id)) {
      this.errorMessage = 'Sinif identifikatoru düzgün deyil.';
      this.refreshView();
      return;
    }

    this.classId = id;
    this.loadClassDetail();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadClassDetail(): void {
    this.loading = true;
    this.errorMessage = '';
    this.refreshView();

    this.teacherPanelService.getMyClassRoomDetail(this.classId).subscribe({
      next: (response) => {
        this.classDetail = {
          ...(response ?? {}),
          subjects: Array.isArray(response?.subjects) ? [...response.subjects] : [],
          students: Array.isArray(response?.students) ? [...response.students] : [],
          exams: Array.isArray(response?.exams) ? [...response.exams] : [],
          tasks: Array.isArray(response?.tasks) ? [...response.tasks] : [],
          topStudents: Array.isArray(response?.topStudents) ? [...response.topStudents] : []
        };
        this.loading = false;
        this.refreshView();
      },
      error: (error) => {
        console.error('Teacher class detail error:', error);
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Sinif detalları yüklənərkən xəta baş verdi.';
        this.loading = false;
        this.refreshView();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/teacher/classes']);
  }

  get className(): string {
    return (
      this.classDetail?.name ||
      this.classDetail?.className ||
      this.classDetail?.title ||
      'Sinif'
    );
  }

  get subjectNames(): string[] {
    const subjects = this.classDetail?.subjects;
    if (!Array.isArray(subjects)) return [];

    return subjects.map((x: any) => x?.name || x?.subjectName).filter(Boolean);
  }

  get students(): any[] {
    return Array.isArray(this.classDetail?.students) ? [...this.classDetail.students] : [];
  }

  get exams(): any[] {
    return Array.isArray(this.classDetail?.exams) ? [...this.classDetail.exams] : [];
  }

  get tasks(): any[] {
    return Array.isArray(this.classDetail?.tasks) ? [...this.classDetail.tasks] : [];
  }

  get topStudents(): any[] {
    const topStudents = this.classDetail?.topStudents;
    if (Array.isArray(topStudents)) return [...topStudents];

    return [...this.students]
      .sort((a: any, b: any) => (b?.averageScore ?? 0) - (a?.averageScore ?? 0))
      .slice(0, 5);
  }

  get attendanceSummary(): any {
    return this.classDetail?.attendanceSummary ?? null;
  }

  get examSummary(): any {
    return this.classDetail?.examSummary ?? null;
  }

  get taskSummary(): any {
    return this.classDetail?.taskSummary ?? null;
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTaskStatusLabel(status: string): string {
    switch (status) {
      case 'Pending':
        return 'Gözləyir';
      case 'InProgress':
        return 'İcra olunur';
      case 'Completed':
        return 'Tamamlanıb';
      case 'Overdue':
        return 'Gecikib';
      default:
        return status || '-';
    }
  }

  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'pending';
      case 'InProgress':
        return 'progress';
      case 'Completed':
        return 'completed';
      case 'Overdue':
        return 'overdue';
      default:
        return 'default';
    }
  }
}