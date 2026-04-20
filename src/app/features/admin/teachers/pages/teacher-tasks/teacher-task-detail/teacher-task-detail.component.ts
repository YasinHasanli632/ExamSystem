import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherPanelService } from '../../../data/teacher-panel.service';
import {
  GradeStudentTaskPayload,
  StudentTaskSubmissionDetail,
  StudentTaskSubmissionListItem,
  TeacherTaskDetail,
  UpdateTeacherTaskPayload
} from '../../../../../../core/models/teacher/task-management.model';

interface GradeFormState {
  score: number;
  feedback: string;
  saving: boolean;
  error: string;
}

@Component({
  selector: 'app-teacher-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-task-detail.component.html',
  styleUrls: ['./teacher-task-detail.component.css']
})
export class TeacherTaskDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly cdr = inject(ChangeDetectorRef);

  taskGroupKey = '';

  isLoading = true;
  errorMessage = '';
  successMessage = '';

  task: TeacherTaskDetail | null = null;

  showResults = false;
  showExtendPanel = false;

  extendDueDate = '';
  isExtending = false;
  extendErrorMessage = '';

  isDeleting = false;

  expandedStudentTaskId: number | null = null;
  isLoadingSubmissionDetail = false;

  submissionDetailMap: Record<number, StudentTaskSubmissionDetail | undefined> = {};
  gradeFormMap: Record<number, GradeFormState | undefined> = {};

  ngOnInit(): void {
    this.taskGroupKey = this.route.snapshot.paramMap.get('taskGroupKey') ?? '';

    if (!this.taskGroupKey) {
      this.errorMessage = 'Task identifikatoru tapılmadı.';
      this.isLoading = false;
      this.refreshView();
      return;
    }

    this.loadTaskDetail();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadTaskDetail(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    this.teacherPanelService.getTeacherTaskDetail(this.taskGroupKey).subscribe({
      next: (response) => {
        this.task = response
          ? {
              ...response,
              students: [...(response.students ?? [])]
            }
          : null;
        this.extendDueDate = response ? this.toLocalInputValue(response.dueDate) : '';
        this.isLoading = false;
        this.refreshView();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Task detail yüklənmədi.';
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  goBack(): void {
    if (!this.task?.classRoomId) {
      this.router.navigate(['/teacher/tasks']);
      return;
    }

    this.router.navigate(['/teacher/tasks/class', this.task.classRoomId]);
  }

  toggleResults(): void {
    this.showResults = !this.showResults;
    this.refreshView();
  }

  toggleExtendPanel(): void {
    if (!this.task) {
      return;
    }

    this.showExtendPanel = !this.showExtendPanel;
    this.extendErrorMessage = '';
    this.extendDueDate = this.toLocalInputValue(this.task.dueDate);
    this.refreshView();
  }

  saveExtendedTime(): void {
    if (!this.task) {
      return;
    }

    this.extendErrorMessage = '';

    if (!this.extendDueDate) {
      this.extendErrorMessage = 'Yeni son tarix daxil edilməlidir.';
      this.refreshView();
      return;
    }

    const newDueDate = new Date(this.extendDueDate);
    const currentDueDate = new Date(this.task.dueDate);
    const assignedDate = new Date(this.task.assignedDate);

    if (Number.isNaN(newDueDate.getTime())) {
      this.extendErrorMessage = 'Tarix formatı yanlışdır.';
      this.refreshView();
      return;
    }

    if (newDueDate <= assignedDate) {
      this.extendErrorMessage = 'Son tarix başlama tarixindən böyük olmalıdır.';
      this.refreshView();
      return;
    }

    if (newDueDate <= currentDueDate) {
      this.extendErrorMessage = 'Yeni son tarix mövcud tarixdən böyük olmalıdır.';
      this.refreshView();
      return;
    }

    const payload: UpdateTeacherTaskPayload = {
      title: this.task.title,
      description: this.task.description ?? null,
     assignedDate: this.toLocalDateTimeInputValue(this.task.assignedDate),
dueDate: this.extendDueDate,
      maxScore: Number(this.task.maxScore),
      link: this.task.link ?? null,
      note: this.task.note ?? null
    };

    this.isExtending = true;
    this.refreshView();

    this.teacherPanelService.updateTeacherTask(this.task.taskGroupKey, payload).subscribe({
      next: (response) => {
        this.task = response
          ? {
              ...response,
              students: [...(response.students ?? [])]
            }
          : null;
        this.extendDueDate = response ? this.toLocalInputValue(response.dueDate) : '';
        this.showExtendPanel = false;
        this.isExtending = false;
        this.successMessage = 'Taskın son tarixi uğurla uzadıldı.';
        this.refreshView();
      },
      error: (error) => {
        this.extendErrorMessage =
          error?.error?.message ||
          error?.message ||
          'Vaxt uzadılarkən xəta baş verdi.';
        this.isExtending = false;
        this.refreshView();
      }
    });
  }

  deleteTask(): void {
    if (!this.task) {
      return;
    }

    const confirmed = window.confirm(
      'Bu task silinəcək. Davam etmək istədiyinizə əminsiniz?'
    );

    if (!confirmed) {
      return;
    }

    this.isDeleting = true;
    this.refreshView();

    this.teacherPanelService.deleteTeacherTask(this.task.taskGroupKey).subscribe({
      next: () => {
        this.isDeleting = false;
        this.refreshView();
        this.router.navigate(['/teacher/tasks/class', this.task?.classRoomId]);
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Task silinərkən xəta baş verdi.';
        this.isDeleting = false;
        this.refreshView();
      }
    });
  }

  toggleStudent(student: StudentTaskSubmissionListItem): void {
    if (this.expandedStudentTaskId === student.studentTaskId) {
      this.expandedStudentTaskId = null;
      this.refreshView();
      return;
    }

    this.expandedStudentTaskId = student.studentTaskId;
    this.refreshView();

    if (!this.submissionDetailMap[student.studentTaskId]) {
      this.loadStudentSubmissionDetail(student.studentTaskId);
    }
  }

  loadStudentSubmissionDetail(studentTaskId: number): void {
    if (!this.task) {
      return;
    }

    this.isLoadingSubmissionDetail = true;
    this.refreshView();

    this.teacherPanelService
      .getStudentTaskSubmissionDetail(this.task.taskGroupKey, studentTaskId)
      .subscribe({
        next: (response) => {
          this.submissionDetailMap = {
            ...this.submissionDetailMap,
            [studentTaskId]: response ? { ...response } : undefined
          };

          this.gradeFormMap = {
            ...this.gradeFormMap,
            [studentTaskId]: {
              score: Number(response.score ?? 0),
              feedback: response.feedback ?? '',
              saving: false,
              error: ''
            }
          };

          this.isLoadingSubmissionDetail = false;
          this.refreshView();
        },
        error: () => {
          this.isLoadingSubmissionDetail = false;
          this.refreshView();
        }
      });
  }

  submitGrade(studentTaskId: number): void {
    const detail = this.submissionDetailMap[studentTaskId];
    const form = this.gradeFormMap[studentTaskId];

    if (!detail || !form) {
      return;
    }

    form.error = '';

    if (form.score < 0 || form.score > Number(detail.maxScore)) {
      form.error = `Bal 0 ilə ${detail.maxScore} arasında olmalıdır.`;
      this.refreshView();
      return;
    }

    const payload: GradeStudentTaskPayload = {
      studentTaskId,
      score: Number(form.score),
      feedback: form.feedback?.trim() || null
    };

    form.saving = true;
    this.refreshView();

    this.teacherPanelService.gradeStudentTask(payload).subscribe({
      next: (response) => {
        this.submissionDetailMap = {
          ...this.submissionDetailMap,
          [studentTaskId]: response ? { ...response } : undefined
        };

        this.gradeFormMap = {
          ...this.gradeFormMap,
          [studentTaskId]: {
            score: Number(response.score ?? 0),
            feedback: response.feedback ?? '',
            saving: false,
            error: ''
          }
        };

        if (this.task) {
          const updatedStudents = this.task.students.map((x) =>
            x.studentTaskId === studentTaskId
              ? {
                  ...x,
                  score: Number(response.score ?? 0),
                  isReviewed: true,
                  submissionStatus: response.submissionStatus
                }
              : x
          );

          this.task = {
            ...this.task,
            students: [...updatedStudents],
            reviewedCount: updatedStudents.filter((x) => x.isReviewed).length
          };
        }

        this.successMessage = 'Qiymətləndirmə uğurla yadda saxlanıldı.';
        this.refreshView();
      },
      error: (error) => {
        form.error =
          error?.error?.message ||
          error?.message ||
          'Qiymətləndirmə zamanı xəta baş verdi.';
        form.saving = false;
        this.refreshView();
      }
    });
  }

  getSubmissionDetail(studentTaskId: number): StudentTaskSubmissionDetail | undefined {
    return this.submissionDetailMap[studentTaskId];
  }

  getGradeForm(studentTaskId: number): GradeFormState | undefined {
    return this.gradeFormMap[studentTaskId];
  }

  isExpanded(studentTaskId: number): boolean {
    return this.expandedStudentTaskId === studentTaskId;
  }

  isTaskExpired(): boolean {
    if (!this.task) {
      return false;
    }

    return new Date().getTime() > new Date(this.task.dueDate).getTime();
  }

  canExtendTask(): boolean {
    if (!this.task) {
      return false;
    }

    return !this.isTaskExpired();
  }

  getRemainingLabel(): string {
    if (!this.task) {
      return '-';
    }

    const now = new Date().getTime();
    const assigned = new Date(this.task.assignedDate).getTime();
    const due = new Date(this.task.dueDate).getTime();

    if (now < assigned) {
      const diff = assigned - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return `${days} gün sonra başlayır`;
    }

    if (now <= due) {
      const diff = due - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        return `${days} gün ${hours} saat qalıb`;
      }

      return `${Math.max(hours, 0)} saat qalıb`;
    }

    return 'Vaxtı bitib';
  }

  getSubmissionRate(): number {
    if (!this.task?.totalStudentCount) {
      return 0;
    }

    return Math.round((this.task.submittedCount / this.task.totalStudentCount) * 100);
  }

  getMissingRate(): number {
    if (!this.task?.totalStudentCount) {
      return 0;
    }

    return Math.round((this.task.missingCount / this.task.totalStudentCount) * 100);
  }

  getStateClass(state: string | undefined): string {
    if (state === 'Gözləyir') return 'waiting';
    if (state === 'Davam edir') return 'active';
    if (state === 'Bitib') return 'completed';
    return '';
  }

  trackByStudentTask(index: number, item: StudentTaskSubmissionListItem): number {
    return item.studentTaskId;
  }

  private toLocalInputValue(value: string): string {
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }
  private toLocalDateTimeInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
}
