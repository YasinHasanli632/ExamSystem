import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { isAdminRole, normalizeRole } from '../../../core/utils/role.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  usernameOrEmail = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  onLogin(): void {
    if (!this.usernameOrEmail.trim() || !this.password.trim()) {
      this.errorMessage = 'İstifadəçi adı/email və şifrə daxil edilməlidir.';
      this.refreshView();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.refreshView();

    this.authService.login({
      usernameOrEmail: this.usernameOrEmail.trim(),
      password: this.password
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.refreshView();

        if (response.mustChangePassword) {
          this.router.navigate(['/change-password']);
          return;
        }

        const role = normalizeRole(response.user?.role);

        if (isAdminRole(role)) {
          this.router.navigate(['/admin/dashboard']);
          return;
        }

        if (role === 'teacher') {
          this.router.navigate(['/teacher/dashboard']);
          return;
        }

        if (role === 'student') {
          this.router.navigate(['/student/dashboard']);
          return;
        }

        this.errorMessage = 'İstifadəçi rolu tanınmadı.';
        this.refreshView();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Login alınmadı.';
        this.refreshView();
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.refreshView();
  }
}