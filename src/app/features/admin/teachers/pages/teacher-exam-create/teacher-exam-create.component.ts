import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ClosedQuestionSelectionMode,
  CreateExamRequest,
  ExamQuestionDraft,
  ExamQuestionOption,
  ExamSubjectOption,
  QuestionType
} from '../../../../../core/models/exam/exam.model';
import { Teacher } from '../../../../../core/models/teacher/teacher.model';
import { ExamService } from '../../../../admin/exam/data/exam.service';
import { TeacherPanelService } from '../../data/teacher-panel.service';

type QuestionModalType = 'Closed' | 'Open';

interface TeacherClassOptionVm {
  id: number;
  name: string;
  subjectNames: string[];
}

interface TeacherSubjectOptionVm extends ExamSubjectOption {
  normalizedName: string;
}

interface UiExamForm {
  title: string;
  classId: number | null;
  subjectId: number | null;
  teacherId: number | null;
  examDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  totalQuestionCount: number | null;
  openQuestionCount: number | null;
  closedQuestionCount: number | null;
  totalScore: number | null;
  closedQuestionScore: number | null;
  description: string;
  instructions: string;
  isPublished: boolean;
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
  selector: 'app-teacher-exam-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-exam-create.component.html',
  styleUrls: ['./teacher-exam-create.component.css']
})
export class TeacherExamCreateComponent implements OnInit {
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly examService = inject(ExamService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly Math = Math;

  teacherProfile: Teacher | null = null;
  teacherId: number | null = null;
  teacherFullName = '';
  teacherSubjectNames: string[] = [];
  teacherSubjectNamesNormalized: string[] = [];

  classes: TeacherClassOptionVm[] = [];
  subjects: TeacherSubjectOptionVm[] = [];
  filteredSubjects: TeacherSubjectOptionVm[] = [];

  currentStep: 1 | 2 = 1;

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

  ngOnInit(): void {
    this.loadInitialData();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView();

    forkJoin({
      profile: this.teacherPanelService.getMyProfile(),
      myClassRooms: this.teacherPanelService.getMyClassRooms(),
      subjectOptions: this.examService.getSubjects()
    }).subscribe({
      next: ({ profile, myClassRooms, subjectOptions }) => {
        this.teacherProfile = profile ? { ...profile } : null;
        this.teacherId = this.toNumberOrNull(profile?.id);
        this.teacherFullName =
          profile?.fullName?.trim() ||
          `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
          'Müəllim';

        this.teacherSubjectNames = [...this.extractTeacherSubjectNames(profile)];
        this.teacherSubjectNamesNormalized = this.teacherSubjectNames.map((x) => this.normalizeText(x));

        this.classes = [...this.mapTeacherClassRooms(myClassRooms)];
        this.subjects = (subjectOptions ?? []).map((item) => ({
          ...item,
          normalizedName: this.normalizeText(item.name)
        }));

        this.examForm.teacherId = this.teacherId;
        this.filteredSubjects = [...this.getFilteredSubjects()];

        this.isLoading = false;
        this.refreshView();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(error, 'Məlumatlar yüklənmədi.');
        this.refreshView();
      }
    });
  }

  private createEmptyExamForm(): UiExamForm {
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
      isPublished: false
    };
  }

  private createEmptyQuestionModalForm(): QuestionModalForm {
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

  private extractTeacherSubjectNames(profile: any): string[] {
    const rawSubjects = Array.isArray(profile?.subjects) ? profile.subjects : [];

    return rawSubjects
      .map((item: any) => {
        if (typeof item === 'string') {
          return item.trim();
        }

        return (
          item?.subjectName ??
          item?.name ??
          item?.title ??
          ''
        ).trim();
      })
      .filter(Boolean);
  }

  private mapTeacherClassRooms(items: any[]): TeacherClassOptionVm[] {
    const list = Array.isArray(items) ? items : [];
    const map = new Map<number, TeacherClassOptionVm>();

    for (const item of list) {
      const id =
        this.toNumberOrNull(item?.classRoomId) ??
        this.toNumberOrNull(item?.id) ??
        this.toNumberOrNull(item?.classId);

      if (!id) {
        continue;
      }

      const name =
        item?.classRoomName ??
        item?.name ??
        item?.className ??
        `Sinif ${id}`;

      const subjectName =
        item?.subjectName ??
        item?.subject?.name ??
        item?.subjectTitle ??
        '';

      if (!map.has(id)) {
        map.set(id, {
          id,
          name,
          subjectNames: []
        });
      }

      const current = map.get(id)!;

      if (subjectName && !current.subjectNames.includes(subjectName)) {
        current.subjectNames.push(subjectName);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  onExamClassOrSubjectChange(): void {
    this.filteredSubjects = [...this.getFilteredSubjects()];

    if (
      this.examForm.subjectId !== null &&
      !this.filteredSubjects.some((subject) => subject.id === this.examForm.subjectId)
    ) {
      this.examForm.subjectId = null;
    }

    this.refreshView();
  }

  private getFilteredSubjects(): TeacherSubjectOptionVm[] {
    let allowedByTeacher = [...this.subjects];

    if (this.teacherSubjectNamesNormalized.length > 0) {
      allowedByTeacher = this.subjects.filter((subject) =>
        this.teacherSubjectNamesNormalized.includes(subject.normalizedName)
      );
    }

    const selectedClass = this.classes.find((x) => x.id === this.examForm.classId);

    if (!selectedClass || !selectedClass.subjectNames.length) {
      return allowedByTeacher;
    }

    const selectedClassSubjectNames = selectedClass.subjectNames.map((x) => this.normalizeText(x));

    const classFiltered = allowedByTeacher.filter((subject) =>
      selectedClassSubjectNames.includes(subject.normalizedName)
    );

    return classFiltered.length > 0 ? classFiltered : allowedByTeacher;
  }

  get selectedClassName(): string {
    return this.classes.find((x) => x.id === this.examForm.classId)?.name ?? '-';
  }

  get selectedSubjectName(): string {
    return this.filteredSubjects.find((x) => x.id === this.examForm.subjectId)?.name ??
      this.subjects.find((x) => x.id === this.examForm.subjectId)?.name ??
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
      open + closed === total &&
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

    const total = this.toNonNegativeInt(this.examForm.totalQuestionCount);
    const open = this.toNonNegativeInt(this.examForm.openQuestionCount);
    const closed = this.toNonNegativeInt(this.examForm.closedQuestionCount);

    if (!this.examForm.title.trim()) {
      this.errorMessage = 'İmtahan adını daxil et.';
      this.refreshView();
      return;
    }

    if (this.examForm.classId === null) {
      this.errorMessage = 'Sinif seçilməlidir.';
      this.refreshView();
      return;
    }

    if (this.examForm.subjectId === null) {
      this.errorMessage = 'Fənn seçilməlidir.';
      this.refreshView();
      return;
    }

    if (this.examForm.teacherId === null) {
      this.errorMessage = 'Müəllim məlumatı tapılmadı.';
      this.refreshView();
      return;
    }

    if (!this.examForm.examDate) {
      this.errorMessage = 'İmtahan vaxtını seç.';
      this.refreshView();
      return;
    }

    if (total <= 0) {
      this.errorMessage = 'Ümumi sual sayı 0-dan böyük olmalıdır.';
      this.refreshView();
      return;
    }

    if (open < 0 || closed < 0) {
      this.errorMessage = 'Açıq və qapalı sual sayı mənfi ola bilməz.';
      this.refreshView();
      return;
    }

    if (open + closed !== total) {
      this.errorMessage = `Açıq (${open}) + qapalı (${closed}) sual sayı ümumi sual sayına (${total}) bərabər olmalıdır.`;
      this.refreshView();
      return;
    }

    if (Number(this.examForm.totalScore ?? 0) <= 0 || Number(this.examForm.totalScore ?? 0) > 100) {
      this.errorMessage = 'Ümumi bal 1-100 aralığında olmalıdır.';
      this.refreshView();
      return;
    }

    if (this.toPositiveInt(this.examForm.durationMinutes) <= 0) {
      this.errorMessage = 'Müddət düzgün daxil edilməlidir.';
      this.refreshView();
      return;
    }

    if (!this.examForm.description.trim()) {
      this.errorMessage = 'Açıqlama sahəsini doldur.';
      this.refreshView();
      return;
    }

    this.examForm.totalQuestionCount = total;
    this.examForm.openQuestionCount = open;
    this.examForm.closedQuestionCount = closed;

    this.syncExamDateToRange();
    this.currentStep = 2;
    this.refreshView();
  }

  backToMetaStep(): void {
    this.currentStep = 1;
    this.refreshView();
  }

  openQuestionModal(type?: QuestionModalType): void {
    this.editingQuestionId = null;
    this.questionModalForm = this.createEmptyQuestionModalForm();

    if (type) {
      this.questionModalForm.type = type;
    }

    this.pendingOptionValue = '';
    this.isQuestionModalOpen = true;
    this.refreshView();
  }

  editQuestion(question: ExamQuestionDraft): void {
    const isOpen = this.isOpenQuestion(question);

    const options: UiQuestionOption[] = (question.options ?? []).map((option, index) => ({
      id: option.id ?? Date.now() + index,
      label: option.optionKey?.trim() || this.getOptionLabel(index),
      value: option.optionText
    }));

    const correctOptionIds = options
      .filter((_, index) => !!question.options?.[index]?.isCorrect)
      .map((option) => option.id);

    this.editingQuestionId = question.id;
    this.questionModalForm = {
      type: isOpen ? 'Open' : 'Closed',
      title: question.questionText,
      description: question.description ?? '',
      score: question.points,
      selectionMode: question.selectionMode === 'multiple' ? 'multiple' : 'single',
      options: [...options],
      correctOptionIds: [...correctOptionIds]
    };

    this.pendingOptionValue = '';
    this.isQuestionModalOpen = true;
    this.refreshView();
  }

  closeQuestionModal(): void {
    this.isQuestionModalOpen = false;
    this.questionModalForm = this.createEmptyQuestionModalForm();
    this.pendingOptionValue = '';
    this.editingQuestionId = null;
    this.refreshView();
  }

  addOption(): void {
    const value = this.pendingOptionValue.trim();

    if (!value) {
      return;
    }

    const nextIndex = this.questionModalForm.options.length;

    this.questionModalForm.options = [
      ...this.questionModalForm.options,
      {
        id: Date.now() + nextIndex,
        label: this.getOptionLabel(nextIndex),
        value
      }
    ];

    this.pendingOptionValue = '';
    this.refreshView();
  }

  removeOption(optionId: number): void {
    const updatedOptions = this.questionModalForm.options
      .filter((option) => option.id !== optionId)
      .map((option, index) => ({
        ...option,
        label: this.getOptionLabel(index)
      }));

    this.questionModalForm.options = [...updatedOptions];
    this.questionModalForm.correctOptionIds = this.questionModalForm.correctOptionIds.filter((id) =>
      updatedOptions.some((option) => option.id === id)
    );
    this.refreshView();
  }

  openCorrectAnswerModal(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.questionModalForm.type !== 'Closed') {
      return;
    }

    if (this.questionModalForm.options.length < 2) {
      this.errorMessage = 'Qapalı sual üçün ən azı 2 variant olmalıdır.';
      this.refreshView();
      return;
    }

    this.isCorrectAnswerModalOpen = true;
    this.refreshView();
  }

  closeCorrectAnswerModal(): void {
    this.isCorrectAnswerModalOpen = false;
    this.refreshView();
  }

  toggleCorrectOption(optionId: number): void {
    if (this.questionModalForm.selectionMode === 'single') {
      this.questionModalForm.correctOptionIds = [optionId];
      this.refreshView();
      return;
    }

    if (this.questionModalForm.correctOptionIds.includes(optionId)) {
      this.questionModalForm.correctOptionIds =
        this.questionModalForm.correctOptionIds.filter((id) => id !== optionId);
    } else {
      this.questionModalForm.correctOptionIds = [
        ...this.questionModalForm.correctOptionIds,
        optionId
      ];
    }

    this.refreshView();
  }

  confirmCorrectAnswers(): void {
    if (!this.questionModalForm.correctOptionIds.length) {
      this.errorMessage = 'Ən azı 1 düzgün cavab seçilməlidir.';
      this.refreshView();
      return;
    }

    this.errorMessage = '';
    this.isCorrectAnswerModalOpen = false;
    this.refreshView();
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

    if (!this.canSaveQuestion) {
      this.errorMessage =
        'Sual tam deyil. Bal düzgün olmalıdır. Qapalı sualda variantlar və düzgün cavab seçilməlidir.';
      this.refreshView();
      return;
    }

    const isClosed = this.questionModalForm.type === 'Closed';

    const type: QuestionType = isClosed
      ? this.questionModalForm.selectionMode === 'multiple'
        ? 'MultipleChoice'
        : 'SingleChoice'
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
      this.questionDrafts = this.questionDrafts.map((item) =>
        item.id === this.editingQuestionId
          ? { ...question, orderNumber: item.orderNumber }
          : item
      );

      this.questionDrafts = this.questionDrafts.map((item, index) => ({
        ...item,
        orderNumber: index + 1
      }));
    } else {
      this.questionDrafts = [
        ...this.questionDrafts,
        {
          ...question,
          orderNumber: this.questionDrafts.length + 1
        }
      ];
    }

    this.closeQuestionModal();
    this.refreshView();
  }

  removeQuestion(questionId: number): void {
    this.questionDrafts = this.questionDrafts
      .filter((item) => item.id !== questionId)
      .map((item, index) => ({
        ...item,
        orderNumber: index + 1
      }));

    this.refreshView();
  }

  moveQuestionUp(index: number): void {
    if (index <= 0) {
      return;
    }

    const items = [...this.questionDrafts];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];

    this.questionDrafts = items.map((item, idx) => ({
      ...item,
      orderNumber: idx + 1
    }));

    this.refreshView();
  }

  moveQuestionDown(index: number): void {
    if (index >= this.questionDrafts.length - 1) {
      return;
    }

    const items = [...this.questionDrafts];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];

    this.questionDrafts = items.map((item, idx) => ({
      ...item,
      orderNumber: idx + 1
    }));

    this.refreshView();
  }

  get currentOpenDraftCount(): number {
    return this.questionDrafts.filter((x) => this.isOpenQuestion(x)).length;
  }

  get currentClosedDraftCount(): number {
    return this.questionDrafts.filter((x) => !this.isOpenQuestion(x)).length;
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

  finalizeExam(isPublished = false): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.teacherId) {
      this.errorMessage = 'Müəllim identifikatoru tapılmadı.';
      this.refreshView();
      return;
    }

    if (this.examForm.classId === null || this.examForm.subjectId === null) {
      this.errorMessage = 'Sinif və fənn seçimi tamamlanmalıdır.';
      this.refreshView();
      return;
    }

    if (!this.isQuestionPlanCompatible) {
      this.errorMessage =
        `Sual planı uyğun deyil. Plan üzrə ${this.examForm.totalQuestionCount}, əlavə edilən ${this.questionDrafts.length}.`;
      this.refreshView();
      return;
    }

    if (this.totalDraftScore > Number(this.examForm.totalScore ?? 0)) {
      this.errorMessage = 'Sualların ümumi balı imtahanın ümumi balından çox ola bilməz.';
      this.refreshView();
      return;
    }

    this.syncExamDateToRange();

    const payload: CreateExamRequest = {
      title: this.examForm.title.trim(),
      subjectId: this.examForm.subjectId,
      teacherId: this.teacherId,
      classRoomId: this.examForm.classId,
      startTime: this.examForm.startTime,
      endTime: this.examForm.endTime,
      durationMinutes: Number(this.examForm.durationMinutes ?? 0),
      description: this.examForm.description.trim(),
      totalScore: Number(this.examForm.totalScore ?? 0),
      closedQuestionScore: Number(this.examForm.closedQuestionScore ?? 0),
      instructions: this.examForm.instructions.trim(),
      isPublished,
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
    };

    this.isSaving = true;
    this.refreshView();

    this.teacherPanelService.createExam(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = isPublished
          ? 'İmtahan yaradıldı və yayımlandı.'
          : 'İmtahan qaralama kimi yaradıldı.';
        this.refreshView();

        this.router.navigate(['/teacher/exams']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving = false;
        this.errorMessage = this.extractErrorMessage(error, 'İmtahan yaradılmadı.');
        this.refreshView();
      }
    });
  }

  isOpenQuestion(question: ExamQuestionDraft): boolean {
    return question.type === 'OpenText';
  }

  isClosedQuestion(question: ExamQuestionDraft): boolean {
    return !this.isOpenQuestion(question);
  }

  getQuestionDisplayType(question: ExamQuestionDraft): string {
    if (question.type === 'MultipleChoice') {
      return 'Qapalı sual (çox seçim)';
    }

    if (question.type === 'SingleChoice') {
      return 'Qapalı sual (tək seçim)';
    }

    return 'Açıq sual';
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getClassDisplay(item: TeacherClassOptionVm): string {
    return item.name;
  }

  getSubjectDisplay(item: TeacherSubjectOptionVm): string {
    return item.name;
  }

  goBack(): void {
    this.router.navigate(['/teacher/exams']);
  }

  private syncExamDateToRange(): void {
    if (!this.examForm.examDate) {
      this.examForm.startTime = '';
      this.examForm.endTime = '';
      this.refreshView();
      return;
    }

    const start = new Date(this.examForm.examDate);
    const duration = Number(this.examForm.durationMinutes ?? 0);

    if (Number.isNaN(start.getTime()) || duration <= 0) {
      this.examForm.startTime = '';
      this.examForm.endTime = '';
      this.refreshView();
      return;
    }

    const end = new Date(start.getTime() + duration * 60000);

    this.examForm.startTime = this.toLocalDateTimeInputValue(start);
    this.examForm.endTime = this.toLocalDateTimeInputValue(end);
    this.refreshView();
  }

  private toLocalDateTimeInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hour = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
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

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeText(value: string): string {
    return (value ?? '').trim().toLocaleLowerCase('az');
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
