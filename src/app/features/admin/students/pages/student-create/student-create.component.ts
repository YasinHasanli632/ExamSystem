import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StudentClassOption, StudentStatus } from '../../../../../core/models/students/student.model';
import { StudentsService } from '../../data/students.service';
import { parseApiError } from '../../../../../core/utils/api-error.util';

@Component({
  selector: 'app-student-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './student-create.component.html',
  styleUrls: ['./student-create.component.css']
})
export class StudentCreateComponent {
  private readonly cdr = inject(ChangeDetectorRef); // YENI

  studentForm: FormGroup;

  classOptions: StudentClassOption[] = [];

  isSubmitting = false;
  loadingLookups = true;

  errorTitle = '';
  errorMessage = '';
  errorDetails: string[] = [];

  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly studentsService: StudentsService
  ) {
    this.studentForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],

      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      fatherName: [''],

      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      country: ['Azərbaycan'],

      birthDate: ['', [Validators.required]],
      studentNumber: ['', [Validators.required, Validators.minLength(3)]],

      classRoomId: [null],
      status: ['Aktiv', [Validators.required]],

      photoUrl: ['https://i.pravatar.cc/300?img=18'],
      details: [''],
      notes: ['']
    });

    this.loadLookups();
  }

  private refreshView(): void { // YENI
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  get f() {
    return this.studentForm.controls;
  }

  get hasError(): boolean {
    return !!this.errorMessage;
  }

  get statusOptions(): StudentStatus[] {
    return ['Aktiv', 'Passiv', 'Məzun'];
  }

  clearMessages(): void {
    this.errorTitle = '';
    this.errorMessage = '';
    this.errorDetails = [];
    this.successMessage = '';
    this.refreshView(); // YENI
  }

  loadLookups(): void {
    this.loadingLookups = true;
    this.clearMessages();
    this.refreshView(); // YENI

    this.studentsService.getClassOptions().subscribe({
      next: (classes) => {
        this.classOptions = [...(classes ?? [])];
        this.loadingLookups = false;
        this.refreshView(); // YENI
      },
      error: (error) => {
        console.error('Student class lookup error =>', error);

        const parsedError = parseApiError(error, 'Sinif siyahısı yüklənmədi.');

        this.errorTitle = parsedError.title;
        this.errorMessage = parsedError.message;
        this.errorDetails = [...parsedError.details];

        this.loadingLookups = false;
        this.refreshView(); // YENI
      }
    });
  }

  submit(): void {
    this.studentForm.markAllAsTouched();
    this.clearMessages();

    if (this.studentForm.invalid) {
      this.errorTitle = 'Form xətası';
      this.errorMessage = 'Form məlumatları tam və düzgün doldurulmalıdır.';
      this.refreshView(); // YENI
      return;
    }

    const formValue = this.studentForm.getRawValue();
    const status = formValue.status as StudentStatus;

    this.isSubmitting = true;
    this.refreshView(); // YENI

    this.studentsService.createStudent(
      {
        username: (formValue.username ?? '').trim(),
        email: (formValue.email ?? '').trim(),
        password: formValue.password,
        role: 'Student',
        isActive: status !== 'Passiv',
        firstName: (formValue.firstName ?? '').trim(),
        lastName: (formValue.lastName ?? '').trim(),
        fatherName: (formValue.fatherName ?? '').trim(),
        birthDate: formValue.birthDate ? this.toIsoDate(formValue.birthDate) : null,
        phoneNumber: this.nullIfEmpty(formValue.phone),
        country: this.nullIfEmpty(formValue.country),
        photoUrl: this.nullIfEmpty(formValue.photoUrl),
        details: this.nullIfEmpty(formValue.details)
      },
      {
        fullName: `${formValue.firstName} ${formValue.lastName}`.trim(),
        dateOfBirth: this.toIsoDate(formValue.birthDate)!,
        studentNumber: (formValue.studentNumber ?? '').trim(),
        classRoomId: formValue.classRoomId ? Number(formValue.classRoomId) : null,
        status: this.mapUiStatusToApi(status),
        notes: this.nullIfEmpty(formValue.notes)
      }
    ).subscribe({
      next: (createdStudent) => {
        this.isSubmitting = false;
        this.successMessage = 'Şagird uğurla əlavə olundu. Detail səhifəsinə yönləndirilirsiniz...';
        this.refreshView(); // YENI

        setTimeout(() => {
          this.router.navigate(['/admin/users/students', createdStudent.id]);
        }, 700);
      },
      error: (error) => {
        console.error('Student create error =>', error);

        const parsedError = parseApiError(error, 'Şagird yaradıla bilmədi.');

        this.isSubmitting = false;
        this.errorTitle = parsedError.title;
        this.errorMessage = parsedError.message;
        this.errorDetails = [...parsedError.details];
        this.refreshView(); // YENI
      }
    });
  }

  private mapUiStatusToApi(status: StudentStatus): number {
    switch (status) {
      case 'Passiv':
        return 0;
      case 'Məzun':
        return 2;
      default:
        return 1;
    }
  }

  private nullIfEmpty(value: string | null | undefined): string | null {
    const normalized = (value ?? '').trim();
    return normalized ? normalized : null;
  }

  private toIsoDate(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }
}