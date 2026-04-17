import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, finalize, interval } from 'rxjs';
import {
  StudentExamAccessModalModel,
  StudentExamFilterModel,
  StudentExamListItemModel,
  StudentExamListStatsModel,
  StudentExamListTab
} from '../../../../core/models/students/student-exam.model';
import { StudentExamService } from '../../data/student-exam.service';

@Component({
  selector: 'app-student-exams',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-exams.component.html',
  styleUrls: ['./student-exams.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentExamsComponent implements OnInit, OnDestroy {
  private readonly studentExamService = inject(StudentExamService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private clockSubscription?: Subscription;

  // YENI
  private lastAutoRefreshAt = 0;

  // YENI
  private readonly autoRefreshCooldownMs = 15000;

  isLoading = false;
  isFilterLoading = false;
  errorMessage = '';
  nowTimestamp = Date.now();

  allExams: StudentExamListItemModel[] = [];
  visibleExams: StudentExamListItemModel[] = [];

  stats: StudentExamListStatsModel = {
    totalCount: 0,
    upcomingCount: 0,
    activeCount: 0,
    completedCount: 0
  };

  filter: StudentExamFilterModel = {
    tab: 'all',
    searchText: '',
    subjectName: '',
    status: ''
  };

  accessModal: StudentExamAccessModalModel = {
    isOpen: false,
    examId: null,
    examTitle: '',
    visibleAccessCode: null,
    enteredAccessCode: '',
    isSubmitting: false,
    errorMessage: ''
  };

  ngOnInit(): void {
    this.startClock();
    this.loadExams();
  }

  ngOnDestroy(): void {
    this.clockSubscription?.unsubscribe();
  }

  loadExams(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentExamService
      .getMyExams()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (items) => {
          this.allExams = [...(items ?? [])].sort((a, b) => {
            return new Date(a.examStartTime).getTime() - new Date(b.examStartTime).getTime();
          });

          this.applyFilters(false);
        },
        error: (error) => {
          console.error('Student exams load error:', error);
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'İmtahanlar yüklənərkən xəta baş verdi.';
          this.allExams = [];
          this.visibleExams = [];
          this.stats = this.calculateStats([]);
        }
      });
  }

  applyFilters(showLoader = true): void {
    if (showLoader) {
      this.isFilterLoading = true;
      this.cdr.detectChanges();
    }

    const search = this.filter.searchText.trim().toLowerCase();
    const subjectName = this.filter.subjectName.trim().toLowerCase();
    const status = this.filter.status.trim().toLowerCase();
    const tab = this.filter.tab;

    this.visibleExams = this.allExams.filter((exam) => {
      const matchesTab = this.matchesTab(exam, tab);

      const searchBlob = [
        exam.examTitle,
        exam.subjectName,
        exam.teacherName,
        exam.note,
        exam.status,
        exam.examType,
        exam.accessCode
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || searchBlob.includes(search);
      const matchesSubject =
        !subjectName || exam.subjectName.toLowerCase().includes(subjectName);
      const matchesStatus =
        !status || (exam.status ?? '').toLowerCase().includes(status);

      return matchesTab && matchesSearch && matchesSubject && matchesStatus;
    });

    this.stats = this.calculateStats(this.allExams);

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

  setTab(tab: StudentExamListTab): void {
    this.filter.tab = tab;
    this.applyFilters();
  }

  resetFilters(): void {
    this.filter = {
      tab: 'all',
      searchText: '',
      subjectName: '',
      status: ''
    };

    this.applyFilters();
  }

  openAccessModal(exam: StudentExamListItemModel): void {
    if (!this.canOpenAccess(exam)) {
      return;
    }

    // YENI
    // Modal açılmamışdan əvvəl ən son access code-u backenddən yenidən götürürük
    this.studentExamService.getMyExams().subscribe({
      next: (items) => {
        const normalizedItems = [...(items ?? [])].sort((a, b) => {
          return new Date(a.examStartTime).getTime() - new Date(b.examStartTime).getTime();
        });

        this.allExams = normalizedItems;
        this.applyFilters(false);

        const latestExam =
          normalizedItems.find((item) => item.examId === exam.examId) ?? exam;

        this.accessModal = {
          isOpen: true,
          examId: latestExam.examId,
          examTitle: latestExam.examTitle,
          visibleAccessCode: latestExam.accessCode || null,
          enteredAccessCode: latestExam.accessCode || '',
          isSubmitting: false,
          errorMessage: ''
        };

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Open access modal refresh error:', error);

        this.accessModal = {
          isOpen: true,
          examId: exam.examId,
          examTitle: exam.examTitle,
          visibleAccessCode: exam.accessCode || null,
          enteredAccessCode: exam.accessCode || '',
          isSubmitting: false,
          errorMessage: ''
        };

        this.cdr.detectChanges();
      }
    });
  }

  closeAccessModal(): void {
    this.accessModal = {
      isOpen: false,
      examId: null,
      examTitle: '',
      visibleAccessCode: null,
      enteredAccessCode: '',
      isSubmitting: false,
      errorMessage: ''
    };

    this.cdr.detectChanges();
  }

  submitAccessCode(): void {
    if (!this.accessModal.examId) {
      return;
    }

    const code = this.accessModal.enteredAccessCode.trim();

    if (!code) {
      this.accessModal.errorMessage = 'İmtahan parolunu daxil et.';
      this.cdr.detectChanges();
      return;
    }

    this.accessModal.isSubmitting = true;
    this.accessModal.errorMessage = '';
    this.cdr.detectChanges();

    this.studentExamService
      .verifyAccessCode({
        examId: this.accessModal.examId,
        accessCode: code
      })
      .pipe(
        finalize(() => {
          this.accessModal.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          const examId = this.accessModal.examId!;
          this.closeAccessModal();
          this.router.navigate(['/student/exams', examId], {
            queryParams: { verified: 1 }
          });
        },
        error: (error) => {
          console.error('Verify access code error:', error);
          this.accessModal.errorMessage =
            error?.error?.message ||
            error?.message ||
            'İmtahan parolu təsdiqlənmədi.';
        }
      });
  }

  openDetail(exam: StudentExamListItemModel): void {
    this.router.navigate(['/student/exams', exam.examId]);
  }

  handlePrimaryAction(exam: StudentExamListItemModel): void {
    if (this.isEntryClosed(exam)) {
      this.openDetail(exam);
      return;
    }

    if (this.canOpenAccess(exam)) {
      this.openAccessModal(exam);
    }
  }

  trackByExam(_: number, item: StudentExamListItemModel): number {
    return item.studentExamId || item.examId;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filter.searchText ||
      this.filter.subjectName ||
      this.filter.status ||
      this.filter.tab !== 'all'
    );
  }

  get emptyStateTitle(): string {
    return this.allExams.length
      ? 'Filterə uyğun imtahan tapılmadı'
      : 'Hələ imtahan yoxdur';
  }

  get emptyStateDescription(): string {
    return this.allExams.length
      ? 'Axtarış və filterləri dəyişib yenidən yoxla.'
      : 'Bu tələbə üçün backenddən hələ imtahan məlumatı gəlməyib.';
  }

  getTabCount(tab: StudentExamListTab): number {
    if (tab === 'all') {
      return this.allExams.length;
    }

    return this.allExams.filter((exam) => this.matchesTab(exam, tab)).length;
  }

  getStatusLabel(status: string): string {
    switch ((status ?? '').trim()) {
      case 'Pending':
        return 'Gözləyir';
      case 'CodeReady':
        return 'Kod aktivdir';
      case 'ReadyToStart':
        return 'Başlamağa hazırdır';
      case 'InProgress':
        return 'Aktivdir';
      case 'Submitted':
        return 'Təhvil verilib';
      case 'AutoSubmitted':
        return 'Avtomatik təhvil verilib';
      case 'Missed':
        return 'Buraxılıb';
      case 'Reviewed':
        return 'Yoxlanılıb';
      default:
        return status || 'Naməlum';
    }
  }

  getStatusClass(status: string): string {
    switch ((status ?? '').trim()) {
      case 'Pending':
        return 'status-pending';
      case 'CodeReady':
      case 'ReadyToStart':
        return 'status-ready';
      case 'InProgress':
        return 'status-active';
      case 'Submitted':
      case 'AutoSubmitted':
        return 'status-submitted';
      case 'Reviewed':
        return 'status-reviewed';
      case 'Missed':
        return 'status-missed';
      default:
        return 'status-default';
    }
  }

  isUpcoming(exam: StudentExamListItemModel): boolean {
    const examStart = new Date(exam.examStartTime).getTime();
    return !exam.isCompleted && !exam.isMissed && examStart > this.nowTimestamp;
  }

  isActive(exam: StudentExamListItemModel): boolean {
    const start = new Date(exam.examStartTime).getTime();
    const end = new Date(exam.examEndTime).getTime();

    return !exam.isCompleted && !exam.isMissed && this.nowTimestamp >= start && this.nowTimestamp <= end;
  }

  isCompleted(exam: StudentExamListItemModel): boolean {
    return exam.isCompleted || ['Submitted', 'AutoSubmitted', 'Reviewed'].includes(exam.status);
  }

  isEntryClosed(exam: StudentExamListItemModel): boolean {
    if (this.isCompleted(exam) || exam.isMissed) {
      return true;
    }

    return this.nowTimestamp > this.getExamCloseTime(exam);
  }

  canOpenAccess(exam: StudentExamListItemModel): boolean {
    if (this.isEntryClosed(exam)) {
      return false;
    }

    if (exam.canEnter || exam.canStart || exam.isAccessCodeReady) {
      return true;
    }

    const activationTime = this.getAccessActivationTime(exam);
    const closeTime = this.getExamCloseTime(exam);

    return this.nowTimestamp >= activationTime && this.nowTimestamp <= closeTime;
  }

  isPrimaryButtonDisabled(exam: StudentExamListItemModel): boolean {
    if (this.isEntryClosed(exam)) {
      return false;
    }

    return !this.canOpenAccess(exam);
  }

  getAccessHint(exam: StudentExamListItemModel): string {
    if (exam.isMissed) {
      return 'Bu imtahan buraxılıb. Giriş artıq mümkün deyil.';
    }

    if (this.isCompleted(exam)) {
      return 'Bu imtahan tamamlanıb. Yalnız nəticə hissəsinə baxa bilərsən.';
    }

    if (this.nowTimestamp > this.getExamCloseTime(exam)) {
      return 'İmtahana giriş vaxtı bitib.';
    }

    if (exam.accessCode) {
      return 'İmtahan parolu aktivdir. “Daxil ol” düyməsi ilə davam et.';
    }

    if (this.canOpenAccess(exam)) {
      return 'İmtahan parolu aktivdir. “Daxil ol” düyməsi ilə davam et.';
    }

    const diffMs = this.getAccessActivationTime(exam) - this.nowTimestamp;

    if (diffMs > 0) {
      return `İmtahan parolunun aktiv olmasına ${this.formatCountdownFromMs(diffMs)} qalıb.`;
    }

    return 'İmtahana giriş üçün gözlənilir.';
  }

  getPrimaryActionLabel(exam: StudentExamListItemModel): string {
    if (this.isEntryClosed(exam)) {
      return 'Ətraflı bax';
    }

    return 'Daxil ol';
  }

  shouldShowAccessCodeArea(exam: StudentExamListItemModel): boolean {
    return !this.isEntryClosed(exam);
  }

  formatDateTime(value: string): string {
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

  private matchesTab(
    exam: StudentExamListItemModel,
    tab: StudentExamListTab
  ): boolean {
    if (tab === 'all') {
      return true;
    }

    if (tab === 'upcoming') {
      return this.isUpcoming(exam);
    }

    if (tab === 'active') {
      return this.isActive(exam) || ['CodeReady', 'ReadyToStart', 'InProgress'].includes(exam.status);
    }

    if (tab === 'completed') {
      return this.isCompleted(exam) || exam.isMissed;
    }

    return true;
  }

  private calculateStats(items: StudentExamListItemModel[]): StudentExamListStatsModel {
    return {
      totalCount: items.length,
      upcomingCount: items.filter((item) => this.isUpcoming(item)).length,
      activeCount: items.filter((item) =>
        this.isActive(item) || ['CodeReady', 'ReadyToStart', 'InProgress'].includes(item.status)
      ).length,
      completedCount: items.filter((item) => this.isCompleted(item) || item.isMissed).length
    };
  }

  private startClock(): void {
    this.clockSubscription?.unsubscribe();

    this.clockSubscription = interval(1000).subscribe(() => {
      this.nowTimestamp = Date.now();

      if (this.shouldAutoRefreshAccessCodes()) {
        this.lastAutoRefreshAt = this.nowTimestamp;
        this.loadExamsSilently();
        return;
      }

      this.cdr.detectChanges();
    });
  }

  private shouldAutoRefreshAccessCodes(): boolean {
    if (this.isLoading || this.isFilterLoading || !this.allExams.length) {
      return false;
    }

    if (this.nowTimestamp - this.lastAutoRefreshAt < this.autoRefreshCooldownMs) {
      return false;
    }

    return this.allExams.some((exam) => {
      if (this.isEntryClosed(exam)) {
        return false;
      }

      if (exam.accessCode) {
        return false;
      }

      const activationTime = this.getAccessActivationTime(exam);
      const closeTime = this.getExamCloseTime(exam);

      return this.nowTimestamp >= activationTime && this.nowTimestamp <= closeTime;
    });
  }

  private loadExamsSilently(): void {
    this.studentExamService.getMyExams().subscribe({
      next: (items) => {
        this.allExams = [...(items ?? [])].sort((a, b) => {
          return new Date(a.examStartTime).getTime() - new Date(b.examStartTime).getTime();
        });

        this.applyFilters(false);
      },
      error: (error) => {
        console.error('Silent student exams refresh error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  private getAccessActivationTime(exam: StudentExamListItemModel): number {
    return new Date(exam.examStartTime).getTime() - exam.accessCodeActivationMinutes * 60 * 1000;
  }

  private getExamCloseTime(exam: StudentExamListItemModel): number {
    return new Date(exam.examEndTime).getTime() + exam.lateEntryToleranceMinutes * 60 * 1000;
  }   

  private formatCountdownFromMs(diffMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}