import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, forkJoin, finalize, takeUntil } from 'rxjs';
import {
  ExamDetail,
  ExamQuestionDraft,
  ExamQuestionOption,
  ExamStatus,
  ExamSubjectOption,
  ExamTeacherOption,
  QuestionType,
  UpdateExamRequest
} from '../../../../../core/models/exam/exam.model';
import { ExamService } from '../../data/exam.service';

type ToastType = 'success' | 'error' | 'warning';

interface PendingTypeChange {
  questionId: number;
  targetType: QuestionType;
}

interface AddQuestionModalState {
  open: boolean;
  requiredOpenCount: number;
  requiredClosedCount: number;
  newQuestions: ExamQuestionDraft[];
}

interface SuccessModalState {
  open: boolean;
  title: string;
  message: string;
}

@Component({
  selector: 'app-exam-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  providers: [DatePipe],
  templateUrl: './exam-detail.component.html',
  styleUrls: ['./exam-detail.component.css']
})
export class ExamDetailComponent implements OnInit, OnDestroy {
  readonly Math = Math;

  examId: number | null = null;

  teachers: ExamTeacherOption[] = [];
  subjects: ExamSubjectOption[] = [];

  detailLoading = false;
  saveLoading = false;
  deleteLoading = false;

  detailError = '';
  editError = '';

  examDetail: ExamDetail | null = null;
  editableExam: ExamDetail | null = null;

  isEditMode = false;

  desiredOpenCount = 0;
  desiredClosedCount = 0;

  pendingTypeChange: PendingTypeChange | null = null;

  addQuestionModal: AddQuestionModalState = {
    open: false,
    requiredOpenCount: 0,
    requiredClosedCount: 0,
    newQuestions: []
  };

  successModal: SuccessModalState = {
    open: false,
    title: '',
    message: ''
  };

  toastMessage = '';
  toastType: ToastType = 'success';

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private successModalTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly examService: ExamService,
    private readonly datePipe: DatePipe,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = Number(params.get('id'));

        if (!id || Number.isNaN(id)) {
          this.detailError = 'İmtahan ID-si düzgün deyil.';
          this.cdr.detectChanges();
          return;
        }

        this.examId = id;
        this.loadInitialData(id);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    if (this.successModalTimer) {
      clearTimeout(this.successModalTimer);
    }
  }

  loadInitialData(id: number): void {
    this.detailLoading = true;
    this.detailError = '';
    this.editError = '';
    this.cdr.detectChanges();

    forkJoin({
      teachers: this.examService.getTeachers(),
      subjects: this.examService.getSubjects(),
      detail: this.examService.getExamById(id)
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.detailLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: ({ teachers, subjects, detail }) => {
          this.teachers = teachers ?? [];
          this.subjects = subjects ?? [];

          const normalized = this.normalizeExamDetailForEditor(detail);
          this.examDetail = normalized;

          if (this.isEditMode) {
            this.editableExam = this.cloneExamDetail(normalized);
            this.desiredOpenCount = this.getOpenQuestionCount(this.editableExam.questions);
            this.desiredClosedCount = this.getClosedQuestionCount(this.editableExam.questions);
          }

          this.cdr.detectChanges();
        },
        error: error => {
          this.detailError = this.extractErrorMessage(
            error,
            'İmtahan detail məlumatı yüklənmədi.'
          );
          this.cdr.detectChanges();
        }
      });
  }

  reloadDetail(showLoader = true): void {
    if (!this.examId) {
      return;
    }

    if (showLoader) {
      this.detailLoading = true;
      this.cdr.detectChanges();
    }

    this.examService.getExamById(this.examId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (showLoader) {
            this.detailLoading = false;
          }
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          try {
            const normalized = this.normalizeExamDetailForEditor(response);
            this.examDetail = normalized;
            this.detailError = '';
          } catch (e) {
            console.error('reloadDetail normalize error:', e);
            this.detailError = 'İmtahan detail məlumatı yenilənərkən emal xətası baş verdi.';
          }

          this.cdr.detectChanges();
        },
        error: error => {
          this.detailError = this.extractErrorMessage(
            error,
            'İmtahan detail məlumatı yenilənmədi.'
          );
          this.cdr.detectChanges();
        }
      });
  }

  goBackToList(): void {
    this.router.navigate(['/admin/exams/list']);
  }

  enterEditMode(): void {
    if (!this.examDetail) {
      return;
    }

    this.editError = '';
    this.isEditMode = true;
    this.editableExam = this.cloneExamDetail(this.examDetail);
    this.desiredOpenCount = this.getOpenQuestionCount(this.editableExam.questions);
    this.desiredClosedCount = this.getClosedQuestionCount(this.editableExam.questions);
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.editError = '';
    this.pendingTypeChange = null;
    this.editableExam = null;
    this.closeAddQuestionModal();
    this.cdr.detectChanges();
  }

  saveEdit(): void {
    this.editError = '';
    this.detailError = '';

    if (!this.editableExam || this.saveLoading) {
      return;
    }

    const validationError = this.validateEditableExam(this.editableExam);
    if (validationError) {
      this.editError = validationError;
      this.cdr.detectChanges();
      return;
    }

    const payload = this.buildUpdatePayload(this.editableExam);
    this.saveLoading = true;
    this.cdr.detectChanges();

    this.examService.updateExam(this.editableExam.id, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.saveLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: ExamDetail) => {
          const normalized = this.normalizeExamDetailForEditor(response);

          this.examDetail = normalized;
          this.desiredOpenCount = normalized.openQuestionCount;
          this.desiredClosedCount = normalized.closedQuestionCount;

          this.isEditMode = false;
          this.editableExam = null;
          this.pendingTypeChange = null;
          this.closeAddQuestionModal();

          this.cdr.detectChanges();

          this.openSuccessModal(
            'Yadda saxlanıldı',
            'Dəyişikliklər uğurla yerinə yetirildi. İmtahan detail görünüşü yeniləndi.'
          );

          this.reloadDetail(false);
        },
        error: error => {
          this.editError = this.extractErrorMessage(
            error,
            'Dəyişikliklər yadda saxlanmadı.'
          );
          this.cdr.detectChanges();
        }
      });
  }

  deleteExam(): void {
    if (!this.examDetail) {
      return;
    }

    const accepted = confirm(`"${this.examDetail.title}" imtahanı silinsin?`);
    if (!accepted) {
      return;
    }

    this.deleteLoading = true;
    this.cdr.detectChanges();

    this.examService.deleteExam(this.examDetail.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deleteLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.showToast('İmtahan uğurla silindi.', 'success');
          this.cdr.detectChanges();

          setTimeout(() => {
            this.router.navigate(['/admin/exams/list']);
          }, 300);
        },
        error: error => {
          this.detailError = this.extractErrorMessage(
            error,
            'İmtahan silinmədi.'
          );
          this.cdr.detectChanges();
        }
      });
  }

  applyQuestionStructureChange(): void {
  this.editError = '';

  if (!this.editableExam) {
    return;
  }

  const targetOpen = Number(this.desiredOpenCount || 0);
  const targetClosed = Number(this.desiredClosedCount || 0);

  if (targetOpen < 0 || targetClosed < 0) {
    this.editError = 'Sual sayı mənfi ola bilməz.';
    this.cdr.detectChanges();
    return;
  }

  if (targetOpen + targetClosed === 0) {
    this.editError = 'Ən azı 1 sual qalmalıdır.';
    this.cdr.detectChanges();
    return;
  }

  const currentOpen = this.getOpenQuestionCount(this.editableExam.questions);
  const currentClosed = this.getClosedQuestionCount(this.editableExam.questions);

  if (targetOpen < currentOpen) {
    const needConvert = currentOpen - targetOpen;
    this.convertQuestionsByType('OpenText', needConvert, 'SingleChoice');
  }

  if (targetClosed < currentClosed) {
    let remaining = currentClosed - targetClosed;
    remaining = this.convertClosedToOpen('MultipleChoice', remaining);
    remaining = this.convertClosedToOpen('SingleChoice', remaining);
  }

  const finalOpen = this.getOpenQuestionCount(this.editableExam.questions);
  const finalClosed = this.getClosedQuestionCount(this.editableExam.questions);

  const openDeficit = Math.max(0, targetOpen - finalOpen);
  const closedDeficit = Math.max(0, targetClosed - finalClosed);

  if (openDeficit > 0 || closedDeficit > 0) {
    this.openAddQuestionModal(openDeficit, closedDeficit);
    this.cdr.detectChanges();
    return;
  }

  this.reindexQuestions(this.editableExam.questions);
  this.showToast('Sual strukturu yeniləndi.', 'success');
  this.cdr.detectChanges();
}

  requestQuestionTypeChange(questionId: number, targetType: QuestionType): void {
    if (!this.editableExam) {
      return;
    }

    const question = this.editableExam.questions.find(item => item.id === questionId);
    if (!question || question.type === targetType) {
      return;
    }

    this.pendingTypeChange = {
      questionId,
      targetType
    };

    this.cdr.detectChanges();
  }

  cancelQuestionTypeChange(): void {
    this.pendingTypeChange = null;
    this.cdr.detectChanges();
  }

  applyQuestionTypeChange(): void {
    if (!this.editableExam || !this.pendingTypeChange) {
      return;
    }

    const question = this.editableExam.questions.find(
      item => item.id === this.pendingTypeChange?.questionId
    );

    if (!question) {
      this.pendingTypeChange = null;
      this.cdr.detectChanges();
      return;
    }

    this.transformQuestionType(question, this.pendingTypeChange.targetType);

    this.pendingTypeChange = null;
    this.desiredOpenCount = this.getOpenQuestionCount(this.editableExam.questions);
    this.desiredClosedCount = this.getClosedQuestionCount(this.editableExam.questions);

    this.showToast('Sual növü yeniləndi.', 'success');
    this.cdr.detectChanges();
  }

  moveQuestion(questions: ExamQuestionDraft[], fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= questions.length ||
      toIndex >= questions.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const temp = questions[fromIndex];
    questions[fromIndex] = questions[toIndex];
    questions[toIndex] = temp;

    this.reindexQuestions(questions);
    this.cdr.detectChanges();
  }

  removeQuestion(index: number): void {
    this.editError = '';

    if (!this.editableExam) {
      return;
    }

    if (this.editableExam.questions.length <= 1) {
      this.editError = 'Ən azı 1 sual qalmalıdır.';
      this.cdr.detectChanges();
      return;
    }

    this.editableExam.questions.splice(index, 1);
    this.reindexQuestions(this.editableExam.questions);

    this.desiredOpenCount = this.getOpenQuestionCount(this.editableExam.questions);
    this.desiredClosedCount = this.getClosedQuestionCount(this.editableExam.questions);
    this.cdr.detectChanges();
  }

  addOption(question: ExamQuestionDraft): void {
    if (question.type === 'OpenText') {
      return;
    }

    question.options.push({
      id: this.generateClientId(),
      optionText: '',
      isCorrect: false,
      optionKey: this.getOptionKey(question.options.length),
      orderNumber: question.options.length + 1
    });

    this.reindexOptions(question);
    this.cdr.detectChanges();
  }

  removeOption(question: ExamQuestionDraft, optionIndex: number): void {
    this.editError = '';

    if (question.type === 'OpenText') {
      return;
    }

    if (question.options.length <= 2) {
      this.editError = 'Qapalı sualda ən azı 2 variant qalmalıdır.';
      this.cdr.detectChanges();
      return;
    }

    question.options.splice(optionIndex, 1);

    if (!question.options.some(item => item.isCorrect) && question.options.length > 0) {
      question.options[0].isCorrect = true;
    }

    this.reindexOptions(question);
    this.cdr.detectChanges();
  }

  toggleCorrectOption(question: ExamQuestionDraft, optionIndex: number): void {
    if (question.type === 'OpenText') {
      return;
    }

    const target = question.options[optionIndex];
    if (!target) {
      return;
    }

    const singleMode =
      this.normalizeSelectionMode(question.selectionMode) === 'single' ||
      question.type === 'SingleChoice';

    if (singleMode) {
      question.options.forEach((option, index) => {
        option.isCorrect = index === optionIndex;
      });
      this.cdr.detectChanges();
      return;
    }

    target.isCorrect = !target.isCorrect;

    if (!question.options.some(item => item.isCorrect)) {
      target.isCorrect = true;
    }

    this.cdr.detectChanges();
  }

  onDateRangeChanged(): void {
    if (!this.editableExam?.startTime || !this.editableExam?.endTime) {
      return;
    }

    const duration = this.calculateDurationMinutes(
      this.editableExam.startTime,
      this.editableExam.endTime
    );

    if (duration > 0) {
      this.editableExam.durationMinutes = duration;
      this.cdr.detectChanges();
    }
  }

  syncEndTimeFromDuration(): void {
    if (!this.editableExam?.startTime || !this.editableExam.durationMinutes) {
      return;
    }

    const startDate = new Date(this.editableExam.startTime);

    if (Number.isNaN(startDate.getTime())) {
      return;
    }

    startDate.setMinutes(startDate.getMinutes() + Number(this.editableExam.durationMinutes));
    this.editableExam.endTime = this.toDatetimeLocal(startDate.toISOString());
    this.cdr.detectChanges();
  }

  syncTeacherName(): void {
    if (!this.editableExam) {
      return;
    }

    const teacher = this.teachers.find(item => item.id === this.editableExam?.teacherId);
    if (teacher) {
      this.editableExam.teacherName = teacher.fullName;
      this.cdr.detectChanges();
    }
  }

  syncSubjectName(): void {
    if (!this.editableExam) {
      return;
    }

    const subject = this.subjects.find(item => item.id === this.editableExam?.subjectId);
    if (subject) {
      this.editableExam.subjectName = subject.name;
      this.cdr.detectChanges();
    }
  }

  openAddQuestionModal(openCount: number, closedCount: number): void {
    const newQuestions: ExamQuestionDraft[] = [];

    for (let i = 0; i < closedCount; i++) {
      newQuestions.push(this.createDefaultQuestion('SingleChoice'));
    }

    for (let i = 0; i < openCount; i++) {
      newQuestions.push(this.createDefaultQuestion('OpenText'));
    }

    this.addQuestionModal = {
      open: true,
      requiredOpenCount: openCount,
      requiredClosedCount: closedCount,
      newQuestions
    };

    this.cdr.detectChanges();
  }

  closeAddQuestionModal(): void {
    this.addQuestionModal = {
      open: false,
      requiredOpenCount: 0,
      requiredClosedCount: 0,
      newQuestions: []
    };

    this.cdr.detectChanges();
  }

  onAddModalQuestionTypeChanged(question: ExamQuestionDraft): void {
    if (question.type === 'OpenText') {
      question.selectionMode = undefined;
      question.options = [];
      this.cdr.detectChanges();
      return;
    }

    question.selectionMode = question.type === 'MultipleChoice' ? 'multiple' : 'single';

    if (!question.options?.length) {
      question.options = this.createDefaultClosedOptions();
    }

    this.reindexOptions(question);
    this.cdr.detectChanges();
  }

  appendNewQuestions(): void {
    this.editError = '';

    if (!this.editableExam) {
      return;
    }

    const invalidQuestion = this.addQuestionModal.newQuestions.find(question => {
      if (!question.questionText?.trim()) {
        return true;
      }

      if (!question.points || question.points <= 0) {
        return true;
      }

      if (question.type !== 'OpenText') {
        return (
          !question.options ||
          question.options.length < 2 ||
          question.options.some(item => !item.optionText?.trim()) ||
          !question.options.some(item => item.isCorrect)
        );
      }

      return false;
    });

    if (invalidQuestion) {
      this.editError = 'Yeni əlavə edilən sualların məlumatları tam doldurulmalıdır.';
      this.cdr.detectChanges();
      return;
    }

    this.editableExam.questions.push(
      ...this.addQuestionModal.newQuestions.map(question => ({
        ...this.cloneQuestion(question),
        id: this.generateClientId()
      }))
    );

    this.reindexQuestions(this.editableExam.questions);
    this.desiredOpenCount = this.getOpenQuestionCount(this.editableExam.questions);
    this.desiredClosedCount = this.getClosedQuestionCount(this.editableExam.questions);

    this.closeAddQuestionModal();
    this.showToast('Yeni suallar əlavə edildi.', 'success');
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.successModal = {
      open: false,
      title: '',
      message: ''
    };

    if (this.successModalTimer) {
      clearTimeout(this.successModalTimer);
      this.successModalTimer = null;
    }

    this.cdr.detectChanges();
  }

  private openSuccessModal(title: string, message: string): void {
    this.successModal = {
      open: true,
      title,
      message
    };

    if (this.successModalTimer) {
      clearTimeout(this.successModalTimer);
    }

    this.cdr.detectChanges();

    this.successModalTimer = setTimeout(() => {
      this.closeSuccessModal();
    }, 6000);
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

  getQuestionTypeLabel(type: QuestionType): string {
    switch (type) {
      case 'SingleChoice':
        return 'Qapalı / Tək seçim';
      case 'MultipleChoice':
        return 'Qapalı / Çox seçim';
      case 'OpenText':
        return 'Açıq sual';
      default:
        return type;
    }
  }

  getOpenQuestionCount(questions: ExamQuestionDraft[]): number {
    return (questions || []).filter(item => item.type === 'OpenText').length;
  }

  getClosedQuestionCount(questions: ExamQuestionDraft[]): number {
    return (questions || []).filter(item => item.type !== 'OpenText').length;
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

  trackQuestionById(_: number, item: ExamQuestionDraft): number {
    return item.id;
  }

  trackOptionById(_: number, item: ExamQuestionOption): number {
    return item.id;
  }

  private validateEditableExam(exam: ExamDetail): string {
    if (!exam.title?.trim()) {
      return 'İmtahan adı boş ola bilməz.';
    }

    if (!exam.subjectId) {
      return 'Fənn seçilməlidir.';
    }

    if (!exam.teacherId) {
      return 'Müəllim seçilməlidir.';
    }

    if (!exam.startTime || !exam.endTime) {
      return 'Başlama və bitmə tarixləri doldurulmalıdır.';
    }

    const startDate = new Date(exam.startTime);
    const endDate = new Date(exam.endTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 'Tarix formatı düzgün deyil.';
    }

    if (endDate <= startDate) {
      return 'Bitmə vaxtı başlama vaxtından sonra olmalıdır.';
    }

    if (!exam.questions?.length) {
      return 'İmtahanda ən azı 1 sual olmalıdır.';
    }

    for (const question of exam.questions) {
      if (!question.questionText?.trim()) {
        return `${question.orderNumber}. sualın mətni boş ola bilməz.`;
      }

      if (!question.points || question.points <= 0) {
        return `${question.orderNumber}. sualın balı 0-dan böyük olmalıdır.`;
      }

      if (question.type !== 'OpenText') {
        if (!question.options || question.options.length < 2) {
          return `${question.orderNumber}. qapalı sualda ən azı 2 variant olmalıdır.`;
        }

        if (question.options.some(item => !item.optionText?.trim())) {
          return `${question.orderNumber}. sualın variant mətnləri boş ola bilməz.`;
        }

        const correctCount = question.options.filter(item => item.isCorrect).length;

        if (correctCount === 0) {
          return `${question.orderNumber}. sualda ən azı 1 düzgün cavab olmalıdır.`;
        }

        const singleMode =
          this.normalizeSelectionMode(question.selectionMode) === 'single' ||
          question.type === 'SingleChoice';

        if (singleMode && correctCount > 1) {
          return `${question.orderNumber}. tək seçimli sualda yalnız 1 düzgün cavab olmalıdır.`;
        }
      }
    }

    return '';
  }

  private buildUpdatePayload(exam: ExamDetail): UpdateExamRequest {
    const questions = this.cloneQuestions(exam.questions);
    this.reindexQuestions(questions);

    const totalScore =
      exam.totalScore && Number(exam.totalScore) > 0
        ? Number(exam.totalScore)
        : questions.reduce((sum, item) => sum + Number(item.points || 0), 0);

    const closedQuestionScore =
      exam.closedQuestionScore !== null &&
      exam.closedQuestionScore !== undefined &&
      Number(exam.closedQuestionScore) >= 0
        ? Number(exam.closedQuestionScore)
        : questions
            .filter(item => item.type !== 'OpenText')
            .reduce((sum, item) => sum + Number(item.points || 0), 0);

    const resolvedClassRoomId =
      (exam as any).classRoomId ??
      (exam as any).classId ??
      null;

    return {
      id: exam.id,
      title: exam.title?.trim(),
      subjectId: Number(exam.subjectId),
      teacherId: Number(exam.teacherId),
      classRoomId: resolvedClassRoomId !== null && resolvedClassRoomId !== undefined
        ? Number(resolvedClassRoomId)
        : null,
     startTime: exam.startTime,
endTime: exam.endTime,
      durationMinutes: Number(
        exam.durationMinutes || this.calculateDurationMinutes(exam.startTime, exam.endTime)
      ),
      description: exam.description?.trim() || '',
      totalScore,
      closedQuestionScore,
      instructions: exam.instructions?.trim() || '',
      isPublished: !!exam.isPublished,
      questions: questions.map(question => ({
        id: this.isClientOnlyId(question.id) ? undefined : question.id,
        questionText: question.questionText?.trim(),
        type: this.normalizeQuestionType(question.type),
        points: Number(question.points),
        orderNumber: Number(question.orderNumber),
        description: question.description?.trim() || '',
        selectionMode:
          this.normalizeQuestionType(question.type) === 'OpenText'
            ? null
            : this.normalizeSelectionMode(question.selectionMode) ??
              (this.normalizeQuestionType(question.type) === 'MultipleChoice' ? 'multiple' : 'single'),
        options:
          this.normalizeQuestionType(question.type) === 'OpenText'
            ? []
            : (question.options || []).map(option => ({
                id: this.isClientOnlyId(option.id) ? undefined : option.id,
                optionText: option.optionText?.trim(),
                isCorrect: !!option.isCorrect,
                optionKey: option.optionKey || '',
                orderNumber: Number(option.orderNumber)
              }))
      }))
    };
  }

  private normalizeExamDetailForEditor(detail: ExamDetail): ExamDetail {
    const normalized = this.cloneExamDetail(detail);

    normalized.status = this.normalizeStatus(normalized.status);
    normalized.startTime = this.toDatetimeLocal((detail as any).startTime);
    normalized.endTime = this.toDatetimeLocal((detail as any).endTime);

    normalized.questions = (normalized.questions || []).map(question => {
      const cloned = this.cloneQuestion(question);

      cloned.type = this.normalizeQuestionType(cloned.type);
      cloned.selectionMode = this.normalizeSelectionMode(cloned.selectionMode);

      if (cloned.type === 'OpenText') {
        cloned.options = [];
        cloned.selectionMode = undefined;
      } else {
        cloned.selectionMode =
          cloned.selectionMode ?? (cloned.type === 'MultipleChoice' ? 'multiple' : 'single');

        if (!cloned.options?.length) {
          cloned.options = this.createDefaultClosedOptions();
        }

        this.reindexOptions(cloned);

        if (!cloned.options.some(item => item.isCorrect) && cloned.options.length) {
          cloned.options[0].isCorrect = true;
        }

        const singleMode =
          this.normalizeSelectionMode(cloned.selectionMode) === 'single' ||
          cloned.type === 'SingleChoice';

        if (singleMode) {
          let found = false;

          cloned.options.forEach(option => {
            if (option.isCorrect && !found) {
              found = true;
              return;
            }

            if (found && option.isCorrect) {
              option.isCorrect = false;
            }
          });

          if (!cloned.options.some(item => item.isCorrect) && cloned.options.length) {
            cloned.options[0].isCorrect = true;
          }
        }
      }

      return cloned;
    });

    this.reindexQuestions(normalized.questions);

    normalized.openQuestionCount = this.getOpenQuestionCount(normalized.questions);
    normalized.closedQuestionCount = this.getClosedQuestionCount(normalized.questions);
    normalized.totalQuestionCount = normalized.questions.length;

    return normalized;
  }

  private cloneExamDetail(detail: ExamDetail): ExamDetail {
    return {
      ...detail,
      questions: this.cloneQuestions(detail.questions)
    };
  }

  private cloneQuestions(questions: ExamQuestionDraft[]): ExamQuestionDraft[] {
    return (questions || []).map(question => this.cloneQuestion(question));
  }

  private cloneQuestion(question: ExamQuestionDraft): ExamQuestionDraft {
    return {
      ...question,
      options: (question.options || []).map(option => ({ ...option }))
    };
  }

  private createDefaultQuestion(type: QuestionType): ExamQuestionDraft {
    const isOpen = type === 'OpenText';

    return {
      id: this.generateClientId(),
      questionText: '',
      type,
      points: 1,
      orderNumber: 1,
      description: '',
      selectionMode: isOpen ? undefined : (type === 'MultipleChoice' ? 'multiple' : 'single'),
      options: isOpen ? [] : this.createDefaultClosedOptions()
    };
  }

  private createDefaultClosedOptions(): ExamQuestionOption[] {
    return [
      {
        id: this.generateClientId(),
        optionText: '',
        isCorrect: true,
        optionKey: 'A',
        orderNumber: 1
      },
      {
        id: this.generateClientId(),
        optionText: '',
        isCorrect: false,
        optionKey: 'B',
        orderNumber: 2
      },
      {
        id: this.generateClientId(),
        optionText: '',
        isCorrect: false,
        optionKey: 'C',
        orderNumber: 3
      },
      {
        id: this.generateClientId(),
        optionText: '',
        isCorrect: false,
        optionKey: 'D',
        orderNumber: 4
      }
    ];
  }

  private transformQuestionType(question: ExamQuestionDraft, targetType: QuestionType): void {
    question.type = this.normalizeQuestionType(targetType);

    if (question.type === 'OpenText') {
      question.selectionMode = undefined;
      question.options = [];
      return;
    }

    question.selectionMode = question.type === 'MultipleChoice' ? 'multiple' : 'single';

    if (!question.options?.length) {
      question.options = this.createDefaultClosedOptions();
    }

    this.reindexOptions(question);

    const singleMode =
      this.normalizeSelectionMode(question.selectionMode) === 'single' ||
      question.type === 'SingleChoice';

    if (singleMode) {
      question.options.forEach((option, index) => {
        option.isCorrect = index === 0;
      });
    } else if (!question.options.some(item => item.isCorrect)) {
      question.options[0].isCorrect = true;
    }
  }

  private convertQuestionsByType(
    currentType: QuestionType,
    count: number,
    targetType: QuestionType
  ): void {
    if (!this.editableExam || count <= 0) {
      return;
    }

    const candidates = this.editableExam.questions.filter(
      item => this.normalizeQuestionType(item.type) === this.normalizeQuestionType(currentType)
    );

    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      this.transformQuestionType(candidates[i], targetType);
    }
  }

  private convertClosedToOpen(currentType: QuestionType, remaining: number): number {
    if (!this.editableExam || remaining <= 0) {
      return remaining;
    }

    const candidates = this.editableExam.questions.filter(
      item => this.normalizeQuestionType(item.type) === this.normalizeQuestionType(currentType)
    );
    const convertCount = Math.min(remaining, candidates.length);

    for (let i = 0; i < convertCount; i++) {
      this.transformQuestionType(candidates[i], 'OpenText');
    }

    return remaining - convertCount;
  }

  private reindexQuestions(questions: ExamQuestionDraft[]): void {
    questions.forEach((question, questionIndex) => {
      question.orderNumber = questionIndex + 1;
      this.reindexOptions(question);
    });
  }

  private reindexOptions(question: ExamQuestionDraft): void {
    (question.options || []).forEach((option, optionIndex) => {
      option.orderNumber = optionIndex + 1;
      option.optionKey = this.getOptionKey(optionIndex);
    });
  }

  getOptionKey(index: number): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet[index] ?? `O${index + 1}`;
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

  private toDatetimeLocal(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      const textValue = String(value);
      return textValue.length >= 16 ? textValue.slice(0, 16) : textValue;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  

  private generateClientId(): number {
    return -Math.floor(Math.random() * 1_000_000_000);
  }

  private isClientOnlyId(id: number | undefined): boolean {
    return typeof id === 'number' && id < 0;
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

  private normalizeQuestionType(type: string | null | undefined): QuestionType {
    const value = (type ?? '').toString().trim().toLowerCase();

    if (value === 'opentext' || value === 'open') {
      return 'OpenText';
    }

    if (value === 'multiplechoice' || value === 'multiple') {
      return 'MultipleChoice';
    }

    return 'SingleChoice';
  }

  private normalizeSelectionMode(
    selectionMode: string | null | undefined
  ): 'single' | 'multiple' | undefined {
    const value = (selectionMode ?? '').toString().trim().toLowerCase();

    if (!value) {
      return undefined;
    }

    if (value === 'multiple' || value === 'multi' || value === 'checkbox') {
      return 'multiple';
    }

    return 'single';
  }

  private normalizeStatus(status: string | null | undefined): ExamStatus {
    const value = (status ?? '').toString().trim();

    if (!value) {
      return 'Draft' as ExamStatus;
    }

    const lower = value.toLowerCase();

    if (lower === 'draft') return 'Draft' as ExamStatus;
    if (lower === 'published') return 'Published' as ExamStatus;
    if (lower === 'active') return 'Active' as ExamStatus;
    if (lower === 'completed') return 'Completed' as ExamStatus;
    if (lower === 'cancelled') return 'Cancelled' as ExamStatus;

    return 'Draft' as ExamStatus;
  }
}