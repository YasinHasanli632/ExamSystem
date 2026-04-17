import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  StudentTaskDetailModel,
  StudentTaskFilterStatus,
  StudentTaskModel,
  StudentTaskSummaryModel,
  SubmitStudentTaskRequest
} from '../../../core/models/students/task-status.model';

interface StudentTaskListApiDto {
  id: number;
  taskGroupKey: string;
  title: string;
  description?: string | null;
  subjectId?: number | null;
  subjectName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  classRoomId?: number | null;
  className?: string | null;
  assignedDate: string;
  dueDate: string;
  status?: string | null;
  isLate?: boolean;
  canSubmit?: boolean;
  isSubmitted?: boolean;
  isReviewed?: boolean;
  score?: number;
  maxScore?: number;
  submittedAt?: string | null;
}

interface StudentTaskDetailApiDto {
  id: number;
  taskGroupKey: string;
  title: string;
  description?: string | null;
  subjectId?: number | null;
  subjectName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  classRoomId?: number | null;
  className?: string | null;
  assignedDate: string;
  dueDate: string;
  status?: string | null;
  isLate?: boolean;
  canSubmit?: boolean;
  isSubmitted?: boolean;
  isReviewed?: boolean;
  score?: number;
  maxScore?: number;
  link?: string | null;
  note?: string | null;
  submissionText?: string | null;
  submissionLink?: string | null;
  submissionFileUrl?: string | null;
  submittedAt?: string | null;
  feedback?: string | null;
  checkedAt?: string | null;
}

interface StudentTaskSummaryApiDto {
  totalCount?: number;
  pendingCount?: number;
  submittedCount?: number;
  reviewedCount?: number;
  lateCount?: number;
  missingCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class StudentTaskService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/student/tasks`;

  getMyTasks(subjectId?: number | null): Observable<StudentTaskModel[]> {
    let params = new HttpParams();

    if (subjectId !== null && subjectId !== undefined) {
      params = params.set('subjectId', String(subjectId));
    }

    return this.http
      .get<StudentTaskListApiDto[]>(this.apiUrl, { params })
      .pipe(map((items) => (items ?? []).map((item) => this.mapTaskListItem(item))));
  }

  getMyTaskSummary(): Observable<StudentTaskSummaryModel> {
    return this.http
      .get<StudentTaskSummaryApiDto>(`${this.apiUrl}/summary`)
      .pipe(
        map((dto) => ({
          totalCount: Number(dto?.totalCount ?? 0),
          pendingCount: Number(dto?.pendingCount ?? 0),
          submittedCount: Number(dto?.submittedCount ?? 0),
          reviewedCount: Number(dto?.reviewedCount ?? 0),
          lateCount: Number(dto?.lateCount ?? 0),
          missingCount: Number(dto?.missingCount ?? 0)
        }))
      );
  }

  getMyTaskDetail(studentTaskId: number): Observable<StudentTaskDetailModel> {
    return this.http
      .get<StudentTaskDetailApiDto>(`${this.apiUrl}/${studentTaskId}`)
      .pipe(map((dto) => this.mapTaskDetail(dto)));
  }

  submitMyTask(
    studentTaskId: number,
    payload: SubmitStudentTaskRequest
  ): Observable<StudentTaskDetailModel> {
    return this.http
      .post<StudentTaskDetailApiDto>(`${this.apiUrl}/${studentTaskId}/submit`, payload)
      .pipe(map((dto) => this.mapTaskDetail(dto)));
  }

  private mapTaskListItem(item: StudentTaskListApiDto): StudentTaskModel {
    const normalized = this.normalizeStatus(item.status);

    return {
      id: Number(item.id ?? 0),
      taskGroupKey: item.taskGroupKey ?? '',
      title: item.title ?? '',
      description: item.description ?? null,
      subjectId:
        item.subjectId !== null && item.subjectId !== undefined
          ? Number(item.subjectId)
          : null,
      subjectName: (item.subjectName ?? '').trim() || 'Fənn təyin edilməyib',
      teacherId:
        item.teacherId !== null && item.teacherId !== undefined
          ? Number(item.teacherId)
          : null,
      teacherName: (item.teacherName ?? '').trim() || 'Müəllim təyin edilməyib',
      classRoomId:
        item.classRoomId !== null && item.classRoomId !== undefined
          ? Number(item.classRoomId)
          : null,
      className: item.className ?? '',
      assignedDate: item.assignedDate ?? '',
      dueDate: item.dueDate ?? '',
      status: normalized,
      isLate: !!item.isLate,
      canSubmit: !!item.canSubmit,
      isSubmitted: !!item.isSubmitted,
      isReviewed: !!item.isReviewed,
      score: Number(item.score ?? 0),
      maxScore: Number(item.maxScore ?? 0),
      submittedAt: item.submittedAt ?? null,
      statusLabel: this.getStatusLabel(normalized),
      statusKey: normalized,
      progressPercent: this.calculateProgressPercent(item.score, item.maxScore)
    };
  }

  private mapTaskDetail(item: StudentTaskDetailApiDto): StudentTaskDetailModel {
    const normalized = this.normalizeStatus(item.status);

    return {
      id: Number(item.id ?? 0),
      taskGroupKey: item.taskGroupKey ?? '',
      title: item.title ?? '',
      description: item.description ?? null,
      subjectId:
        item.subjectId !== null && item.subjectId !== undefined
          ? Number(item.subjectId)
          : null,
      subjectName: (item.subjectName ?? '').trim() || 'Fənn təyin edilməyib',
      teacherId:
        item.teacherId !== null && item.teacherId !== undefined
          ? Number(item.teacherId)
          : null,
      teacherName: (item.teacherName ?? '').trim() || 'Müəllim təyin edilməyib',
      classRoomId:
        item.classRoomId !== null && item.classRoomId !== undefined
          ? Number(item.classRoomId)
          : null,
      className: item.className ?? '',
      assignedDate: item.assignedDate ?? '',
      dueDate: item.dueDate ?? '',
      status: normalized,
      isLate: !!item.isLate,
      canSubmit: !!item.canSubmit,
      isSubmitted: !!item.isSubmitted,
      isReviewed: !!item.isReviewed,
      score: Number(item.score ?? 0),
      maxScore: Number(item.maxScore ?? 0),
      link: item.link ?? null,
      note: item.note ?? null,
      submissionText: item.submissionText ?? null,
      submissionLink: item.submissionLink ?? null,
      submissionFileUrl: item.submissionFileUrl ?? null,
      submittedAt: item.submittedAt ?? null,
      feedback: item.feedback ?? null,
      checkedAt: item.checkedAt ?? null,
      statusLabel: this.getStatusLabel(normalized),
      statusKey: normalized,
      progressPercent: this.calculateProgressPercent(item.score, item.maxScore)
    };
  }

  private normalizeStatus(value: string | null | undefined): StudentTaskFilterStatus {
    const normalized = (value ?? '').trim().toLowerCase();

    if (normalized === 'pending') return 'Pending';
    if (normalized === 'submitted') return 'Submitted';
    if (normalized === 'reviewed') return 'Reviewed';
    if (normalized === 'late') return 'Late';
    if (normalized === 'missing') return 'Missing';

    return 'Pending';
  }

  private getStatusLabel(status: StudentTaskFilterStatus): string {
    switch (status) {
      case 'Pending':
        return 'Gözləyən';
      case 'Submitted':
        return 'Təslim edilən';
      case 'Reviewed':
        return 'Yoxlanılan';
      case 'Late':
        return 'Gecikən';
      case 'Missing':
        return 'Buraxılan';
      default:
        return 'Naməlum';
    }
  }

  private calculateProgressPercent(score?: number | null, maxScore?: number | null): number {
    const safeScore = Number(score ?? 0);
    const safeMax = Number(maxScore ?? 0);

    if (!safeMax || safeMax <= 0) {
      return 0;
    }

    const percent = (safeScore / safeMax) * 100;
    return Math.max(0, Math.min(100, Number(percent.toFixed(0))));
  }
}