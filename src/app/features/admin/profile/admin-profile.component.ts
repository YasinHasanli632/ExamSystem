import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../users/data/user.service';
import { ChangePasswordRequest, CurrentUser } from '../../../core/models/auth/auth.models';
import { UpdateUserRequest, UserDetail } from '../../../core/models/user/user.model';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.css']
})
export class AdminProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);

  currentUser: CurrentUser | null = null;
  userDetail: UserDetail | null = null;

  fullName = '';
  firstName = '';
  lastName = '';
  username = '';
  email = '';
  role = '';
  phoneNumber = '';
  photoUrl = '';
  details = '';
  birthDate = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  isLoading = false;
  isSavingProfile = false;
  isChangingPassword = false;

  profileSuccessMessage = '';
  profileErrorMessage = '';

  passwordSuccessMessage = '';
  passwordErrorMessage = '';

  ngOnInit(): void {
    this.loadProfile();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    this.profileErrorMessage = '';
    this.profileSuccessMessage = '';
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';
    this.refreshView();

    this.authService.getMe().subscribe({
      next: (currentUser) => {
        this.currentUser = { ...currentUser };
        this.role = currentUser.role ?? '';
        this.refreshView();

        this.userService.getById(currentUser.userId).subscribe({
          next: (detail) => {
            this.userDetail = { ...detail };

            this.firstName = detail.firstName ?? '';
            this.lastName = detail.lastName ?? '';
            this.fullName =
              detail.fullName?.trim() ||
              `${detail.firstName ?? ''} ${detail.lastName ?? ''}`.trim();

            this.username = detail.username ?? '';
            this.email = detail.email ?? '';
            this.role = detail.role ?? currentUser.role ?? '';
            this.phoneNumber = detail.phoneNumber ?? '';
            this.photoUrl = detail.photoUrl ?? '';
            this.details = detail.details ?? '';
            this.birthDate = this.toInputDate(detail.birthDate);

            this.isLoading = false;
            this.refreshView();
          },
          error: (error) => {
            console.error('Admin profile detail load error =>', error);

            this.fullName = currentUser.fullName ?? '';
            this.username = currentUser.username ?? '';
            this.email = currentUser.email ?? '';
            this.role = currentUser.role ?? '';

            this.profileErrorMessage = 'Profil detalları tam yüklənmədi, əsas məlumatlar göstərildi.';
            this.isLoading = false;
            this.refreshView();
          }
        });
      },
      error: (error) => {
        console.error('Admin profile current user load error =>', error);
        this.profileErrorMessage = error?.error?.message || 'Profil məlumatları yüklənmədi.';
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  saveProfile(): void {
    this.profileSuccessMessage = '';
    this.profileErrorMessage = '';
    this.refreshView();

    if (!this.currentUser || !this.userDetail) {
      this.profileErrorMessage = 'Cari istifadəçi məlumatı tapılmadı.';
      this.refreshView();
      return;
    }

    if (!this.firstName.trim() || !this.lastName.trim() || !this.username.trim() || !this.email.trim()) {
      this.profileErrorMessage = 'Ad, soyad, istifadəçi adı və email boş ola bilməz.';
      this.refreshView();
      return;
    }

    const payload: UpdateUserRequest = {
      userId: this.currentUser.userId,
      username: this.username.trim(),
      email: this.email.trim(),
      role: this.role || this.currentUser.role,
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      birthDate: this.birthDate ? new Date(this.birthDate).toISOString() : null,
      phoneNumber: this.nullIfEmpty(this.phoneNumber),
      photoUrl: this.nullIfEmpty(this.photoUrl),
      details: this.nullIfEmpty(this.details)
    };

    this.isSavingProfile = true;
    this.refreshView();

    this.userService.update(payload).subscribe({
      next: (updatedUser) => {
        this.userDetail = { ...updatedUser };
        this.firstName = updatedUser.firstName ?? '';
        this.lastName = updatedUser.lastName ?? '';
        this.fullName =
          updatedUser.fullName?.trim() ||
          `${updatedUser.firstName ?? ''} ${updatedUser.lastName ?? ''}`.trim();

        this.username = updatedUser.username ?? '';
        this.email = updatedUser.email ?? '';
        this.role = updatedUser.role ?? this.role;
        this.phoneNumber = updatedUser.phoneNumber ?? '';
        this.photoUrl = updatedUser.photoUrl ?? '';
        this.details = updatedUser.details ?? '';
        this.birthDate = this.toInputDate(updatedUser.birthDate);

        this.updateLocalCurrentUser();

        this.isSavingProfile = false;
        this.profileSuccessMessage = 'Profil məlumatları uğurla yeniləndi.';
        this.refreshView();
      },
      error: (error) => {
        console.error('Admin profile update error =>', error);
        this.isSavingProfile = false;
        this.profileErrorMessage =
          error?.error?.message ||
          error?.error?.title ||
          'Profil məlumatları yenilənmədi.';
        this.refreshView();
      }
    });
  }

  changePassword(): void {
    this.passwordSuccessMessage = '';
    this.passwordErrorMessage = '';
    this.refreshView();

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordErrorMessage = 'Bütün şifrə sahələrini doldurun.';
      this.refreshView();
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorMessage = 'Yeni şifrə ilə təkrar şifrə eyni deyil.';
      this.refreshView();
      return;
    }

    const payload: ChangePasswordRequest = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmNewPassword: this.confirmPassword
    };

    this.isChangingPassword = true;
    this.refreshView();

    this.authService.changePassword(payload).subscribe({
      next: (response) => {
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';

        this.isChangingPassword = false;
        this.passwordSuccessMessage = response?.message || 'Şifrə uğurla yeniləndi.';
        this.refreshView();
      },
      error: (error) => {
        console.error('Admin change password error =>', error);
        this.isChangingPassword = false;
        this.passwordErrorMessage =
          error?.error?.message ||
          error?.error?.title ||
          'Şifrə dəyişdirilə bilmədi.';
        this.refreshView();
      }
    });
  }

  get avatarText(): string {
    const source = this.fullName?.trim() || this.username?.trim() || 'A';
    return source.charAt(0).toUpperCase();
  }

  get statusText(): string {
    if (this.currentUser?.isActive === false) {
      return 'Passiv';
    }

    return 'Aktiv';
  }

  private updateLocalCurrentUser(): void {
    const raw = localStorage.getItem('currentUser');
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const updated = {
        ...parsed,
        fullName: this.fullName,
        username: this.username,
        email: this.email,
        role: this.role
      };

      localStorage.setItem('currentUser', JSON.stringify(updated));
      this.currentUser = { ...updated };
    } catch {
      // ignore
    }
  }

  private nullIfEmpty(value: string | null | undefined): string | null {
    const normalized = (value ?? '').trim();
    return normalized ? normalized : null;
  }

  private toInputDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');

    return `${parsed.getFullYear()}-${month}-${day}`;
  }
}