import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AttendanceStatus,
  ExamReviewQuestionType,
  ExamType,
  StudentAttendanceItem,
  StudentDetail,
  StudentExamItem,
  StudentExamReview,
  StudentTaskItem,
  StudentTaskStatus,
  StudentProfileEditFormValue,
  UpdateStudentProfileRequest,
  UpdateStudentTaskRequest,
  UpdateStudentUserRequest
} from '../../../../../core/models/students/student.model';
import { StudentsService } from '../../data/students.service';

type StudentStatus = 'Aktiv' | 'Passiv' | 'Məzun';
type TaskStatus = StudentTaskStatus;
type AttendanceUiStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
type ExamStatus = 'Passed' | 'Failed' | 'Reviewed' | 'Incomplete';
type QuestionType = 'MultipleChoice' | 'OpenEnded' | 'TrueFalse' | string;

interface StudentProfile {
  id: number;
  firstName: string;
  lastName: string;
  className: string;
  gender: string;
  status: StudentStatus;
  avatarUrl: string;
  email: string;
  phoneNumber: string;
  parentName: string;
  parentPhone: string;
  averageScore: number;
  examsCount: number;
  tasksCount: number;
  completedTasksCount: number;
  attendanceRate: number;
  absentCount: number;
  lateCount: number;
  address: string;
  notes: string;
}

interface StudentTask {
  id: number;
  title: string;
  subjectName: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  status: TaskStatus;
  score: number;
  maxScore: number;
  link: string;
  note: string;
  monthKey: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  dayName: string;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  status: AttendanceUiStatus;
  note: string;
  monthKey: string;
}

interface StudentExam {
  id: number;
  title: string;
  subjectName: string;
  teacherName: string;
  date: string;
  type: ExamType;
  score: number;
  maxScore: number;
  percentage: number;
  status: ExamStatus;
  note: string;
  monthKey: string;
  studentExamId: number;
}

interface ExamQuestionOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

interface ExamQuestion {
  id: number;
  examId: number;
  questionNo: number;
  type: QuestionType;
  questionText: string;
  options?: ExamQuestionOption[];
  correctAnswerText: string;
  studentAnswerText: string;
  awardedScore: number;
  maxScore: number;
  teacherFeedback: string;
}

interface StudentTaskFilter {
  month: string;
  subjectName: string;
  status: string;
  teacherName: string;
  minScore: number | null;
  maxScore: number | null;
  search: string;
}

interface AttendanceFilter {
  month: string;
  subjectName: string;
  status: string;
  teacherName: string;
  search: string;
}

interface ExamFilter {
  month: string;
  subjectName: string;
  type: string;
  status: string;
  teacherName: string;
  minScore: number | null;
  maxScore: number | null;
  search: string;
}

interface TaskEditForm {
  id: number | null;
  title: string;
  subjectName: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  status: TaskStatus;
  score: number | null;
  maxScore: number | null;
  link: string;
  note: string;
}

interface AttendanceEditForm {
  id: number | null;
  date: string;
  dayName: string;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  status: AttendanceUiStatus;
  note: string;
}

interface ExamEditForm {
  id: number | null;
  title: string;
  subjectName: string;
  teacherName: string;
  date: string;
  type: ExamType;
  score: number | null;
  maxScore: number | null;
  status: ExamStatus;
  note: string;
}

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-detail.component.html',
  styleUrls: ['./student-detail.component.css']
})
export class StudentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentsService = inject(StudentsService);
  private readonly cdr = inject(ChangeDetectorRef); // YENI

  activeTab: 'overview' | 'tasks' | 'attendance' | 'exams' | 'review' = 'overview';

  isLoading = false;
  isExamReviewLoading = false;
  errorMessage = '';
  examReviewError = '';

  // YENI
  saveErrorMessage = '';
  saveSuccessMessage = '';

  // YENI
  isProfileDrawerOpen = false;
  isProfileSaving = false;
  isTaskSaving = false;
  isAttendanceSaving = false;
  isExamSaving = false;

  studentId = 0;
  rawStudent: StudentDetail | null = null;

  student: StudentProfile = this.createEmptyStudentProfile();

  tasks: StudentTask[] = [];
  filteredTasks: StudentTask[] = [];

  attendanceRecords: AttendanceRecord[] = [];
  filteredAttendanceRecords: AttendanceRecord[] = [];

  exams: StudentExam[] = [];
  filteredExams: StudentExam[] = [];

  examQuestions: ExamQuestion[] = [];
  selectedExamForReview: StudentExam | null = null;

  taskFilter: StudentTaskFilter = {
    month: '',
    subjectName: '',
    status: '',
    teacherName: '',
    minScore: null,
    maxScore: null,
    search: ''
  };

  attendanceFilter: AttendanceFilter = {
    month: '',
    subjectName: '',
    status: '',
    teacherName: '',
    search: ''
  };

  examFilter: ExamFilter = {
    month: '',
    subjectName: '',
    type: '',
    status: '',
    teacherName: '',
    minScore: null,
    maxScore: null,
    search: ''
  };

  taskMonthOptions: string[] = [];
  taskSubjectOptions: string[] = [];
  taskTeacherOptions: string[] = [];

  attendanceMonthOptions: string[] = [];
  attendanceSubjectOptions: string[] = [];
  attendanceTeacherOptions: string[] = [];

  examMonthOptions: string[] = [];
  examSubjectOptions: string[] = [];
  examTeacherOptions: string[] = [];

  isTaskDrawerOpen = false;
  isAttendanceDrawerOpen = false;
  isExamDrawerOpen = false;

  // YENI
  profileEditForm: StudentProfileEditFormValue = this.createEmptyProfileEditForm();

  taskEditForm: TaskEditForm = this.createEmptyTaskForm();
  attendanceEditForm: AttendanceEditForm = this.createEmptyAttendanceForm();
  examEditForm: ExamEditForm = this.createEmptyExamForm();

  ngOnInit(): void {
    this.studentId = Number(this.route.snapshot.paramMap.get('id') ?? 0);

    if (!this.studentId) {
      this.errorMessage = 'Şagird ID tapılmadı.';
      this.refreshView(); // YENI
      return;
    }

    this.loadStudentDetail();
  }

  private refreshView(): void { // YENI
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  getTaskStatusLabel(status: TaskStatus): string {
    switch (status) {
      case 'Pending':
        return 'Gözləyir';
      case 'Submitted':
        return 'Təhvil verilib';
      case 'Reviewed':
        return 'Yoxlanılıb';
      case 'Late':
        return 'Gecikib';
      case 'Missing':
        return 'Təhvil verilməyib';
      default:
        return status;
    }
  }

  getAttendanceStatusLabel(status: AttendanceUiStatus): string {
    switch (status) {
      case 'Present':
        return 'İştirak edib';
      case 'Absent':
        return 'Qayıb';
      case 'Late':
        return 'Gecikib';
      case 'Excused':
        return 'İcazəli';
      default:
        return status;
    }
  }

  getExamStatusLabel(status: ExamStatus): string {
    switch (status) {
      case 'Passed':
        return 'Keçib';
      case 'Failed':
        return 'Uğursuz';
      case 'Reviewed':
        return 'Yoxlanılıb';
      case 'Incomplete':
        return 'Tamamlanmayıb';
      default:
        return status;
    }
  }

  getExamTypeLabel(type: ExamType): string {
    switch (type) {
      case 'Quiz':
        return 'Kiçik yoxlama';
      case 'Midterm':
        return 'Aralıq imtahan';
      case 'Final':
        return 'Yekun imtahan';
      case 'Practice':
        return 'Məşq imtahanı';
      default:
        return type;
    }
  }

  loadStudentDetail(showMainLoader = true): void {
    if (showMainLoader) {
      this.isLoading = true;
      this.refreshView(); // YENI
    }

    this.errorMessage = '';
    this.examReviewError = '';
    this.saveErrorMessage = '';
    this.saveSuccessMessage = '';
    this.examQuestions = [];
    this.selectedExamForReview = null;
    this.refreshView(); // YENI

    this.studentsService.getStudentById(this.studentId).subscribe({
      next: (response) => {
        this.rawStudent = { ...response };
        this.student = { ...this.mapStudentProfile(response) };
        this.tasks = [...((response.tasks ?? []).map((task) => this.mapTaskViewModel(task)))];
        this.attendanceRecords = [...((response.attendance ?? []).map((record) =>
          this.mapAttendanceViewModel(record)
        ))];
        this.exams = [...((response.exams ?? []).map((exam) => this.mapExamViewModel(exam)))];

        // YENI
        this.profileEditForm = { ...this.mapProfileEditForm(response) };

        this.prepareTaskOptions();
        this.prepareAttendanceOptions();
        this.prepareExamOptions();

        this.applyTaskFilters();
        this.applyAttendanceFilters();
        this.applyExamFilters();

        this.selectedExamForReview = this.exams[0] ? { ...this.exams[0] } : null;

        if (this.selectedExamForReview) {
          this.loadExamReview(this.selectedExamForReview);
        }

        this.isLoading = false;
        this.refreshView(); // YENI
      },
      error: (error) => {
        console.error('Student detail load error:', error);
        this.errorMessage = 'Şagird məlumatları yüklənmədi.';
        this.isLoading = false;
        this.refreshView(); // YENI
      }
    });
  }

  private loadExamReview(exam: StudentExam): void {
    if (!exam?.studentExamId || !this.studentId) {
      this.examQuestions = [];
      this.refreshView(); // YENI
      return;
    }

    this.isExamReviewLoading = true;
    this.examReviewError = '';
    this.refreshView(); // YENI

    this.studentsService.getExamReview(this.studentId, exam.studentExamId).subscribe({
      next: (review) => {
        this.examQuestions = [...this.mapExamReviewQuestions(review)];
        this.isExamReviewLoading = false;
        this.refreshView(); // YENI
      },
      error: (error) => {
        console.error('Exam review load error:', error);
        this.examQuestions = [];
        this.examReviewError = 'İmtahan review məlumatı yüklənmədi.';
        this.isExamReviewLoading = false;
        this.refreshView(); // YENI
      }
    });
  }

  private createEmptyStudentProfile(): StudentProfile {
    return {
      id: 0,
      firstName: '',
      lastName: '',
      className: '',
      gender: '',
      status: 'Aktiv',
      avatarUrl: '',
      email: '',
      phoneNumber: '',
      parentName: '',
      parentPhone: '',
      averageScore: 0,
      examsCount: 0,
      tasksCount: 0,
      completedTasksCount: 0,
      attendanceRate: 0,
      absentCount: 0,
      lateCount: 0,
      address: '',
      notes: ''
    };
  }

  private mapStudentProfile(student: StudentDetail): StudentProfile {
    return {
      id: student.id,
      firstName: student.firstName ?? '',
      lastName: student.lastName ?? '',
      className: student.className ?? 'Təyin edilməyib',
      gender: student.gender ?? 'Bilinmir',
      status: student.status,
      avatarUrl: student.photoUrl?.trim() || 'https://i.pravatar.cc/150?img=32',
      email: student.email ?? '',
      phoneNumber: student.phoneNumber ?? '',
      parentName: student.parentName ?? '-',
      parentPhone: student.parentPhone ?? '',
      averageScore: this.toNumber(student.averageScore),
      examsCount: student.examsCount ?? 0,
      tasksCount: student.tasksCount ?? 0,
      completedTasksCount: student.completedTasksCount ?? 0,
      attendanceRate: this.toNumber(student.attendanceRate),
      absentCount: student.absentCount ?? 0,
      lateCount: student.lateCount ?? 0,
      address: student.address ?? '',
      notes: student.notes ?? ''
    };
  }

  private mapTaskViewModel(task: StudentTaskItem): StudentTask {
    return {
      id: task.id,
      title: task.title ?? 'Tapşırıq',
      subjectName: task.subjectName ?? 'Fənn təyin edilməyib',
      teacherName: task.teacherName ?? 'Müəllim təyin edilməyib',
      assignedDate: task.assignedDate ?? '',
      dueDate: task.dueDate ?? '',
      status: task.status,
      score: this.toNumber(task.score),
      maxScore: this.toNumber(task.maxScore),
      link: task.link ?? '',
      note: task.note ?? '',
      monthKey: task.monthKey ?? this.toMonthKey(task.assignedDate ?? task.dueDate ?? '')
    };
  }

  private mapAttendanceViewModel(record: StudentAttendanceItem): AttendanceRecord {
    return {
      id: record.attendanceSessionId,
      date: record.sessionDate ?? '',
      dayName: this.getDayName(record.sessionDate),
      subjectName: record.subjectName ?? 'Fənn təyin edilməyib',
      teacherName: record.teacherName ?? 'Müəllim təyin edilməyib',
      startTime: record.startTime ?? '',
      endTime: record.endTime ?? '',
      status: this.mapAttendanceStatusToUi(record.status),
      note: record.note ?? '',
      monthKey: record.monthKey ?? this.toMonthKey(record.sessionDate ?? '')
    };
  }

  private mapExamViewModel(exam: StudentExamItem): StudentExam {
    return {
      id: exam.examId,
      studentExamId: exam.studentExamId,
      title: exam.examTitle ?? 'İmtahan',
      subjectName: exam.subjectName ?? 'Fənn təyin edilməyib',
      teacherName: exam.teacherName ?? 'Müəllim təyin edilməyib',
      date: exam.startTime ?? '',
      type: exam.examType,
      score: this.toNumber(exam.score),
      maxScore: this.toNumber(exam.maxScore),
      percentage: this.toNumber(exam.percentage),
      status: this.mapExamStatusFromResultLabel(exam.resultLabel, exam.isCompleted),
      note: exam.note ?? '',
      monthKey: exam.monthKey ?? this.toMonthKey(exam.startTime ?? '')
    };
  }

  private mapExamReviewQuestions(review: StudentExamReview): ExamQuestion[] {
    return (review.questions ?? []).map((question) => ({
      id: question.id,
      examId: question.examId,
      questionNo: question.questionNo,
      type: this.mapQuestionType(question.type),
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
    }));
  }

  // YENI
  private createEmptyProfileEditForm(): StudentProfileEditFormValue {
    return {
      userId: 0,
      studentId: 0,
      username: '',
      firstName: '',
      lastName: '',
      fatherName: '',
      email: '',
      phoneNumber: '',
      country: '',
      photoUrl: '',
      details: '',
      fullName: '',
      birthDate: '',
      dateOfBirth: '',
      studentNumber: '',
      classRoomId: null,
      status: 'Aktiv',
      notes: ''
    };
  }

  // YENI
  private mapProfileEditForm(student: StudentDetail): StudentProfileEditFormValue {
    const anyStudent = student as StudentDetail & {
      username?: string | null;
      fatherName?: string | null;
      country?: string | null;
      details?: string | null;
      classRoomId?: number | null;
    };

    return {
      userId: student.userId ?? 0,
      studentId: student.id ?? 0,
      username: anyStudent.username?.trim() || '',
      firstName: student.firstName ?? '',
      lastName: student.lastName ?? '',
      fatherName: anyStudent.fatherName?.trim() || '',
      email: student.email ?? '',
      phoneNumber: student.phoneNumber ?? '',
      country: anyStudent.country?.trim() || '',
      photoUrl: student.photoUrl ?? '',
      details: anyStudent.details ?? '',
      fullName: student.fullName ?? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
      birthDate: this.toInputDate(student.dateOfBirth),
      dateOfBirth: this.toInputDate(student.dateOfBirth),
      studentNumber: student.studentNumber ?? '',
      classRoomId: anyStudent.classRoomId ?? null,
      status: student.status ?? 'Aktiv',
      notes: student.notes ?? ''
    };
  }

  createEmptyTaskForm(): TaskEditForm {
    return {
      id: null,
      title: '',
      subjectName: '',
      teacherName: '',
      assignedDate: '',
      dueDate: '',
      status: 'Pending',
      score: 0,
      maxScore: 20,
      link: '',
      note: ''
    };
  }

  createEmptyAttendanceForm(): AttendanceEditForm {
    return {
      id: null,
      date: '',
      dayName: '',
      subjectName: '',
      teacherName: '',
      startTime: '',
      endTime: '',
      status: 'Present',
      note: ''
    };
  }

  createEmptyExamForm(): ExamEditForm {
    return {
      id: null,
      title: '',
      subjectName: '',
      teacherName: '',
      date: '',
      type: 'Quiz',
      score: 0,
      maxScore: 20,
      status: 'Reviewed',
      note: ''
    };
  }

  setTab(tab: 'overview' | 'tasks' | 'attendance' | 'exams' | 'review'): void {
    this.activeTab = tab;
    this.refreshView(); // YENI

    if (tab === 'review' && this.selectedExamForReview && !this.examQuestions.length) {
      this.loadExamReview(this.selectedExamForReview);
    }
  }

  getQuestionScorePercent(question: ExamQuestion): number {
    if (!question.maxScore) {
      return 0;
    }

    return Math.round((question.awardedScore / question.maxScore) * 100);
  }

  prepareTaskOptions(): void {
    this.taskMonthOptions = [...new Set(this.tasks.map((x) => x.monthKey).filter(Boolean))].sort();
    this.taskSubjectOptions = [...new Set(this.tasks.map((x) => x.subjectName).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'az')
    );
    this.taskTeacherOptions = [...new Set(this.tasks.map((x) => x.teacherName).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'az')
    );
    this.refreshView(); // YENI
  }

  prepareAttendanceOptions(): void {
    this.attendanceMonthOptions = [
      ...new Set(this.attendanceRecords.map((x) => x.monthKey).filter(Boolean))
    ].sort();
    this.attendanceSubjectOptions = [
      ...new Set(this.attendanceRecords.map((x) => x.subjectName).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b, 'az'));
    this.attendanceTeacherOptions = [
      ...new Set(this.attendanceRecords.map((x) => x.teacherName).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b, 'az'));
    this.refreshView(); // YENI
  }

  prepareExamOptions(): void {
    this.examMonthOptions = [...new Set(this.exams.map((x) => x.monthKey).filter(Boolean))].sort();
    this.examSubjectOptions = [...new Set(this.exams.map((x) => x.subjectName).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'az')
    );
    this.examTeacherOptions = [...new Set(this.exams.map((x) => x.teacherName).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'az')
    );
    this.refreshView(); // YENI
  }

  applyTaskFilters(): void {
    let result = [...this.tasks];

    const search = this.taskFilter.search.trim().toLowerCase();
    const subjectName = this.taskFilter.subjectName.trim().toLowerCase();
    const teacherName = this.taskFilter.teacherName.trim().toLowerCase();

    if (this.taskFilter.month) {
      result = result.filter((x) => x.monthKey === this.taskFilter.month);
    }

    if (subjectName) {
      result = result.filter((x) => x.subjectName.toLowerCase() === subjectName);
    }

    if (teacherName) {
      result = result.filter((x) => x.teacherName.toLowerCase().includes(teacherName));
    }

    if (this.taskFilter.status) {
      result = result.filter((x) => x.status === this.taskFilter.status);
    }

    if (this.taskFilter.minScore != null) {
      const min = Number(this.taskFilter.minScore);
      result = result.filter((x) => this.toNumber(x.score) >= min);
    }

    if (this.taskFilter.maxScore != null) {
      const max = Number(this.taskFilter.maxScore);
      result = result.filter((x) => this.toNumber(x.score) <= max);
    }

    if (search) {
      result = result.filter(
        (x) =>
          x.title.toLowerCase().includes(search) ||
          x.subjectName.toLowerCase().includes(search) ||
          x.teacherName.toLowerCase().includes(search) ||
          x.note.toLowerCase().includes(search)
      );
    }

    this.filteredTasks = [...result.sort(
      (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
    )];
    this.refreshView(); // YENI
  }

  resetTaskFilters(): void {
    this.taskFilter = {
      month: '',
      subjectName: '',
      status: '',
      teacherName: '',
      minScore: null,
      maxScore: null,
      search: ''
    };
    this.refreshView(); // YENI
    this.applyTaskFilters();
  }

  applyAttendanceFilters(): void {
    let result = [...this.attendanceRecords];

    const search = this.attendanceFilter.search.trim().toLowerCase();
    const subjectName = this.attendanceFilter.subjectName.trim().toLowerCase();
    const teacherName = this.attendanceFilter.teacherName.trim().toLowerCase();

    if (this.attendanceFilter.month) {
      result = result.filter((x) => x.monthKey === this.attendanceFilter.month);
    }

    if (subjectName) {
      result = result.filter((x) => x.subjectName.toLowerCase() === subjectName);
    }

    if (teacherName) {
      result = result.filter((x) => x.teacherName.toLowerCase().includes(teacherName));
    }

    if (this.attendanceFilter.status) {
      result = result.filter((x) => x.status === this.attendanceFilter.status);
    }

    if (search) {
      result = result.filter(
        (x) =>
          x.subjectName.toLowerCase().includes(search) ||
          x.teacherName.toLowerCase().includes(search) ||
          x.note.toLowerCase().includes(search) ||
          x.dayName.toLowerCase().includes(search)
      );
    }

    this.filteredAttendanceRecords = [...result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )];
    this.refreshView(); // YENI
  }

  resetAttendanceFilters(): void {
    this.attendanceFilter = {
      month: '',
      subjectName: '',
      status: '',
      teacherName: '',
      search: ''
    };
    this.refreshView(); // YENI
    this.applyAttendanceFilters();
  }

  applyExamFilters(): void {
    let result = [...this.exams];

    const search = this.examFilter.search.trim().toLowerCase();
    const subjectName = this.examFilter.subjectName.trim().toLowerCase();
    const teacherName = this.examFilter.teacherName.trim().toLowerCase();

    if (this.examFilter.month) {
      result = result.filter((x) => x.monthKey === this.examFilter.month);
    }

    if (subjectName) {
      result = result.filter((x) => x.subjectName.toLowerCase() === subjectName);
    }

    if (teacherName) {
      result = result.filter((x) => x.teacherName.toLowerCase().includes(teacherName));
    }

    if (this.examFilter.type) {
      result = result.filter((x) => x.type === this.examFilter.type);
    }

    if (this.examFilter.status) {
      result = result.filter((x) => x.status === this.examFilter.status);
    }

    if (this.examFilter.minScore != null) {
      const min = Number(this.examFilter.minScore);
      result = result.filter((x) => this.toNumber(x.score) >= min);
    }

    if (this.examFilter.maxScore != null) {
      const max = Number(this.examFilter.maxScore);
      result = result.filter((x) => this.toNumber(x.score) <= max);
    }

    if (search) {
      result = result.filter(
        (x) =>
          x.title.toLowerCase().includes(search) ||
          x.subjectName.toLowerCase().includes(search) ||
          x.teacherName.toLowerCase().includes(search) ||
          x.note.toLowerCase().includes(search)
      );
    }

    this.filteredExams = [...result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())];
    this.refreshView(); // YENI
  }

  resetExamFilters(): void {
    this.examFilter = {
      month: '',
      subjectName: '',
      type: '',
      status: '',
      teacherName: '',
      minScore: null,
      maxScore: null,
      search: ''
    };
    this.refreshView(); // YENI
    this.applyExamFilters();
  }

  // =========================================================
  // YENI
  // PROFIL EDIT
  // =========================================================

  openProfileDrawer(): void {
    if (!this.rawStudent) {
      return;
    }

    this.saveErrorMessage = '';
    this.saveSuccessMessage = '';
    this.profileEditForm = { ...this.mapProfileEditForm(this.rawStudent) };
    this.isProfileDrawerOpen = true;
    this.refreshView(); // YENI
  }

  closeProfileDrawer(): void {
    this.isProfileDrawerOpen = false;
    this.profileEditForm = this.createEmptyProfileEditForm();
    this.refreshView(); // YENI
  }

  saveProfileEdit(): void {
    if (!this.rawStudent || !this.profileEditForm.studentId || !this.profileEditForm.userId) {
      this.saveErrorMessage = 'Profil məlumatı tapılmadı.';
      this.refreshView(); // YENI
      return;
    }

    this.saveErrorMessage = '';
    this.saveSuccessMessage = '';

    const firstName = this.profileEditForm.firstName.trim();
    const lastName = this.profileEditForm.lastName.trim();
    const generatedFullName = `${firstName} ${lastName}`.trim();

    const userRequest: UpdateStudentUserRequest = {
      userId: this.profileEditForm.userId,
      username:
        this.profileEditForm.username.trim() ||
        (this.rawStudent as StudentDetail & { username?: string | null }).username?.trim() ||
        this.rawStudent.email ||
        `student${this.profileEditForm.userId}`,
      email: this.profileEditForm.email.trim(),
      role: 'Student',
      firstName,
      lastName,
      fatherName: this.profileEditForm.fatherName.trim(),
      birthDate: this.profileEditForm.birthDate || this.profileEditForm.dateOfBirth || null,
      phoneNumber: this.profileEditForm.phoneNumber.trim() || null,
      country: this.profileEditForm.country.trim() || null,
      photoUrl: this.profileEditForm.photoUrl.trim() || null,
      details: this.profileEditForm.details.trim() || null
    };

    const profileRequest: UpdateStudentProfileRequest = {
      id: this.profileEditForm.studentId,
      fullName: this.profileEditForm.fullName.trim() || generatedFullName,
      dateOfBirth: this.profileEditForm.dateOfBirth || this.profileEditForm.birthDate,
      studentNumber: this.profileEditForm.studentNumber.trim(),
      classRoomId: this.profileEditForm.classRoomId ?? null,
      status: this.studentsService.mapStudentStatusToApi(this.profileEditForm.status),
      notes: this.profileEditForm.notes.trim() || null
    };

    this.isProfileSaving = true;
    this.refreshView(); // YENI

    this.studentsService.updateStudentProfile(userRequest, profileRequest).subscribe({
      next: (updatedStudent) => {
        this.rawStudent = { ...updatedStudent };
        this.student = { ...this.mapStudentProfile(updatedStudent) };
        this.tasks = [...((updatedStudent.tasks ?? []).map((task) => this.mapTaskViewModel(task)))];
        this.attendanceRecords = [...((updatedStudent.attendance ?? []).map((record) =>
          this.mapAttendanceViewModel(record)
        ))];
        this.exams = [...((updatedStudent.exams ?? []).map((exam) => this.mapExamViewModel(exam)))];
        this.profileEditForm = { ...this.mapProfileEditForm(updatedStudent) };

        this.prepareTaskOptions();
        this.prepareAttendanceOptions();
        this.prepareExamOptions();

        this.applyTaskFilters();
        this.applyAttendanceFilters();
        this.applyExamFilters();

        this.saveSuccessMessage = 'Şagird məlumatları uğurla yeniləndi.';
        this.isProfileSaving = false;
        this.closeProfileDrawer();
        this.refreshView(); // YENI
      },
      error: (error) => {
        console.error('Student profile update error:', error);
        this.saveErrorMessage = this.extractErrorMessage(
          error,
          'Şagird məlumatları yenilənərkən xəta baş verdi.'
        );
        this.isProfileSaving = false;
        this.refreshView(); // YENI
      }
    });
  }

  // =========================================================
  // TASK EDIT
  // =========================================================

  openTaskDrawer(task: StudentTask): void {
    this.saveErrorMessage = '';
    this.saveSuccessMessage = '';

    this.taskEditForm = {
      id: task.id,
      title: task.title,
      subjectName: task.subjectName,
      teacherName: task.teacherName,
      assignedDate: this.toInputDate(task.assignedDate),
      dueDate: this.toInputDate(task.dueDate),
      status: task.status,
      score: task.score,
      maxScore: task.maxScore,
      link: task.link,
      note: task.note
    };
    this.isTaskDrawerOpen = true;
    this.refreshView(); // YENI
  }

  closeTaskDrawer(): void {
    this.isTaskDrawerOpen = false;
    this.taskEditForm = this.createEmptyTaskForm();
    this.refreshView(); // YENI
  }

  saveTaskEdit(): void {
    if (this.taskEditForm.id === null || !this.studentId) {
      this.saveErrorMessage = 'Tapşırıq məlumatı tapılmadı.';
      this.refreshView(); // YENI
      return;
    }

    this.saveErrorMessage = '';
    this.saveSuccessMessage = '';

    const request: UpdateStudentTaskRequest = {
      id: this.taskEditForm.id,
      title: this.taskEditForm.title.trim(),
      description: null,
      subjectId: null,
      teacherId: null,
      assignedDate: this.taskEditForm.assignedDate,
      dueDate: this.taskEditForm.dueDate,
      status: this.studentsService.mapTaskStatusToApi(this.taskEditForm.status),
      score: Number(this.taskEditForm.score ?? 0),
      maxScore: Number(this.taskEditForm.maxScore ?? 0),
      link: this.taskEditForm.link.trim() || null,
      note: this.taskEditForm.note.trim() || null
    };

    this.isTaskSaving = true;
    this.refreshView(); // YENI

    this.studentsService.updateStudentTask(this.studentId, request).subscribe({
      next: () => {
        this.saveSuccessMessage = 'Tapşırıq uğurla yeniləndi.';
        this.isTaskSaving = false;
        this.closeTaskDrawer();
        this.refreshView(); // YENI
        this.loadStudentDetail(false);
      },
      error: (error) => {
        console.error('Student task update error:', error);
        this.saveErrorMessage = this.extractErrorMessage(
          error,
          'Tapşırıq yenilənərkən xəta baş verdi.'
        );
        this.isTaskSaving = false;
        this.refreshView(); // YENI
      }
    });
  }

  // =========================================================
  // ATTENDANCE EDIT
  // HAL-HAZIRDA STRUKTUR SAXLANILIB
  // BACKEND ENDPOINT HAZIR OLANDA REAL SAVE QOŞULA BİLƏR
  // =========================================================

  openAttendanceDrawer(record: AttendanceRecord): void {
    this.saveErrorMessage = '';
    this.saveSuccessMessage = '';

    this.attendanceEditForm = {
      id: record.id,
      date: this.toInputDate(record.date),
      dayName: record.dayName,
      subjectName: record.subjectName,
      teacherName: record.teacherName,
      startTime: record.startTime,
      endTime: record.endTime,
      status: record.status,
      note: record.note
    };
    this.isAttendanceDrawerOpen = true;
    this.refreshView(); // YENI
  }

  closeAttendanceDrawer(): void {
    this.isAttendanceDrawerOpen = false;
    this.attendanceEditForm = this.createEmptyAttendanceForm();
    this.refreshView(); // YENI
  }

  saveAttendanceEdit(): void {
  if (this.attendanceEditForm.id === null || !this.studentId) {
    this.saveErrorMessage = 'Davamiyyət məlumatı tapılmadı.';
    this.refreshView();
    return;
  }

  this.saveErrorMessage = '';
  this.saveSuccessMessage = '';

  this.isAttendanceSaving = true;
  this.refreshView();

  const request = {
    attendanceSessionId: this.attendanceEditForm.id,
    status: this.studentsService.mapAttendanceStatusToApi(this.attendanceEditForm.status),
    note: this.attendanceEditForm.note.trim() || null
  };

  this.studentsService.updateStudentAttendance(this.studentId, request).subscribe({
    next: () => {
      this.saveSuccessMessage = 'Davamiyyət uğurla yeniləndi.';
      this.isAttendanceSaving = false;
      this.closeAttendanceDrawer();
      this.refreshView();
      this.loadStudentDetail(false);
    },
    error: (error) => {
      console.error('Student attendance update error:', error);
      this.saveErrorMessage = this.extractErrorMessage(
        error,
        'Davamiyyət yenilənərkən xəta baş verdi.'
      );
      this.isAttendanceSaving = false;
      this.refreshView();
    }
  });
}

  // =========================================================
  // EXAM EDIT
  // HAL-HAZIRDA STRUKTUR SAXLANILIB
  // BACKEND STUDENT RESULT UPDATE ENDPOINT HAZIR OLANDA REAL SAVE QOŞULA BİLƏR
  // =========================================================

  openExamDrawer(exam: StudentExam): void {
    this.saveErrorMessage = '';
    this.saveSuccessMessage = '';

    this.examEditForm = {
      id: exam.id,
      title: exam.title,
      subjectName: exam.subjectName,
      teacherName: exam.teacherName,
      date: this.toInputDate(exam.date),
      type: exam.type,
      score: exam.score,
      maxScore: exam.maxScore,
      status: exam.status,
      note: exam.note
    };
    this.isExamDrawerOpen = true;
    this.refreshView(); // YENI
  }

  closeExamDrawer(): void {
    this.isExamDrawerOpen = false;
    this.examEditForm = this.createEmptyExamForm();
    this.refreshView(); // YENI
  }

  saveExamEdit(): void {
    if (this.examEditForm.id === null) {
      this.saveErrorMessage = 'İmtahan məlumatı tapılmadı.';
      this.refreshView(); // YENI
      return;
    }

    this.saveErrorMessage = '';
    this.saveSuccessMessage = '';

    this.isExamSaving = true;
    this.refreshView(); // YENI

    this.exams = [...this.exams.map((exam) => {
      if (exam.id !== this.examEditForm.id) {
        return exam;
      }

      const score = Number(this.examEditForm.score ?? 0);
      const maxScore = Number(this.examEditForm.maxScore ?? 0);
      const percentage = this.calculatePercentage(score, maxScore);

      return {
        ...exam,
        title: this.examEditForm.title.trim(),
        subjectName: this.examEditForm.subjectName.trim(),
        teacherName: this.examEditForm.teacherName.trim(),
        date: this.examEditForm.date,
        type: this.examEditForm.type,
        score,
        maxScore,
        percentage,
        status: this.examEditForm.status,
        note: this.examEditForm.note.trim(),
        monthKey: this.toMonthKey(this.examEditForm.date)
      };
    })];

    if (this.selectedExamForReview?.id === this.examEditForm.id) {
      this.selectedExamForReview = this.exams.find((x) => x.id === this.examEditForm.id)
        ? { ...(this.exams.find((x) => x.id === this.examEditForm.id) as StudentExam) }
        : null;
    }

    this.prepareExamOptions();
    this.applyExamFilters();
    this.isExamSaving = false;
    this.saveSuccessMessage = 'İmtahan dəyişiklikləri lokal olaraq yeniləndi.';
    this.closeExamDrawer();
    this.refreshView(); // YENI
  }

  selectExamForReview(exam: StudentExam): void {
    this.selectedExamForReview = { ...exam };
    this.activeTab = 'review';
    this.refreshView(); // YENI
    this.loadExamReview(exam);
  }

  getExamQuestions(examId: number | undefined): ExamQuestion[] {
    if (!examId) {
      return [];
    }

    return this.examQuestions.filter((x) => x.examId === examId);
  }

  get recentTasks(): StudentTask[] {
    return [...this.tasks]
      .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())
      .slice(0, 3);
  }

  get recentAttendance(): AttendanceRecord[] {
    return [...this.attendanceRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }

  get recentExams(): StudentExam[] {
    return [...this.exams]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }

  get pendingTasksCount(): number {
    return this.tasks.filter(
      (x) => x.status === 'Pending' || x.status === 'Late' || x.status === 'Missing'
    ).length;
  }

  get presentCount(): number {
    return this.attendanceRecords.filter((x) => x.status === 'Present').length;
  }

  get attendanceTotalCount(): number {
    return this.attendanceRecords.length;
  }

  get failedExamCount(): number {
    return this.exams.filter((x) => x.status === 'Failed').length;
  }

  get reviewedTasksCount(): number {
    return this.tasks.filter((x) => x.status === 'Reviewed').length;
  }

  getTaskScorePercent(task: StudentTask): number {
    if (!task.maxScore) {
      return 0;
    }

    return Math.round((task.score / task.maxScore) * 100);
  }

  getExamScoreClass(percentage: number): string {
    if (percentage >= 85) {
      return 'score-good';
    }

    if (percentage >= 60) {
      return 'score-medium';
    }

    return 'score-bad';
  }

  getAttendanceStatusClass(status: AttendanceUiStatus): string {
    switch (status) {
      case 'Present':
        return 'attendance-present';
      case 'Absent':
        return 'attendance-absent';
      case 'Late':
        return 'attendance-late';
      case 'Excused':
        return 'attendance-excused';
      default:
        return '';
    }
  }

  getTaskStatusClass(status: TaskStatus): string {
    switch (status) {
      case 'Reviewed':
        return 'tag-success';
      case 'Submitted':
        return 'tag-info';
      case 'Pending':
        return 'tag-warning';
      case 'Late':
      case 'Missing':
        return 'tag-danger';
      default:
        return '';
    }
  }

  getExamStatusClass(status: ExamStatus): string {
    switch (status) {
      case 'Passed':
        return 'tag-success';
      case 'Reviewed':
        return 'tag-info';
      case 'Failed':
        return 'tag-danger';
      case 'Incomplete':
        return 'tag-warning';
      default:
        return '';
    }
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private mapAttendanceStatusToUi(status: AttendanceStatus): AttendanceUiStatus {
    switch (status) {
      case 'Gəlib':
        return 'Present';
      case 'Yoxdur':
        return 'Absent';
      case 'Gecikib':
        return 'Late';
      case 'İcazəli':
        return 'Excused';
      default:
        return 'Present';
    }
  }

  private mapExamStatusFromResultLabel(resultLabel: string, isCompleted: boolean): ExamStatus {
    if (!isCompleted) {
      return 'Incomplete';
    }

    const normalized = (resultLabel ?? '').trim().toLowerCase();

    if (
      normalized === 'əla' ||
      normalized === 'yaxşı' ||
      normalized === 'orta' ||
      normalized === 'keçib'
    ) {
      return normalized === 'orta' ? 'Passed' : normalized === 'keçib' ? 'Passed' : 'Reviewed';
    }

    if (normalized === 'zəif') {
      return 'Failed';
    }

    return 'Reviewed';
  }

  private mapQuestionType(type: ExamReviewQuestionType): QuestionType {
    const normalized = (type ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'multiplechoice':
        return 'MultipleChoice';
      case 'openended':
        return 'OpenEnded';
      case 'truefalse':
        return 'TrueFalse';
      default:
        return type;
    }
  }

  private getDayName(date: string | null | undefined): string {
    if (!date) {
      return '';
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const days = [
      'Bazar',
      'Bazar ertəsi',
      'Çərşənbə axşamı',
      'Çərşənbə',
      'Cümə axşamı',
      'Cümə',
      'Şənbə'
    ];

    return days[parsed.getDay()] ?? '';
  }

  private calculatePercentage(score: number, maxScore: number): number {
    if (!maxScore || maxScore <= 0) {
      return 0;
    }

    return Math.round((score / maxScore) * 100);
  }

  private toMonthKey(value: string): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value.slice(0, 7);
    }

    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    return `${parsed.getFullYear()}-${month}`;
  }

  // YENI
  private toInputDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    return `${parsed.getFullYear()}-${month}-${day}`;
  }

  // YENI
  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    const err = error as {
      error?: {
        message?: string;
        title?: string;
        errors?: Record<string, string[]>;
      };
      message?: string;
    };

    const validationErrors = err?.error?.errors;
    if (validationErrors) {
      const allMessages = Object.values(validationErrors)
        .flat()
        .filter(Boolean);

      if (allMessages.length) {
        return allMessages.join(' | ');
      }
    }

    return err?.error?.message || err?.error?.title || err?.message || fallbackMessage;
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