import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  email = '';
  otp = '';
  newPassword = '';
  confirmNewPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.otp = this.route.snapshot.queryParamMap.get('otp') ?? '';

    if (!this.email || !this.otp) {
      this.router.navigate(['/forgot-password']);
    }
  }

  onSubmit(): void {
    if (!this.newPassword.trim() || !this.confirmNewPassword.trim()) {
      this.errorMessage = 'Yeni şifrə və təkrar şifrə daxil edilməlidir.';
      return;
    }

    if (this.newPassword.trim() !== this.confirmNewPassword.trim()) {
      this.errorMessage = 'Yeni şifrə ilə təkrar şifrə eyni deyil.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword({
      email: this.email.trim(),
      otp: this.otp.trim(),
      newPassword: this.newPassword,
      confirmNewPassword: this.confirmNewPassword
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Şifrə uğurla yeniləndi.';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1200);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Şifrə yenilənmədi.';
      }
    });
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}