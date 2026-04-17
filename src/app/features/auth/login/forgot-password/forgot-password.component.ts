import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  email = '';
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
    if (!this.email.trim()) {
      this.errorMessage = 'Email daxil edilməlidir.';
      this.successMessage = '';
      this.refreshView();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    this.authService.forgotPassword({
      email: this.email.trim()
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response?.message || 'Kod göndərildi.';
        this.errorMessage = '';
        this.refreshView();

        this.router.navigate(['/verify-reset-otp'], {
          queryParams: { email: this.email.trim() }
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Kod göndərilmədi.';
        this.successMessage = '';
        this.refreshView();
      }
    });
  }
}