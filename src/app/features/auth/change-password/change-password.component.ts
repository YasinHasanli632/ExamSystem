import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  onSubmit(): void {
    if (!this.currentPassword.trim() || !this.newPassword.trim() || !this.confirmNewPassword.trim()) {
      this.errorMessage = 'Bütün sahələr doldurulmalıdır.';
      this.successMessage = '';
      this.refreshView();
      return;
    }

    if (this.newPassword.trim() !== this.confirmNewPassword.trim()) {
      this.errorMessage = 'Yeni şifrə ilə təkrar şifrə eyni deyil.';
      this.successMessage = '';
      this.refreshView();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    this.authService.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmNewPassword: this.confirmNewPassword
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response?.message || 'Şifrə uğurla dəyişdirildi.';
        this.errorMessage = '';
        this.refreshView();

        this.authService.clearMustChangePassword();

        setTimeout(() => {
          this.router.navigate([this.authService.getHomeRouteByRole()]);
        }, 1000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Şifrə dəyişdirilmədi.';
        this.successMessage = '';
        this.refreshView();
      }
    });
  }

  toggleCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
    this.refreshView();
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
    this.refreshView();
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
    this.refreshView();
  }
}