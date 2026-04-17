import { Injectable, inject } from '@angular/core';
import { Observable, throwError, switchMap, forkJoin } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Teacher } from '../../../../core/models/teacher/teacher.model';
import { AuthService } from '../../../../core/services/auth.service';
import { TeacherService } from '../../../admin/teachers/data/teacher.service';
import { environment } from '../../../../../environments/environment';
import { DashboardResponseModel } from '../../../../core/models/dashboard/dashboard.model';
// YENI
import {
  ExamClassOption,
  ExamDetail,
  ExamListItem,
  ExamSubjectOption,
  ExamTeacherOption,
  TeacherExamCreateOptions,
  TeacherExamFilter,
  ExamSubmissionStudent,
  ExamSubmissionDetail,
  GradeStudentExamRequest,
  GradeStudentExamResult
} from '../../../../core/models/exam/exam.model';

// YENI
import {
  GradeStudentTaskPayload,
  StudentTaskSubmissionDetail,
  TeacherClassTaskListItem,
  TeacherTaskClassSummary,
  TeacherTaskDetail,
  UpdateTeacherTaskPayload
} from '../../../../core/models/teacher/task-management.model';

// YENI
import {
  AttendanceBoard,
  AttendanceBoardFilter,
  AttendanceSessionDetail,
  CreateAttendanceSessionColumnRequest,
  SaveAttendanceSessionRecordsRequest
} from '../../../../core/models/class/attendance/attendance.model';

@Injectable({
  providedIn: 'root'
})
export class TeacherPanelService {
  private readonly authService = inject(AuthService);
  private readonly teacherService = inject(TeacherService);
  private readonly http = inject(HttpClient);

  // YENI
  private readonly apiUrl = environment.apiUrl;

  getMyTeacherProfile(): Observable<Teacher> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.userId) {
      return throwError(() => new Error('Cari istifadəçi məlumatı tapılmadı.'));
    }

    return this.teacherService.getByUserId(currentUser.userId);
  }

  // YENI
  getMyProfile(): Observable<Teacher> {
    return this.http.get<Teacher>(`${this.apiUrl}/Teacher/me`);
  }

  // YENI
  getMyDashboard(): Observable<DashboardResponseModel> {
  return this.http.get<DashboardResponseModel>(`${this.apiUrl}/Dashboard/me`);
}
  

  // YENI
  getMyClassRooms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Teacher/me/classrooms`);
  }

  // YENI
  getMyClassRoomDetail(classRoomId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Teacher/me/classrooms/${classRoomId}/details`);
  }

  // YENI
  // Vacib: /Teacher/{teacherId}/tasks teacher entity id istəyir, userId yox
  getMyTasks(): Observable<any[]> {
    return this.getMyProfile().pipe(
      switchMap((teacher: any) => {
        const teacherId = teacher?.id;

        if (!teacherId) {
          return throwError(() => new Error('Müəllim identifikatoru tapılmadı.'));
        }

        return this.http.get<any[]>(`${this.apiUrl}/Teacher/${teacherId}/tasks`);
      })
    );
  }

  // YENI
  // Vacib: /Teacher/{teacherId}/overview-stats teacher entity id istəyir, userId yox
  getMyOverviewStats(): Observable<any> {
    return this.getMyProfile().pipe(
      switchMap((teacher: any) => {
        const teacherId = teacher?.id;

        if (!teacherId) {
          return throwError(() => new Error('Müəllim identifikatoru tapılmadı.'));
        }

        return this.http.get<any>(`${this.apiUrl}/Teacher/${teacherId}/overview-stats`);
      })
    );
  }

  // YENI
  // Köhnə /Exam endpointi bütün examları gətirirdi.
  // Teacher panel üçün artıq teacher-ə aid endpoint istifadə olunur.
  getMyExams(filter?: TeacherExamFilter): Observable<ExamListItem[]> {
    let params = new HttpParams();

    if (filter?.classRoomId !== null && filter?.classRoomId !== undefined) {
      params = params.set('classRoomId', String(filter.classRoomId));
    }

    if (filter?.subjectId !== null && filter?.subjectId !== undefined) {
      params = params.set('subjectId', String(filter.subjectId));
    }

    if (filter?.isPublished !== null && filter?.isPublished !== undefined) {
      params = params.set('isPublished', String(filter.isPublished));
    }

    if (filter?.status) {
      params = params.set('status', filter.status);
    }

    return this.http.get<ExamListItem[]>(`${this.apiUrl}/Exam/teacher/my`, { params });
  }

  // YENI
  getClassOptions(): Observable<ExamClassOption[]> {
    return this.http.get<ExamClassOption[]>(`${this.apiUrl}/Exam/class-options`);
  }

  // YENI
  getSubjectOptions(): Observable<ExamSubjectOption[]> {
    return this.http.get<ExamSubjectOption[]>(`${this.apiUrl}/Exam/subject-options`);
  }

  // YENI
  getTeacherOptions(): Observable<ExamTeacherOption[]> {
    return this.http.get<ExamTeacherOption[]>(`${this.apiUrl}/Exam/teacher-options`);
  }

  // YENI
  // Bu köhnə create flow üçün qalır
  getTeacherExamCreateOptions(): Observable<{
    classOptions: ExamClassOption[];
    subjectOptions: ExamSubjectOption[];
    teacherOptions: ExamTeacherOption[];
  }> {
    return forkJoin({
      classOptions: this.getClassOptions(),
      subjectOptions: this.getSubjectOptions(),
      teacherOptions: this.getTeacherOptions()
    });
  }

  // YENI
  // Teacher-in öz create səhifəsi üçün backenddə xüsusi endpoint
  getMyExamCreateOptions(): Observable<TeacherExamCreateOptions> {
    return this.http.get<TeacherExamCreateOptions>(`${this.apiUrl}/Exam/teacher/my-create-options`);
  }

  // YENI
  createExam(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Exam`, payload);
  }

  // YENI
  getExamDetail(id: number): Observable<ExamDetail> {
    return this.http.get<ExamDetail>(`${this.apiUrl}/Exam/${id}`);
  }

  // YENI
  // Teacher detail səhifəsində ayrıca semantic method olsun deyə saxlayırıq
  getTeacherExamDetail(id: number): Observable<ExamDetail> {
    return this.http.get<ExamDetail>(`${this.apiUrl}/Exam/${id}`);
  }

  // YENI
  updateExam(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/Exam/${id}`, payload);
  }

  // YENI
  publishExam(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/Exam/${id}/publish`, {});
  }

  // YENI
  // Teacher task list səhifəsi üçün sinif üzrə ümumi task statistikaları
  getTeacherTaskClasses(): Observable<TeacherTaskClassSummary[]> {
    return this.http.get<TeacherTaskClassSummary[]>(`${this.apiUrl}/TeacherTasks/classes`);
  }

  // YENI
  // Müəyyən sinif üzrə ümumi taskların listi
  getTeacherClassTasks(classRoomId: number): Observable<TeacherClassTaskListItem[]> {
    return this.http.get<TeacherClassTaskListItem[]>(
      `${this.apiUrl}/TeacherTasks/classes/${classRoomId}/tasks`
    );
  }

  // YENI
  // Task yaratmaq
  createTeacherTask(payload: any): Observable<TeacherTaskDetail> {
    return this.http.post<TeacherTaskDetail>(`${this.apiUrl}/TeacherTasks`, payload);
  }

  // YENI
  // Task detail
  getTeacherTaskDetail(taskGroupKey: string): Observable<TeacherTaskDetail> {
    return this.http.get<TeacherTaskDetail>(`${this.apiUrl}/TeacherTasks/${taskGroupKey}`);
  }

  // YENI
  // Task update
  updateTeacherTask(
    taskGroupKey: string,
    payload: UpdateTeacherTaskPayload
  ): Observable<TeacherTaskDetail> {
    return this.http.put<TeacherTaskDetail>(`${this.apiUrl}/TeacherTasks/${taskGroupKey}`, payload);
  }

  // YENI
  // Task delete
  deleteTeacherTask(taskGroupKey: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/TeacherTasks/${taskGroupKey}`);
  }

  // YENI
  // Müəyyən student task submission detail
  getStudentTaskSubmissionDetail(
    taskGroupKey: string,
    studentTaskId: number
  ): Observable<StudentTaskSubmissionDetail> {
    return this.http.get<StudentTaskSubmissionDetail>(
      `${this.apiUrl}/TeacherTasks/${taskGroupKey}/submissions/${studentTaskId}`
    );
  }

  // YENI
  // Student task grading
  gradeStudentTask(payload: GradeStudentTaskPayload): Observable<StudentTaskSubmissionDetail> {
    return this.http.put<StudentTaskSubmissionDetail>(
      `${this.apiUrl}/TeacherTasks/submissions/grade`,
      payload
    );
  }

  // YENI
  // Completed exam üçün submissions list
  getExamSubmissions(examId: number): Observable<ExamSubmissionStudent[]> {
    return this.http.get<ExamSubmissionStudent[]>(`${this.apiUrl}/Exam/${examId}/submissions`);
  }

  // YENI
  // Müəyyən student submission detail
  getStudentExamSubmissionDetail(
    examId: number,
    studentExamId: number
  ): Observable<ExamSubmissionDetail> {
    return this.http.get<ExamSubmissionDetail>(
      `${this.apiUrl}/Exam/${examId}/submissions/${studentExamId}`
    );
  }

  // YENI
  // Açıq sualların qiymətləndirilməsi
  gradeStudentExam(payload: GradeStudentExamRequest): Observable<GradeStudentExamResult> {
    return this.http.post<GradeStudentExamResult>(
      `${this.apiUrl}/Exam/submissions/grade`,
      payload
    );
  }

  // YENI
  // Müəllim üçün aylıq attendance board
  getAttendanceBoard(filter: AttendanceBoardFilter): Observable<AttendanceBoard> {
    const params = new HttpParams()
      .set('classRoomId', String(filter.classRoomId))
      .set('subjectId', String(filter.subjectId))
      .set('teacherId', String(filter.teacherId))
      .set('year', String(filter.year))
      .set('month', String(filter.month));

    return this.http.get<AttendanceBoard>(`${this.apiUrl}/Attendance/board`, { params });
  }

  // YENI
  // Yeni dərs session sütunu yaratmaq
  createAttendanceSessionColumn(
    payload: CreateAttendanceSessionColumnRequest
  ): Observable<AttendanceSessionDetail> {
    return this.http.post<AttendanceSessionDetail>(
      `${this.apiUrl}/Attendance/session-column`,
      payload
    );
  }

  // YENI
  // Müəyyən session üçün bütün student attendance record-larını save etmək
  saveAttendanceSessionRecords(
    payload: SaveAttendanceSessionRecordsRequest
  ): Observable<AttendanceSessionDetail> {
    return this.http.put<AttendanceSessionDetail>(
      `${this.apiUrl}/Attendance/session-records`,
      payload
    );
  }
}