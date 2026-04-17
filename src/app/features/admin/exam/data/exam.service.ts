import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CreateExamRequest,
  ExamClassOption,
  ExamDetail,
  ExamFilter,
  ExamListItem,
  ExamQuestionDraft,
  ExamStats,
  ExamStatus,
  ExamSubjectOption,
  ExamTeacherOption,
  QuestionType,
  UpdateExamRequest
} from '../../../../core/models/exam/exam.model';

interface BackendExamClassOptionDto {
  id: number;
  name: string;
}

interface BackendExamSubjectOptionDto {
  id: number;
  name: string;
}

interface BackendExamTeacherOptionDto {
  id: number;
  fullName: string;
}

interface BackendExamOptionDto {
  id: number;
  optionText: string;
  isCorrect: boolean;
  optionKey?: string | null;
  orderNumber: number;
}

interface BackendExamQuestionDto {
  id: number;
  questionText: string;
  type: string;
  points: number;
  orderNumber: number;
  description?: string | null;
  selectionMode?: string | null;
  options: BackendExamOptionDto[];
}

interface BackendExamListItemDto {
  id: number;
  title: string;
  className?: string | null;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  status: string;
  totalQuestionCount: number;
  isPublished: boolean;
}

interface BackendExamDetailDto {
  id: number;
  title: string;
  subjectId: number;
  teacherId: number;
  classRoomId?: number | null;
  className?: string | null;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  description?: string | null;
  totalScore: number | string;
  closedQuestionScore: number | string;
  totalQuestionCount: number;
  openQuestionCount: number;
  closedQuestionCount: number;
  instructions?: string | null;
  status: string;
  isPublished: boolean;
  questions: BackendExamQuestionDto[];
}

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Exam`;

  getClasses(): Observable<ExamClassOption[]> {
    return this.http
      .get<BackendExamClassOptionDto[]>(`${this.baseUrl}/class-options`)
      .pipe(map(items => items.map(item => this.mapClassOption(item))));
  }

  getSubjects(): Observable<ExamSubjectOption[]> {
    return this.http
      .get<BackendExamSubjectOptionDto[]>(`${this.baseUrl}/subject-options`)
      .pipe(map(items => items.map(item => this.mapSubjectOption(item))));
  }

  getTeachers(): Observable<ExamTeacherOption[]> {
    return this.http
      .get<BackendExamTeacherOptionDto[]>(`${this.baseUrl}/teacher-options`)
      .pipe(map(items => items.map(item => this.mapTeacherOption(item))));
  }

  getExams(filter?: ExamFilter): Observable<ExamListItem[]> {
    return this.http.get<BackendExamListItemDto[]>(this.baseUrl).pipe(
      map(items => {
        let result = items.map(item => this.mapExamListItem(item));

        if (!filter) {
          return result;
        }

        const term = filter.search?.trim().toLowerCase();
        if (term) {
          result = result.filter(item =>
            `${item.title} ${item.className} ${item.subjectName} ${item.teacherName} ${item.status}`
              .toLowerCase()
              .includes(term)
          );
        }

        if (filter.classId !== null) {
          result = result.filter(item => item.classId === filter.classId);
        }

        if (filter.subjectId !== null) {
          result = result.filter(item => item.subjectId === filter.subjectId);
        }

        if (filter.teacherId !== null) {
          result = result.filter(item => item.teacherId === filter.teacherId);
        }

        if (filter.status) {
          result = result.filter(item => item.status === filter.status);
        }

        return result;
      })
    );
  }

  getExamById(id: number): Observable<ExamDetail> {
    return this.http
      .get<BackendExamDetailDto>(`${this.baseUrl}/${id}`)
      .pipe(map(detail => this.mapExamDetail(detail)));
  }

  createExam(payload: CreateExamRequest): Observable<ExamDetail> {
    return this.http
      .post<BackendExamDetailDto>(this.baseUrl, payload)
      .pipe(map(detail => this.mapExamDetail(detail)));
  }

  updateExam(id: number, payload: UpdateExamRequest): Observable<ExamDetail> {
    return this.http
      .put<BackendExamDetailDto>(`${this.baseUrl}/${id}`, payload)
      .pipe(map(detail => this.mapExamDetail(detail)));
  }

  publishExam(id: number): Observable<{ message?: string }> {
    return this.http.patch<{ message?: string }>(`${this.baseUrl}/${id}/publish`, {});
  }

  deleteExam(id: number): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.baseUrl}/${id}`);
  }

  getStats(exams: ExamListItem[]): ExamStats {
    return {
      totalExams: exams.length,
      plannedExams: exams.filter(x => x.status === 'Draft' || x.status === 'Published').length,
      activeExams: exams.filter(x => x.status === 'Active').length,
      completedExams: exams.filter(x => x.status === 'Completed').length,
      totalQuestions: exams.reduce((sum, exam) => sum + Number(exam.totalQuestionCount || 0), 0)
    };
  }

  private mapClassOption(item: BackendExamClassOptionDto): ExamClassOption {
    return {
      id: item.id,
      name: item.name ?? ''
    };
  }

  private mapSubjectOption(item: BackendExamSubjectOptionDto): ExamSubjectOption {
    return {
      id: item.id,
      name: item.name ?? ''
    };
  }

  private mapTeacherOption(item: BackendExamTeacherOptionDto): ExamTeacherOption {
    return {
      id: item.id,
      fullName: item.fullName ?? ''
    };
  }

  private mapExamListItem(item: BackendExamListItemDto): ExamListItem {
    return {
      id: item.id,
      title: item.title ?? '',
      classId: null,
      className: item.className ?? 'Təyin edilməyib',
      subjectId: undefined,
      subjectName: item.subjectName ?? '',
      teacherId: undefined,
      teacherName: item.teacherName ?? '',
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      durationMinutes: this.calculateDuration(item.startTime, item.endTime),
      status: this.mapExamStatus(item.status),
      totalQuestionCount: this.toNumber(item.totalQuestionCount),
      openQuestionCount: 0,
      closedQuestionCount: 0,
      totalScore: 0,
      closedQuestionScore: 0,
      description: '',
      instructions: '',
      isPublished: !!item.isPublished,
      questions: []
    };
  }

  private mapExamDetail(detail: BackendExamDetailDto): ExamDetail {
    return {
      id: detail.id,
      title: detail.title ?? '',
      classId: detail.classRoomId ?? null,
      className: detail.className ?? 'Təyin edilməyib',
      subjectId: detail.subjectId,
      subjectName: detail.subjectName ?? '',
      teacherId: detail.teacherId,
      teacherName: detail.teacherName ?? '',
      startTime: detail.startTime ?? '',
      endTime: detail.endTime ?? '',
      durationMinutes: this.toNumber(detail.durationMinutes),
      status: this.mapExamStatus(detail.status),
      totalQuestionCount: this.toNumber(detail.totalQuestionCount),
      openQuestionCount: this.toNumber(detail.openQuestionCount),
      closedQuestionCount: this.toNumber(detail.closedQuestionCount),
      totalScore: this.toNumber(detail.totalScore),
      closedQuestionScore: this.toNumber(detail.closedQuestionScore),
      description: detail.description ?? '',
      instructions: detail.instructions ?? '',
      isPublished: !!detail.isPublished,
      questions: (detail.questions ?? []).map(question => this.mapQuestion(question))
    };
  }

  private mapQuestion(question: BackendExamQuestionDto): ExamQuestionDraft {
    return {
      id: question.id,
      questionText: question.questionText ?? '',
      type: this.mapQuestionType(question.type),
      points: this.toNumber(question.points),
      orderNumber: this.toNumber(question.orderNumber),
      description: question.description ?? '',
      selectionMode: this.mapSelectionMode(question.selectionMode),
      options: (question.options ?? []).map(option => ({
        id: option.id,
        optionText: option.optionText ?? '',
        isCorrect: !!option.isCorrect,
        optionKey: option.optionKey ?? '',
        orderNumber: this.toNumber(option.orderNumber)
      }))
    };
  }

  private mapExamStatus(status: string | null | undefined): ExamStatus {
    const normalized = (status ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'draft':
        return 'Draft';
      case 'published':
        return 'Published';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Draft';
    }
  }

  private mapQuestionType(type: string | null | undefined): QuestionType {
    const normalized = (type ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'singlechoice':
      case 'single':
        return 'SingleChoice';
      case 'multiplechoice':
      case 'multiple':
        return 'MultipleChoice';
      case 'opentext':
      case 'open':
        return 'OpenText';
      default:
        return 'OpenText';
    }
  }

  private mapSelectionMode(
    selectionMode: string | null | undefined
  ): 'single' | 'multiple' | undefined {
    const normalized = (selectionMode ?? '').trim().toLowerCase();

    if (normalized === 'single') {
      return 'single';
    }

    if (normalized === 'multiple') {
      return 'multiple';
    }

    return undefined;
  }

  private calculateDuration(startTime?: string, endTime?: string): number {
    if (!startTime || !endTime) {
      return 0;
    }

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return 0;
    }

    return Math.round((end - start) / 60000);
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim();
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }
}