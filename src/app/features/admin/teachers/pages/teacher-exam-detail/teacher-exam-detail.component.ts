import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, interval, Subscription } from 'rxjs';
import { TeacherPanelService } from '../../data/teacher-panel.service';
import { AdminSettingsService } from '../../../settings/data/admin-settings.service';
import {
  ExamClassOption,
  ExamDetail,
  ExamQuestionDraft,
  ExamQuestionOption,
  ExamStatus,
  ExamSubjectOption,
  ExamSubmissionAnswer,
  ExamSubmissionDetail,
  ExamSubmissionStudent,
  GradeStudentExamRequest,
  QuestionType,
  UpdateExamRequest
} from '../../../../../core/models/exam/exam.model';

type TeacherExamMode = 'planned' | 'active' | 'completed';

interface PendingQuestionRemovalState {
  questionIndex: number;
  questionText: string;
  questionType: QuestionType;
  questionPoints: number;
}

@Component({
  selector: 'app-teacher-exam-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-exam-detail.component.html',
  styleUrls: ['./teacher-exam-detail.component.css']
})
export class TeacherExamDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly adminSettingsService = inject(AdminSettingsService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly Math = Math;

  examId: number | null = null;

  loading = false;
  saving = false;
  grading = false;
  loadingSubmissionDetail = false;
  refreshingLiveStats = false;

  errorMessage = '';
  successMessage = '';
  gradingError = '';

  examDetail: ExamDetail | null = null;
  editableExam: ExamDetail | null = null;
  originalEditableExam: ExamDetail | null = null;

  mode: TeacherExamMode = 'planned';
  isEditMode = false;

  createOptionsLoading = false;
  classOptions: ExamClassOption[] = [];
  subjectOptions: ExamSubjectOption[] = [];
  teacherName = '';
  teacherId: number | null = null;

  showAutoScore = true;
  settingsLoaded = false;

  submissions: ExamSubmissionStudent[] = [];
  selectedSubmission: ExamSubmissionStudent | null = null;
  submissionDetail: ExamSubmissionDetail | null = null;

  pendingQuestionRemoval: PendingQuestionRemovalState | null = null;
  replacementQuestionType: QuestionType = 'OpenText';
  addQuestionPanelOpen = false;
  addQuestionType: QuestionType = 'OpenText';

  // YENI: sual və variant bazalı edit state
  questionEditStates: Record<string, boolean> = {};
  questionDraftCache: Record<string, ExamQuestionDraft> = {};
  optionEditStates: Record<string, boolean> = {};
  optionDraftCache: Record<string, ExamQuestionOption> = {};

  private liveTimerSubscription?: Subscription;
  private routeSubscription?: Subscription;

  ngOnInit(): void {
    this.loadDisplaySettings();

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!id || Number.isNaN(id)) {
        this.errorMessage = 'İmtahan identifikatoru düzgün deyil.';
        this.cdr.detectChanges();
        return;
      }

      this.examId = id;
      this.resetPageState();
      this.loadExamDetail();
    });
  }

  ngOnDestroy(): void {
    this.stopLiveTimer();
    this.routeSubscription?.unsubscribe();
  }

  resetPageState(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.gradingError = '';
    this.examDetail = null;
    this.editableExam = null;
    this.originalEditableExam = null;
    this.submissions = [];
    this.selectedSubmission = null;
    this.submissionDetail = null;
    this.pendingQuestionRemoval = null;
    this.isEditMode = false;
    this.addQuestionPanelOpen = false;

    // YENI
    this.questionEditStates = {};
    this.questionDraftCache = {};
    this.optionEditStates = {};
    this.optionDraftCache = {};

    this.stopLiveTimer();
  }

  loadDisplaySettings(): void {
    this.adminSettingsService.getSettings().subscribe({
      next: (settings: any) => {
        this.showAutoScore = !!settings?.exam?.showScoreImmediately;
        this.settingsLoaded = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showAutoScore = true;
        this.settingsLoaded = true;
        this.cdr.detectChanges();
      }
    });
  }

  shouldShowAutoScore(): boolean {
    return this.showAutoScore;
  }

  loadExamDetail(): void {
    if (!this.examId) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.gradingError = '';

    this.teacherPanelService
      .getTeacherExamDetail(this.examId)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (detail) => {
          this.examDetail = this.normalizeExamDetail(detail);
          this.mode = this.resolveMode(this.examDetail);

          if (this.mode === 'planned') {
            this.editableExam = this.cloneExam(this.examDetail);
            this.originalEditableExam = this.cloneExam(this.examDetail);
            this.isEditMode = false;
            this.loadEditOptions();
            this.stopLiveTimer();
          } else if (this.mode === 'active') {
            this.isEditMode = false;
            this.editableExam = null;
            this.originalEditableExam = null;
            this.loadSubmissions(false);
            this.startLiveTimer();
          } else {
            this.isEditMode = false;
            this.editableExam = null;
            this.originalEditableExam = null;
            this.loadSubmissions(false);
            this.stopLiveTimer();
          }
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'İmtahan məlumatları yüklənərkən xəta baş verdi.';
        }
      });
  }

  loadEditOptions(): void {
    this.createOptionsLoading = true;

    this.teacherPanelService.getMyExamCreateOptions()
      .pipe(finalize(() => {
        this.createOptionsLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.classOptions = Array.isArray(response?.classOptions) ? response.classOptions : [];
          this.subjectOptions = Array.isArray(response?.subjectOptions) ? response.subjectOptions : [];
          this.teacherId = Number(response?.teacherId ?? 0) || null;
          this.teacherName = response?.teacherName ?? '';

          if (this.editableExam && this.teacherId) {
            this.editableExam.teacherId = this.teacherId;
            this.editableExam.teacherName = this.teacherName || this.editableExam.teacherName;
          }
        },
        error: () => {
          // səssiz keç
        }
      });
  }

  loadSubmissions(showMainLoader = true): void {
    if (!this.examId) {
      return;
    }

    if (showMainLoader) {
      this.loading = true;
    }

    this.teacherPanelService.getExamSubmissions(this.examId)
      .pipe(finalize(() => {
        this.loading = false;
        this.refreshingLiveStats = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (items) => {
          this.submissions = Array.isArray(items)
            ? [...items].sort((a, b) => this.toNumber(b.score) - this.toNumber(a.score))
            : [];

          if (this.selectedSubmission) {
            const updated = this.submissions.find(
              (x) => x.studentExamId === this.selectedSubmission?.studentExamId
            );
            this.selectedSubmission = updated ?? this.selectedSubmission;
          }

          if (this.mode === 'active' && this.hasExamEnded(this.examDetail)) {
            this.stopLiveTimer();
            this.loadExamDetail();
            return;
          }
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Tələbə nəticələri yüklənərkən xəta baş verdi.';
        }
      });
  }

  openSubmission(submission: ExamSubmissionStudent): void {
    if (!this.examId || !submission?.studentExamId) {
      return;
    }

    this.selectedSubmission = submission;
    this.loadingSubmissionDetail = true;
    this.gradingError = '';
    this.successMessage = '';

    this.teacherPanelService
      .getStudentExamSubmissionDetail(this.examId, submission.studentExamId)
      .pipe(finalize(() => {
        this.loadingSubmissionDetail = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (detail) => {
          this.submissionDetail = this.normalizeSubmissionDetail(detail);
        },
        error: (error) => {
          this.gradingError =
            error?.error?.message ||
            error?.message ||
            'Tələbə cavab detaili yüklənmədi.';
        }
      });
  }

  enableEditMode(): void {
    if (this.mode !== 'planned' || !this.examDetail) {
      return;
    }

    this.editableExam = this.cloneExam(this.examDetail);
    this.originalEditableExam = this.cloneExam(this.examDetail);
    this.pendingQuestionRemoval = null;
    this.addQuestionPanelOpen = false;
    this.isEditMode = true;

    this.questionEditStates = {};
    this.questionDraftCache = {};
    this.optionEditStates = {};
    this.optionDraftCache = {};

    this.recalculateScores();
    this.cdr.detectChanges();
  }

  cancelEditMode(): void {
    if (!this.originalEditableExam) {
      this.isEditMode = false;
      return;
    }

    this.editableExam = this.cloneExam(this.originalEditableExam);
    this.pendingQuestionRemoval = null;
    this.addQuestionPanelOpen = false;
    this.isEditMode = false;
    this.errorMessage = '';
    this.successMessage = 'Dəyişikliklər ləğv edildi.';

    this.questionEditStates = {};
    this.questionDraftCache = {};
    this.optionEditStates = {};
    this.optionDraftCache = {};

    this.cdr.detectChanges();
  }

  savePlannedExam(): void {
    if (!this.examId || !this.editableExam || this.saving) {
      return;
    }

    const validation = this.validateEditableExam(this.editableExam);
    if (validation) {
      this.errorMessage = validation;
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    const payload = this.buildUpdatePayload(this.editableExam);

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.teacherPanelService.updateExam(this.examId, payload)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'İmtahan məlumatları uğurla yadda saxlanıldı.';
          this.isEditMode = false;
          this.pendingQuestionRemoval = null;

          this.questionEditStates = {};
          this.questionDraftCache = {};
          this.optionEditStates = {};
          this.optionDraftCache = {};

          this.loadExamDetail();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'İmtahan yadda saxlanılarkən xəta baş verdi.';
        }
      });
  }

  publishExam(): void {
    if (!this.examId || this.saving) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.teacherPanelService.publishExam(this.examId)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'İmtahan uğurla yayımlandı.';
          this.loadExamDetail();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'İmtahan yayımlanarkən xəta baş verdi.';
        }
      });
  }

  saveGrading(): void {
    if (!this.submissionDetail || this.grading) {
      return;
    }

    const openAnswers = this.getOpenAnswers(this.submissionDetail.answers);

    const invalid = openAnswers.find(
      (x) => this.toNumber(x.awardedScore) < 0 || this.toNumber(x.awardedScore) > this.toNumber(x.maxScore)
    );

    if (invalid) {
      this.gradingError = 'Açıq suallardan birində verilən bal maksimum balı keçir.';
      this.cdr.detectChanges();
      return;
    }

    const payload: GradeStudentExamRequest = {
      studentExamId: this.submissionDetail.studentExamId,
      answers: openAnswers.map((answer) => ({
        studentAnswerId: answer.studentAnswerId,
        score: this.toNumber(answer.awardedScore),
        teacherFeedback: answer.teacherFeedback ?? ''
      }))
    };

    this.grading = true;
    this.gradingError = '';
    this.successMessage = '';

    this.teacherPanelService.gradeStudentExam(payload)
      .pipe(finalize(() => {
        this.grading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          if (this.submissionDetail) {
            this.submissionDetail = {
              ...this.submissionDetail,
              isReviewed: result.isReviewed,
              manualGradedScore: result.manualGradedScore,
              autoGradedScore: result.autoGradedScore,
              score: result.totalScore
            };
          }

          this.successMessage = result?.message || 'Qiymətləndirmə yadda saxlanıldı.';
          this.loadSubmissions(false);

          if (this.selectedSubmission) {
            this.openSubmission(this.selectedSubmission);
          }
        },
        error: (error) => {
          this.gradingError =
            error?.error?.message ||
            error?.message ||
            'Qiymətləndirmə yadda saxlanılmadı.';
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/teacher/exams']);
  }

  toggleAddQuestionPanel(): void {
    if (!this.isEditMode) {
      return;
    }

    this.addQuestionPanelOpen = !this.addQuestionPanelOpen;
    this.cdr.detectChanges();
  }

  addQuestionFromPanel(): void {
    this.addQuestion(this.addQuestionType);
    this.addQuestionPanelOpen = false;
    this.successMessage = 'Yeni sual əlavə olundu.';
    this.cdr.detectChanges();
  }

  addQuestion(type: QuestionType = 'OpenText'): void {
    if (!this.editableExam || !this.isEditMode) {
      return;
    }

    const nextOrder = (this.editableExam.questions?.length ?? 0) + 1;

    const question: ExamQuestionDraft = {
      id: 0,
      questionText: '',
      type,
      points: 0,
      orderNumber: nextOrder,
      description: '',
      selectionMode: type === 'MultipleChoice' ? 'multiple' : 'single',
      options:
        type === 'OpenText'
          ? []
          : [
              this.createOption(1),
              this.createOption(2)
            ]
    };

    this.editableExam.questions = [...(this.editableExam.questions ?? []), question];
    this.reorderQuestions();
    this.rebalanceScoresAfterQuestionCountChange(type);

    const newIndex = (this.editableExam.questions?.length ?? 1) - 1;
    this.startQuestionEdit(question, newIndex);

    this.cdr.detectChanges();
  }

  requestRemoveQuestion(index: number): void {
    if (!this.editableExam || !this.isEditMode) {
      return;
    }

    const question = this.editableExam.questions[index];
    if (!question) {
      return;
    }

    this.pendingQuestionRemoval = {
      questionIndex: index,
      questionText: question.questionText || `Sual ${index + 1}`,
      questionType: question.type,
      questionPoints: this.toNumber(question.points)
    };

    this.replacementQuestionType = question.type;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  cancelPendingQuestionRemoval(): void {
    this.pendingQuestionRemoval = null;
    this.cdr.detectChanges();
  }

  confirmRemoveQuestionReduceCounts(): void {
    if (!this.pendingQuestionRemoval || !this.editableExam) {
      return;
    }

    const index = this.pendingQuestionRemoval.questionIndex;
    const questionType = this.pendingQuestionRemoval.questionType;

    this.editableExam.questions.splice(index, 1);
    this.reorderQuestions();
    this.pendingQuestionRemoval = null;

    this.rebalanceScoresAfterQuestionCountChange(questionType);
    this.successMessage = 'Sual silindi və sual sayı azaldıldı.';
    this.cdr.detectChanges();
  }

  confirmRemoveQuestionWithReplacement(): void {
    if (!this.pendingQuestionRemoval || !this.editableExam) {
      return;
    }

    const index = this.pendingQuestionRemoval.questionIndex;
    const oldType = this.pendingQuestionRemoval.questionType;

    this.editableExam.questions.splice(index, 1);

    const replacement: ExamQuestionDraft = {
      id: 0,
      questionText: '',
      type: this.replacementQuestionType,
      points: 0,
      orderNumber: index + 1,
      description: '',
      selectionMode: this.replacementQuestionType === 'MultipleChoice' ? 'multiple' : 'single',
      options:
        this.replacementQuestionType === 'OpenText'
          ? []
          : [this.createOption(1), this.createOption(2)]
    };

    this.editableExam.questions.splice(index, 0, replacement);
    this.reorderQuestions();
    this.pendingQuestionRemoval = null;

    this.rebalanceScoresAfterReplacement(oldType, this.replacementQuestionType);
    this.startQuestionEdit(replacement, index);

    this.successMessage = 'Sual silindi və yerinə yeni sual əlavə olundu.';
    this.cdr.detectChanges();
  }

  onQuestionTypeChange(question: ExamQuestionDraft, previousType?: QuestionType): void {
    const oldType = previousType ?? question.type;

    if (question.type === 'OpenText') {
      question.selectionMode = undefined;
      question.options = [];
    } else {
      question.selectionMode = question.type === 'MultipleChoice' ? 'multiple' : 'single';

      if (!Array.isArray(question.options) || question.options.length < 2) {
        question.options = [this.createOption(1), this.createOption(2)];
      }
    }

    this.normalizeCorrectAnswers(question);
    this.rebalanceScoresAfterReplacement(oldType, question.type);
    this.cdr.detectChanges();
  }

  addOption(question: ExamQuestionDraft, questionIndex: number): void {
    if (!this.isEditMode || !this.isQuestionEditing(question, questionIndex)) {
      return;
    }

    const nextOrder = (question.options?.length ?? 0) + 1;
    question.options = [...(question.options ?? []), this.createOption(nextOrder)];

    const newOptionIndex = (question.options?.length ?? 1) - 1;
    const option = question.options[newOptionIndex];
    this.startOptionEdit(question, questionIndex, option, newOptionIndex);

    this.cdr.detectChanges();
  }

  removeOption(question: ExamQuestionDraft, optionIndex: number): void {
    if (!this.isEditMode) {
      return;
    }

    if (!Array.isArray(question.options) || question.options.length <= 2) {
      return;
    }

    question.options.splice(optionIndex, 1);
    question.options = question.options.map((option, index) => ({
      ...option,
      orderNumber: index + 1
    }));
    this.normalizeCorrectAnswers(question);
    this.cdr.detectChanges();
  }

  onSingleCorrectChange(question: ExamQuestionDraft, selectedIndex: number): void {
    question.options = (question.options ?? []).map((option, index) => ({
      ...option,
      isCorrect: index === selectedIndex
    }));
    this.cdr.detectChanges();
  }

  onMultipleCorrectChange(question: ExamQuestionDraft): void {
    this.normalizeCorrectAnswers(question);
    this.cdr.detectChanges();
  }

  onQuestionPointsChange(): void {
    this.recalculateScores();
    this.cdr.detectChanges();
  }

  rebalanceOpenScores(): void {
    if (!this.editableExam) {
      return;
    }

    const questions = this.editableExam.questions ?? [];
    const openQuestions = questions.filter((q) => this.isOpenQuestion(q.type));

    if (!openQuestions.length) {
      return;
    }

    const openTotal = questions
      .filter((q) => this.isOpenQuestion(q.type))
      .reduce((sum, q) => sum + this.toNumber(q.points), 0);

    this.distributePoints(openQuestions, openTotal || openQuestions.length * 5);
    this.recalculateScores();
    this.successMessage = 'Açıq sualların balları bərabər paylandı.';
    this.cdr.detectChanges();
  }

  rebalanceClosedScores(): void {
    if (!this.editableExam) {
      return;
    }

    const questions = this.editableExam.questions ?? [];
    const closedQuestions = questions.filter((q) => !this.isOpenQuestion(q.type));

    if (!closedQuestions.length) {
      return;
    }

    const closedTotal = questions
      .filter((q) => !this.isOpenQuestion(q.type))
      .reduce((sum, q) => sum + this.toNumber(q.points), 0);

    this.distributePoints(closedQuestions, closedTotal || closedQuestions.length * 5);
    this.recalculateScores();
    this.successMessage = 'Qapalı sualların balları bərabər paylandı.';
    this.cdr.detectChanges();
  }

  rebalanceAllScores(): void {
    if (!this.editableExam) {
      return;
    }

    const allQuestions = this.editableExam.questions ?? [];
    if (!allQuestions.length) {
      return;
    }

    const total = allQuestions.reduce((sum, q) => sum + this.toNumber(q.points), 0) || (allQuestions.length * 5);
    this.distributePoints(allQuestions, total);
    this.recalculateScores();
    this.successMessage = 'Bütün sualların balları bərabər paylandı.';
    this.cdr.detectChanges();
  }

  reorderQuestions(): void {
    if (!this.editableExam) {
      return;
    }

    this.editableExam.questions = (this.editableExam.questions ?? []).map((question, index) => ({
      ...question,
      orderNumber: index + 1,
      options: (question.options ?? []).map((option, optionIndex) => ({
        ...option,
        orderNumber: optionIndex + 1
      }))
    }));
  }

  recalculateScores(): void {
    if (!this.editableExam) {
      return;
    }

    const questions = this.editableExam.questions ?? [];
    this.editableExam.totalQuestionCount = questions.length;
    this.editableExam.openQuestionCount = questions.filter((q) => this.isOpenQuestion(q.type)).length;
    this.editableExam.closedQuestionCount = questions.filter((q) => !this.isOpenQuestion(q.type)).length;
    this.editableExam.totalScore = questions.reduce((sum, q) => sum + this.toNumber(q.points), 0);
    this.editableExam.closedQuestionScore = questions
      .filter((q) => !this.isOpenQuestion(q.type))
      .reduce((sum, q) => sum + this.toNumber(q.points), 0);
  }

  normalizeCorrectAnswers(question: ExamQuestionDraft): void {
    if (this.isOpenQuestion(question.type)) {
      return;
    }

    if (question.selectionMode === 'multiple') {
      if (!(question.options ?? []).some((x) => x.isCorrect) && question.options?.length) {
        question.options[0].isCorrect = true;
      }
      return;
    }

    const firstCorrectIndex = (question.options ?? []).findIndex((x) => x.isCorrect);

    question.options = (question.options ?? []).map((option, index) => ({
      ...option,
      isCorrect: index === (firstCorrectIndex >= 0 ? firstCorrectIndex : 0)
    }));
  }

  getQuestionKey(question: ExamQuestionDraft, index: number): string {
    return `q-${question.id || 0}-${index}`;
  }

  getOptionKey(question: ExamQuestionDraft, questionIndex: number, option: ExamQuestionOption, optionIndex: number): string {
    return `q-${question.id || 0}-${questionIndex}-o-${option.id || 0}-${optionIndex}`;
  }

  isQuestionEditing(question: ExamQuestionDraft, index: number): boolean {
    return !!this.questionEditStates[this.getQuestionKey(question, index)];
  }

  startQuestionEdit(question: ExamQuestionDraft, index: number): void {
    if (!this.isEditMode) {
      return;
    }

    const key = this.getQuestionKey(question, index);
    this.questionEditStates[key] = true;
    this.questionDraftCache[key] = this.cloneQuestion(question);
    this.cdr.detectChanges();
  }

  cancelQuestionEdit(question: ExamQuestionDraft, index: number): void {
    const key = this.getQuestionKey(question, index);
    const draft = this.questionDraftCache[key];
    if (!draft || !this.editableExam) {
      this.questionEditStates[key] = false;
      return;
    }

    this.editableExam.questions[index] = this.cloneQuestion(draft);
    this.questionEditStates[key] = false;
    delete this.questionDraftCache[key];

    Object.keys(this.optionEditStates)
      .filter((x) => x.startsWith(`q-${question.id || 0}-${index}-o-`))
      .forEach((x) => {
        delete this.optionEditStates[x];
        delete this.optionDraftCache[x];
      });

    this.recalculateScores();
    this.cdr.detectChanges();
  }

  saveQuestionEdit(question: ExamQuestionDraft, index: number): void {
    const validation = this.validateSingleQuestion(question);
    if (validation) {
      this.errorMessage = validation;
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    const key = this.getQuestionKey(question, index);
    this.questionEditStates[key] = false;
    delete this.questionDraftCache[key];
    this.normalizeCorrectAnswers(question);
    this.recalculateScores();
    this.errorMessage = '';
    this.successMessage = `Sual ${index + 1} üçün dəyişikliklər tətbiq olundu.`;
    this.cdr.detectChanges();
  }

  isOptionEditing(
    question: ExamQuestionDraft,
    questionIndex: number,
    option: ExamQuestionOption,
    optionIndex: number
  ): boolean {
    return !!this.optionEditStates[this.getOptionKey(question, questionIndex, option, optionIndex)];
  }

  startOptionEdit(
    question: ExamQuestionDraft,
    questionIndex: number,
    option: ExamQuestionOption,
    optionIndex: number
  ): void {
    if (!this.isEditMode || !this.isQuestionEditing(question, questionIndex)) {
      return;
    }

    const key = this.getOptionKey(question, questionIndex, option, optionIndex);
    this.optionEditStates[key] = true;
    this.optionDraftCache[key] = this.cloneOption(option);
    this.cdr.detectChanges();
  }

  cancelOptionEdit(
    question: ExamQuestionDraft,
    questionIndex: number,
    option: ExamQuestionOption,
    optionIndex: number
  ): void {
    const key = this.getOptionKey(question, questionIndex, option, optionIndex);
    const draft = this.optionDraftCache[key];
    if (!draft) {
      this.optionEditStates[key] = false;
      return;
    }

    const targetOption = question.options?.[optionIndex];
    if (targetOption) {
      targetOption.optionText = draft.optionText;
      targetOption.optionKey = draft.optionKey;
      targetOption.isCorrect = draft.isCorrect;
      targetOption.orderNumber = draft.orderNumber;
    }

    this.optionEditStates[key] = false;
    delete this.optionDraftCache[key];
    this.normalizeCorrectAnswers(question);
    this.cdr.detectChanges();
  }

  saveOptionEdit(
    question: ExamQuestionDraft,
    questionIndex: number,
    option: ExamQuestionOption,
    optionIndex: number
  ): void {
    if (!option.optionText?.trim()) {
      this.errorMessage = `Sual ${questionIndex + 1} üçün variant mətni boş ola bilməz.`;
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    const key = this.getOptionKey(question, questionIndex, option, optionIndex);
    this.optionEditStates[key] = false;
    delete this.optionDraftCache[key];
    this.normalizeCorrectAnswers(question);
    this.errorMessage = '';
    this.successMessage = `Sual ${questionIndex + 1} üçün variant yeniləndi.`;
    this.cdr.detectChanges();
  }

  private validateSingleQuestion(question: ExamQuestionDraft): string {
    if (!question.questionText?.trim()) {
      return `Sual ${question.orderNumber} üçün mətn boş ola bilməz.`;
    }

    if (!question.points || question.points <= 0) {
      return `Sual ${question.orderNumber} üçün bal 0-dan böyük olmalıdır.`;
    }

    if (!this.isOpenQuestion(question.type)) {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        return `Qapalı sual ${question.orderNumber} üçün ən azı 2 variant olmalıdır.`;
      }

      const emptyOption = question.options.find((x) => !x.optionText?.trim());
      if (emptyOption) {
        return `Sual ${question.orderNumber} üçün bütün variantlar doldurulmalıdır.`;
      }

      const correctCount = question.options.filter((x) => x.isCorrect).length;
      if (question.selectionMode === 'multiple') {
        if (correctCount < 1) {
          return `Multiple seçimli ${question.orderNumber}-cu sual üçün ən azı 1 doğru cavab olmalıdır.`;
        }
      } else {
        if (correctCount !== 1) {
          return `Single seçimli ${question.orderNumber}-cu sual üçün yalnız 1 doğru cavab olmalıdır.`;
        }
      }
    }

    return '';
  }

  private cloneQuestion(question: ExamQuestionDraft): ExamQuestionDraft {
    return JSON.parse(JSON.stringify(question));
  }

  private cloneOption(option: ExamQuestionOption): ExamQuestionOption {
    return JSON.parse(JSON.stringify(option));
  }

  getQuestionTypeLabel(type: QuestionType): string {
    switch (type) {
      case 'SingleChoice':
        return 'Tək seçimli';
      case 'MultipleChoice':
        return 'Çox seçimli';
      case 'OpenText':
        return 'Açıq sual';
      default:
        return type;
    }
  }

  getCanStartCountdownText(): string {
    if (!this.examDetail?.startTime) {
      return '-';
    }

    const start = new Date(this.examDetail.startTime).getTime();
    const now = Date.now();
    const diff = start - now;

    if (diff <= 0) {
      return 'İmtahan başlama vaxtına çatıb.';
    }

    return this.formatDuration(diff);
  }

  getRemainingActiveTimeText(): string {
    if (!this.examDetail?.endTime) {
      return '-';
    }

    const end = new Date(this.examDetail.endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      return 'Bitmə vaxtı çatıb.';
    }

    return this.formatDuration(diff);
  }

  getNotStartedStudentCount(): number {
    const started = this.getStartedCount();
    const total = this.submissions.length;
    return Math.max(0, total - started);
  }

  getLiveParticipantRate(): number {
    if (!this.submissions.length) {
      return 0;
    }

    return Math.round((this.getStartedCount() / this.submissions.length) * 100);
  }

  getClosedQuestionPercent(): number {
    if (!this.examDetail?.totalQuestionCount) {
      return 0;
    }

    return Math.round((this.toNumber(this.examDetail.closedQuestionCount) / this.toNumber(this.examDetail.totalQuestionCount)) * 100);
  }

  getOpenQuestionPercent(): number {
    if (!this.examDetail?.totalQuestionCount) {
      return 0;
    }

    return Math.round((this.toNumber(this.examDetail.openQuestionCount) / this.toNumber(this.examDetail.totalQuestionCount)) * 100);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Draft':
        return 'Qaralama';
      case 'Published':
        return 'Yayımlanıb';
      case 'Planned':
        return 'Planlaşdırılıb';
      case 'Active':
        return 'Aktiv';
      case 'Completed':
        return 'Tamamlanıb';
      case 'Cancelled':
        return 'Ləğv edilib';
      default:
        return status || '-';
    }
  }

  getModeTitle(): string {
    switch (this.mode) {
      case 'planned':
        return 'Planlaşdırma və redaktə paneli';
      case 'active':
        return 'Canlı imtahan paneli';
      case 'completed':
        return 'Nəticə və qiymətləndirmə paneli';
      default:
        return '';
    }
  }

  getModeDescription(): string {
    switch (this.mode) {
      case 'planned':
        return 'İmtahan başlamayıb. Bu mərhələdə müəllim əsas məlumatları, sualları, variantları və balları tam redaktə edə bilər.';
      case 'active':
        return 'İmtahan hazırda davam edir. Bu mərhələdə yalnız canlı statistikalar və sualların baxış rejimi göstərilir.';
      case 'completed':
        return 'İmtahan bitib. Bu mərhələdə bütün nəticələr görünür və açıq suallar manual qaydada qiymətləndirilə bilər.';
      default:
        return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Draft':
        return 'badge-draft';
      case 'Published':
      case 'Planned':
        return 'badge-planned';
      case 'Active':
        return 'badge-active';
      case 'Completed':
        return 'badge-completed';
      default:
        return 'badge-default';
    }
  }

  getReviewStateLabel(item: ExamSubmissionStudent): string {
    if (item.isReviewed) {
      return 'İmtahan təsdiqlənib';
    }

    const openQuestionsCount = this.toNumber(item.openQuestionsCount);
    const reviewedOpenQuestionsCount = this.toNumber(item.reviewedOpenQuestionsCount);
    const autoGradedScore = this.toNumber(item.autoGradedScore);
    const totalScore = this.toNumber(item.score);

    if (openQuestionsCount === 0 && (autoGradedScore > 0 || totalScore > 0)) {
      return 'İmtahan təsdiqlənib';
    }

    if (reviewedOpenQuestionsCount > 0) {
      return 'Qismən yoxlanıb';
    }

    return 'Yoxlanmayıb';
  }

  getReviewStateClass(item: ExamSubmissionStudent): string {
    if (item.isReviewed) {
      return 'review-complete';
    }

    const openQuestionsCount = this.toNumber(item.openQuestionsCount);
    const reviewedOpenQuestionsCount = this.toNumber(item.reviewedOpenQuestionsCount);
    const autoGradedScore = this.toNumber(item.autoGradedScore);
    const totalScore = this.toNumber(item.score);

    if (openQuestionsCount === 0 && (autoGradedScore > 0 || totalScore > 0)) {
      return 'review-complete';
    }

    if (reviewedOpenQuestionsCount > 0) {
      return 'review-partial';
    }

    return 'review-pending';
  }

  getSubmissionPercent(item: ExamSubmissionStudent | null | undefined): number {
    if (!item || !this.examDetail?.totalScore) {
      return 0;
    }

    const percent = (this.toNumber(item.score) / this.toNumber(this.examDetail.totalScore)) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  getSubmissionDetailPercent(): number {
    if (!this.submissionDetail || !this.examDetail?.totalScore) {
      return 0;
    }

    const percent = (this.toNumber(this.submissionDetail.score) / this.toNumber(this.examDetail.totalScore)) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  getAverageScore(): number {
    if (!this.submissions.length) {
      return 0;
    }

    const total = this.submissions.reduce((sum, item) => sum + this.toNumber(item.score), 0);
    return Math.round((total / this.submissions.length) * 100) / 100;
  }

  getAveragePercent(): number {
    if (!this.submissions.length || !this.examDetail?.totalScore) {
      return 0;
    }

    return Math.round((this.getAverageScore() / this.toNumber(this.examDetail.totalScore)) * 100);
  }

  getReviewedCount(): number {
    return this.submissions.filter((x) => this.getReviewStateClass(x) === 'review-complete').length;
  }

  getPendingReviewCount(): number {
    return this.submissions.filter((x) => this.getReviewStateClass(x) !== 'review-complete').length;
  }

  getStartedCount(): number {
    return this.submissions.filter((x) => !!x.startTime).length;
  }

  getHighestScore(): number {
    if (!this.submissions.length) {
      return 0;
    }

    return Math.max(...this.submissions.map((x) => this.toNumber(x.score)));
  }

  getLowestScore(): number {
    if (!this.submissions.length) {
      return 0;
    }

    return Math.min(...this.submissions.map((x) => this.toNumber(x.score)));
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPercent(value: number): string {
    return `${Math.max(0, Math.round(value))}%`;
  }

  toNumber(value: any): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  isOpenQuestion(type: string): boolean {
    return String(type).toLowerCase() === 'opentext';
  }

  getOpenAnswers(answers: ExamSubmissionAnswer[]): ExamSubmissionAnswer[] {
    return (answers ?? []).filter((answer) =>
      String(answer.questionType ?? '').toLowerCase().includes('open')
    );
  }

  getClosedAnswers(answers: ExamSubmissionAnswer[]): ExamSubmissionAnswer[] {
    return (answers ?? []).filter((answer) =>
      !String(answer.questionType ?? '').toLowerCase().includes('open')
    );
  }

  hasOpenQuestionsInSubmission(item: ExamSubmissionStudent | null | undefined): boolean {
    if (!item) {
      return false;
    }

    return this.toNumber(item.openQuestionsCount) > 0;
  }

  trackByQuestion(_: number, item: ExamQuestionDraft): number {
    return this.toNumber(item.id) || this.toNumber(item.orderNumber);
  }

  trackBySubmission(_: number, item: ExamSubmissionStudent): number {
    return this.toNumber(item.studentExamId);
  }

  private createOption(orderNumber: number): ExamQuestionOption {
    return {
      id: 0,
      optionText: '',
      isCorrect: orderNumber === 1,
      optionKey: '',
      orderNumber
    };
  }

  private validateEditableExam(exam: ExamDetail): string {
    if (!exam.title?.trim()) {
      return 'İmtahan adı boş ola bilməz.';
    }

    if (!exam.subjectId) {
      return 'Fənn seçilməlidir.';
    }

    if (!exam.teacherId) {
      return 'Müəllim identifikatoru tapılmadı.';
    }

    if (!exam.startTime || !exam.endTime) {
      return 'Başlama və bitmə vaxtı daxil edilməlidir.';
    }

    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Vaxt formatı düzgün deyil.';
    }

    if (start >= end) {
      return 'Başlama vaxtı bitmə vaxtından əvvəl olmalıdır.';
    }

    if (!exam.durationMinutes || exam.durationMinutes <= 0) {
      return 'Müddət düzgün daxil edilməlidir.';
    }

    if (!Array.isArray(exam.questions) || exam.questions.length === 0) {
      return 'Ən azı 1 sual olmalıdır.';
    }

    for (const question of exam.questions) {
      if (!question.questionText?.trim()) {
        return `Sual ${question.orderNumber} üçün mətn boş ola bilməz.`;
      }

      if (!question.points || question.points <= 0) {
        return `Sual ${question.orderNumber} üçün bal 0-dan böyük olmalıdır.`;
      }

      if (!this.isOpenQuestion(question.type)) {
        if (!Array.isArray(question.options) || question.options.length < 2) {
          return `Qapalı sual ${question.orderNumber} üçün ən azı 2 variant olmalıdır.`;
        }

        const correctCount = question.options.filter((x) => x.isCorrect).length;
        if (question.selectionMode === 'multiple') {
          if (correctCount < 1) {
            return `Multiple seçimli ${question.orderNumber}-cu sual üçün ən azı 1 doğru cavab lazımdır.`;
          }
        } else {
          if (correctCount !== 1) {
            return `Single seçimli ${question.orderNumber}-cu sual üçün yalnız 1 doğru cavab olmalıdır.`;
          }
        }

        const emptyOption = question.options.find((x) => !x.optionText?.trim());
        if (emptyOption) {
          return `Sual ${question.orderNumber} üçün bütün variantlar doldurulmalıdır.`;
        }
      }
    }

    return '';
  }

  private buildUpdatePayload(exam: ExamDetail): UpdateExamRequest {
    return {
      id: exam.id,
      title: exam.title?.trim(),
      subjectId: Number(exam.subjectId),
      teacherId: Number(exam.teacherId),
      classRoomId: exam.classId ? Number(exam.classId) : null,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: Number(exam.durationMinutes),
      description: exam.description?.trim() || '',
      totalScore: Number(exam.totalScore ?? 0),
      closedQuestionScore: Number(exam.closedQuestionScore ?? 0),
      instructions: exam.instructions?.trim() || '',
      isPublished: !!exam.isPublished,
      questions: (exam.questions ?? []).map((question, index) => ({
        id: question.id && question.id > 0 ? question.id : undefined,
        questionText: question.questionText?.trim(),
        type: question.type,
        points: Number(question.points),
        orderNumber: index + 1,
        description: question.description?.trim() || '',
        selectionMode: this.isOpenQuestion(question.type)
          ? null
          : (question.selectionMode ?? (question.type === 'MultipleChoice' ? 'multiple' : 'single')),
        options: this.isOpenQuestion(question.type)
          ? []
          : (question.options ?? []).map((option, optionIndex) => ({
              id: option.id && option.id > 0 ? option.id : undefined,
              optionText: option.optionText?.trim(),
              isCorrect: !!option.isCorrect,
              optionKey: option.optionKey?.trim() || undefined,
              orderNumber: optionIndex + 1
            }))
      }))
    };
  }

  private normalizeExamDetail(detail: any): ExamDetail {
    const questions = Array.isArray(detail?.questions) ? detail.questions : [];

    const normalizedQuestions: ExamQuestionDraft[] = questions.map((question: any, index: number) => ({
      id: Number(question?.id ?? 0),
      questionText: question?.questionText ?? '',
      type: this.normalizeQuestionType(question?.type),
      points: this.toNumber(question?.points),
      orderNumber: Number(question?.orderNumber ?? index + 1),
      description: question?.description ?? '',
      selectionMode: this.normalizeSelectionMode(question?.selectionMode, question?.type),
      options: Array.isArray(question?.options)
        ? question.options.map((option: any, optionIndex: number) => ({
            id: Number(option?.id ?? 0),
            optionText: option?.optionText ?? '',
            isCorrect: !!option?.isCorrect,
            optionKey: option?.optionKey ?? '',
            orderNumber: Number(option?.orderNumber ?? optionIndex + 1)
          }))
        : []
    }));

    const totalQuestionCount =
      this.toNumber(detail?.totalQuestionCount) || normalizedQuestions.length;

    const openQuestionCount =
      this.toNumber(detail?.openQuestionCount) ||
      normalizedQuestions.filter((q) => this.isOpenQuestion(q.type)).length;

    const closedQuestionCount =
      this.toNumber(detail?.closedQuestionCount) ||
      normalizedQuestions.filter((q) => !this.isOpenQuestion(q.type)).length;

    const totalScore =
      this.toNumber(detail?.totalScore) ||
      normalizedQuestions.reduce((sum, q) => sum + this.toNumber(q.points), 0);

    const closedQuestionScore =
      this.toNumber(detail?.closedQuestionScore) ||
      normalizedQuestions
        .filter((q) => !this.isOpenQuestion(q.type))
        .reduce((sum, q) => sum + this.toNumber(q.points), 0);

    return {
      id: Number(detail?.id ?? 0),
      title: detail?.title ?? '',
      classId: detail?.classRoomId ?? detail?.classId ?? null,
      className: detail?.className ?? '',
      subjectId: detail?.subjectId ?? null,
      subjectName: detail?.subjectName ?? '',
      teacherId: detail?.teacherId ?? null,
      teacherName: detail?.teacherName ?? '',
      startTime: detail?.startTime ?? '',
      endTime: detail?.endTime ?? '',
      durationMinutes: this.toNumber(detail?.durationMinutes),
      status: (detail?.status ?? 'Planned') as ExamStatus,
      totalQuestionCount,
      openQuestionCount,
      closedQuestionCount,
      totalScore,
      closedQuestionScore,
      description: detail?.description ?? '',
      instructions: detail?.instructions ?? '',
      isPublished: !!detail?.isPublished,
      questions: normalizedQuestions
    };
  }

  private normalizeSubmissionDetail(detail: ExamSubmissionDetail): ExamSubmissionDetail {
    return {
      ...detail,
      answers: Array.isArray(detail?.answers)
        ? detail.answers.map((answer) => ({
            ...answer,
            awardedScore: this.toNumber(answer?.awardedScore),
            maxScore: this.toNumber(answer?.maxScore),
            teacherFeedback: answer?.teacherFeedback ?? '',
            options: Array.isArray(answer?.options) ? answer.options : []
          }))
        : []
    };
  }

  private cloneExam(detail: ExamDetail): ExamDetail {
    return JSON.parse(JSON.stringify(detail));
  }

  private resolveMode(detail: ExamDetail): TeacherExamMode {
    const now = new Date();
    const start = new Date(detail.startTime);
    const end = new Date(detail.endTime);

    if (detail.status === 'Completed' || (!Number.isNaN(end.getTime()) && end <= now)) {
      return 'completed';
    }

    if (
      detail.status === 'Active' ||
      (!Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        start <= now &&
        end > now)
    ) {
      return 'active';
    }

    return 'planned';
  }

  private hasExamEnded(detail: ExamDetail | null): boolean {
    if (!detail?.endTime) {
      return false;
    }

    const end = new Date(detail.endTime);
    const now = new Date();

    if (Number.isNaN(end.getTime())) {
      return false;
    }

    return end <= now;
  }

  private normalizeQuestionType(type: any): QuestionType {
    const value = String(type ?? '').toLowerCase();

    if (value.includes('multiple')) {
      return 'MultipleChoice';
    }

    if (value.includes('single')) {
      return 'SingleChoice';
    }

    return 'OpenText';
  }

  private normalizeSelectionMode(value: any, type: any): 'single' | 'multiple' | undefined {
    const raw = String(value ?? '').toLowerCase();

    if (raw === 'multiple' || raw === 'multi') {
      return 'multiple';
    }

    if (raw === 'single') {
      return 'single';
    }

    return this.normalizeQuestionType(type) === 'MultipleChoice' ? 'multiple' : 'single';
  }

  private rebalanceScoresAfterReplacement(oldType: QuestionType, newType: QuestionType): void {
    if (!this.editableExam) {
      return;
    }

    if (oldType === newType) {
      this.rebalanceScoresAfterQuestionCountChange(newType);
      return;
    }

    this.rebalanceScoresAfterQuestionCountChange(oldType);
    this.rebalanceScoresAfterQuestionCountChange(newType);
  }

  private rebalanceScoresAfterQuestionCountChange(type: QuestionType): void {
    if (!this.editableExam) {
      return;
    }

    const questions = this.editableExam.questions ?? [];
    const targetQuestions = questions.filter((q) =>
      this.isOpenQuestion(type) ? this.isOpenQuestion(q.type) : !this.isOpenQuestion(q.type)
    );

    if (!targetQuestions.length) {
      this.recalculateScores();
      return;
    }

    const previousExam = this.originalEditableExam ?? this.examDetail;
    let typeTotalScore = 0;

    if (previousExam) {
      const previousQuestions = previousExam.questions ?? [];
      typeTotalScore = previousQuestions
        .filter((q) =>
          this.isOpenQuestion(type) ? this.isOpenQuestion(q.type) : !this.isOpenQuestion(q.type)
        )
        .reduce((sum, q) => sum + this.toNumber(q.points), 0);
    }

    if (!typeTotalScore) {
      typeTotalScore = targetQuestions.reduce((sum, q) => sum + this.toNumber(q.points), 0);
    }

    if (!typeTotalScore) {
      typeTotalScore = targetQuestions.length * 5;
    }

    this.distributePoints(targetQuestions, typeTotalScore);
    this.recalculateScores();
  }

  private distributePoints(questions: ExamQuestionDraft[], total: number): void {
    if (!questions.length) {
      return;
    }

    const normalizedTotal = Math.max(questions.length, this.toNumber(total));
    const base = Math.floor(normalizedTotal / questions.length);
    let remainder = normalizedTotal % questions.length;

    questions.forEach((question) => {
      question.points = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) {
        remainder--;
      }
    });
  }

  private startLiveTimer(): void {
    this.stopLiveTimer();

    this.liveTimerSubscription = interval(30000).subscribe(() => {
      if (this.mode !== 'active') {
        return;
      }

      if (this.hasExamEnded(this.examDetail)) {
        this.stopLiveTimer();
        this.loadExamDetail();
        return;
      }

      this.refreshingLiveStats = true;
      this.loadSubmissions(false);
      this.cdr.detectChanges();
    });
  }

  private stopLiveTimer(): void {
    this.liveTimerSubscription?.unsubscribe();
    this.liveTimerSubscription = undefined;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days} gün`);
    }
    if (hours > 0) {
      parts.push(`${hours} saat`);
    }
    if (minutes > 0 || !parts.length) {
      parts.push(`${minutes} dəq`);
    }

    return parts.join(' ');
  }
}
