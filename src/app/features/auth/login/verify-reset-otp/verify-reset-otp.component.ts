import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-verify-reset-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-reset-otp.component.html',
  styleUrl: './verify-reset-otp.component.css'
})
export class VerifyResetOtpComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  email = '';
  otp = '';
  isLoading = false;
  resendLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.refreshView();

    if (!this.email) {
      this.router.navigate(['/forgot-password']);
    }
  }

  onSubmit(): void {
    if (!this.email.trim()) {
      this.errorMessage = 'Email tapılmadı.';
      this.successMessage = '';
      this.refreshView();
      return;
    }

    if (!this.otp.trim()) {
      this.errorMessage = 'OTP kodu daxil edilməlidir.';
      this.successMessage = '';
      this.refreshView();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    this.authService.verifyResetOtp({
      email: this.email.trim(),
      otp: this.otp.trim()
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response?.message || 'Kod təsdiqləndi.';
        this.errorMessage = '';
        this.refreshView();

        this.router.navigate(['/reset-password'], {
          queryParams: {
            email: this.email.trim(),
            otp: this.otp.trim()
          }
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Kod təsdiqlənmədi.';
        this.successMessage = '';
        this.refreshView();
      }
    });
  }

  resendCode(): void {
    if (!this.email.trim()) {
      this.errorMessage = 'Email tapılmadı.';
      this.successMessage = '';
      this.refreshView();
      return;
    }

    this.resendLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    this.authService.forgotPassword({
      email: this.email.trim()
    }).subscribe({
      next: (response) => {
        this.resendLoading = false;
        this.successMessage = response?.message || 'Yeni kod göndərildi.';
        this.errorMessage = '';
        this.refreshView();
      },
      error: (error) => {
        this.resendLoading = false;
        this.errorMessage = error?.error?.message || 'Kod yenidən göndərilmədi.';
        this.successMessage = '';
        this.refreshView();
      }
    });
  }
}