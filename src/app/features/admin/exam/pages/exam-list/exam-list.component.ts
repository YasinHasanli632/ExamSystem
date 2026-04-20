import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import {
  ExamClassOption,
  ExamFilter,
  ExamListItem,
  ExamStatus,
  ExamSubjectOption,
  ExamTeacherOption
} from '../../../../../core/models/exam/exam.model';
import { ExamService } from '../../data/exam.service';

type ToastType = 'success' | 'error' | 'warning';

interface DelayDraft {
  examId: number | null;
  examTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  providers: [DatePipe],
  templateUrl: './exam-list.component.html',
  styleUrls: ['./exam-list.component.css']
})
export class ExamListComponent implements OnInit, OnDestroy {
  classes: ExamClassOption[] = [];
  subjects: ExamSubjectOption[] = [];
  teachers: ExamTeacherOption[] = [];

  exams: ExamListItem[] = [];
  filteredExams: ExamListItem[] = [];

  filter: ExamFilter = {
    search: '',
    classId: null,
    subjectId: null,
    teacherId: null,
    status: ''
  };

  pageLoading = false;
  saveLoading = false;
  deleteLoadingId: number | null = null;

  pageError = '';
  delayError = '';

  isDelayModalOpen = false;

  delayDraft: DelayDraft = {
    examId: null,
    examTitle: '',
    startTime: '',
    endTime: '',
    durationMinutes: 0
  };

  toastMessage = '';
  toastType: ToastType = 'success';

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly examService: ExamService,
    private readonly datePipe: DatePipe,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  loadInitialData(): void {
    this.pageLoading = true;
    this.pageError = '';
    this.cdr.detectChanges();

    forkJoin({
      classes: this.examService.getClasses(),
      subjects: this.examService.getSubjects(),
      teachers: this.examService.getTeachers(),
      exams: this.examService.getExams()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ classes, subjects, teachers, exams }) => {
          this.classes = classes ?? [];
          this.subjects = subjects ?? [];
          this.teachers = teachers ?? [];
          this.exams = exams ?? [];
          this.applyLocalFilters();
          this.pageLoading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          this.pageLoading = false;
          this.pageError = this.extractErrorMessage(
            error,
            'İmtahan məlumatları yüklənərkən xəta baş verdi.'
          );
          this.cdr.detectChanges();
        }
      });
  }

  refresh(): void {
    this.pageLoading = true;
    this.pageError = '';
    this.cdr.detectChanges();

    this.examService.getExams()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.exams = response ?? [];
          this.applyLocalFilters();
          this.pageLoading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          this.pageLoading = false;
          this.pageError = this.extractErrorMessage(
            error,
            'İmtahan siyahısı yenilənmədi.'
          );
          this.cdr.detectChanges();
        }
      });
  }

  onSearchChange(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.applyLocalFilters();
      this.cdr.detectChanges();
    }, 300);
  }

  applyFilters(): void {
    this.applyLocalFilters();
    this.cdr.detectChanges();
  }

  resetFilters(): void {
    this.filter = {
      search: '',
      classId: null,
      subjectId: null,
      teacherId: null,
      status: ''
    };

    this.applyLocalFilters();
    this.cdr.detectChanges();
  }

  openDetail(examId: number): void {
    this.router.navigate(['/admin/exams/detail', examId]);
  }

  openDelayModal(exam: ExamListItem): void {
  if (exam.status === 'Completed') {
    this.showToast('Tamamlanmış imtahan təxirə salına bilməz.', 'warning');
    this.cdr.detectChanges();
    return;
  }

  this.delayError = '';
  this.isDelayModalOpen = true;

  const startTime = this.toDatetimeLocal(exam.startTime);
  const endTime = this.toDatetimeLocal(exam.endTime);

  this.delayDraft = {
    examId: exam.id,
    examTitle: exam.title,
    startTime,
    endTime,
    durationMinutes: this.calculateDurationMinutes(startTime, endTime)
  };

  this.cdr.detectChanges();
}

  closeDelayModal(): void {
    if (this.saveLoading) {
      return;
    }

    this.isDelayModalOpen = false;
    this.delayError = '';
    this.delayDraft = {
      examId: null,
      examTitle: '',
      startTime: '',
      endTime: '',
      durationMinutes: 0
    };

    this.cdr.detectChanges();
  }

  onDelayDateRangeChanged(): void {
    if (!this.delayDraft.startTime || !this.delayDraft.endTime) {
      return;
    }

    const duration = this.calculateDurationMinutes(
      this.delayDraft.startTime,
      this.delayDraft.endTime
    );

    if (duration > 0) {
      this.delayDraft.durationMinutes = duration;
      this.cdr.detectChanges();
    }
  }

  syncDelayEndTimeFromDuration(): void {
    if (!this.delayDraft.startTime || !this.delayDraft.durationMinutes) {
      return;
    }

    const startDate = new Date(this.delayDraft.startTime);

    if (Number.isNaN(startDate.getTime())) {
      return;
    }

    startDate.setMinutes(startDate.getMinutes() + Number(this.delayDraft.durationMinutes));
    this.delayDraft.endTime = this.toDatetimeLocal(startDate.toISOString());
    this.cdr.detectChanges();
  }

  confirmDelay(): void {
    this.delayError = '';

    if (!this.delayDraft.examId) {
      this.delayError = 'İmtahan seçilməyib.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.delayDraft.startTime || !this.delayDraft.endTime) {
      this.delayError = 'Yeni başlama və bitmə tarixini daxil et.';
      this.cdr.detectChanges();
      return;
    }

    const startDate = new Date(this.delayDraft.startTime);
    const endDate = new Date(this.delayDraft.endTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      this.delayError = 'Tarix formatı düzgün deyil.';
      this.cdr.detectChanges();
      return;
    }

    if (endDate <= startDate) {
      this.delayError = 'Bitmə vaxtı başlama vaxtından sonra olmalıdır.';
      this.cdr.detectChanges();
      return;
    }

    this.saveLoading = true;
    this.cdr.detectChanges();

    this.examService.getExamById(this.delayDraft.examId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          const payload = {
            id: detail.id,
            title: detail.title?.trim(),
            subjectId: Number(detail.subjectId),
            teacherId: Number(detail.teacherId),
            classRoomId: detail.classId ?? null,
            startTime: this.delayDraft.startTime,
endTime: this.delayDraft.endTime,
            durationMinutes: this.calculateDurationMinutes(
              this.delayDraft.startTime,
              this.delayDraft.endTime
            ),
            description: detail.description?.trim() || '',
            totalScore: Number(detail.totalScore || 0),
            closedQuestionScore: Number(detail.closedQuestionScore || 0),
            instructions: detail.instructions?.trim() || '',
            isPublished: !!detail.isPublished,
            questions: (detail.questions ?? []).map(question => ({
              id: question.id,
              questionText: question.questionText?.trim(),
              type: question.type,
              points: Number(question.points),
              orderNumber: Number(question.orderNumber),
              description: question.description?.trim() || '',
              selectionMode:
                question.type === 'OpenText'
                  ? null
                  : (question.selectionMode ?? (question.type === 'MultipleChoice' ? 'multiple' : 'single')),
              options:
                question.type === 'OpenText'
                  ? []
                  : (question.options ?? []).map(option => ({
                      id: option.id,
                      optionText: option.optionText?.trim(),
                      isCorrect: !!option.isCorrect,
                      optionKey: option.optionKey || '',
                      orderNumber: Number(option.orderNumber)
                    }))
            }))
          };

          this.examService.updateExam(detail.id, payload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.saveLoading = false;

                const examTitle = this.delayDraft.examTitle;
                const delayedTo = this.formatDateTime(this.delayDraft.startTime);

                this.closeDelayModal();
                this.refresh();
                this.showToast(
                  `"${examTitle}" imtahanı ${delayedTo} tarixinə təxirə salındı.`,
                  'success'
                );
                this.cdr.detectChanges();
              },  
              error: error => {
                this.saveLoading = false;
                this.delayError = this.extractErrorMessage(
                  error,
                  'İmtahan təxirə salınmadı.'
                );
                this.cdr.detectChanges();
              }
            });
        },
        error: error => {
          this.saveLoading = false;
          this.delayError = this.extractErrorMessage(
            error,
            'İmtahan detail məlumatı tapılmadı.'
          );
          this.cdr.detectChanges();
        }
      });
  }

  deleteExam(exam: ExamListItem): void {
    const accepted = confirm(`"${exam.title}" imtahanı silinsin?`);
    if (!accepted) {
      return;
    }

    this.deleteLoadingId = exam.id;
    this.pageError = '';
    this.cdr.detectChanges();

    this.examService.deleteExam(exam.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleteLoadingId = null;
          this.showToast('İmtahan uğurla silindi.', 'success');
          this.refresh();
          this.cdr.detectChanges();
        },
        error: error => {
          this.deleteLoadingId = null;
          this.pageError = this.extractErrorMessage(
            error,
            'İmtahan silinmədi.'
          );
          this.cdr.detectChanges();
        }
      });
  }

  getStatusLabel(status: ExamStatus): string {
    switch (status) {
      case 'Draft':
        return 'Qaralama';
      case 'Published':
        return 'Yayımlanıb';
      case 'Active':
        return 'Aktiv';
      case 'Completed':
        return 'Tamamlanıb';
      case 'Cancelled':
        return 'Ləğv edilib';
      default:
        return status;
    }
  }

  getStatusClass(status: ExamStatus): string {
    return `status-${(status || '').toLowerCase()}`;
  }

  getStatusCount(status: ExamStatus): number {
    return this.filteredExams.filter(item => item.status === status).length;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return this.datePipe.transform(date, 'dd.MM.yyyy HH:mm') ?? value;
  }

  getDurationLabel(exam: ExamListItem): string {
    if (exam.durationMinutes && exam.durationMinutes > 0) {
      return `${exam.durationMinutes} dəq`;
    }

    const minutes = this.calculateDurationMinutes(exam.startTime, exam.endTime);
    return minutes > 0 ? `${minutes} dəq` : '-';
  }

  getDelayNote(exam: ExamListItem): string {
    return `${this.formatDateTime(exam.startTime)} • ${this.formatDateTime(exam.endTime)}`;
  }

  trackById(_: number, item: ExamListItem): number {
    return item.id;
  }

  private applyLocalFilters(): void {
    let result = [...this.exams];

    const term = this.filter.search?.trim().toLowerCase();
    if (term) {
      result = result.filter(item =>
        `${item.title} ${item.className} ${item.subjectName} ${item.teacherName} ${item.status}`
          .toLowerCase()
          .includes(term)
      );
    }

    if (this.filter.classId !== null) {
      const className = this.classes.find(item => item.id === this.filter.classId)?.name?.toLowerCase() ?? '';
      result = result.filter(item => item.className?.toLowerCase() === className);
    }

    if (this.filter.subjectId !== null) {
      const subjectName = this.subjects.find(item => item.id === this.filter.subjectId)?.name?.toLowerCase() ?? '';
      result = result.filter(item => item.subjectName?.toLowerCase() === subjectName);
    }

    if (this.filter.teacherId !== null) {
      const teacherName = this.teachers.find(item => item.id === this.filter.teacherId)?.fullName?.toLowerCase() ?? '';
      result = result.filter(item => item.teacherName?.toLowerCase() === teacherName);
    }

    if (this.filter.status) {
      result = result.filter(item => item.status === this.filter.status);
    }

    result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    this.filteredExams = result;
  }

  private calculateDurationMinutes(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0;
    }

    const diff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }

  private toDatetimeLocal(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value.length >= 16 ? value.slice(0, 16) : value;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private showToast(message: string, type: ToastType): void {
    this.toastMessage = message;
    this.toastType = type;
    this.cdr.detectChanges();

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 6000);
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const validationErrors = error?.error?.errors;

    if (validationErrors && typeof validationErrors === 'object') {
      const messages = Object.values(validationErrors)
        .flat()
        .filter(Boolean)
        .join(' | ');

      if (messages) {
        return messages;
      }
    }

    return (
      error?.error?.message ||
      error?.error?.title ||
      error?.message ||
      fallback
    );
  }
}