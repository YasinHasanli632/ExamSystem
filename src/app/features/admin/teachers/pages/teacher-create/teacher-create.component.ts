import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  SubjectOptionDto,
  TeacherApiStatus,
  TeacherStatus
} from '../../../../../core/models/teacher/teacher.model';
import { TeacherService } from '../../data/teacher.service';
import { parseApiError } from '../../../../../core/utils/api-error.util';

@Component({
  selector: 'app-teacher-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './teacher-create.component.html',
  styleUrls: ['./teacher-create.component.scss']
})
export class TeacherCreateComponent {
  // YENI
  private readonly cdr = inject(ChangeDetectorRef);

  teacherForm: FormGroup;

  subjectOptions: SubjectOptionDto[] = [];
  selectedSubjectIds: number[] = [];

  isSubmitting = false;
  loadingLookups = true;

  errorTitle = '';
  errorMessage = '';
  errorDetails: string[] = [];

  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private teacherService: TeacherService
  ) {
    this.teacherForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      fatherName: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      country: ['Azərbaycan'],
      age: [null, [Validators.min(18), Validators.max(80)]],
      status: ['Aktiv', [Validators.required]],
      department: ['General', [Validators.required]],
      specialization: ['', [Validators.required]],
      photoUrl: ['https://i.pravatar.cc/300?img=32'],
      details: ['']
    });

    this.loadLookups();
  }

  // YENI
  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  get f() {
    return this.teacherForm.controls;
  }

  get hasError(): boolean {
    return !!this.errorMessage;
  }

  clearMessages(): void {
    this.errorTitle = '';
    this.errorMessage = '';
    this.errorDetails = [];
    this.successMessage = '';

    // YENI
    this.refreshView();
  }

  loadLookups(): void {
    this.loadingLookups = true;
    this.clearMessages();

    // YENI
    this.refreshView();

    this.teacherService.getSubjectOptions().subscribe({
      next: (subjects) => {
        this.subjectOptions = [...(subjects ?? [])];
        this.loadingLookups = false;

        // YENI
        this.refreshView();
      },
      error: (error) => {
        console.error('Subject lookup error:', error);

        const parsedError = parseApiError(error, 'Fənn siyahısı yüklənmədi.');

        this.errorTitle = parsedError.title;
        this.errorMessage = parsedError.message;
        this.errorDetails = [...parsedError.details];

        this.loadingLookups = false;

        // YENI
        this.refreshView();
      }
    });
  }

  toggleSubject(subjectId: number): void {
    const exists = this.selectedSubjectIds.includes(subjectId);

    if (exists) {
      this.selectedSubjectIds = this.selectedSubjectIds.filter(id => id !== subjectId);
    } else {
      this.selectedSubjectIds = [...this.selectedSubjectIds, subjectId];
    }

    // YENI
    this.refreshView();
  }

  isSubjectSelected(subjectId: number): boolean {
    return this.selectedSubjectIds.includes(subjectId);
  }

  getSubjectName(subjectId: number): string {
    return this.subjectOptions.find(x => x.id === subjectId)?.name ?? `#${subjectId}`;
  }

  get selectedSubjectNames(): string[] {
    return this.selectedSubjectIds.map(id => this.getSubjectName(id));
  }

  submit(): void {
    this.teacherForm.markAllAsTouched();
    this.clearMessages();

    if (this.teacherForm.invalid) {
      this.errorTitle = 'Form xətası';
      this.errorMessage = 'Form məlumatları tam və düzgün doldurulmalıdır.';

      // YENI
      this.refreshView();
      return;
    }

    if (this.selectedSubjectIds.length === 0) {
      this.errorTitle = 'Seçim tələb olunur';
      this.errorMessage = 'Ən azı 1 fənn seçilməlidir.';

      // YENI
      this.refreshView();
      return;
    }

    this.isSubmitting = true;

    // YENI
    this.refreshView();

    const formValue = this.teacherForm.getRawValue();
    const birthDate = this.buildBirthDateFromAge(formValue.age);
    const status = formValue.status as TeacherStatus;

    this.teacherService.createTeacher(
      {
        username: formValue.username,
        email: formValue.email,
        password: formValue.password,
        role: 'Teacher',
        isActive: status !== 'Passiv',
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        fatherName: formValue.fatherName || '',
        birthDate,
        phoneNumber: formValue.phone || null,
        country: formValue.country || null,
        photoUrl: formValue.photoUrl || null,
        details: formValue.details || null
      },
      {
        fullName: `${formValue.firstName} ${formValue.lastName}`.trim(),
        department: formValue.department,
        specialization: formValue.specialization || null,
        status: this.mapUiStatusToApi(status)
      },
      this.selectedSubjectIds,
      []
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Müəllim uğurla əlavə olundu. Siyahıya yönləndirilirsiniz...';

        // YENI
        this.refreshView();

        setTimeout(() => {
          this.router.navigate(['/admin/users/teachers']);
        }, 700);
      },
      error: (error) => {
        console.error('Teacher create error:', error);

        const parsedError = parseApiError(error, 'Müəllim yaradıla bilmədi.');

        this.isSubmitting = false;
        this.errorTitle = parsedError.title;
        this.errorMessage = parsedError.message;
        this.errorDetails = [...parsedError.details];

        // YENI
        this.refreshView();
      }
    });
  }

  private buildBirthDateFromAge(age: number | null): string | null {
    if (!age || age < 1) {
      return null;
    }

    const today = new Date();
    const birthDate = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
    return birthDate.toISOString();
  }
 
  private mapUiStatusToApi(status: TeacherStatus): TeacherApiStatus {
    switch (status) {
      case 'Passiv':
        return 0;
      case 'Məzuniyyət':
        return 2;
      default:
        return 1;
    }
  }
}