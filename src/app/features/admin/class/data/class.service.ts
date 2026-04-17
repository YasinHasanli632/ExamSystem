import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ClassDetail,
  ClassExamItem,
  ClassFilter,
  ClassListItem,
  ClassStats,
  ClassTeacherAssignmentView,
  ClassTeacherSubjectRow,
  ClassTopStudent,
  CreateClassRequest,
  SchoolClass,
  StudentOption,
  SubjectOption,
  TeacherOption,
  UpdateClassRequest
} from '../../../../core/models/class/class.model';

interface BackendClassListItemDto {
  id: number;
  name: string;
  academicYear: string;
  room: string;
  status: string;
  studentCount: number;
  subjectCount: number;
  teacherCount: number;
  averageScore: number | string;
}

interface BackendClassDetailDto {
  id: number;
  name: string;
  academicYear: string;
  room: string;
  description?: string;
  status: string;
  maxStudentCount: number;
  averageScore: number | string;
  attendanceRate: number | string;
  examCount: number;
  createdAt?: string;
  students: BackendStudentOptionDto[];
  topStudents: BackendTopStudentDto[];
  subjects: BackendSubjectOptionDto[];
  exams: BackendClassExamItemDto[];
  teacherSubjectRows: BackendTeacherSubjectRowDto[];
}

interface BackendSubjectOptionDto {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

interface BackendTeacherOptionDto {
  id: number;
  fullName: string;
  email: string;
  photoUrl: string;
  subjectIds: number[];
  subjectNames: string[];
  status: string;
}

interface BackendStudentOptionDto {
  id: number;
  fullName: string;
  email: string;
  photoUrl: string;
  className?: string;
  averageScore?: number | string | null;
  attendanceRate?: number | string | null;
  status: string;
}

interface BackendClassExamItemDto {
  id: number;
  title: string;
  subjectId: number;
  subjectName: string;
  examDate: string;
  durationMinutes: number;
  totalScore: number | string;
  status: string;
}

interface BackendTopStudentDto {
  id: number;
  fullName: string;
  photoUrl: string;
  email: string;
  averageScore: number | string;
}

interface BackendTeacherSubjectRowDto {
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  assignedTeacherId: number | null;
  assignedTeacherName: string;
  availableTeachers: BackendTeacherOptionDto[];
}

@Injectable({
  providedIn: 'root'
})
export class ClassService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ClassRoom`;

  getSubjects(searchTerm: string = ''): Observable<SubjectOption[]> {
    return this.http
      .get<BackendSubjectOptionDto[]>(`${this.baseUrl}/subject-options`)
      .pipe(
        map(subjects => {
          const mapped = subjects.map(subject => this.mapSubjectOption(subject));
          const term = searchTerm.trim().toLowerCase();

          if (!term) {
            return mapped;
          }

          return mapped.filter(subject =>
            `${subject.name} ${subject.code ?? ''} ${subject.description ?? ''}`
              .toLowerCase()
              .includes(term)
          );
        })
      );
  }

  getTeachersBySubject(subjectId: number, searchTerm: string = ''): Observable<TeacherOption[]> {
    let params = new HttpParams();
    const trimmedSearch = searchTerm.trim();

    if (trimmedSearch) {
      params = params.set('search', trimmedSearch);
    }

    return this.http
      .get<BackendTeacherOptionDto[]>(`${this.baseUrl}/teacher-options`, { params })
      .pipe(
        map(teachers =>
          teachers
            .map(teacher => this.mapTeacherOption(teacher))
            .filter(teacher => teacher.subjectIds.includes(subjectId))
        )
      );
  }

  searchStudents(searchTerm: string): Observable<StudentOption[]> {
    let params = new HttpParams();
    const trimmedSearch = searchTerm.trim();

    if (trimmedSearch) {
      params = params.set('search', trimmedSearch);
    }

    return this.http
      .get<BackendStudentOptionDto[]>(`${this.baseUrl}/student-options`, { params })
      .pipe(map(students => students.map(student => this.mapStudentOption(student))));
  }

  getClasses(filter?: ClassFilter): Observable<ClassListItem[]> {
    return this.http.get<BackendClassListItemDto[]>(this.baseUrl).pipe(
      map(items => {
        let result = items.map(item => this.mapClassListItem(item));

        if (!filter) {
  return result;
}

const term = filter.search?.trim().toLowerCase();
if (term) {
  result = result.filter(item =>
    `${item.name} ${item.academicYear} ${item.room} ${item.status}`
      .toLowerCase()
      .includes(term)
  );
}

if (filter.status) {
  result = result.filter(item => item.status === filter.status);
}

const academicYear = filter.academicYear?.trim();
if (academicYear) {
  result = result.filter(item => item.academicYear === academicYear);
}

const room = filter.room?.trim();
if (room) {
  result = result.filter(item => item.room === room);
}

return result;
      })
    );
  }

  getClassById(id: number): Observable<ClassDetail> {
    return this.http
      .get<BackendClassDetailDto>(`${this.baseUrl}/${id}`)
      .pipe(map(detail => this.mapClassDetail(detail)));
  }

  getClassStats(id: number): Observable<ClassStats> {
    return this.getClassById(id).pipe(
      map(detail => ({
        totalStudents: detail.students.length,
        totalSubjects: detail.subjects.length,
        totalTeachers: new Set(
          detail.teacherSubjectRows
            .filter(row => row.assignedTeacherId !== null)
            .map(row => row.assignedTeacherId)
        ).size,
        averageScore: this.toNumber(detail.averageScore),
        attendanceRate: this.toNumber(detail.attendanceRate),
        examCount: detail.exams.length
      }))
    );
  }

  createClass(payload: CreateClassRequest): Observable<SchoolClass> {
    return this.http
      .post<BackendClassDetailDto>(this.baseUrl, payload)
      .pipe(map(detail => this.mapSchoolClass(detail)));
  }

  updateClass(id: number, payload: UpdateClassRequest): Observable<SchoolClass> {
    return this.http
      .put<BackendClassDetailDto>(`${this.baseUrl}/${id}`, payload)
      .pipe(map(detail => this.mapSchoolClass(detail)));
  }

  deleteClass(id: number): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.baseUrl}/${id}`);
  }

  private mapClassListItem(item: BackendClassListItemDto): ClassListItem {
    return {
      id: item.id,
      name: item.name ?? '',
      academicYear: item.academicYear ?? '',
      room: item.room ?? '',
      status: this.mapClassStatus(item.status),
      studentCount: this.toNumber(item.studentCount),
      subjectCount: this.toNumber(item.subjectCount),
      teacherCount: this.toNumber(item.teacherCount),
      averageScore: this.toNumber(item.averageScore)
    };
  }

  private mapClassDetail(detail: BackendClassDetailDto): ClassDetail {
    return {
      id: detail.id,
      name: detail.name ?? '',
      academicYear: detail.academicYear ?? '',
      room: detail.room ?? '',
      description: detail.description ?? '',
      status: this.mapClassStatus(detail.status),
      maxStudentCount: this.toNumber(detail.maxStudentCount),
      averageScore: this.toNumber(detail.averageScore),
      attendanceRate: this.toNumber(detail.attendanceRate),
      examCount: this.toNumber(detail.examCount),
      createdAt: detail.createdAt ?? '',
      students: (detail.students ?? []).map(student => this.mapStudentOption(student)),
      topStudents: (detail.topStudents ?? []).map(student => this.mapTopStudent(student)),
      subjects: (detail.subjects ?? []).map(subject => this.mapSubjectOption(subject)),
      exams: (detail.exams ?? []).map(exam => this.mapExamItem(exam)),
      teacherSubjectRows: (detail.teacherSubjectRows ?? []).map(row => this.mapTeacherSubjectRow(row))
    };
  }

  private mapSchoolClass(detail: BackendClassDetailDto): SchoolClass {
    const subjects = (detail.subjects ?? []).map(subject => this.mapSubjectOption(subject));
    const teacherSubjectRows = (detail.teacherSubjectRows ?? []).map(row =>
      this.mapTeacherSubjectRow(row)
    );

    return {
      id: detail.id,
      name: detail.name ?? '',
      academicYear: detail.academicYear ?? '',
      room: detail.room ?? '',
      description: detail.description ?? '',
      status: this.mapClassStatus(detail.status),
      maxStudentCount: this.toNumber(detail.maxStudentCount),
      averageScore: this.toNumber(detail.averageScore),
      attendanceRate: this.toNumber(detail.attendanceRate),
      examCount: this.toNumber(detail.examCount),
      subjects,
      teacherAssignments: this.mapTeacherAssignmentsView(subjects, teacherSubjectRows),
      students: (detail.students ?? []).map(student => this.mapStudentOption(student)),
      exams: (detail.exams ?? []).map(exam => this.mapExamItem(exam)),
      topStudents: (detail.topStudents ?? []).map(student => this.mapTopStudent(student)),
      teacherSubjectRows,
      createdAt: detail.createdAt ?? ''
    };
  }

  private mapTeacherAssignmentsView(
    subjects: SubjectOption[],
    teacherRows: ClassTeacherSubjectRow[]
  ): ClassTeacherAssignmentView[] {
    return subjects.map(subject => {
      const row = teacherRows.find(item => item.subjectId === subject.id);
      const teacher =
        row?.assignedTeacherId != null
          ? row.availableTeachers.find(item => item.id === row.assignedTeacherId) ?? null
          : null;

      return {
        subject,
        teacher
      };
    });
  }

  private mapSubjectOption(subject: BackendSubjectOptionDto): SubjectOption {
    return {
      id: subject.id,
      name: subject.name ?? '',
      code: subject.code ?? '',
      description: subject.description ?? ''
    };
  }

  private mapTeacherOption(teacher: BackendTeacherOptionDto): TeacherOption {
    return {
      id: teacher.id,
      fullName: teacher.fullName ?? '',
      email: teacher.email ?? '',
      photoUrl: teacher.photoUrl?.trim() ? teacher.photoUrl : this.getAvatarUrl(teacher.fullName),
      subjectIds: teacher.subjectIds ?? [],
      subjectNames: teacher.subjectNames ?? [],
      status: this.mapTeacherStatus(teacher.status)
    };
  }

  private mapStudentOption(student: BackendStudentOptionDto): StudentOption {
    return {
      id: student.id,
      fullName: student.fullName ?? '',
      email: student.email ?? '',
      photoUrl: student.photoUrl?.trim() ? student.photoUrl : this.getAvatarUrl(student.fullName),
      className: student.className ?? '',
      averageScore:
        student.averageScore == null ? undefined : this.toNumber(student.averageScore),
      attendanceRate:
        student.attendanceRate == null ? undefined : this.toNumber(student.attendanceRate),
      status: this.mapStudentStatus(student.status)
    };
  }

  private mapTopStudent(student: BackendTopStudentDto): ClassTopStudent {
    return {
      id: student.id,
      fullName: student.fullName ?? '',
      photoUrl: student.photoUrl?.trim() ? student.photoUrl : this.getAvatarUrl(student.fullName),
      email: student.email ?? '',
      averageScore: this.toNumber(student.averageScore)
    };
  }

  private mapExamItem(exam: BackendClassExamItemDto): ClassExamItem {
    return {
      id: exam.id,
      title: exam.title ?? '',
      subjectId: this.toNumber(exam.subjectId),
      subjectName: exam.subjectName ?? '',
      examDate: exam.examDate ?? '',
      durationMinutes: this.toNumber(exam.durationMinutes),
      totalScore: this.toNumber(exam.totalScore),
      status: this.mapExamStatus(exam.status)
    };
  }

  private mapTeacherSubjectRow(row: BackendTeacherSubjectRowDto): ClassTeacherSubjectRow {
    return {
      subjectId: this.toNumber(row.subjectId),
      subjectName: row.subjectName ?? '',
      subjectCode: row.subjectCode ?? '',
      assignedTeacherId: row.assignedTeacherId ?? null,
      assignedTeacherName: row.assignedTeacherName ?? 'Təyin edilməyib',
      availableTeachers: (row.availableTeachers ?? []).map(teacher => this.mapTeacherOption(teacher))
    };
  }

  private mapClassStatus(value: string): 'Aktiv' | 'Passiv' {
    return value === 'Passiv' ? 'Passiv' : 'Aktiv';
  }

  private mapTeacherStatus(value: string): 'Aktiv' | 'Passiv' | 'Məzuniyyət' {
    if (value === 'Passiv') {
      return 'Passiv';
    }

    if (value === 'Məzuniyyət') {
      return 'Məzuniyyət';
    }

    return 'Aktiv';
  }

  private mapStudentStatus(value: string): 'Aktiv' | 'Passiv' | 'Məzun' {
    if (value === 'Passiv') {
      return 'Passiv';
    }

    if (value === 'Məzun') {
      return 'Məzun';
    }

    return 'Aktiv';
  }

  private mapExamStatus(value: string): 'Planned' | 'Active' | 'Completed' {
    if (value === 'Active') {
      return 'Active';
    }

    if (value === 'Completed') {
      return 'Completed';
    }

    return 'Planned';
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private getAvatarUrl(name?: string): string {
    const safeName = encodeURIComponent((name ?? 'User').trim() || 'User');
    return `https://ui-avatars.com/api/?name=${safeName}&background=random`;
  }
}