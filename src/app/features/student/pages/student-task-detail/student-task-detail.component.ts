import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  StudentTaskDetailModel,
  StudentTaskSubmitFormModel,
  SubmitStudentTaskRequest
} from '../../../../core/models/students/task-status.model';
import { StudentTaskService } from '../../data/student-task.service';

@Component({
  selector: 'app-student-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-task-detail.component.html',
  styleUrl: './student-task-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentTaskDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentTaskService = inject(StudentTaskService);
  private readonly cdr = inject(ChangeDetectorRef);

  taskId = 0;

  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  task: StudentTaskDetailModel | null = null;

  submitForm: StudentTaskSubmitFormModel = {
    submissionText: '',
    submissionLink: '',
    submissionFileUrl: ''
  };

  submitValidationError = '';

  ngOnInit(): void {
    this.taskId = Number(this.route.snapshot.paramMap.get('id') ?? 0);

    if (!this.taskId) {
      this.errorMessage = 'Task identifikatoru tapılmadı.';
      return;
    }

    this.loadTaskDetail();
  }

  loadTaskDetail(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentTaskService
      .getMyTaskDetail(this.taskId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (task) => {
          this.task = task;
          this.patchSubmitFormFromTask(task);
        },
        error: (error) => {
          console.error('Student task detail error:', error);
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Task detalı yüklənərkən xəta baş verdi.';
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/student/tasks']);
  }

  submitTask(): void {
    if (!this.task) {
      return;
    }

    this.submitValidationError = '';
    this.successMessage = '';

    const payload: SubmitStudentTaskRequest = {
      submissionText: this.normalizeNullable(this.submitForm.submissionText),
      submissionLink: this.normalizeNullable(this.submitForm.submissionLink),
      submissionFileUrl: this.normalizeNullable(this.submitForm.submissionFileUrl)
    };

    if (!payload.submissionText && !payload.submissionLink && !payload.submissionFileUrl) {
      this.submitValidationError = 'Ən azı bir cavab sahəsi doldurulmalıdır.';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;

    this.studentTaskService
      .submitMyTask(this.task.id, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.task = response;
          this.patchSubmitFormFromTask(response);
          this.successMessage = 'Tapşırıq cavabı uğurla göndərildi.';
        },
        error: (error) => {
          console.error('Student task submit error:', error);
          this.submitValidationError =
            error?.error?.message ||
            error?.message ||
            'Cavab göndərilərkən xəta baş verdi.';
        }
      });
  }

  patchSubmitFormFromTask(task: StudentTaskDetailModel): void {
    this.submitForm = {
      submissionText: task.submissionText ?? '',
      submissionLink: task.submissionLink ?? '',
      submissionFileUrl: task.submissionFileUrl ?? ''
    };
  }

  get canShowSubmitForm(): boolean {
    return !!this.task?.canSubmit && !this.task?.isReviewed;
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

  formatDate(value: string | null): string {
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

  private normalizeNullable(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed ? trimmed : null;
  }
}
