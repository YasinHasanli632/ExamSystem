import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import {
  ClassDetail,
  ClassListItem,
  ClassStats,
  ClassTeacherAssignment,
  ClassTeacherSubjectRow,
  StudentOption,
  SubjectOption,
  TeacherOption,
  UpdateClassRequest
} from '../../../../../core/models/class/class.model';
import { ClassService } from '../../data/class.service';

type ExamFilterStatus = '' | 'Planned' | 'Active' | 'Completed';
type StudentFilterStatus = '' | 'Aktiv' | 'Passiv' | 'Məzun';
type ClassListStatusFilter = '' | 'Aktiv' | 'Passiv';
type AttendanceUiStatus = 'Gəlib' | 'Gecikib' | 'İcazəli' | 'Yoxdur';
type TaskFilterStatus = '' | 'Pending' | 'Submitted' | 'Reviewed' | 'Late' | 'Missing';

interface AttendanceSessionSummaryApi {
  id: number;
  classRoomId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
}

interface AttendanceRecordApi {
  id: number;
  studentId: number;
  studentFullName: string;
  studentEmail: string;
  studentPhotoUrl: string;
  status: string;
  notes?: string | null;
}

interface AttendanceSessionDetailApi {
  id: number;
  classRoomId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  records: AttendanceRecordApi[];
}

interface AttendanceDayColumn {
  key: string;
  label: string;
  shortLabel: string;
  subjectName: string;
  teacherName: string;
}

interface AttendanceCell {
  sessionId: number;
  dateKey: string;
  status: AttendanceUiStatus;
  rawStatus: string;
  notes?: string | null;
}

interface AttendanceStudentRow {
  studentId: number;
  fullName: string;
  email: string;
  photoUrl: string;
  attendanceRate: number;
  status: StudentOption['status'];
  records: AttendanceCell[];
}

interface StudentTaskApi {
  id: number;
  title: string;
  subjectName: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  status: string;
  score: number;
  maxScore: number;
  link?: string | null;
  note?: string | null;
}

interface ClassTaskItem extends StudentTaskApi {
  studentId: number;
  studentFullName: string;
  studentEmail: string;
  studentPhotoUrl: string;
}

interface ClassEditForm {
  name: string;
  academicYear: string;
  room: string;
  description: string;
  status: 'Aktiv' | 'Passiv';
  maxStudentCount: number;
  teacherAssignments: Record<number, number | null>;
}

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './class-detail.component.html',
  styleUrls: ['./class-detail.component.css']
})
export class ClassDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly classService = inject(ClassService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef); // YENI

  readonly Math = Math;
  private readonly apiUrl = environment.apiUrl;

  readonly classDetail = signal<ClassDetail | null>(null);
  readonly originalClassDetail = signal<ClassDetail | null>(null);
  readonly classStats = signal<ClassStats | null>(null);

  readonly classList = signal<ClassListItem[]>([]);
  readonly availableSubjects = signal<SubjectOption[]>([]);
  readonly searchedStudents = signal<StudentOption[]>([]);
  readonly attendanceSessions = signal<AttendanceSessionDetailApi[]>([]);
  readonly classTasks = signal<ClassTaskItem[]>([]);

  visibleClassCount = 5;
  classSearch = '';
  classStatusFilter: ClassListStatusFilter = '';

  isLoading = true;
  isStatsLoading = true;
  isListLoading = false;
  isEditSubmitting = false;
  isAttendanceLoading = false;
  isTaskLoading = false;
  isOptionsLoading = false;
  loadError = '';

  selectedClassId: number | null = null;
  isListMode = true;
  isEditMode = false;

  editForm: ClassEditForm = this.createEmptyEditForm();

  examSearch = '';
  examStatusFilter: ExamFilterStatus = '';

  studentSearch = '';
  studentStatusFilter: StudentFilterStatus = '';

  teacherSearch = '';
  taskSearch = '';
  taskStatusFilter: TaskFilterStatus = '';

  attendanceSearch = '';
  attendanceStatusFilter: '' | AttendanceUiStatus = '';

  subjectSearchText = '';
  teacherOptionsBySubject: Record<number, TeacherOption[]> = {};
  teacherLoadingBySubject: Record<number, boolean> = {};

  readonly canEdit = computed(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) {
        return false;
      }

      const user = JSON.parse(raw);
      return user?.role === 'Admin' || user?.role === 'IsSuperAdmin';
    } catch {
      return false;
    }
  });

  readonly hasEditChanges = computed(() => {
    const original = this.originalClassDetail();
    const current = this.classDetail();

    if (!original || !current) {
      return false;
    }

    const originalAssignments = this.toTeacherAssignmentsMap(original.teacherSubjectRows);

    if ((this.editForm.name ?? '').trim() !== (original.name ?? '').trim()) {
      return true;
    }

    if ((this.editForm.academicYear ?? '').trim() !== (original.academicYear ?? '').trim()) {
      return true;
    }

    if ((this.editForm.room ?? '').trim() !== (original.room ?? '').trim()) {
      return true;
    }

    if ((this.editForm.description ?? '').trim() !== (original.description ?? '').trim()) {
      return true;
    }

    if (this.editForm.status !== original.status) {
      return true;
    }

    if (Number(this.editForm.maxStudentCount ?? 0) !== Number(original.maxStudentCount ?? 0)) {
      return true;
    }

    const originalSubjectIds = [...(original.subjects ?? [])].map(x => x.id).sort((a, b) => a - b);
    const currentSubjectIds = [...(current.subjects ?? [])].map(x => x.id).sort((a, b) => a - b);
    if (JSON.stringify(originalSubjectIds) !== JSON.stringify(currentSubjectIds)) {
      return true;
    }

    const originalStudentIds = [...(original.students ?? [])].map(x => x.id).sort((a, b) => a - b);
    const currentStudentIds = [...(current.students ?? [])].map(x => x.id).sort((a, b) => a - b);
    if (JSON.stringify(originalStudentIds) !== JSON.stringify(currentStudentIds)) {
      return true;
    }

    const subjectIds = new Set<number>([
      ...Object.keys(originalAssignments).map(Number),
      ...Object.keys(this.editForm.teacherAssignments).map(Number)
    ]);

    for (const subjectId of subjectIds) {
      const originalTeacherId = originalAssignments[subjectId] ?? null;
      const currentTeacherId = this.editForm.teacherAssignments[subjectId] ?? null;

      if (originalTeacherId !== currentTeacherId) {
        return true;
      }
    }

    return false;
  });

  readonly filteredClassList = computed(() => {
    let result = [...this.classList()];

    const term = this.classSearch.trim().toLowerCase();
    if (term) {
      result = result.filter(item =>
        `${item.name} ${item.academicYear} ${item.room} ${item.status}`
          .toLowerCase()
          .includes(term)
      );
    }

    if (this.classStatusFilter) {
      result = result.filter(item => item.status === this.classStatusFilter);
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly visibleFilteredClassList = computed(() => {
    return this.filteredClassList().slice(0, this.visibleClassCount);
  });

  readonly hasMoreClasses = computed(() => {
    return this.filteredClassList().length > this.visibleClassCount;
  });

  readonly filteredExams = computed(() => {
    const detail = this.classDetail();
    if (!detail) {
      return [];
    }

    let result = [...detail.exams];

    const examTerm = this.examSearch.trim().toLowerCase();
    if (examTerm) {
      result = result.filter(exam =>
        `${exam.title} ${exam.subjectName} ${exam.status}`
          .toLowerCase()
          .includes(examTerm)
      );
    }

    if (this.examStatusFilter) {
      result = result.filter(exam => exam.status === this.examStatusFilter);
    }

    return result.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
  });

  readonly filteredStudents = computed(() => {
    const detail = this.classDetail();
    if (!detail) {
      return [];
    }

    let result = [...detail.students];

    const studentTerm = this.studentSearch.trim().toLowerCase();
    if (studentTerm) {
      result = result.filter(student =>
        `${student.fullName} ${student.email} ${student.className ?? ''} ${student.status}`
          .toLowerCase()
          .includes(studentTerm)
      );
    }

    if (this.studentStatusFilter) {
      result = result.filter(student => student.status === this.studentStatusFilter);
    }

    return result.sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0));
  });

  readonly filteredTeacherRows = computed(() => {
    const detail = this.classDetail();
    if (!detail) {
      return [];
    }

    let result = [...detail.teacherSubjectRows];

    const teacherTerm = this.teacherSearch.trim().toLowerCase();
    if (teacherTerm) {
      result = result.filter(row =>
        `${row.subjectName} ${row.subjectCode ?? ''} ${row.assignedTeacherName}`
          .toLowerCase()
          .includes(teacherTerm)
      );
    }

    return result;
  });

  readonly filteredAvailableSubjects = computed(() => {
    const term = this.subjectSearchText.trim().toLowerCase();
    const selectedIds = new Set((this.classDetail()?.subjects ?? []).map(x => x.id));

    return this.availableSubjects().filter(subject => {
      const matchesTerm = !term
        || `${subject.name} ${subject.code ?? ''} ${subject.description ?? ''}`
            .toLowerCase()
            .includes(term);

      return matchesTerm || selectedIds.has(subject.id);
    });
  });

  readonly attendanceColumns = computed<AttendanceDayColumn[]>(() => {
    return [...this.attendanceSessions()]
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
      .map(session => {
        const date = new Date(session.sessionDate);
        return {
          key: this.toDateKey(date),
          label: date.toLocaleDateString('az-AZ', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit'
          }),
          shortLabel: date.toLocaleDateString('az-AZ', {
            day: '2-digit',
            month: '2-digit'
          }),
          subjectName: session.subjectName,
          teacherName: session.teacherName
        };
      });
  });

  readonly attendanceRows = computed<AttendanceStudentRow[]>(() => {
    const detail = this.classDetail();
    const sessions = this.attendanceSessions();

    if (!detail) {
      return [];
    }

    return detail.students.map(student => {
      const records = [...sessions]
        .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
        .map(session => {
          const record = session.records.find(x => x.studentId === student.id);

          return {
            sessionId: session.id,
            dateKey: this.toDateKey(new Date(session.sessionDate)),
            status: this.mapAttendanceStatus(record?.status),
            rawStatus: record?.status ?? 'Absent',
            notes: record?.notes ?? ''
          };
        });

      return {
        studentId: student.id,
        fullName: student.fullName,
        email: student.email,
        photoUrl: student.photoUrl,
        attendanceRate: student.attendanceRate ?? 0,
        status: student.status,
        records
      };
    });
  });

  readonly filteredAttendanceRows = computed(() => {
    let result = [...this.attendanceRows()];

    const term = this.attendanceSearch.trim().toLowerCase();
    if (term) {
      result = result.filter(row =>
        `${row.fullName} ${row.email} ${row.status}`
          .toLowerCase()
          .includes(term)
      );
    }

    if (this.attendanceStatusFilter) {
      result = result.filter(row =>
        row.records.some(record => record.status === this.attendanceStatusFilter)
      );
    }

    return result;
  });

  readonly filteredTasks = computed(() => {
    let result = [...this.classTasks()];

    const term = this.taskSearch.trim().toLowerCase();
    if (term) {
      result = result.filter(task =>
        `${task.title} ${task.subjectName} ${task.teacherName} ${task.studentFullName} ${task.status}`
          .toLowerCase()
          .includes(term)
      );
    }

    if (this.taskStatusFilter) {
      result = result.filter(task => task.status === this.taskStatusFilter);
    }

    return result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');

      this.resetModeState();

      if (!idParam) {
        this.isListMode = true;
        this.loadClassList();
        this.refreshView(); // YENI
        return;
      }

      const id = Number(idParam);

      if (!id || Number.isNaN(id)) {
        this.isListMode = false;
        this.loadError = 'Sinif identifikatoru düzgün deyil.';
        this.isLoading = false;
        this.isStatsLoading = false;
        this.refreshView(); // YENI
        return;
      }

      this.isListMode = false;
      this.selectedClassId = id;
      this.refreshView(); // YENI
      this.loadClassDetail(id);
      this.loadClassStats(id);
      this.loadAttendanceSessions(id);
    });
  }

  private refreshView(): void { // YENI
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  private createEmptyEditForm(): ClassEditForm {
    return {
      name: '',
      academicYear: '',
      room: '',
      description: '',
      status: 'Aktiv',
      maxStudentCount: 0,
      teacherAssignments: {}
    };
  }

  private resetModeState(): void {
    this.loadError = '';
    this.selectedClassId = null;
    this.visibleClassCount = 5;
    this.isEditMode = false;
    this.isEditSubmitting = false;

    this.classDetail.set(null);
    this.originalClassDetail.set(null);
    this.classStats.set(null);
    this.availableSubjects.set([]);
    this.searchedStudents.set([]);
    this.attendanceSessions.set([]);
    this.classTasks.set([]);
    this.teacherOptionsBySubject = {};
    this.teacherLoadingBySubject = {};
    this.editForm = this.createEmptyEditForm();

    this.examSearch = '';
    this.examStatusFilter = '';
    this.studentSearch = '';
    this.studentStatusFilter = '';
    this.teacherSearch = '';
    this.taskSearch = '';
    this.taskStatusFilter = '';
    this.attendanceSearch = '';
    this.attendanceStatusFilter = '';
    this.subjectSearchText = '';
    this.refreshView(); // YENI
  }

  loadClassList(): void {
    this.isListLoading = true;
    this.isLoading = false;
    this.isStatsLoading = false;
    this.loadError = '';
    this.refreshView(); // YENI

    this.classService.getClasses().subscribe({
      next: response => {
        this.classList.set([...(response ?? [])]);
        this.isListLoading = false;
        this.refreshView(); // YENI
      },
      error: () => {
        this.classList.set([]);
        this.loadError = 'Sinif siyahısı yüklənərkən xəta baş verdi.';
        this.isListLoading = false;
        this.refreshView(); // YENI
      }
    });
  }

  loadMoreClasses(): void {
    this.visibleClassCount += 5;
    this.refreshView(); // YENI
  }

  openClassDetail(classId: number): void {
    this.router.navigate(['/admin/classes/detail', classId]);
  }

  resetClassFilters(): void {
    this.classSearch = '';
    this.classStatusFilter = '';
    this.visibleClassCount = 5;
    this.refreshView(); // YENI
  }

  loadClassDetail(id: number): void {
    this.isLoading = true;
    this.loadError = '';
    this.refreshView(); // YENI

    this.classService.getClassById(id).subscribe({
      next: response => {
        const safeDetail: ClassDetail = {
          ...response,
          teacherSubjectRows: response.teacherSubjectRows.map(row => ({
            ...row,
            availableTeachers: [...row.availableTeachers]
          })),
          subjects: [...response.subjects],
          students: [...response.students],
          exams: [...response.exams],
          topStudents: [...response.topStudents]
        };

        this.classDetail.set({ ...safeDetail });
        this.originalClassDetail.set(this.cloneDetail(safeDetail));
        this.setEditFormFromDetail(safeDetail);
        this.loadStudentTasksForClass(safeDetail.students);
        this.isLoading = false;
        this.refreshView(); // YENI
      },
      error: () => {
        this.loadError = 'Sinif məlumatları yüklənərkən xəta baş verdi.';
        this.isLoading = false;
        this.refreshView(); // YENI
      }
    });
  }

  loadClassStats(id: number): void {
    this.isStatsLoading = true;
    this.refreshView(); // YENI

    this.classService.getClassStats(id).subscribe({
      next: response => {
        this.classStats.set(response ? { ...response } : null);
        this.isStatsLoading = false;
        this.refreshView(); // YENI
      },
      error: () => {
        this.isStatsLoading = false;
        this.refreshView(); // YENI
      }
    });
  }

  loadAttendanceSessions(classRoomId: number): void {
    this.isAttendanceLoading = true;
    this.refreshView(); // YENI

    this.http
      .get<AttendanceSessionSummaryApi[]>(`${this.apiUrl}/Attendance/classroom/${classRoomId}`)
      .subscribe({
        next: summaries => {
          const latest = [...(summaries ?? [])]
            .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
            .slice(0, 5);

          if (!latest.length) {
            this.attendanceSessions.set([]);
            this.isAttendanceLoading = false;
            this.refreshView(); // YENI
            return;
          }

          forkJoin(
            latest.map(item =>
              this.http
                .get<AttendanceSessionDetailApi>(`${this.apiUrl}/Attendance/${item.id}`)
                .pipe(catchError(() => of(null as AttendanceSessionDetailApi | null)))
            )
          ).subscribe({
            next: sessions => {
              this.attendanceSessions.set(
                [...sessions.filter(Boolean) as AttendanceSessionDetailApi[]]
              );
              this.isAttendanceLoading = false;
              this.refreshView(); // YENI
            },
            error: () => {
              this.attendanceSessions.set([]);
              this.isAttendanceLoading = false;
              this.refreshView(); // YENI
            }
          });
        },
        error: () => {
          this.attendanceSessions.set([]);
          this.isAttendanceLoading = false;
          this.refreshView(); // YENI
        }
      });
  }

  loadStudentTasksForClass(students: StudentOption[]): void {
    if (!students.length) {
      this.classTasks.set([]);
      this.refreshView(); // YENI
      return;
    }

    this.isTaskLoading = true;
    this.refreshView(); // YENI

    forkJoin(
      students.map(student =>
        this.http
          .get<StudentTaskApi[]>(`${this.apiUrl}/Student/${student.id}/tasks`)
          .pipe(
            map(tasks =>
              (tasks ?? []).map<ClassTaskItem>(task => ({
                ...task,
                studentId: student.id,
                studentFullName: student.fullName,
                studentEmail: student.email,
                studentPhotoUrl: student.photoUrl
              }))
            ),
            catchError(() => of([] as ClassTaskItem[]))
          )
      )
    ).subscribe({
      next: taskGroups => {
        this.classTasks.set([...taskGroups.flat()]);
        this.isTaskLoading = false;
        this.refreshView(); // YENI
      },
      error: () => {
        this.classTasks.set([]);
        this.isTaskLoading = false;
        this.refreshView(); // YENI
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/classes']);
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin/classes/add']);
  }

  startEdit(): void {
    const detail = this.classDetail();
    if (!detail || !this.canEdit()) {
      return;
    }

    this.setEditFormFromDetail(detail);
    this.isEditMode = true;
    this.refreshView(); // YENI
    this.loadEditOptions();
  }

  loadEditOptions(): void {
    this.isOptionsLoading = true;
    this.refreshView(); // YENI

    this.classService.getSubjects().subscribe({
      next: subjects => {
        this.availableSubjects.set([...(subjects ?? [])]);

        const rows = this.classDetail()?.teacherSubjectRows ?? [];
        for (const row of rows) {
          this.teacherOptionsBySubject[row.subjectId] = [...(row.availableTeachers ?? [])];
        }

        this.isOptionsLoading = false;
        this.refreshView(); // YENI
      },
      error: () => {
        this.availableSubjects.set([]);
        this.isOptionsLoading = false;
        this.refreshView(); // YENI
      }
    });
  }

  cancelEdit(): void {
    const original = this.originalClassDetail();
    if (!original) {
      this.isEditMode = false;
      this.refreshView(); // YENI
      return;
    }

    const restored = this.cloneDetail(original);
    this.classDetail.set(restored);
    this.setEditFormFromDetail(restored);
    this.searchedStudents.set([]);
    this.subjectSearchText = '';
    this.isEditMode = false;
    this.refreshView(); // YENI
  }

  saveEdit(): void {
    const detail = this.classDetail();
    if (!detail || !this.selectedClassId || !this.canEdit() || !this.hasEditChanges()) {
      return;
    }

    const payload: UpdateClassRequest = {
      name: (this.editForm.name ?? '').trim(),
      academicYear: (this.editForm.academicYear ?? '').trim(),
      room: (this.editForm.room ?? '').trim(),
      description: (this.editForm.description ?? '').trim(),
      status: this.editForm.status,
      maxStudentCount: Number(this.editForm.maxStudentCount ?? 0),
      subjectIds: (detail.subjects ?? []).map(subject => subject.id),
      teacherAssignments: (detail.teacherSubjectRows ?? []).map<ClassTeacherAssignment>(row => ({
        subjectId: row.subjectId,
        teacherId: this.editForm.teacherAssignments[row.subjectId] ?? null
      })),
      studentIds: (detail.students ?? []).map(student => student.id)
    };

    this.isEditSubmitting = true;
    this.refreshView(); // YENI

    this.classService.updateClass(this.selectedClassId, payload).subscribe({
      next: () => {
        this.isEditSubmitting = false;
        this.isEditMode = false;
        this.refreshView(); // YENI
        this.loadClassDetail(this.selectedClassId!);
        this.loadClassStats(this.selectedClassId!);
        this.loadAttendanceSessions(this.selectedClassId!);
      },
      error: error => {
        this.isEditSubmitting = false;
        this.refreshView(); // YENI
        alert(this.getErrorMessage(error, 'Düzəlişlər yadda saxlanılarkən xəta baş verdi.'));
      }
    });
  }

  navigateToCreateExam(): void {
    if (!this.selectedClassId) {
      return;
    }

    this.router.navigate(['/admin/exams/create'], {
      queryParams: { classId: this.selectedClassId }
    });
  }

  navigateToStudentDetail(studentId: number): void {
    this.router.navigate(['/admin/users/students', studentId]);
  }

  onSubjectSearchChange(value: string): void {
    this.subjectSearchText = value;
    this.refreshView(); // YENI
  }

  isSubjectSelected(subjectId: number): boolean {
    return (this.classDetail()?.subjects ?? []).some(x => x.id === subjectId);
  }

  toggleSubject(subject: SubjectOption): void {
    if (!this.isEditMode) {
      return;
    }

    const detail = this.classDetail();
    if (!detail) {
      return;
    }

    const exists = detail.subjects.some(item => item.id === subject.id);

    if (exists) {
      const updatedSubjects = detail.subjects.filter(item => item.id !== subject.id);
      const updatedRows = detail.teacherSubjectRows.filter(item => item.subjectId !== subject.id);

      delete this.editForm.teacherAssignments[subject.id];
      delete this.teacherOptionsBySubject[subject.id];
      delete this.teacherLoadingBySubject[subject.id];

      this.classDetail.set({
        ...detail,
        subjects: [...updatedSubjects],
        teacherSubjectRows: [...updatedRows]
      });
      this.refreshView(); // YENI
      return;
    }

    const newRow: ClassTeacherSubjectRow = {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code ?? '',
      assignedTeacherId: null,
      assignedTeacherName: 'Təyin edilməyib',
      availableTeachers: []
    };

    this.editForm.teacherAssignments = {
      ...this.editForm.teacherAssignments,
      [subject.id]: null
    };

    this.classDetail.set({
      ...detail,
      subjects: [...detail.subjects, subject],
      teacherSubjectRows: [...detail.teacherSubjectRows, newRow]
    });
    this.refreshView(); // YENI

    this.loadTeachersForSubject(subject.id);
  }

  loadTeachersForSubject(subjectId: number): void {
    this.teacherLoadingBySubject = {
      ...this.teacherLoadingBySubject,
      [subjectId]: true
    };
    this.refreshView(); // YENI

    this.classService.getTeachersBySubject(subjectId).subscribe({
      next: teachers => {
        const safeTeachers = [...(teachers ?? [])];
        this.teacherOptionsBySubject = {
          ...this.teacherOptionsBySubject,
          [subjectId]: safeTeachers
        };
        this.teacherLoadingBySubject = {
          ...this.teacherLoadingBySubject,
          [subjectId]: false
        };

        const detail = this.classDetail();
        if (!detail) {
          this.refreshView(); // YENI
          return;
        }

        this.classDetail.set({
          ...detail,
          teacherSubjectRows: detail.teacherSubjectRows.map(row =>
            row.subjectId === subjectId
              ? { ...row, availableTeachers: [...safeTeachers] }
              : row
          )
        });
        this.refreshView(); // YENI
      },
      error: () => {
        this.teacherOptionsBySubject = {
          ...this.teacherOptionsBySubject,
          [subjectId]: []
        };
        this.teacherLoadingBySubject = {
          ...this.teacherLoadingBySubject,
          [subjectId]: false
        };
        this.refreshView(); // YENI
      }
    });
  }

  onStudentSearchChange(value: string): void {
    if (!this.isEditMode) {
      return;
    }

    if (!value.trim()) {
      this.searchedStudents.set([]);
      this.refreshView(); // YENI
      return;
    }

    this.classService.searchStudents(value).subscribe({
      next: students => {
        const existingIds = new Set((this.classDetail()?.students ?? []).map(x => x.id));
        this.searchedStudents.set([...(students ?? []).filter(student => !existingIds.has(student.id))]);
        this.refreshView(); // YENI
      },
      error: () => {
        this.searchedStudents.set([]);
        this.refreshView(); // YENI
      }
    });
  }

  addStudent(student: StudentOption): void {
    if (!this.isEditMode) {
      return;
    }

    const detail = this.classDetail();
    if (!detail) {
      return;
    }

    if (detail.students.some(x => x.id === student.id)) {
      return;
    }

    const updatedStudents = [...detail.students, student];

    this.classDetail.set({
      ...detail,
      students: [...updatedStudents]
    });

    this.searchedStudents.set([]);
    this.refreshView(); // YENI
    this.loadStudentTasksForClass(updatedStudents);
  }

  removeStudent(studentId: number): void {
    if (!this.isEditMode) {
      return;
    }

    const detail = this.classDetail();
    if (!detail) {
      return;
    }

    const updatedStudents = detail.students.filter(x => x.id !== studentId);

    this.classDetail.set({
      ...detail,
      students: [...updatedStudents]
    });

    this.refreshView(); // YENI
    this.loadStudentTasksForClass(updatedStudents);
  }

  onTeacherChanged(row: ClassTeacherSubjectRow, teacherIdValue: string | number | null): void {
    if (!this.isEditMode) {
      return;
    }

    const normalized =
      teacherIdValue === null || teacherIdValue === '' ? null : Number(teacherIdValue);

    this.editForm.teacherAssignments = {
      ...this.editForm.teacherAssignments,
      [row.subjectId]: normalized && !Number.isNaN(normalized) ? normalized : null
    };

    const detail = this.classDetail();
    if (!detail) {
      this.refreshView(); // YENI
      return;
    }

    const availableTeachers =
      row.availableTeachers?.length > 0
        ? row.availableTeachers
        : this.teacherOptionsBySubject[row.subjectId] ?? [];

    const selectedTeacher =
      availableTeachers.find(
        teacher => teacher.id === this.editForm.teacherAssignments[row.subjectId]
      ) ?? null;

    const updatedRows = detail.teacherSubjectRows.map(item => {
      if (item.subjectId !== row.subjectId) {
        return item;
      }

      return {
        ...item,
        availableTeachers: [...availableTeachers],
        assignedTeacherId: selectedTeacher?.id ?? null,
        assignedTeacherName: selectedTeacher?.fullName ?? 'Təyin edilməyib'
      };
    });

    this.classDetail.set({
      ...detail,
      teacherSubjectRows: [...updatedRows]
    });
    this.refreshView(); // YENI
  }

  getAssignedTeacher(row: ClassTeacherSubjectRow): TeacherOption | null {
    return row.availableTeachers.find(teacher => teacher.id === row.assignedTeacherId) ?? null;
  }

  getTeacherOptionsForRow(row: ClassTeacherSubjectRow): TeacherOption[] {
    if (row.availableTeachers?.length > 0) {
      return row.availableTeachers;
    }

    return this.teacherOptionsBySubject[row.subjectId] ?? [];
  }

  getStudentCountLabel(): string {
    const detail = this.classDetail();
    if (!detail) {
      return '0 / 0';
    }

    return `${detail.students.length} / ${this.editForm.maxStudentCount || detail.maxStudentCount}`;
  }

  getStudentCapacityPercent(): number {
    const detail = this.classDetail();
    const maxCount = this.editForm.maxStudentCount || detail?.maxStudentCount || 0;

    if (!detail || !maxCount) {
      return 0;
    }

    return Math.min(100, Math.round((detail.students.length / maxCount) * 100));
  }

  getExamStatusLabel(status: string): string {
    switch (status) {
      case 'Planned':
        return 'Planlaşdırılıb';
      case 'Active':
        return 'Aktiv';
      case 'Completed':
        return 'Tamamlanıb';
      default:
        return status;
    }
  }

  getExamStatusClass(status: string): string {
    switch (status) {
      case 'Planned':
        return 'planned';
      case 'Active':
        return 'active';
      case 'Completed':
        return 'completed';
      default:
        return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Aktiv':
        return 'active';
      case 'Passiv':
        return 'passive';
      case 'Məzun':
        return 'graduated';
      default:
        return '';
    }
  }

  getTeacherStatusClass(status: string): string {
    switch (status) {
      case 'Aktiv':
        return 'active';
      case 'Passiv':
        return 'passive';
      case 'Məzuniyyət':
        return 'leave';
      default:
        return '';
    }
  }

  getAttendanceStatusClass(status: AttendanceUiStatus): string {
    switch (status) {
      case 'Gəlib':
        return 'present';
      case 'Gecikib':
        return 'late';
      case 'İcazəli':
        return 'excused';
      case 'Yoxdur':
        return 'absent';
      default:
        return '';
    }
  }

  getAttendanceStatusShort(status: AttendanceUiStatus): string {
    switch (status) {
      case 'Gəlib':
        return 'G';
      case 'Gecikib':
        return 'Q';
      case 'İcazəli':
        return 'İ';
      case 'Yoxdur':
        return 'Y';
      default:
        return '-';
    }
  }

  getAttendanceSummary(row: AttendanceStudentRow): string {
    const presentCount = row.records.filter(record => record.status === 'Gəlib').length;
    const lateCount = row.records.filter(record => record.status === 'Gecikib').length;
    const excusedCount = row.records.filter(record => record.status === 'İcazəli').length;
    const absentCount = row.records.filter(record => record.status === 'Yoxdur').length;

    return `G: ${presentCount} • Q: ${lateCount} • İ: ${excusedCount} • Y: ${absentCount}`;
  }

  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'planned';
      case 'Submitted':
        return 'active';
      case 'Reviewed':
        return 'completed';
      case 'Late':
        return 'late-task';
      case 'Missing':
        return 'missing-task';
      default:
        return '';
    }
  }

  getActiveStudentsCount(): number {
    return this.classDetail()?.students.filter(student => student.status === 'Aktiv').length ?? 0;
  }

  getPassiveStudentsCount(): number {
    return this.classDetail()?.students.filter(student => student.status === 'Passiv').length ?? 0;
  }

  getGraduatedStudentsCount(): number {
    return this.classDetail()?.students.filter(student => student.status === 'Məzun').length ?? 0;
  }

  getCompletedExamCount(): number {
    return this.classDetail()?.exams.filter(exam => exam.status === 'Completed').length ?? 0;
  }

  getActiveExamCount(): number {
    return this.classDetail()?.exams.filter(exam => exam.status === 'Active').length ?? 0;
  }

  getPlannedExamCount(): number {
    return this.classDetail()?.exams.filter(exam => exam.status === 'Planned').length ?? 0;
  }

  getUniqueTeacherCount(): number {
    const detail = this.classDetail();
    if (!detail) {
      return 0;
    }

    const ids = new Set(
      detail.teacherSubjectRows
        .filter(row => row.assignedTeacherId)
        .map(row => row.assignedTeacherId)
    );

    return ids.size;
  }

  getTopStudentsAverage(): number {
    const detail = this.classDetail();
    if (!detail?.topStudents?.length) {
      return 0;
    }

    const total = detail.topStudents.reduce((sum, student) => sum + student.averageScore, 0);
    return Number((total / detail.topStudents.length).toFixed(1));
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackByStudent(index: number, item: StudentOption): number {
    return item.id;
  }

  trackByTeacherRow(index: number, item: ClassTeacherSubjectRow): number {
    return item.subjectId;
  }

  trackByClass(index: number, item: ClassListItem): number {
    return item.id;
  }

  trackByAttendanceRow(index: number, item: AttendanceStudentRow): number {
    return item.studentId;
  }

  trackByTask(index: number, item: ClassTaskItem): number {
    return item.id;
  }

  private setEditFormFromDetail(detail: ClassDetail): void {
    this.editForm = {
      name: detail.name ?? '',
      academicYear: detail.academicYear ?? '',
      room: detail.room ?? '',
      description: detail.description ?? '',
      status: detail.status,
      maxStudentCount: Number(detail.maxStudentCount ?? 0),
      teacherAssignments: { ...this.toTeacherAssignmentsMap(detail.teacherSubjectRows) }
    };
    this.refreshView(); // YENI
  }

  private toTeacherAssignmentsMap(
    rows: ClassTeacherSubjectRow[]
  ): Record<number, number | null> {
    const map: Record<number, number | null> = {};

    for (const row of rows ?? []) {
      map[row.subjectId] = row.assignedTeacherId ?? null;
    }

    return map;
  }

  private cloneDetail(detail: ClassDetail): ClassDetail {
    return {
      ...detail,
      students: [...detail.students],
      topStudents: [...detail.topStudents],
      subjects: [...detail.subjects],
      exams: [...detail.exams],
      teacherSubjectRows: detail.teacherSubjectRows.map(row => ({
        ...row,
        availableTeachers: [...row.availableTeachers]
      }))
    };
  }

  private toDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private mapAttendanceStatus(value?: string): AttendanceUiStatus {
    switch ((value ?? '').toLowerCase()) {
      case 'present':
        return 'Gəlib';
      case 'late':
        return 'Gecikib';
      case 'excused':
        return 'İcazəli';
      case 'absent':
      default:
        return 'Yoxdur';
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const data = error.error;

      if (typeof data === 'string' && data.trim()) {
        return data;
      }

      if (data?.message && typeof data.message === 'string') {
        return data.message;
      }

      if (data?.title && typeof data.title === 'string') {
        return data.title;
      }

      if (data?.errors && typeof data.errors === 'object') {
        const messages = Object.values(data.errors)
          .flatMap(value => (Array.isArray(value) ? value : [value]))
          .filter(Boolean)
          .map(value => String(value));

        if (messages.length > 0) {
          return messages.join('\n');
        }
      }
    }

    return fallback;
  }
}