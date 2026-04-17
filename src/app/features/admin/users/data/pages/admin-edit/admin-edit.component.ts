import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs/operators';
import {
  UpdateUserRequest,
  UserDetail,
  UserRole
} from '../../../../../../core/models/user/user.model';
import { UserService } from '../../user.service';
import { AuthService } from '../../../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-edit.component.html',
  styleUrls: ['./admin-edit.component.css']
})
export class AdminEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  userId = 0;
  currentUser: UserDetail | null = null;

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    birthDate: [''],
    phoneNumber: ['', [Validators.maxLength(30)]],
    photoUrl: [''],
    details: ['', [Validators.maxLength(1000)]]
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(take(1)).subscribe({
      next: (params) => {
        const rawId = params.get('id');
        const id = Number(rawId);

        console.log('ADMIN EDIT ROUTE ID =>', rawId, id);

        if (!rawId || Number.isNaN(id) || id <= 0) {
          this.loading = false;
          this.errorMessage = 'İstifadəçi ID tapılmadı.';
          this.cdr.detectChanges();
          return;
        }

        this.userId = id;
        this.loadUser();
      },
      error: (err) => {
        console.error('ADMIN EDIT PARAM ERROR =>', err);
        this.loading = false;
        this.errorMessage = 'Route parametri oxunmadı.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadUser(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.currentUser = null;

    console.log('ADMIN EDIT LOAD START =>', this.userId);

    this.userService
      .getById(this.userId)
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (user) => {
          console.log('ADMIN EDIT LOAD RESPONSE =>', user);

          if (user.role === 'IsSuperAdmin' && !this.authService.isSuperAdmin()) {
            this.errorMessage = 'SuperAdmin məlumatını yalnız SuperAdmin redaktə edə bilər.';
            return;
          }

          this.currentUser = user;

          this.form.patchValue({
            username: user.username || '',
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            birthDate: this.normalizeDateForInput(user.birthDate),
            phoneNumber: user.phoneNumber || '',
            photoUrl: user.photoUrl || '',
            details: user.details || ''
          });

          this.form.markAsPristine();
        },
        error: (error) => {
          console.error('ADMIN EDIT LOAD ERROR =>', error);

          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Admin məlumatı yüklənmədi.';
        }
      });
  }

  submit(): void {
    if (this.form.invalid || !this.userId || !this.currentUser) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: UpdateUserRequest = {
      userId: this.userId,
      username: this.form.controls.username.value.trim(),
      email: this.form.controls.email.value.trim(),
      role: this.normalizeRole(this.currentUser.role),
      firstName: this.form.controls.firstName.value.trim(),
      lastName: this.form.controls.lastName.value.trim(),
      birthDate: this.form.controls.birthDate.value || null,
      phoneNumber: this.nullIfEmpty(this.form.controls.phoneNumber.value),
      photoUrl: this.nullIfEmpty(this.form.controls.photoUrl.value),
      details: this.nullIfEmpty(this.form.controls.details.value)
    };

    console.log('ADMIN EDIT UPDATE PAYLOAD =>', payload);

    this.userService
      .update(payload)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (updatedUser) => {
          console.log('ADMIN EDIT UPDATE RESPONSE =>', updatedUser);

          this.successMessage = 'Admin uğurla yeniləndi.';
          this.form.markAsPristine();

          const targetId = updatedUser?.userId || this.userId;

          setTimeout(() => {
            this.router.navigate(['/admin/users/admins', targetId]);
          }, 500);
        },
        error: (error) => {
          console.error('ADMIN EDIT UPDATE ERROR =>', error);

          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Admin yenilənərkən xəta baş verdi.';
        }
      });
  }

  refresh(): void {
    if (this.userId > 0) {
      this.loadUser();
    }
  }

  get previewName(): string {
    const firstName = this.form.controls.firstName.value?.trim() || '';
    const lastName = this.form.controls.lastName.value?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) {
      return fullName;
    }

    return this.form.controls.username.value?.trim() || 'Admin';
  }

  get previewRole(): string {
    const role = this.currentUser?.role;

    if (role === 'IsSuperAdmin') {
      return 'Super Admin';
    }

    if (role === 'Admin') {
      return 'Admin';
    }

    return role || '-';
  }

  get previewImage(): string {
    return (
      this.form.controls.photoUrl.value?.trim() ||
      'https://via.placeholder.com/120x120?text=Admin'
    );
  }

  get canShowUnsavedBadge(): boolean {
    return this.form.dirty && !this.isSubmitting;
  }

  hasError(controlName: keyof typeof this.form.controls, errorKey: string): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.touched && control.hasError(errorKey);
  }

  private normalizeDateForInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const text = String(value).trim();

    if (!text) {
      return '';
    }

    if (text.length >= 10) {
      return text.substring(0, 10);
    }

    return '';
  }

  private normalizeRole(role: string | null | undefined): UserRole {
    if (role === 'IsSuperAdmin') {
      return 'IsSuperAdmin';
    }

    return 'Admin';
  }

  private nullIfEmpty(value: string | null | undefined): string | null {
    const text = (value || '').trim();
    return text ? text : null;
  }
}