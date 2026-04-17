import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../user.service';
import { CreateUserRequest, UserRole } from '../../../../../../../app/core/models/user/user.model';

@Component({
  selector: 'app-admin-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-create.component.html',
  styleUrls: ['./admin-create.component.css']
})
export class AdminCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  readonly roleOptions: UserRole[] = ['Admin', 'IsSuperAdmin'];

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Admin' as UserRole, [Validators.required]],
    isActive: [true],

    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    birthDate: [''],
    phoneNumber: [''],
    photoUrl: [''],
    details: ['']
  });

  get fullNamePreview(): string {
    const firstName = this.form.controls.firstName.value?.trim();
    const lastName = this.form.controls.lastName.value?.trim();
    return `${firstName} ${lastName}`.trim() || 'Ad Soyad';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: CreateUserRequest = {
      username: this.form.controls.username.value.trim(),
      email: this.form.controls.email.value.trim(),
      password: this.form.controls.password.value,
      role: this.form.controls.role.value,
      isActive: this.form.controls.isActive.value,

      firstName: this.form.controls.firstName.value.trim(),
      lastName: this.form.controls.lastName.value.trim(),
      birthDate: this.form.controls.birthDate.value || null,
      phoneNumber: this.form.controls.phoneNumber.value?.trim() || null,
      photoUrl: this.form.controls.photoUrl.value?.trim() || null,
      details: this.form.controls.details.value?.trim() || null
    };

    this.userService.create(payload).subscribe({
      next: (createdUser) => {
        this.isSubmitting = false;
        this.successMessage = 'Admin uğurla yaradıldı.';
        this.router.navigate(['/admin/users/admins', createdUser.userId]);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Admin yaradılarkən xəta baş verdi.';
      }
    });
  }
}