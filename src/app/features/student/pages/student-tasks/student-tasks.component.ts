import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  StudentTaskFilterModel,
  StudentTaskModel,
  StudentTaskSubjectOptionModel,
  StudentTaskSummaryModel,
  StudentTaskVisibleStatsModel
} from '../../../../core/models/students/task-status.model';
import { StudentTaskService } from '../../data/student-task.service';

@Component({
  selector: 'app-student-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-tasks.component.html',
  styleUrl: './student-tasks.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentTasksComponent implements OnInit {
  private readonly studentTaskService = inject(StudentTaskService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = false;
  isFilterLoading = false;
  errorMessage = '';

  allTasks: StudentTaskModel[] = [];
  visibleTasks: StudentTaskModel[] = [];
  subjectOptions: StudentTaskSubjectOptionModel[] = [];

  backendSummary: StudentTaskSummaryModel = {
    totalCount: 0,
    pendingCount: 0,
    submittedCount: 0,
    reviewedCount: 0,
    lateCount: 0,
    missingCount: 0
  };

  visibleStats: StudentTaskVisibleStatsModel = {
    totalCount: 0,
    pendingCount: 0,
    submittedCount: 0,
    reviewedCount: 0,
    lateCount: 0,
    missingCount: 0
  };

  filter: StudentTaskFilterModel = {
    subjectId: null,
    status: '',
    searchText: ''
  };

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentTaskService
      .getMyTasks()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (tasks) => {
          this.allTasks = [...(tasks ?? [])].sort((a, b) => {
            return new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime();
          });

          this.subjectOptions = this.buildSubjectOptions(this.allTasks);
          this.applyClientFilters(false);
          this.loadSummarySilently();
        },
        error: (error) => {
          console.error('Student tasks load error:', error);
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Tapşırıqlar yüklənərkən xəta baş verdi.';
          this.allTasks = [];
          this.visibleTasks = [];
          this.subjectOptions = [];
          this.visibleStats = this.calculateVisibleStats([]);
        }
      });
  }

  private loadSummarySilently(): void {
    this.studentTaskService.getMyTaskSummary().subscribe({
      next: (summary) => {
        this.backendSummary = summary;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Student task summary load error:', error);
      }
    });
  }

  onSubjectChange(): void {
    this.isFilterLoading = true;
    this.errorMessage = '';

    this.studentTaskService
      .getMyTasks(this.filter.subjectId)
      .pipe(
        finalize(() => {
          this.isFilterLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (tasks) => {
          this.allTasks = [...(tasks ?? [])].sort((a, b) => {
            return new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime();
          });

          this.applyClientFilters(false);
        },
        error: (error) => {
          console.error('Student task subject filter error:', error);
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Fənn üzrə tasklar yüklənərkən xəta baş verdi.';
          this.allTasks = [];
          this.visibleTasks = [];
          this.visibleStats = this.calculateVisibleStats([]);
        }
      });
  }

  applyClientFilters(showLoader = true): void {
    if (showLoader) {
      this.isFilterLoading = true;
      this.cdr.detectChanges();
    }

    const status = this.filter.status.trim().toLowerCase();
    const search = this.filter.searchText.trim().toLowerCase();

    this.visibleTasks = this.allTasks.filter((task) => {
      const matchesStatus = !status || task.statusKey.toLowerCase() === status;

      const searchBlob = [
        task.title,
        task.description,
        task.subjectName,
        task.teacherName,
        task.className,
        task.statusLabel
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || searchBlob.includes(search);

      return matchesStatus && matchesSearch;
    });

    this.visibleStats = this.calculateVisibleStats(this.visibleTasks);

    if (showLoader) {
      setTimeout(() => {
        this.isFilterLoading = false;
        this.cdr.detectChanges();
      }, 120);
      return;
    }

    this.isFilterLoading = false;
    this.cdr.detectChanges();
  }

  resetFilters(): void {
    this.filter = {
      subjectId: null,
      status: '',
      searchText: ''
    };

    this.onSubjectChange();
  }

  openDetail(taskId: number): void {
    this.router.navigate(['/student/tasks', taskId]);
  }

  trackByTask(_: number, item: StudentTaskModel): number {
    return item.id;
  }

  get hasActiveFilters(): boolean {
    return !!(this.filter.subjectId || this.filter.status || this.filter.searchText);
  }

  get emptyStateTitle(): string {
    if (!this.subjectOptions.length && !this.allTasks.length) {
      return 'Hələ task yoxdur';
    }

    return 'Filterə uyğun task tapılmadı';
  }

  get emptyStateDescription(): string {
    if (!this.subjectOptions.length && !this.allTasks.length) {
      return 'Bu tələbə üçün backenddən hələ task məlumatı gəlməyib.';
    }

    return 'Axtarış, status və ya fənn filtrini dəyişərək yenidən yoxlayın.';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'status-pending';
      case 'Submitted':
        return 'status-submitted';
      case 'Reviewed':
        return 'status-reviewed';
      case 'Late':
        return 'status-late';
      case 'Missing':
        return 'status-missing';
      default:
        return 'status-default';
    }
  }

  formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private calculateVisibleStats(tasks: StudentTaskModel[]): StudentTaskVisibleStatsModel {
    const countBy = (key: string): number =>
      tasks.filter((item) => item.statusKey === key).length;

    return {
      totalCount: tasks.length,
      pendingCount: countBy('Pending'),
      submittedCount: countBy('Submitted'),
      reviewedCount: countBy('Reviewed'),
      lateCount: countBy('Late'),
      missingCount: countBy('Missing')
    };
  }

  private buildSubjectOptions(tasks: StudentTaskModel[]): StudentTaskSubjectOptionModel[] {
    const map = new Map<number, StudentTaskSubjectOptionModel>();

    for (const task of tasks) {
      if (task.subjectId === null || task.subjectId === undefined || task.subjectId <= 0) {
        continue;
      }

      const existing = map.get(task.subjectId);

      if (existing) {
        existing.count += 1;
        continue;
      }

      map.set(task.subjectId, {
        id: task.subjectId,
        name: task.subjectName || 'Fənn təyin edilməyib',
        count: 1
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'az'));
  }
}