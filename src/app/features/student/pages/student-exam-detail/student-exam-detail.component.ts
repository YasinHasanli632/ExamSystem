import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, finalize, interval } from 'rxjs';
import {
  LogStudentExamSecurityPayload,
  SaveStudentAnswerPayload,
  StudentExamAnswerDraftModel,
  StudentExamDetailModel,
  StudentExamQuestionModel,
  StudentExamSessionModel,
  StudentExamSubmitResultModel
} from '../../../../core/models/students/student-exam.model';
import { StudentExamService } from '../../data/student-exam.service';

@Component({
  selector: 'app-student-exam-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-exam-detail.component.html',
  styleUrls: ['./student-exam-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentExamDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentExamService = inject(StudentExamService);
  private readonly cdr = inject(ChangeDetectorRef);

  examId: number | null = null;

  isLoading = false;
  isStarting = false;
  isSubmitting = false;
  isAutoSubmitting = false;
  loadingMessage = 'Yüklənir...';

  errorMessage = '';
  successMessage = '';
  startErrorMessage = '';
  sessionErrorMessage = '';

  examDetail: StudentExamDetailModel | null = null;
  examSession: StudentExamSessionModel | null = null;
  submitResult: StudentExamSubmitResultModel | null = null;

  acceptRules = false;
  remainingSeconds = 0;
  timerLabel = '--:--:--';

  waitingSeconds = 0;
  waitingLabel = '--:--:--';

  savingQuestionIds = new Set<number>();
  saveSuccessQuestionIds = new Set<number>();

  answerDrafts: Record<number, StudentExamAnswerDraftModel> = {};
  openTextExpanded: Record<number, boolean> = {};

  private routeSubscription?: Subscription;
  private timerSubscription?: Subscription;
  private autoSubmittedByTimer = false;
  private lastSecurityLogMap: Record<string, number> = {};

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const examId = Number(params.get('examId'));

      if (!examId || Number.isNaN(examId)) {
        this.errorMessage = 'İmtahan identifikatoru düzgün deyil.';
        this.cdr.detectChanges();
        return;
      }

      this.examId = examId;
      this.resetPageState();
      this.loadExamDetail();
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.routeSubscription?.unsubscribe();
  }

  loadExamDetail(): void {
    if (!this.examId) {
      return;
    }

    this.isLoading = true;
    this.loadingMessage = 'İmtahan detalları yüklənir...';
    this.errorMessage = '';
    this.successMessage = '';
    this.startErrorMessage = '';
    this.sessionErrorMessage = '';

    this.studentExamService
      .getMyExamDetail(this.examId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (detail) => {
          this.examDetail = detail;
          this.acceptRules = detail.status === 'InProgress' ? true : false;
          this.submitResult = null;

          if (this.showStartArea) {
            this.startWaitingCountdown();
          } else {
            this.stopTimer();
          }
        },
        error: (error) => {
          console.error('Student exam detail load error:', error);
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'İmtahan detalı yüklənərkən xəta baş verdi.';
        }
      });
  }

  startExam(): void {
    if (!this.examId || !this.examDetail) {
      return;
    }

    if (!this.acceptRules) {
      this.startErrorMessage = 'İmtahan qaydalarını təsdiqlə.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isStartWindowReached) {
      this.startErrorMessage = 'İmtahan hələ başlamayıb.';
      this.cdr.detectChanges();
      return;
    }

    this.isStarting = true;
    this.startErrorMessage = '';
    this.successMessage = '';

    this.studentExamService
      .startExam({
        examId: this.examId,
        accessCode: null,
        acceptRules: true
      })
      .pipe(
        finalize(() => {
          this.isStarting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (session) => {
          this.examSession = session;
          this.sessionErrorMessage = '';
          this.submitResult = null;
          this.initializeAnswerDrafts(session);
          this.startSessionCountdown();
          this.enterFullscreen();
          this.successMessage = 'İmtahan sessiyası uğurla açıldı.';
        },
        error: (error) => {
          console.error('Student exam start error:', error);
          this.startErrorMessage =
            error?.error?.message ||
            error?.message ||
            'İmtahana daxil olarkən xəta baş verdi.';
        }
      });
  }

  submitExam(forceAutoSubmit = false): void {
    if (!this.examSession?.studentExamId || this.isSubmitting || this.isAutoSubmitting) {
      return;
    }

    if (forceAutoSubmit) {
      this.isAutoSubmitting = true;
    } else {
      this.isSubmitting = true;
    }

    this.studentExamService
      .submitExam({
        studentExamId: this.examSession.studentExamId,
        forceAutoSubmit
      })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.isAutoSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (result) => {
          this.submitResult = result;
          this.stopTimer();
          this.examSession = null;
          this.successMessage = result.message || 'İmtahan uğurla təhvil verildi.';
          this.loadExamDetail();
        },
        error: (error) => {
          console.error('Student exam submit error:', error);
          this.sessionErrorMessage =
            error?.error?.message ||
            error?.message ||
            'İmtahan təhvil verilərkən xəta baş verdi.';
        }
      });
  }

  onSingleChoiceChange(question: StudentExamQuestionModel, optionId: number): void {
    if (!this.examSession || this.examSession.isCompleted) {
      return;
    }

    const draft = this.answerDrafts[question.id];
    if (!draft) {
      return;
    }

    draft.selectedOptionId = optionId;
    draft.selectedOptionIds = [];
    draft.answerText = '';

    this.saveAnswer({
      studentExamId: this.examSession.studentExamId,
      examQuestionId: question.id,
      selectedOptionId: optionId,
      selectedOptionIds: [],
      answerText: null
    });
  }

  onMultipleChoiceChange(
    question: StudentExamQuestionModel,
    optionId: number,
    checked: boolean
  ): void {
    if (!this.examSession || this.examSession.isCompleted) {
      return;
    }

    const draft = this.answerDrafts[question.id];
    if (!draft) {
      return;
    }

    if (checked) {
      if (!draft.selectedOptionIds.includes(optionId)) {
        draft.selectedOptionIds = [...draft.selectedOptionIds, optionId];
      }
    } else {
      draft.selectedOptionIds = draft.selectedOptionIds.filter((id) => id !== optionId);
    }

    draft.selectedOptionId = null;
    draft.answerText = '';

    this.saveAnswer({
      studentExamId: this.examSession.studentExamId,
      examQuestionId: question.id,
      selectedOptionId: null,
      selectedOptionIds: [...draft.selectedOptionIds],
      answerText: null
    });
  }

  saveOpenTextAnswer(question: StudentExamQuestionModel): void {
    if (!this.examSession || this.examSession.isCompleted) {
      return;
    }

    const draft = this.answerDrafts[question.id];
    if (!draft) {
      return;
    }

    this.saveAnswer({
      studentExamId: this.examSession.studentExamId,
      examQuestionId: question.id,
      selectedOptionId: null,
      selectedOptionIds: [],
      answerText: draft.answerText?.trim() || ''
    });
  }

  toggleOpenTextExpanded(questionId: number): void {
    this.openTextExpanded[questionId] = !this.openTextExpanded[questionId];
  }

  isQuestionSaving(questionId: number): boolean {
    return this.savingQuestionIds.has(questionId);
  }

  isQuestionSaved(questionId: number): boolean {
    return this.saveSuccessQuestionIds.has(questionId);
  }

  getQuestionProgressLabel(question: StudentExamQuestionModel): string {
    const draft = this.answerDrafts[question.id];

    if (!draft) {
      return 'Cavab verilməyib';
    }

    if (question.type === 'OpenText') {
      return draft.answerText?.trim() ? 'Mətn yazılıb' : 'Cavab verilməyib';
    }

    if (question.type === 'SingleChoice') {
      return draft.selectedOptionId ? 'Seçim edilib' : 'Cavab verilməyib';
    }

    if (question.type === 'MultipleChoice') {
      return draft.selectedOptionIds.length ? 'Seçim edilib' : 'Cavab verilməyib';
    }

    return 'Cavab verilməyib';
  }

  get answeredQuestionCount(): number {
    if (!this.examSession?.questions?.length) {
      return 0;
    }

    return this.examSession.questions.filter((question) => this.isQuestionAnswered(question)).length;
  }

  get totalQuestionCount(): number {
    return this.examSession?.questions?.length ?? 0;
  }

  get progressPercent(): number {
    if (!this.totalQuestionCount) {
      return 0;
    }

    return Math.round((this.answeredQuestionCount / this.totalQuestionCount) * 100);
  }

  get canStartExam(): boolean {
    if (!this.examDetail) {
      return false;
    }

    return !this.examDetail.isCompleted && !this.examDetail.isMissed;
  }

  get showSessionArea(): boolean {
    return !!this.examSession;
  }

  get showStartArea(): boolean {
    return !!this.examDetail && !this.examSession && !this.examDetail.isCompleted && !this.examDetail.isMissed;
  }

  get showResultArea(): boolean {
    return !!this.examDetail && !this.examSession && (this.examDetail.isCompleted || this.examDetail.isMissed);
  }

  get isStartWindowReached(): boolean {
    return this.waitingSeconds <= 0;
  }

  get startButtonDisabled(): boolean {
    return !this.acceptRules || !this.isStartWindowReached || this.isStarting;
  }

  get startButtonLabel(): string {
    if (this.isStarting) {
      return 'İmtahana daxil olunur...';
    }

    if (!this.acceptRules) {
      return 'Qaydaları təsdiqlə';
    }

    if (!this.isStartWindowReached) {
      return `İmtahanın başlamasına ${this.waitingLabel} qalıb`;
    }

    return 'İmtahana daxil ol';
  }

  get resultTitle(): string {
    if (!this.examDetail) {
      return 'Nəticə';
    }

    if (this.examDetail.isMissed) {
      return 'İmtahan buraxılıb';
    }

    if (this.examDetail.publishedScore !== null) {
      return 'İmtahan nəticəsi';
    }

    if (this.examDetail.requiresManualReview) {
      return 'Nəticələr yoxlanılır';
    }

    return 'İmtahan tamamlanıb';
  }

  get resultDescription(): string {
    if (!this.examDetail) {
      return '';
    }

    if (this.examDetail.resultMessage) {
      return this.examDetail.resultMessage;
    }

    if (this.examDetail.isMissed) {
      return 'Bu imtahana giriş edilmədiyi üçün bal avtomatik olaraq 0 hesablanıb.';
    }

    if (this.examDetail.requiresManualReview) {
      return 'Açıq suallar olduğu üçün nəticələr hələ hazır deyil.';
    }

    if (this.examDetail.publishedScore !== null) {
      return 'Yekun nəticən aşağıda göstərilir.';
    }

    return 'İmtahan tamamlanıb.';
  }

  get displayedScore(): number | null {
    if (!this.examDetail) {
      return null;
    }

    if (this.examDetail.isMissed) {
      return 0;
    }

    return this.examDetail.publishedScore;
  }

  formatDateTime(value: string | null | undefined): string {
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

  formatQuestionType(value: string): string {
    switch ((value ?? '').trim()) {
      case 'SingleChoice':
        return 'Tək seçim';
      case 'MultipleChoice':
        return 'Çox seçim';
      case 'OpenText':
        return 'Açıq sual';
      default:
        return value || 'Naməlum';
    }
  }

  getStatusLabel(value: string): string {
    switch ((value ?? '').trim()) {
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
        return value || 'Naməlum';
    }
  }

  getStatusClass(value: string): string {
    switch ((value ?? '').trim()) {
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

  backToList(): void {
    this.router.navigate(['/student/exams']);
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (!this.examSession || this.examSession.isCompleted) {
      return;
    }

    if (document.hidden) {
      this.logSecurityEvent({
        studentExamId: this.examSession.studentExamId,
        eventType: 'TabSwitch',
        description: 'Tələbə başqa tab və ya pəncərəyə keçdi.'
      });
    }
  }

  @HostListener('document:copy', ['$event'])
  onCopy(event: ClipboardEvent): void {
    if (!this.examSession || this.examSession.isCompleted) {
      return;
    }

    event.preventDefault();

    this.logSecurityEvent({
      studentExamId: this.examSession.studentExamId,
      eventType: 'CopyAttempt',
      description: 'Copy cəhdi qeydə alındı.'
    });
  }

  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (!this.examSession || this.examSession.isCompleted) {
      return;
    }

    event.preventDefault();

    this.logSecurityEvent({
      studentExamId: this.examSession.studentExamId,
      eventType: 'PasteAttempt',
      description: 'Paste cəhdi qeydə alındı.'
    });
  }

  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    if (!this.examSession || this.examSession.isCompleted) {
      return;
    }

    event.preventDefault();

    this.logSecurityEvent({
      studentExamId: this.examSession.studentExamId,
      eventType: 'RightClickAttempt',
      description: 'Sağ klik cəhdi qeydə alındı.'
    });
  }

  private resetPageState(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.startErrorMessage = '';
    this.sessionErrorMessage = '';
    this.examDetail = null;
    this.examSession = null;
    this.submitResult = null;
    this.acceptRules = false;
    this.remainingSeconds = 0;
    this.timerLabel = '--:--:--';
    this.waitingSeconds = 0;
    this.waitingLabel = '--:--:--';
    this.answerDrafts = {};
    this.openTextExpanded = {};
    this.savingQuestionIds.clear();
    this.saveSuccessQuestionIds.clear();
    this.autoSubmittedByTimer = false;
    this.lastSecurityLogMap = {};
    this.stopTimer();
  }

  private initializeAnswerDrafts(session: StudentExamSessionModel): void {
    const draftMap: Record<number, StudentExamAnswerDraftModel> = {};

    for (const question of session.questions ?? []) {
      draftMap[question.id] = {
        examQuestionId: question.id,
        selectedOptionId: question.existingAnswer?.selectedOptionId ?? null,
        selectedOptionIds: [...(question.existingAnswer?.selectedOptionIds ?? [])],
        answerText: question.existingAnswer?.answerText ?? ''
      };
    }

    this.answerDrafts = draftMap;
    this.cdr.detectChanges();
  }

  private saveAnswer(payload: SaveStudentAnswerPayload): void {
    const questionId = payload.examQuestionId;

    this.savingQuestionIds.add(questionId);
    this.saveSuccessQuestionIds.delete(questionId);
    this.cdr.detectChanges();

    this.studentExamService
      .saveAnswer(payload)
      .pipe(
        finalize(() => {
          this.savingQuestionIds.delete(questionId);
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.saveSuccessQuestionIds.add(questionId);

          setTimeout(() => {
            this.saveSuccessQuestionIds.delete(questionId);
            this.cdr.detectChanges();
          }, 1600);
        },
        error: (error) => {
          console.error('Save answer error:', error);
          this.sessionErrorMessage =
            error?.error?.message ||
            error?.message ||
            'Cavab yadda saxlanılarkən xəta baş verdi.';
        }
      });
  }

  private isQuestionAnswered(question: StudentExamQuestionModel): boolean {
    const draft = this.answerDrafts[question.id];

    if (!draft) {
      return false;
    }

    if (question.type === 'OpenText') {
      return !!draft.answerText?.trim();
    }

    if (question.type === 'SingleChoice') {
      return !!draft.selectedOptionId;
    }

    if (question.type === 'MultipleChoice') {
      return draft.selectedOptionIds.length > 0;
    }

    return false;
  }

  private startWaitingCountdown(): void {
    this.stopTimer();
    this.updateWaitingCountdown();

    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateWaitingCountdown();
    });
  }

  private startSessionCountdown(): void {
    this.stopTimer();
    this.updateSessionRemainingSeconds();

    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateSessionRemainingSeconds();
    });
  }

  private stopTimer(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = undefined;
  }

  private updateWaitingCountdown(): void {
    if (!this.examDetail?.startTime) {
      this.waitingSeconds = 0;
      this.waitingLabel = '--:--:--';
      this.cdr.detectChanges();
      return;
    }

    const startMs = new Date(this.examDetail.startTime).getTime();
    const diffMs = startMs - Date.now();

    this.waitingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    this.waitingLabel = this.formatRemainingTime(this.waitingSeconds);
    this.cdr.detectChanges();
  }

  private updateSessionRemainingSeconds(): void {
    if (!this.examSession?.startTime || !this.examSession?.durationMinutes) {
      this.remainingSeconds = 0;
      this.timerLabel = '--:--:--';
      this.cdr.detectChanges();
      return;
    }

    const start = new Date(this.examSession.startTime).getTime();
    const deadline = start + this.examSession.durationMinutes * 60 * 1000;
    const remainingMs = deadline - Date.now();

    this.remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    this.timerLabel = this.formatRemainingTime(this.remainingSeconds);

    if (this.remainingSeconds <= 0 && !this.autoSubmittedByTimer && !this.examSession.isCompleted) {
      this.autoSubmittedByTimer = true;
      this.submitExam(true);
      return;
    }

    this.cdr.detectChanges();
  }

  private formatRemainingTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private logSecurityEvent(payload: LogStudentExamSecurityPayload): void {
    const key = `${payload.eventType}:${payload.studentExamId}`;
    const now = Date.now();
    const last = this.lastSecurityLogMap[key] ?? 0;

    if (now - last < 3000) {
      return;
    }

    this.lastSecurityLogMap[key] = now;

    this.studentExamService.logSecurityEvent(payload).subscribe({
      next: () => {
        if (this.examSession) {
          if (payload.eventType === 'TabSwitch' || payload.eventType === 'Blur') {
            this.examSession = {
              ...this.examSession,
              warningCount: (this.examSession.warningCount ?? 0) + 1,
              tabSwitchCount: (this.examSession.tabSwitchCount ?? 0) + 1
            };
          }

          if (payload.eventType === 'FullScreenExit') {
            this.examSession = {
              ...this.examSession,
              warningCount: (this.examSession.warningCount ?? 0) + 1,
              fullScreenExitCount: (this.examSession.fullScreenExitCount ?? 0) + 1
            };
          }

          if (
            payload.eventType === 'CopyAttempt' ||
            payload.eventType === 'PasteAttempt' ||
            payload.eventType === 'RightClickAttempt'
          ) {
            this.examSession = {
              ...this.examSession,
              warningCount: (this.examSession.warningCount ?? 0) + 1
            };
          }

          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Security log error:', error);
      }
    });
  }

  private async enterFullscreen(): Promise<void> {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen request failed:', error);
    }

    document.addEventListener('fullscreenchange', this.handleFullScreenChange);
  }

  private handleFullScreenChange = (): void => {
    if (!this.examSession || this.examSession.isCompleted) {
      return;
    }

    if (!document.fullscreenElement) {
      this.logSecurityEvent({
        studentExamId: this.examSession.studentExamId,
        eventType: 'FullScreenExit',
        description: 'Tələbə full screen rejimindən çıxdı.'
      });
    }
  };
}
