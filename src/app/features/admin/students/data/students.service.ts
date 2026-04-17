import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  switchMap,
  throwError,
  timeout
} from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CreateStudentProfileRequest,
  CreateStudentUserRequest,
  ExamType,
  StudentAttendanceItem,
  StudentClassOption,
  StudentDetail,
  StudentExamReview,
  StudentFilter,
  StudentListItem,
  StudentStatus,
  StudentSummaryStats,
  StudentTaskItem,
  StudentTaskStatus,
  UpdateStudentProfileRequest,
  UpdateStudentTaskRequest,
  UpdateStudentUserRequest
} from '../../../../core/models/students/student.model';
export interface UpdateStudentAttendanceRequest {
  attendanceSessionId: number;
  status: number;
  note: string | null;
}
interface BackendStudentListItemDto {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  studentNumber: string;
  className?: string | null;
  averageScore: number | string;
  examsCount: number;
  attendanceRate: number | string;
  status: string;
  photoUrl?: string | null;
}

interface BackendStudentTaskDto {
  id: number;
  title: string;
  description?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  assignedDate: string;
  dueDate: string;
  status: string;
  score: number | string;
  maxScore: number | string;
  link?: string | null;
  note?: string | null;
}

interface BackendStudentAttendanceDto {
  attendanceSessionId: number;
  sessionDate: string;
  subjectName?: string | null;
  teacherName?: string | null;
  status: string;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}

interface BackendStudentExamDto {
  studentExamId: number;
  examId: number;
  examTitle?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  score: number | string;
  maxScore: number | string;
  isCompleted: boolean;
  startTime: string;
  endTime?: string | null;
  examType?: string | null;
  note?: string | null;
}

interface BackendStudentDetailDto {
  id: number;
  userId: number;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phoneNumber?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  gender?: string | null;
  address?: string | null;
  studentNumber: string;
  dateOfBirth: string;
  className?: string | null;
  status: string;
  notes?: string | null;
  averageScore: number | string;
  examsCount: number;
  attendanceRate: number | string;
  photoUrl?: string | null;
  tasksCount?: number;
  completedTasksCount?: number;
  absentCount?: number;
  lateCount?: number;
  tasks?: BackendStudentTaskDto[];
  attendance?: BackendStudentAttendanceDto[];
  exams?: BackendStudentExamDto[];
}

interface BackendClassListItemDto {
  id: number;
  name: string;
}

interface BackendClassTeacherSubjectRowDto {
  assignedTeacherName: string;
}

interface BackendClassDetailDto {
  id: number;
  name: string;
  teacherSubjectRows: BackendClassTeacherSubjectRowDto[];
}

interface CreateUserResponseDto {
  userId: number;
}

interface BackendStudentExamReviewOptionDto {
  id: number;
  text?: string | null;
  isCorrect: boolean;
}

interface BackendStudentExamReviewQuestionDto {
  id: number;
  examId: number;
  questionNo: number;
  type: string;
  questionText?: string | null;
  options?: BackendStudentExamReviewOptionDto[];
  correctAnswerText?: string | null;
  studentAnswerText?: string | null;
  awardedScore: number | string;
  maxScore: number | string;
  teacherFeedback?: string | null;
}

interface BackendStudentExamReviewDto {
  studentExamId: number;
  examId: number;
  examTitle?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  examDate: string;
  score: number | string;
  questions?: BackendStudentExamReviewQuestionDto[];
}

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private readonly http = inject(HttpClient);

  private readonly studentBaseUrl = `${environment.apiUrl}/Student`;
  private readonly classBaseUrl = `${environment.apiUrl}/ClassRoom`;
  private readonly userBaseUrl = `${environment.apiUrl}/User`;

  getStudents(filter?: StudentFilter): Observable<StudentListItem[]> {
    return this.http.get<BackendStudentListItemDto[]>(this.studentBaseUrl).pipe(
      timeout(12000),
      switchMap((students) => {
        if (!students?.length) {
          return of([]);
        }

        return this.loadTeacherMapByClassName().pipe(
          map((teacherMap) => {
            const mapped = students.map((student) => this.mapStudentListItem(student, teacherMap));
            return this.applyFilters(mapped, filter);
          })
        );
      })
    );
  }

  getStudentById(studentId: number): Observable<StudentDetail> {
    return this.http.get<BackendStudentDetailDto>(`${this.studentBaseUrl}/${studentId}`).pipe(
      timeout(12000),
      map((response) => this.mapStudentDetail(response))
    );
  }

  getStudentTasks(studentId: number): Observable<StudentTaskItem[]> {
    return this.http.get<BackendStudentTaskDto[]>(`${this.studentBaseUrl}/${studentId}/tasks`).pipe(
      timeout(12000),
      map((tasks) => (tasks ?? []).map((task) => this.mapTask(task)))
    );
  }

  getExamReview(studentId: number, studentExamId: number): Observable<StudentExamReview> {
    return this.http
      .get<BackendStudentExamReviewDto>(
        `${this.studentBaseUrl}/${studentId}/exam-reviews/${studentExamId}`
      )
      .pipe(
        timeout(12000),
        map((response) => ({
          studentExamId: response.studentExamId,
          examId: response.examId,
          examTitle: response.examTitle ?? 'İmtahan',
          subjectName: response.subjectName ?? 'Fənn təyin edilməyib',
          teacherName: response.teacherName ?? 'Müəllim təyin edilməyib',
          examDate: response.examDate,
          score: this.toNumber(response.score),
          questions: (response.questions ?? []).map((question) => ({
            id: question.id,
            examId: question.examId,
            questionNo: question.questionNo,
            type: question.type ?? 'MultipleChoice',
            questionText: question.questionText ?? '',
            options: (question.options ?? []).map((option) => ({
              id: option.id,
              text: option.text ?? '',
              isCorrect: !!option.isCorrect
            })),
            correctAnswerText: question.correctAnswerText ?? '',
            studentAnswerText: question.studentAnswerText ?? '',
            awardedScore: this.toNumber(question.awardedScore),
            maxScore: this.toNumber(question.maxScore),
            teacherFeedback: question.teacherFeedback ?? ''
          }))
        }))
      );
  }

  getSummaryStats(students: StudentListItem[]): StudentSummaryStats {
    const totalStudents = students.length;
    const activeStudents = students.filter((x) => x.status === 'Aktiv').length;
    const passiveStudents = students.filter((x) => x.status === 'Passiv').length;

    const averageScore = totalStudents
      ? Math.round(
          students.reduce((sum, item) => sum + this.toNumber(item.averageScore), 0) / totalStudents
        )
      : 0;

    return {
      totalStudents,
      activeStudents,
      passiveStudents,
      averageScore
    };
  }

  getClassOptions(): Observable<StudentClassOption[]> {
    return this.http.get<BackendClassListItemDto[]>(this.classBaseUrl).pipe(
      timeout(12000),
      map((classes) =>
        (classes ?? [])
          .map((item) => ({
            id: item.id,
            name: item.name
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'az'))
      )
    );
  }

  createStudent(
    userRequest: CreateStudentUserRequest,
    profileRequest: Omit<CreateStudentProfileRequest, 'userId'>
  ): Observable<StudentDetail> {
    let createdUserId: number | null = null;

    return this.http.post<CreateUserResponseDto>(this.userBaseUrl, userRequest).pipe(
      timeout(12000),
      switchMap((userResponse) => {
        createdUserId = userResponse.userId;

        return this.http.post<BackendStudentDetailDto>(this.studentBaseUrl, {
          ...profileRequest,
          userId: userResponse.userId
        });
      }),
      map((studentResponse) => this.mapStudentDetail(studentResponse)),
      catchError((error) => {
        if (!createdUserId) {
          return throwError(() => error);
        }

        return this.http.delete(`${this.userBaseUrl}/${createdUserId}`).pipe(
          timeout(12000),
          switchMap(() => throwError(() => error)),
          catchError(() => throwError(() => error))
        );
      })
    );
  }

  // YENI
  // Student detail səhifəsində yuxarı profil hissəsini update etmək üçündür.
  // Burda həm User, həm də Student entity update olunur.
  updateStudentProfile(
    userRequest: UpdateStudentUserRequest,
    profileRequest: UpdateStudentProfileRequest
  ): Observable<StudentDetail> {
    const userPayload = {
      userId: userRequest.userId,
      username: userRequest.username?.trim() ?? '',
      email: userRequest.email?.trim() ?? '',
      role: userRequest.role ?? 'Student',
      firstName: userRequest.firstName?.trim() ?? '',
      lastName: userRequest.lastName?.trim() ?? '',
      fatherName: userRequest.fatherName?.trim() ?? '',
      birthDate: this.normalizeNullableDate(userRequest.birthDate),
      phoneNumber: this.normalizeNullableString(userRequest.phoneNumber),
      country: this.normalizeNullableString(userRequest.country),
      photoUrl: this.normalizeNullableString(userRequest.photoUrl),
      details: this.normalizeNullableString(userRequest.details)
    };

    const studentPayload = {
      id: profileRequest.id,
      fullName: profileRequest.fullName?.trim() ?? '',
      dateOfBirth: this.normalizeRequiredDate(profileRequest.dateOfBirth),
      studentNumber: profileRequest.studentNumber?.trim() ?? '',
      classRoomId: profileRequest.classRoomId ?? null,
      status: profileRequest.status ?? null,
      notes: this.normalizeNullableString(profileRequest.notes)
    };

    return this.http.put(`${this.userBaseUrl}`, userPayload).pipe(
      timeout(12000),
      switchMap(() =>
        this.http.put(`${this.studentBaseUrl}/${profileRequest.id}`, studentPayload).pipe(timeout(12000))
      ),
      switchMap(() => this.getStudentById(profileRequest.id))
    );
  }

  // YENI
  // Task edit drawer save edəndə backendə real PUT gedəcək.
  updateStudentTask(
    studentId: number,
    taskRequest: UpdateStudentTaskRequest
  ): Observable<StudentTaskItem> {
    const payload = {
      id: taskRequest.id,
      title: taskRequest.title?.trim() ?? '',
      description: this.normalizeNullableString(taskRequest.description),
      subjectId: taskRequest.subjectId ?? null,
      teacherId: taskRequest.teacherId ?? null,
      assignedDate: this.normalizeRequiredDate(taskRequest.assignedDate),
      dueDate: this.normalizeRequiredDate(taskRequest.dueDate),
      status: taskRequest.status,
      score: this.toNumber(taskRequest.score),
      maxScore: this.toNumber(taskRequest.maxScore),
      link: this.normalizeNullableString(taskRequest.link),
      note: this.normalizeNullableString(taskRequest.note)
    };

    return this.http
      .put<BackendStudentTaskDto>(
        `${this.studentBaseUrl}/${studentId}/tasks/${taskRequest.id}`,
        payload
      )
      .pipe(
        timeout(12000),
        map((response) => this.mapTask(response))
      );
  }

  deleteStudent(studentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.studentBaseUrl}/${studentId}`).pipe(
      timeout(12000)
    );
  }

  // YENI
  // Student status string -> backend enum number
  mapStudentStatusToApi(status: StudentStatus | string | null | undefined): number | null {
    const normalized = (status ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'aktiv':
      case 'active':
        return 1;
      case 'passiv':
      case 'passive':
        return 2;
      case 'məzun':
      case 'mezun':
      case 'graduated':
        return 3;
      default:
        return null;
    }
  }

  // YENI
  // Task status string -> backend enum number
  mapTaskStatusToApi(status: StudentTaskStatus | string | null | undefined): number {
    const normalized = (status ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'submitted':
        return 2;
      case 'reviewed':
        return 3;
      case 'late':
        return 4;
      case 'missing':
        return 5;
      case 'pending':
      default:
        return 1;
    }
  }

  private loadTeacherMapByClassName(): Observable<Record<string, string>> {
    return this.http.get<BackendClassListItemDto[]>(this.classBaseUrl).pipe(
      timeout(12000),
      switchMap((classes) => {
        const safeClasses = classes ?? [];

        if (!safeClasses.length) {
          return of({});
        }

        const requests = safeClasses.map((schoolClass) =>
          this.http.get<BackendClassDetailDto>(`${this.classBaseUrl}/${schoolClass.id}`).pipe(
            timeout(12000),
            map((detail) => ({
              className: detail.name,
              teacherName: this.extractTeacherName(detail.teacherSubjectRows ?? [])
            })),
            catchError(() =>
              of({
                className: schoolClass.name,
                teacherName: 'Təyin edilməyib'
              })
            )
          )
        );

        return forkJoin(requests).pipe(
          map((rows) => {
            const teacherMap: Record<string, string> = {};

            for (const row of rows) {
              teacherMap[row.className] = row.teacherName;
            }

            return teacherMap;
          })
        );
      })
    );
  }

  private extractTeacherName(rows: BackendClassTeacherSubjectRowDto[]): string {
    if (!rows.length) {
      return 'Təyin edilməyib';
    }

    const uniqueTeacherNames = [
      ...new Set(
        rows
          .map((row) => (row.assignedTeacherName ?? '').trim())
          .filter((name) => !!name && name !== 'Təyin edilməyib')
      )
    ];

    return uniqueTeacherNames.length ? uniqueTeacherNames.join(', ') : 'Təyin edilməyib';
  }

  private mapStudentListItem(
    dto: BackendStudentListItemDto,
    teacherMap: Record<string, string>
  ): StudentListItem {
    const fullName = (dto.fullName ?? '').trim();
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const className = dto.className?.trim() || 'Təyin edilməyib';

    return {
      id: dto.id,
      userId: dto.userId,
      fullName,
      firstName: firstName || fullName || 'Şagird',
      lastName: lastNameParts.join(' ').trim(),
      email: dto.email ?? '',
      studentNumber: dto.studentNumber ?? '',
      className,
      teacherName: teacherMap[className] || 'Təyin edilməyib',
      averageScore: this.toNumber(dto.averageScore),
      examsCount: dto.examsCount ?? 0,
      attendanceRate: this.toNumber(dto.attendanceRate),
      status: this.mapStudentStatus(dto.status),
      photoUrl: dto.photoUrl?.trim() || 'https://i.pravatar.cc/150?img=12'
    };
  }

  private mapStudentDetail(dto: BackendStudentDetailDto): StudentDetail {
    const fullName = (dto.fullName ?? '').trim();
    const [derivedFirstName, ...lastNameParts] = fullName.split(' ');

    const tasks = (dto.tasks ?? []).map((task) => this.mapTask(task));
    const attendance = (dto.attendance ?? []).map((record) => this.mapAttendance(record));
    const exams = (dto.exams ?? []).map((exam) => this.mapExam(exam));

    return {
      id: dto.id,
      userId: dto.userId,
      fullName,
      firstName: dto.firstName?.trim() || derivedFirstName || fullName || 'Şagird',
      lastName: dto.lastName?.trim() || lastNameParts.join(' ').trim(),
      email: dto.email ?? '',
      phoneNumber: dto.phoneNumber ?? null,
      parentName: dto.parentName?.trim() || '-',
      parentPhone: dto.parentPhone ?? null,
      gender: dto.gender?.trim() || 'Bilinmir',
      address: dto.address ?? null,
      studentNumber: dto.studentNumber ?? '',
      dateOfBirth: dto.dateOfBirth ?? '',
      className: dto.className ?? null,
      status: this.mapStudentStatus(dto.status),
      notes: dto.notes ?? null,
      averageScore: this.toNumber(dto.averageScore),
      examsCount: dto.examsCount ?? exams.length,
      attendanceRate: this.toNumber(dto.attendanceRate),
      photoUrl: dto.photoUrl ?? null,
      tasksCount: dto.tasksCount ?? tasks.length,
      completedTasksCount:
        dto.completedTasksCount ??
        tasks.filter((task) => task.status === 'Submitted' || task.status === 'Reviewed').length,
      absentCount: dto.absentCount ?? attendance.filter((item) => item.status === 'Yoxdur').length,
      lateCount: dto.lateCount ?? attendance.filter((item) => item.status === 'Gecikib').length,
      tasks,
      attendance,
      exams
    };
  }

  private mapTask(dto: BackendStudentTaskDto): StudentTaskItem {
    const assignedDate = dto.assignedDate ?? '';

    return {
      id: dto.id,
      title: dto.title ?? 'Task',
      description: dto.description ?? null,
      subjectName: dto.subjectName?.trim() || 'Fənn təyin edilməyib',
      teacherName: dto.teacherName?.trim() || 'Müəllim təyin edilməyib',
      assignedDate,
      dueDate: dto.dueDate ?? '',
      status: this.mapTaskStatus(dto.status),
      score: this.toNumber(dto.score),
      maxScore: this.toNumber(dto.maxScore),
      link: dto.link ?? null,
      note: dto.note ?? null,
      monthKey: this.getMonthKey(assignedDate)
    };
  }

  private mapAttendance(dto: BackendStudentAttendanceDto): StudentAttendanceItem {
    const sessionDate = dto.sessionDate ?? '';

    return {
      attendanceSessionId: dto.attendanceSessionId,
      sessionDate,
      subjectName: dto.subjectName?.trim() || 'Fənn təyin edilməyib',
      teacherName: dto.teacherName?.trim() || 'Müəllim təyin edilməyib',
      status: this.mapAttendanceStatus(dto.status),
      startTime: this.formatApiTime(dto.startTime),
      endTime: this.formatApiTime(dto.endTime),
      note: dto.note ?? null,
      monthKey: this.getMonthKey(sessionDate)
    };
  }

  private mapExam(dto: BackendStudentExamDto) {
    const score = this.toNumber(dto.score);
    const maxScore = this.toNumber(dto.maxScore);
    const percentage = this.calculatePercentage(score, maxScore);
    const isCompleted = !!dto.isCompleted;

    return {
      studentExamId: dto.studentExamId,
      examId: dto.examId,
      examTitle: dto.examTitle?.trim() || 'İmtahan',
      subjectName: dto.subjectName?.trim() || 'Fənn təyin edilməyib',
      teacherName: dto.teacherName?.trim() || 'Müəllim təyin edilməyib',
      score,
      maxScore,
      isCompleted,
      startTime: dto.startTime ?? '',
      endTime: dto.endTime ?? null,
      examType: this.mapExamType(dto.examType),
      note: dto.note ?? null,
      percentage,
      resultLabel: isCompleted ? this.getResultLabel(percentage) : 'Tamamlanmayıb',
      monthKey: this.getMonthKey(dto.startTime ?? '')
    };
  }

  private applyFilters(students: StudentListItem[], filter?: StudentFilter): StudentListItem[] {
    if (!filter) {
      return [...students].sort((a, b) => b.averageScore - a.averageScore);
    }

    let result = [...students];

    const fullName = (filter.fullName ?? '').trim().toLowerCase();
    const className = (filter.className ?? '').trim().toLowerCase();
    const teacherName = (filter.teacherName ?? '').trim().toLowerCase();
    const status = (filter.status ?? '').trim();

    if (fullName) {
      result = result.filter((student) => student.fullName.toLowerCase().includes(fullName));
    }

    if (className) {
      result = result.filter((student) => student.className.toLowerCase() === className);
    }

    if (teacherName) {
      result = result.filter((student) => student.teacherName.toLowerCase().includes(teacherName));
    }

    if (status) {
      result = result.filter((student) => student.status === status);
    }

    if (filter.minScore != null) {
      const min = Number(filter.minScore);
      result = result.filter((student) => this.toNumber(student.averageScore) >= min);
    }

    if (filter.maxScore != null) {
      const max = Number(filter.maxScore);
      result = result.filter((student) => this.toNumber(student.averageScore) <= max);
    }

    return result.sort((a, b) => b.averageScore - a.averageScore);
  }

  private mapStudentStatus(status: string | null | undefined): StudentStatus {
    const normalized = (status ?? '').trim().toLowerCase();

    if (normalized === 'passive' || normalized === 'passiv') {
      return 'Passiv';
    }

    if (normalized === 'graduated' || normalized === 'məzun' || normalized === 'mezun') {
      return 'Məzun';
    }

    return 'Aktiv';
  }

  private mapTaskStatus(status: string | null | undefined): StudentTaskStatus {
    const normalized = (status ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'submitted':
        return 'Submitted';
      case 'reviewed':
        return 'Reviewed';
      case 'late':
        return 'Late';
      case 'missing':
        return 'Missing';
      default:
        return 'Pending';
    }
  }

  private mapAttendanceStatus(
    status: string | null | undefined
  ): StudentAttendanceItem['status'] {
    const normalized = (status ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'present':
      case 'gəlib':
      case 'gelib':
        return 'Gəlib';
      case 'absent':
      case 'yoxdur':
        return 'Yoxdur';
      case 'late':
      case 'gecikib':
        return 'Gecikib';
      case 'excused':
      case 'icazəli':
      case 'icazeli':
        return 'İcazəli';
      default:
        return 'Gəlib';
    }
  }

  private mapExamType(type: string | null | undefined): ExamType {
    const normalized = (type ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'quiz':
        return 'Quiz';
      case 'midterm':
        return 'Midterm';
      case 'final':
        return 'Final';
      case 'practice':
        return 'Practice';
      default:
        return 'Unknown';
    }
  }

  private calculatePercentage(score: number, maxScore: number): number {
    if (!maxScore || maxScore <= 0) {
      return 0;
    }

    return Math.round((score / maxScore) * 100);
  }

  private getResultLabel(percentage: number): string {
    if (percentage >= 85) {
      return 'Əla';
    }

    if (percentage >= 70) {
      return 'Yaxşı';
    }

    if (percentage >= 50) {
      return 'Orta';
    }

    return 'Zəif';
  }

  private getMonthKey(date: string): string {
    if (!date) {
      return '';
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date.slice(0, 7);
    }

    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    return `${parsed.getFullYear()}-${month}`;
  }

  private formatApiTime(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    return value.slice(0, 5);
  }

  // YENI
  private normalizeRequiredDate(value: string | null | undefined): string {
    if (!value) {
      return new Date().toISOString();
    }

    return value;
  }

  // YENI
  private normalizeNullableDate(value: string | null | undefined): string | null {
    if (!value || !value.trim()) {
      return null;
    }

    return value;
  }

  // YENI
  private normalizeNullableString(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }
updateStudentAttendance(
  studentId: number,
  request: UpdateStudentAttendanceRequest
): Observable<StudentAttendanceItem> {
  const payload = {
    attendanceSessionId: request.attendanceSessionId,
    status: request.status,
    note: this.normalizeNullableString(request.note)
  };

  return this.http
    .put<BackendStudentAttendanceDto>(
      `${this.studentBaseUrl}/${studentId}/attendance/${request.attendanceSessionId}`,
      payload
    )
    .pipe(
      timeout(12000),
      map((response) => this.mapAttendance(response))
    );
}
mapAttendanceStatusToApi(status: string): number {
  const normalized = (status ?? '').trim().toLowerCase();

  switch (normalized) {
    case 'present':
    case 'gəlib':
    case 'iştirak edib':
      return 1;
    case 'absent':
    case 'yoxdur':
    case 'qayıb':
      return 2;
    case 'late':
    case 'gecikib':
      return 3;
    default:
      return 1;
  }
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