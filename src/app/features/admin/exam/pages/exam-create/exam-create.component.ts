import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  ExamBaseForm,
  ExamClassOption,
  ExamFilter,
  ExamListItem,
  ExamQuestionDraft,
  ExamQuestionOption,
  ExamStats,
  ExamStatus,
  ExamSubjectOption,
  ExamTeacherOption
} from '../../../../../core/models/exam/exam.model';
import { ExamService } from '../../data/exam.service';

type QuestionModalType = 'Closed' | 'Open';
type ClosedQuestionSelectionMode = 'single' | 'multiple';

interface UiExamForm extends ExamBaseForm {
  examDate: string;
  totalQuestionCount: number | null;
  openQuestionCount: number | null;
  closedQuestionCount: number | null;
  status: ExamStatus;
}

interface UiQuestionOption {
  id: number;
  label: string;
  value: string;
}

interface QuestionModalForm {
  type: QuestionModalType;
  title: string;
  description: string;
  score: number | null;
  selectionMode: ClosedQuestionSelectionMode;
  options: UiQuestionOption[];
  correctOptionIds: number[];
}

@Component({
  selector: 'app-exam-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-create.component.html',
  styleUrls: ['./exam-create.component.css']
})
export class ExamCreateComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef); // YENI

  readonly Math = Math;

  classes: ExamClassOption[] = [];
  subjects: ExamSubjectOption[] = [];
  teachers: ExamTeacherOption[] = [];
  availableTeachers: ExamTeacherOption[] = [];

  exams: ExamListItem[] = [];
  filteredExams: ExamListItem[] = [];

  stats: ExamStats = {
    totalExams: 0,
    plannedExams: 0,
    activeExams: 0,
    completedExams: 0,
    totalQuestions: 0
  };

  filter: ExamFilter = {
    search: '',
    classId: null,
    subjectId: null,
    teacherId: null,
    status: ''
  };

  isDrawerOpen = false;
  drawerStep: 1 | 2 = 1;

  examForm: UiExamForm = this.createEmptyExamForm();
  questionDrafts: ExamQuestionDraft[] = [];

  isQuestionModalOpen = false;
  isCorrectAnswerModalOpen = false;

  questionModalForm: QuestionModalForm = this.createEmptyQuestionModalForm();
  pendingOptionValue = '';
  editingQuestionId: number | null = null;

  successMessage = '';
  errorMessage = '';

  isLoading = false;
  isSaving = false;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly examService: ExamService) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  private refreshView(): void { // YENI
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.refreshView(); // YENI

    forkJoin({
      classes: this.examService.getClasses(),
      subjects: this.examService.getSubjects(),
      teachers: this.examService.getTeachers(),
      exams: this.examService.getExams(this.filter)
    }).subscribe({
      next: ({ classes, subjects, teachers, exams }) => {
        this.classes = [...(classes ?? [])];
        this.subjects = [...(subjects ?? [])];
        this.teachers = [...(teachers ?? [])];
        this.availableTeachers = [...this.teachers];
        this.exams = [...(exams ?? [])];
        this.filteredExams = [...this.exams];
        this.stats = { ...this.examService.getStats(this.filteredExams) };
        this.isLoading = false;
        this.refreshView(); // YENI
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(error, 'Exam məlumatları yüklənmədi.');
        this.refreshView(); // YENI
      }
    });
  }

  createEmptyExamForm(): UiExamForm {
    return {
      title: '',
      classId: null,
      subjectId: null,
      teacherId: null,
      examDate: '',
      startTime: '',
      endTime: '',
      durationMinutes: 90,
      totalQuestionCount: null,
      openQuestionCount: null,
      closedQuestionCount: null,
      totalScore: 100,
      closedQuestionScore: 10,
      description: '',
      instructions: '',
      isPublished: false,
      status: 'Draft'
    };
  }

  createEmptyQuestionModalForm(): QuestionModalForm {
    return {
      type: 'Closed',
      title: '',
      description: '',
      score: null,
      selectionMode: 'single',
      options: [],
      correctOptionIds: []
    };
  }

  refreshList(): void {
    this.isLoading = true; // YENI
    this.refreshView(); // YENI

    this.examService.getExams(this.filter).subscribe({
      next: exams => {
        this.exams = [...(exams ?? [])];
        this.filteredExams = [...this.exams];
        this.stats = { ...this.examService.getStats(this.filteredExams) };
        this.isLoading = false; // YENI
        this.refreshView(); // YENI
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'İmtahan siyahısı yenilənmədi.');
        this.isLoading = false; // YENI
        this.refreshView(); // YENI
      }
    });
  }

  applyFilters(): void {
    this.isLoading = true; // YENI
    this.refreshView(); // YENI

    this.examService.getExams(this.filter).subscribe({
      next: exams => {
        this.filteredExams = [...(exams ?? [])];
        this.stats = { ...this.examService.getStats(this.filteredExams) };
        this.isLoading = false; // YENI
        this.refreshView(); // YENI
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'Filter tətbiq edilərkən xəta baş verdi.');
        this.isLoading = false; // YENI
        this.refreshView(); // YENI
      }
    });
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }

  resetFilters(): void {
    this.filter = {
      search: '',
      classId: null,
      subjectId: null,
      teacherId: null,
      status: ''
    };

    this.refreshView(); // YENI
    this.applyFilters();
  }

  openDrawer(): void {
    this.isDrawerOpen = true;
    this.drawerStep = 1;
    this.successMessage = '';
    this.errorMessage = '';
    this.examForm = this.createEmptyExamForm();
    this.questionDrafts = [];
    this.availableTeachers = [...this.teachers];
    this.refreshView(); // YENI
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.drawerStep = 1;
    this.examForm = this.createEmptyExamForm();
    this.questionDrafts = [];
    this.closeQuestionModal();
    this.closeCorrectAnswerModal();
    this.refreshView(); // YENI
  }

  onExamClassOrSubjectChange(): void {
    this.availableTeachers = [...this.teachers];

    if (
      this.examForm.teacherId !== null &&
      !this.availableTeachers.some(teacher => teacher.id === this.examForm.teacherId)
    ) {
      this.examForm = {
        ...this.examForm,
        teacherId: null
      };
    }

    this.refreshView(); // YENI
  }

  get selectedClassName(): string {
    return this.classes.find(x => x.id === this.examForm.classId)?.name ?? '-';
  }

  get selectedSubjectName(): string {
    return this.subjects.find(x => x.id === this.examForm.subjectId)?.name ?? '-';
  }

  get selectedTeacherName(): string {
    return this.availableTeachers.find(x => x.id === this.examForm.teacherId)?.fullName ??
      this.teachers.find(x => x.id === this.examForm.teacherId)?.fullName ??
      '-';
  }

  get isExamMetaValid(): boolean {
    const total = this.toNonNegativeInt(this.examForm.totalQuestionCount);
    const open = this.toNonNegativeInt(this.examForm.openQuestionCount);
    const closed = this.toNonNegativeInt(this.examForm.closedQuestionCount);
    const duration = this.toPositiveInt(this.examForm.durationMinutes);
    const totalScore = Number(this.examForm.totalScore ?? 0);
    const closedQuestionScore = Number(this.examForm.closedQuestionScore ?? 0);

    return !!(
      this.examForm.title.trim() &&
      this.examForm.classId !== null &&
      this.examForm.subjectId !== null &&
      this.examForm.teacherId !== null &&
      this.examForm.examDate &&
      total > 0 &&
      open >= 0 &&
      closed >= 0 &&
      (open + closed) === total &&
      totalScore > 0 &&
      totalScore <= 100 &&
      closedQuestionScore >= 0 &&
      duration > 0 &&
      this.examForm.description.trim()
    );
  }

  proceedToQuestions(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    const total = this.toNonNegativeInt(this.examForm.totalQuestionCount);
    const open = this.toNonNegativeInt(this.examForm.openQuestionCount);
    const closed = this.toNonNegativeInt(this.examForm.closedQuestionCount);

    if (!this.examForm.title.trim()) {
      this.errorMessage = 'İmtahan adını daxil et.';
      this.refreshView(); // YENI
      return;
    }

    if (this.examForm.classId === null || this.examForm.subjectId === null || this.examForm.teacherId === null) {
      this.errorMessage = 'Sinif, fənn və müəllim seçilməlidir.';
      this.refreshView(); // YENI
      return;
    }

    if (!this.examForm.examDate) {
      this.errorMessage = 'İmtahan vaxtını seç.';
      this.refreshView(); // YENI
      return;
    }

    if (total <= 0) {
      this.errorMessage = 'Ümumi sual sayı 0-dan böyük olmalıdır.';
      this.refreshView(); // YENI
      return;
    }

    if (open < 0 || closed < 0) {
      this.errorMessage = 'Açıq və qapalı sual sayı mənfi ola bilməz.';
      this.refreshView(); // YENI
      return;
    }

    if ((open + closed) !== total) {
      this.errorMessage = `Açıq (${open}) + qapalı (${closed}) sual sayı ümumi sual sayına (${total}) bərabər olmalıdır.`;
      this.refreshView(); // YENI
      return;
    }

    if (Number(this.examForm.totalScore ?? 0) <= 0 || Number(this.examForm.totalScore ?? 0) > 100) {
      this.errorMessage = 'Ümumi bal 1-100 aralığında olmalıdır.';
      this.refreshView(); // YENI
      return;
    }

    if (this.toPositiveInt(this.examForm.durationMinutes) <= 0) {
      this.errorMessage = 'Müddət düzgün daxil edilməlidir.';
      this.refreshView(); // YENI
      return;
    }

    if (!this.examForm.description.trim()) {
      this.errorMessage = 'Açıqlama sahəsini doldur.';
      this.refreshView(); // YENI
      return;
    }

    this.examForm = {
      ...this.examForm,
      totalQuestionCount: total,
      openQuestionCount: open,
      closedQuestionCount: closed,
      isPublished: this.examForm.status !== 'Draft'
    };

    this.syncExamDateToRange();
    this.drawerStep = 2;
    this.refreshView(); // YENI
  }

  backToMetaStep(): void {
    this.drawerStep = 1;
    this.refreshView(); // YENI
  }

  openQuestionModal(type?: QuestionModalType): void {
    this.editingQuestionId = null;
    this.questionModalForm = this.createEmptyQuestionModalForm();

    if (type) {
      this.questionModalForm = {
        ...this.questionModalForm,
        type
      };
    }

    this.pendingOptionValue = '';
    this.isQuestionModalOpen = true;
    this.refreshView(); // YENI
  }

  editQuestion(question: ExamQuestionDraft): void {
    const isOpen = this.isOpenQuestion(question);
    const modalOptions: UiQuestionOption[] = (question.options ?? []).map((option, index) => ({
      id: option.id ?? Date.now() + index,
      label: option.optionKey?.trim() || this.getOptionLabel(index),
      value: option.optionText
    }));

    const correctOptionIds = modalOptions
      .filter((_, index) => !!question.options?.[index]?.isCorrect)
      .map(option => option.id);

    this.editingQuestionId = question.id;
    this.questionModalForm = {
      type: isOpen ? 'Open' : 'Closed',
      title: question.questionText,
      description: question.description ?? '',
      score: question.points,
      selectionMode: question.selectionMode === 'multiple' ? 'multiple' : 'single',
      options: [...modalOptions],
      correctOptionIds: [...correctOptionIds]
    };

    this.pendingOptionValue = '';
    this.isQuestionModalOpen = true;
    this.refreshView(); // YENI
  }

  closeQuestionModal(): void {
    this.isQuestionModalOpen = false;
    this.questionModalForm = this.createEmptyQuestionModalForm();
    this.pendingOptionValue = '';
    this.editingQuestionId = null;
    this.refreshView(); // YENI
  }

  addOption(): void {
    const value = this.pendingOptionValue.trim();
    if (!value) {
      return;
    }

    const nextIndex = this.questionModalForm.options.length;

    this.questionModalForm = {
      ...this.questionModalForm,
      options: [
        ...this.questionModalForm.options,
        {
          id: Date.now() + nextIndex,
          label: this.getOptionLabel(nextIndex),
          value
        }
      ]
    };

    this.pendingOptionValue = '';
    this.refreshView(); // YENI
  }

  removeOption(optionId: number): void {
    const updatedOptions = this.questionModalForm.options
      .filter(option => option.id !== optionId)
      .map((option, index) => ({
        ...option,
        label: this.getOptionLabel(index)
      }));

    this.questionModalForm = {
      ...this.questionModalForm,
      options: [...updatedOptions],
      correctOptionIds: this.questionModalForm.correctOptionIds.filter(
        id => updatedOptions.some(option => option.id === id)
      )
    };
    this.refreshView(); // YENI
  }

  openCorrectAnswerModal(): void {
    if (this.questionModalForm.type !== 'Closed') {
      return;
    }

    if (this.questionModalForm.options.length < 2) {
      this.errorMessage = 'Qapalı sual üçün ən azı 2 variant əlavə et.';
      this.refreshView(); // YENI
      return;
    }

    this.errorMessage = '';
    this.isCorrectAnswerModalOpen = true;
    this.refreshView(); // YENI
  }

  closeCorrectAnswerModal(): void {
    this.isCorrectAnswerModalOpen = false;
    this.refreshView(); // YENI
  }

  toggleCorrectOption(optionId: number): void {
    if (this.questionModalForm.selectionMode === 'single') {
      this.questionModalForm = {
        ...this.questionModalForm,
        correctOptionIds: [optionId]
      };
      this.refreshView(); // YENI
      return;
    }

    if (this.questionModalForm.correctOptionIds.includes(optionId)) {
      this.questionModalForm = {
        ...this.questionModalForm,
        correctOptionIds: this.questionModalForm.correctOptionIds.filter(id => id !== optionId)
      };
    } else {
      this.questionModalForm = {
        ...this.questionModalForm,
        correctOptionIds: [
          ...this.questionModalForm.correctOptionIds,
          optionId
        ]
      };
    }

    this.refreshView(); // YENI
  }

  confirmCorrectAnswers(): void {
    if (!this.questionModalForm.correctOptionIds.length) {
      this.errorMessage = 'Ən azı 1 düzgün cavab seçilməlidir.';
      this.refreshView(); // YENI
      return;
    }

    this.errorMessage = '';
    this.isCorrectAnswerModalOpen = false;
    this.successMessage = 'Düzgün cavab seçimi təsdiqləndi.';
    this.refreshView(); // YENI
  }

  get canSaveQuestion(): boolean {
    const score = Number(this.questionModalForm.score ?? 0);

    if (!this.questionModalForm.title.trim() || score <= 0 || score > 100) {
      return false;
    }

    if (this.questionModalForm.type === 'Open') {
      return true;
    }

    return (
      this.questionModalForm.options.length >= 2 &&
      this.questionModalForm.correctOptionIds.length > 0
    );
  }

  saveQuestion(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    if (!this.canSaveQuestion) {
      this.errorMessage =
        'Sual tam deyil. Bal 1-100 arası olmalıdır. Qapalı sualda variantlar və düzgün cavab seçilməlidir.';
      this.refreshView(); // YENI
      return;
    }

    const isClosed = this.questionModalForm.type === 'Closed';
    const type = isClosed
      ? (this.questionModalForm.selectionMode === 'multiple' ? 'MultipleChoice' : 'SingleChoice')
      : 'OpenText';

    const options: ExamQuestionOption[] = isClosed
      ? this.questionModalForm.options.map((option, index) => ({
          id: option.id,
          optionText: option.value.trim(),
          isCorrect: this.questionModalForm.correctOptionIds.includes(option.id),
          optionKey: option.label,
          orderNumber: index + 1
        }))
      : [];

    const question: ExamQuestionDraft = {
      id: this.editingQuestionId ?? Date.now(),
      questionText: this.questionModalForm.title.trim(),
      type,
      points: Number(this.questionModalForm.score),
      orderNumber: 1,
      description: this.questionModalForm.description.trim(),
      selectionMode: isClosed ? this.questionModalForm.selectionMode : undefined,
      options
    };

    if (this.editingQuestionId !== null) {
      this.questionDrafts = this.questionDrafts.map(item =>
        item.id === this.editingQuestionId
          ? { ...question, orderNumber: item.orderNumber }
          : item
      );

      this.questionDrafts = this.questionDrafts.map((item, index) => ({
        ...item,
        orderNumber: index + 1
      }));

      this.successMessage = 'Sual yeniləndi.';
    } else {
      this.questionDrafts = [
        ...this.questionDrafts,
        {
          ...question,
          orderNumber: this.questionDrafts.length + 1
        }
      ];

      this.successMessage = 'Sual əlavə edildi və təsdiqləndi.';
    }

    this.refreshView(); // YENI
    this.closeQuestionModal();
  }

  removeQuestion(questionId: number): void {
    this.questionDrafts = this.questionDrafts
      .filter(item => item.id !== questionId)
      .map((item, index) => ({ ...item, orderNumber: index + 1 }));

    this.successMessage = 'Sual silindi.';
    this.refreshView(); // YENI
  }

  moveQuestionUp(index: number): void {
    if (index <= 0) {
      return;
    }

    const items = [...this.questionDrafts];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    this.questionDrafts = items.map((item, idx) => ({ ...item, orderNumber: idx + 1 }));
    this.refreshView(); // YENI
  }

  moveQuestionDown(index: number): void {
    if (index >= this.questionDrafts.length - 1) {
      return;
    }

    const items = [...this.questionDrafts];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    this.questionDrafts = items.map((item, idx) => ({ ...item, orderNumber: idx + 1 }));
    this.refreshView(); // YENI
  }

  get currentClosedDraftCount(): number {
    return this.questionDrafts.filter(item => !this.isOpenQuestion(item)).length;
  }

  get currentOpenDraftCount(): number {
    return this.questionDrafts.filter(item => this.isOpenQuestion(item)).length;
  }

  get isQuestionPlanCompatible(): boolean {
    const total = this.toNonNegativeInt(this.examForm.totalQuestionCount);
    const open = this.toNonNegativeInt(this.examForm.openQuestionCount);
    const closed = this.toNonNegativeInt(this.examForm.closedQuestionCount);

    return (
      this.questionDrafts.length === total &&
      this.currentOpenDraftCount === open &&
      this.currentClosedDraftCount === closed
    );
  }

  get totalDraftScore(): number {
    return this.questionDrafts.reduce((sum, item) => sum + Number(item.points || 0), 0);
  }

  finalizeExam(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    if (!this.isQuestionPlanCompatible) {
      const total = this.toNonNegativeInt(this.examForm.totalQuestionCount);
      const open = this.toNonNegativeInt(this.examForm.openQuestionCount);
      const closed = this.toNonNegativeInt(this.examForm.closedQuestionCount);

      this.errorMessage =
        `Sual planı uyğun deyil. Ümumi plan: ${total}, açıq plan: ${open}, qapalı plan: ${closed}, hazır sual: ${this.questionDrafts.length}.`;
      this.refreshView(); // YENI
      return;
    }

    if (this.totalDraftScore > Number(this.examForm.totalScore ?? 0)) {
      this.errorMessage =
        'Sualların ümumi balı exam üçün verilən ümumi qiymətləndirmədən çox ola bilməz.';
      this.refreshView(); // YENI
      return;
    }

    this.syncExamDateToRange();

    const payload: ExamBaseForm = {
      title: this.examForm.title.trim(),
      classId: this.examForm.classId,
      subjectId: this.examForm.subjectId,
      teacherId: this.examForm.teacherId,
      startTime: this.examForm.startTime,
      endTime: this.examForm.endTime,
      durationMinutes: Number(this.examForm.durationMinutes ?? 0),
      totalScore: Number(this.examForm.totalScore ?? 0),
      closedQuestionScore: Number(this.examForm.closedQuestionScore ?? 0),
      description: this.examForm.description.trim(),
      instructions: this.examForm.instructions.trim(),
      isPublished: this.examForm.status !== 'Draft'
    };

    this.isSaving = true;
    this.refreshView(); // YENI

    this.examService.createExam({
      title: payload.title,
      subjectId: payload.subjectId as number,
      teacherId: payload.teacherId as number,
      classRoomId: payload.classId,
      startTime: payload.startTime,
      endTime: payload.endTime,
      durationMinutes: payload.durationMinutes as number,
      description: payload.description,
      totalScore: payload.totalScore,
      closedQuestionScore: payload.closedQuestionScore,
      instructions: payload.instructions,
      isPublished: payload.isPublished,
      questions: this.questionDrafts.map((question, index) => ({
        questionText: question.questionText.trim(),
        type: question.type,
        points: Number(question.points),
        orderNumber: index + 1,
        description: question.description?.trim() || '',
        selectionMode: this.isOpenQuestion(question) ? null : (question.selectionMode ?? 'single'),
        options: (question.options ?? []).map((option, optionIndex) => ({
          optionText: option.optionText.trim(),
          isCorrect: !!option.isCorrect,
          optionKey: option.optionKey?.trim() || this.getOptionLabel(optionIndex),
          orderNumber: optionIndex + 1
        }))
      }))
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'İmtahan uğurla yaradıldı.';
        this.refreshView(); // YENI
        this.refreshList();
        this.closeDrawer();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving = false;
        this.errorMessage = this.extractErrorMessage(error, 'İmtahan yaradılmadı.');
        this.refreshView(); // YENI
      }
    });
  }

  deleteExam(examId: number): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    this.examService.deleteExam(examId).subscribe({
      next: () => {
        this.successMessage = 'İmtahan silindi.';
        this.refreshView(); // YENI
        this.refreshList();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'İmtahan silinmədi.');
        this.refreshView(); // YENI
      }
    });
  }

  cycleStatus(exam: ExamListItem): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    if (exam.isPublished) {
      this.successMessage = 'Bu imtahan artıq yayımlanıb. Status backenddə tarixə görə avtomatik hesablanır.';
      this.refreshView(); // YENI
      return;
    }

    this.examService.publishExam(exam.id).subscribe({
      next: () => {
        this.successMessage = 'İmtahan yayımlandı.';
        this.refreshView(); // YENI
        this.refreshList();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'Status dəyişdirilmədi.');
        this.refreshView(); // YENI
      }
    });
  }

  getStatusClass(status: string): string {
    return (status ?? '').toLowerCase();
  }

  getStatusLabel(status: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'draft':
        return 'Qaralama';
      case 'published':
        return 'Yayımlanıb';
      case 'active':
        return 'Aktiv';
      case 'completed':
        return 'Tamamlanıb';
      case 'cancelled':
        return 'Ləğv edilib';
      default:
        return status || '-';
    }
  }

  getExamDate(exam: ExamListItem): string {
    return exam.startTime;
  }

  getQuestionDisplayType(question: ExamQuestionDraft): string {
    return this.isOpenQuestion(question) ? 'Açıq' : 'Qapalı';
  }

  isOpenQuestion(question: ExamQuestionDraft): boolean {
    return question.type === 'OpenText';
  }

  isClosedQuestion(question: ExamQuestionDraft): boolean {
    return !this.isOpenQuestion(question);
  }

  getTeacherAvatar(_: ExamListItem): string {
    return 'https://ui-avatars.com/api/?background=EEF2FF&color=3730A3&name=Teacher';
  }

  getTeacherDisplay(teacher: ExamTeacherOption): string {
    return teacher.fullName;
  }

  getClassDisplay(classItem: ExamClassOption): string {
    return classItem.name;
  }

  getSubjectDisplay(subject: ExamSubjectOption): string {
    return subject.name;
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  trackByExamId(_: number, item: ExamListItem): number {
    return item.id;
  }

  trackByQuestionId(_: number, item: ExamQuestionDraft): number {
    return item.id;
  }

  trackByTeacherId(_: number, item: ExamTeacherOption): number {
    return item.id;
  }

  private syncExamDateToRange(): void {
    if (!this.examForm.examDate) {
      this.examForm = {
        ...this.examForm,
        startTime: '',
        endTime: ''
      };
      this.refreshView(); // YENI
      return;
    }

    const start = new Date(this.examForm.examDate);
    const duration = Number(this.examForm.durationMinutes ?? 0);

    if (Number.isNaN(start.getTime()) || duration <= 0) {
      this.examForm = {
        ...this.examForm,
        startTime: '',
        endTime: ''
      };
      this.refreshView(); // YENI
      return;
    }

    const end = new Date(start.getTime() + duration * 60000);
    this.examForm = {
      ...this.examForm,
      startTime: this.toLocalDateTimeInputValue(start),
      endTime: this.toLocalDateTimeInputValue(end)
    };
    this.refreshView(); // YENI
  }

  private toLocalDateTimeInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private toNonNegativeInt(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.trunc(parsed));
  }

  private toPositiveInt(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return parsed > 0 ? Math.trunc(parsed) : 0;
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const payload = error?.error;

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload?.message) {
      return payload.message;
    }

    if (payload?.title) {
      return payload.title;
    }

    if (payload?.errors && typeof payload.errors === 'object') {
      const messages = Object.values(payload.errors)
        .flat()
        .filter(Boolean)
        .join(' | ');

      if (messages) {
        return messages;
      }
    }

    return fallback;
  }
}