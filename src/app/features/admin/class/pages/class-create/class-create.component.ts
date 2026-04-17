import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CreateClassRequest,
  StudentOption,
  SubjectOption,
  TeacherOption
} from '../../../../../core/models/class/class.model';
import { ClassService } from '../../data/class.service';

@Component({
  selector: 'app-class-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './class-create.component.html',
  styleUrls: ['./class-create.component.css']
})
export class ClassCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly classService = inject(ClassService);
  private readonly cdr = inject(ChangeDetectorRef); // YENI

  readonly classForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    academicYear: ['2025-2026', [Validators.required]],
    room: [''],
    status: ['Aktiv', [Validators.required]],
    maxStudentCount: [30, [Validators.required, Validators.min(1), Validators.max(60)]],
    description: ['']
  });

  isSubmitting = false;

  // Accordion state
  isSubjectsOpen = false;
  isTeachersOpen = false;
  isStudentsOpen = false;

  // Loading state
  isLoadingSubjects = false;
  isLoadingStudents = false;
  loadingTeachersBySubject: Record<number, boolean> = {};

  // Subject state
  subjectSearchText = '';
  availableSubjects: SubjectOption[] = [];
  selectedSubjects: SubjectOption[] = [];

  // Teacher state
  teacherOptionsBySubject: Record<number, TeacherOption[]> = {};
  teacherAssignments: Record<number, number | null> = {};

  // Student state
  studentSearchText = '';
  searchedStudents: StudentOption[] = [];
  selectedStudents: StudentOption[] = [];

  ngOnInit(): void {
    this.loadSubjects();
  }

  private refreshView(): void { // YENI
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  get f() {
    return this.classForm.controls;
  }

  get selectedStudentCount(): number {
    return this.selectedStudents.length;
  }

  get selectedSubjectCount(): number {
    return this.selectedSubjects.length;
  }

  get selectedTeacherCount(): number {
    return Object.values(this.teacherAssignments).filter(value => value !== null).length;
  }

  toggleSection(section: 'subjects' | 'teachers' | 'students'): void {
    if (section === 'subjects') {
      this.isSubjectsOpen = !this.isSubjectsOpen;
      this.refreshView(); // YENI
      return;
    }

    if (section === 'teachers') {
      this.isTeachersOpen = !this.isTeachersOpen;
      this.refreshView(); // YENI
      return;
    }

    this.isStudentsOpen = !this.isStudentsOpen;
    this.refreshView(); // YENI
  }

  loadSubjects(): void {
    this.isLoadingSubjects = true;
    this.refreshView(); // YENI

    this.classService.getSubjects(this.subjectSearchText).subscribe({
      next: response => {
        this.availableSubjects = [...(response ?? [])];
        this.isLoadingSubjects = false;
        this.refreshView(); // YENI
      },
      error: error => {
        this.availableSubjects = [];
        this.isLoadingSubjects = false;
        this.refreshView(); // YENI
        alert(this.getErrorMessage(error, 'Fənnlər yüklənərkən xəta baş verdi.'));
      }
    });
  }

  onSubjectSearchChange(value: string): void {
    this.subjectSearchText = value;
    this.refreshView(); // YENI
    this.loadSubjects();
  }

  toggleSubject(subject: SubjectOption): void {
    const exists = this.selectedSubjects.some(item => item.id === subject.id);

    if (exists) {
      this.selectedSubjects = this.selectedSubjects.filter(item => item.id !== subject.id);
      delete this.teacherAssignments[subject.id];
      delete this.teacherOptionsBySubject[subject.id];
      delete this.loadingTeachersBySubject[subject.id];
      this.refreshView(); // YENI
      return;
    }

    this.selectedSubjects = [...this.selectedSubjects, subject];
    this.teacherAssignments = {
      ...this.teacherAssignments,
      [subject.id]: null
    };
    this.refreshView(); // YENI
    this.loadTeachersForSubject(subject.id);
  }

  isSubjectSelected(subjectId: number): boolean {
    return this.selectedSubjects.some(item => item.id === subjectId);
  }

  loadTeachersForSubject(subjectId: number): void {
    this.loadingTeachersBySubject = {
      ...this.loadingTeachersBySubject,
      [subjectId]: true
    };
    this.refreshView(); // YENI

    this.classService.getTeachersBySubject(subjectId).subscribe({
      next: response => {
        this.teacherOptionsBySubject = {
          ...this.teacherOptionsBySubject,
          [subjectId]: [...(response ?? [])]
        };
        this.loadingTeachersBySubject = {
          ...this.loadingTeachersBySubject,
          [subjectId]: false
        };
        this.refreshView(); // YENI
      },
      error: error => {
        this.teacherOptionsBySubject = {
          ...this.teacherOptionsBySubject,
          [subjectId]: []
        };
        this.loadingTeachersBySubject = {
          ...this.loadingTeachersBySubject,
          [subjectId]: false
        };
        this.refreshView(); // YENI
        alert(this.getErrorMessage(error, 'Müəllimlər yüklənərkən xəta baş verdi.'));
      }
    });
  }

  getTeachersForSubject(subjectId: number): TeacherOption[] {
    return this.teacherOptionsBySubject[subjectId] ?? [];
  }

  onTeacherSelected(subjectId: number, value: string): void {
    this.teacherAssignments = {
      ...this.teacherAssignments,
      [subjectId]: value ? Number(value) : null
    };
    this.refreshView(); // YENI
  }

  clearTeacher(subjectId: number): void {
    this.teacherAssignments = {
      ...this.teacherAssignments,
      [subjectId]: null
    };
    this.refreshView(); // YENI
  }

  getTeacherName(subjectId: number): string {
    const teacherId = this.teacherAssignments[subjectId];

    if (teacherId == null) {
      return 'Təyin edilməyib';
    }

    const teacher = this.getTeachersForSubject(subjectId).find(item => item.id === teacherId);
    return teacher?.fullName ?? 'Təyin edilməyib';
  }

  onStudentSearchChange(value: string): void {
    this.studentSearchText = value;

    if (!value.trim()) {
      this.searchedStudents = [];
      this.isLoadingStudents = false;
      this.refreshView(); // YENI
      return;
    }

    this.isLoadingStudents = true;
    this.refreshView(); // YENI

    this.classService.searchStudents(value).subscribe({
      next: response => {
        const students = response ?? [];

        this.searchedStudents = [...students.filter(
          student => !this.selectedStudents.some(selected => selected.id === student.id)
        )];

        this.isLoadingStudents = false;
        this.refreshView(); // YENI
      },
      error: error => {
        this.searchedStudents = [];
        this.isLoadingStudents = false;
        this.refreshView(); // YENI
        alert(this.getErrorMessage(error, 'Şagird axtarışı zamanı xəta baş verdi.'));
      }
    });
  }

  addStudent(student: StudentOption): void {
    const exists = this.selectedStudents.some(item => item.id === student.id);

    if (exists) {
      return;
    }

    this.selectedStudents = [...this.selectedStudents, student];
    this.studentSearchText = '';
    this.searchedStudents = [];
    this.refreshView(); // YENI
  }

  removeStudent(studentId: number): void {
    this.selectedStudents = this.selectedStudents.filter(item => item.id !== studentId);
    this.refreshView(); // YENI
  }

  submit(): void {
    this.classForm.markAllAsTouched();

    if (this.classForm.invalid) {
      this.refreshView(); // YENI
      return;
    }

    const payload: CreateClassRequest = {
      name: (this.classForm.value.name ?? '').trim(),
      academicYear: (this.classForm.value.academicYear ?? '').trim(),
      room: (this.classForm.value.room ?? '').trim(),
      description: (this.classForm.value.description ?? '').trim(),
      status: (this.classForm.value.status as 'Aktiv' | 'Passiv') ?? 'Aktiv',
      maxStudentCount: Number(this.classForm.value.maxStudentCount ?? 0),
      subjectIds: this.selectedSubjects.map(subject => subject.id),
      teacherAssignments: this.selectedSubjects.map(subject => ({
        subjectId: subject.id,
        teacherId: this.teacherAssignments[subject.id] ?? null
      })),
      studentIds: this.selectedStudents.map(student => student.id)
    };

    this.isSubmitting = true;
    this.refreshView(); // YENI

    this.classService.createClass(payload).subscribe({
      next: response => {
        this.isSubmitting = false;
        this.refreshView(); // YENI
        alert(`Sinif uğurla yaradıldı: ${response.name}`);
        this.router.navigate(['/admin/classes']);
      },
      error: error => {
        this.isSubmitting = false;
        this.refreshView(); // YENI
        alert(this.getErrorMessage(error, 'Sinif yaradılarkən xəta baş verdi.'));
      }
    });
  }

  trackBySubjectId(_: number, item: SubjectOption): number {
    return item.id;
  }

  trackByStudentId(_: number, item: StudentOption): number {
    return item.id;
  }

  trackByTeacherId(_: number, item: TeacherOption): number {
    return item.id;
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