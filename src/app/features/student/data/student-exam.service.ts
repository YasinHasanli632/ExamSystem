import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  LogStudentExamSecurityPayload,
  SaveStudentAnswerPayload,
  StartStudentExamPayload,
  StudentAnswerModel,
  StudentExamDetailModel,
  StudentExamListItemModel,
  StudentExamQuestionModel,
  StudentExamQuestionOptionModel,
  StudentExamSessionModel,
  StudentExamSubmitResultModel,
  SubmitStudentExamPayload,
  VerifyStudentExamAccessCodePayload
} from '../../../core/models/students/student-exam.model';

interface BackendStudentExamSummaryDto {
  studentExamId: number;
  examId: number;
  examTitle: string;
  subjectName: string;
  teacherName?: string;
  score: number;
  maxScore: number;
  isCompleted: boolean;
  startTime: string;
  endTime?: string | null;
  examType?: string;
  note?: string | null;
  status: string;
  examStartTime: string;
  examEndTime: string;
  durationMinutes: number;
  isAccessCodeReady: boolean;
  canEnter: boolean;
  canStart: boolean;
  isMissed: boolean;
  accessCode?: string | null;

  // YENI
  accessCodeActivationMinutes?: number;

  // YENI
  lateEntryToleranceMinutes?: number;
}

interface BackendStudentExamDetailDto {
  examId: number;
  studentExamId?: number | null;
  examTitle: string;
  subjectName: string;
  teacherName?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  instructions?: string;
  status: string;
  isAccessCodeReady: boolean;
  canVerifyCode: boolean;
  canStart: boolean;
  isCompleted: boolean;
  accessCode?: string | null;

  // YENI
  isMissed?: boolean;

  // YENI
  accessCodeActivationMinutes?: number;

  // YENI
  lateEntryToleranceMinutes?: number;

  // YENI
  score?: number;

  // YENI
  publishedScore?: number | null;

  // YENI
  requiresManualReview?: boolean;

  // YENI
  canShowScoreImmediately?: boolean;

  // YENI
  isResultAutoPublished?: boolean;

  // YENI
  hasOpenQuestions?: boolean;

  // YENI
  resultMessage?: string;
}

interface BackendStudentAnswerDto {
  studentAnswerId: number;
  studentExamId: number;
  examQuestionId: number;
  selectedOptionId?: number | null;
  answerText?: string | null;
  pointsAwarded: number;
  isReviewed: boolean;
  isCorrect?: boolean | null;
  teacherFeedback?: string | null;
  selectedOptionIds?: number[] | null;
}

interface BackendStudentExamQuestionOptionDto {
  id: number;
  optionText: string;
  optionKey?: string | null;
  orderNumber: number;
}

interface BackendStudentExamQuestionDto {
  id: number;
  orderNumber: number;
  questionText: string;
  type: string;
  points: number;
  description?: string | null;
  options?: BackendStudentExamQuestionOptionDto[] | null;
  existingAnswer?: BackendStudentAnswerDto | null;
}

interface BackendStudentExamSessionDto {
  studentExamId: number;
  examId: number;
  examTitle: string;
  subjectName: string;
  startTime: string;
  endTime?: string | null;
  isCompleted: boolean;
  score: number;
  isReviewed: boolean;
  submittedAt?: string | null;
  durationMinutes: number;
  instructions?: string;
  status: string;
  totalScore: number;
  warningCount: number;
  tabSwitchCount: number;
  fullScreenExitCount: number;
  questions?: BackendStudentExamQuestionDto[] | null;
}

interface BackendStudentExamSubmitResultDto {
  studentExamId: number;
  examId: number;
  startTime: string;
  endTime: string;
  isCompleted: boolean;
  score: number;
  message: string;
  autoGradedScore: number;
  manualGradedScore: number;
  requiresManualReview: boolean;

  // YENI
  hasOpenQuestions?: boolean;

  // YENI
  isResultAutoPublished?: boolean;

  // YENI
  canShowScoreImmediately?: boolean;

  // YENI
  canShowCorrectAnswers?: boolean;

  // YENI
  publishedScore?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class StudentExamService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/StudentExam`;

  getMyExams(): Observable<StudentExamListItemModel[]> {
    return this.http
      .get<BackendStudentExamSummaryDto[]>(`${this.apiUrl}/my`)
      .pipe(map(items => (items ?? []).map(item => this.mapListItem(item))));
  }

  getMyExamDetail(examId: number): Observable<StudentExamDetailModel> {
    return this.http
      .get<BackendStudentExamDetailDto>(`${this.apiUrl}/${examId}`)
      .pipe(map(item => this.mapDetail(item)));
  }

  verifyAccessCode(
    payload: VerifyStudentExamAccessCodePayload
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/verify-access-code`,
      payload
    );
  }

  startExam(payload: StartStudentExamPayload): Observable<StudentExamSessionModel> {
    return this.http
      .post<BackendStudentExamSessionDto>(`${this.apiUrl}/start`, payload)
      .pipe(map(item => this.mapSession(item)));
  }

  saveAnswer(payload: SaveStudentAnswerPayload): Observable<StudentAnswerModel> {
    return this.http
      .post<BackendStudentAnswerDto>(`${this.apiUrl}/save-answer`, payload)
      .pipe(map(item => this.mapAnswer(item)));
  }

  submitExam(payload: SubmitStudentExamPayload): Observable<StudentExamSubmitResultModel> {
    return this.http
      .post<BackendStudentExamSubmitResultDto>(`${this.apiUrl}/submit`, payload)
      .pipe(map(item => this.mapSubmitResult(item)));
  }

  logSecurityEvent(payload: LogStudentExamSecurityPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/security-log`,
      payload
    );
  }

  private mapListItem(item: BackendStudentExamSummaryDto): StudentExamListItemModel {
    return {
      studentExamId: this.toNumber(item?.studentExamId),
      examId: this.toNumber(item?.examId),
      examTitle: item?.examTitle?.trim() || 'Adsız imtahan',
      subjectName: item?.subjectName?.trim() || '',
      teacherName: item?.teacherName?.trim() || '',
      score: this.toNumber(item?.score),
      maxScore: this.toNumber(item?.maxScore),
      isCompleted: !!item?.isCompleted,
      startTime: item?.startTime || '',
      endTime: item?.endTime || null,
      examType: item?.examType?.trim() || '',
      note: item?.note?.trim() || null,
      status: item?.status?.trim() || 'Pending',
      examStartTime: item?.examStartTime || '',
      examEndTime: item?.examEndTime || '',
      durationMinutes: this.toNumber(item?.durationMinutes),
      isAccessCodeReady: !!item?.isAccessCodeReady,
      canEnter: !!item?.canEnter,
      canStart: !!item?.canStart,
      isMissed: !!item?.isMissed,
      accessCode: item?.accessCode?.trim() || null,

      // YENI
      accessCodeActivationMinutes: this.toNumber(item?.accessCodeActivationMinutes),

      // YENI
      lateEntryToleranceMinutes: this.toNumber(item?.lateEntryToleranceMinutes)
    };
  }

  private mapDetail(item: BackendStudentExamDetailDto): StudentExamDetailModel {
    return {
      examId: this.toNumber(item?.examId),
      studentExamId: this.toNullableNumber(item?.studentExamId),
      examTitle: item?.examTitle?.trim() || 'Adsız imtahan',
      subjectName: item?.subjectName?.trim() || '',
      teacherName: item?.teacherName?.trim() || '',
      startTime: item?.startTime || '',
      endTime: item?.endTime || '',
      durationMinutes: this.toNumber(item?.durationMinutes),
      instructions: item?.instructions?.trim() || '',
      status: item?.status?.trim() || 'Pending',
      isAccessCodeReady: !!item?.isAccessCodeReady,
      canVerifyCode: !!item?.canVerifyCode,
      canStart: !!item?.canStart,
      isCompleted: !!item?.isCompleted,
      accessCode: item?.accessCode?.trim() || null,

      // YENI
      isMissed: !!item?.isMissed,
      accessCodeActivationMinutes: this.toNumber(item?.accessCodeActivationMinutes),
      lateEntryToleranceMinutes: this.toNumber(item?.lateEntryToleranceMinutes),
      score: this.toNumber(item?.score),
      publishedScore:
        typeof item?.publishedScore === 'number' ? this.toNumber(item.publishedScore) : null,
      requiresManualReview: !!item?.requiresManualReview,
      canShowScoreImmediately: !!item?.canShowScoreImmediately,
      isResultAutoPublished: !!item?.isResultAutoPublished,
      hasOpenQuestions: !!item?.hasOpenQuestions,
      resultMessage: item?.resultMessage?.trim() || ''
    };
  }

  private mapSession(item: BackendStudentExamSessionDto): StudentExamSessionModel {
    return {
      studentExamId: this.toNumber(item?.studentExamId),
      examId: this.toNumber(item?.examId),
      examTitle: item?.examTitle?.trim() || 'Adsız imtahan',
      subjectName: item?.subjectName?.trim() || '',
      startTime: item?.startTime || '',
      endTime: item?.endTime || null,
      isCompleted: !!item?.isCompleted,
      score: this.toNumber(item?.score),
      isReviewed: !!item?.isReviewed,
      submittedAt: item?.submittedAt || null,
      durationMinutes: this.toNumber(item?.durationMinutes),
      instructions: item?.instructions?.trim() || '',
      status: item?.status?.trim() || 'Pending',
      totalScore: this.toNumber(item?.totalScore),
      warningCount: this.toNumber(item?.warningCount),
      tabSwitchCount: this.toNumber(item?.tabSwitchCount),
      fullScreenExitCount: this.toNumber(item?.fullScreenExitCount),
      questions: (item?.questions ?? []).map(question => this.mapQuestion(question))
    };
  }

  private mapQuestion(item: BackendStudentExamQuestionDto): StudentExamQuestionModel {
    return {
      id: this.toNumber(item?.id),
      orderNumber: this.toNumber(item?.orderNumber),
      questionText: item?.questionText?.trim() || '',
      type: item?.type?.trim() || 'SingleChoice',
      points: this.toNumber(item?.points),
      description: item?.description?.trim() || null,
      options: (item?.options ?? []).map(option => this.mapQuestionOption(option)),
      existingAnswer: item?.existingAnswer ? this.mapAnswer(item.existingAnswer) : null
    };
  }

  private mapQuestionOption(
    item: BackendStudentExamQuestionOptionDto
  ): StudentExamQuestionOptionModel {
    return {
      id: this.toNumber(item?.id),
      optionText: item?.optionText?.trim() || '',
      optionKey: item?.optionKey?.trim() || null,
      orderNumber: this.toNumber(item?.orderNumber)
    };
  }

  private mapAnswer(item: BackendStudentAnswerDto): StudentAnswerModel {
    return {
      studentAnswerId: this.toNumber(item?.studentAnswerId),
      studentExamId: this.toNumber(item?.studentExamId),
      examQuestionId: this.toNumber(item?.examQuestionId),
      selectedOptionId: this.toNullableNumber(item?.selectedOptionId),
      answerText: item?.answerText?.trim() || null,
      pointsAwarded: this.toNumber(item?.pointsAwarded),
      isReviewed: !!item?.isReviewed,
      isCorrect: typeof item?.isCorrect === 'boolean' ? item.isCorrect : null,
      teacherFeedback: item?.teacherFeedback?.trim() || null,
      selectedOptionIds: Array.isArray(item?.selectedOptionIds)
        ? item.selectedOptionIds.map(value => this.toNumber(value)).filter(value => value > 0)
        : []
    };
  }

  private mapSubmitResult(
    item: BackendStudentExamSubmitResultDto
  ): StudentExamSubmitResultModel {
    return {
      studentExamId: this.toNumber(item?.studentExamId),
      examId: this.toNumber(item?.examId),
      startTime: item?.startTime || '',
      endTime: item?.endTime || '',
      isCompleted: !!item?.isCompleted,
      score: this.toNumber(item?.score),
      message: item?.message?.trim() || '',
      autoGradedScore: this.toNumber(item?.autoGradedScore),
      manualGradedScore: this.toNumber(item?.manualGradedScore),
      requiresManualReview: !!item?.requiresManualReview,

      // YENI
      hasOpenQuestions: !!item?.hasOpenQuestions,
      isResultAutoPublished: !!item?.isResultAutoPublished,
      canShowScoreImmediately: !!item?.canShowScoreImmediately,
      canShowCorrectAnswers: !!item?.canShowCorrectAnswers,
      publishedScore:
        typeof item?.publishedScore === 'number' ? this.toNumber(item.publishedScore) : null
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNullableNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}