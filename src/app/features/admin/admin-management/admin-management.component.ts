import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ChangeUserStatusRequest,
  CreateUserRequest,
  UserListItem
} from '../../../core/models/user/user.model';
import { UserService } from '../users/data/user.service';
import { AuthService } from '../../../core/services/auth.service';

interface AdminFormModel {
  username: string;
  email: string;
  password: string;
  role: 'Admin' | 'IsSuperAdmin';
  isActive: boolean;
  firstName: string;
  lastName: string;
  birthDate: string;
  phoneNumber: string;
  photoUrl: string;
  details: string;
}

type StatusFilter = '' | 'active' | 'inactive';
type RoleFilter = '' | 'Admin' | 'IsSuperAdmin';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-management.component.html',
  styleUrls: ['./admin-management.component.css']
})
export class AdminManagementComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly Math = Math;

  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  showCreateDrawer = signal<boolean>(false);
  showFilters = signal<boolean>(true);

  admins = signal<UserListItem[]>([]);

  searchText = signal<string>('');
  selectedRole = signal<RoleFilter>('');
  selectedStatus = signal<StatusFilter>('');

  readonly roleOptions: Array<'Admin' | 'IsSuperAdmin'> = ['Admin', 'IsSuperAdmin'];

  adminForm: AdminFormModel = this.getEmptyForm();

  filteredAdmins = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const role = this.selectedRole();
    const status = this.selectedStatus();

    return this.admins().filter((admin) => {
      const matchesSearch =
        !search ||
        admin.fullName.toLowerCase().includes(search) ||
        admin.username.toLowerCase().includes(search) ||
        admin.email.toLowerCase().includes(search) ||
        (admin.phoneNumber || '').toLowerCase().includes(search);

      const matchesRole = !role || admin.role === role;

      const matchesStatus =
        !status ||
        (status === 'active' && admin.isActive) ||
        (status === 'inactive' && !admin.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  totalCount = computed(() => this.filteredAdmins().length);
  activeCount = computed(() => this.filteredAdmins().filter((x) => x.isActive).length);
  inactiveCount = computed(() => this.filteredAdmins().filter((x) => !x.isActive).length);
  superAdminCount = computed(() => this.filteredAdmins().filter((x) => x.role === 'IsSuperAdmin').length);

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.userService.getAll().subscribe({
      next: (users) => {
        const adminUsers = users
          .filter((user) => user.role === 'Admin' || user.role === 'IsSuperAdmin')
          .sort((a, b) => a.fullName.localeCompare(b.fullName));

        this.admins.set(adminUsers);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          error?.error?.message ||
          error?.message ||
          'Admin siyahısı yüklənərkən xəta baş verdi.'
        );
      }
    });
  }

  openCreateDrawer(): void {
    this.resetForm();
    this.errorMessage.set('');
    this.successMessage.set('');
    this.showCreateDrawer.set(true);
  }

  closeCreateDrawer(): void {
    this.showCreateDrawer.set(false);
    this.resetForm();
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  resetFilters(): void {
    this.searchText.set('');
    this.selectedRole.set('');
    this.selectedStatus.set('');
  }

  resetForm(): void {
    this.adminForm = this.getEmptyForm();
  }

  saveAdmin(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.isCurrentUserSuperAdmin()) {
      this.errorMessage.set('Yalnız SuperAdmin yeni admin yarada bilər.');
      return;
    }

    if (!this.isFormValid()) {
      this.errorMessage.set('Zəhmət olmasa bütün vacib xanaları düzgün doldur.');
      return;
    }

    this.submitting.set(true);

    const payload: CreateUserRequest = {
      username: this.adminForm.username.trim(),
      email: this.adminForm.email.trim(),
      password: this.adminForm.password,
      role: this.adminForm.role,
      isActive: this.adminForm.isActive,
      firstName: this.adminForm.firstName.trim(),
      lastName: this.adminForm.lastName.trim(),
      birthDate: this.adminForm.birthDate || null,
      phoneNumber: this.adminForm.phoneNumber.trim() || null,
      photoUrl: this.adminForm.photoUrl.trim() || null,
      details: this.adminForm.details.trim() || null
    };

    this.userService.create(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Admin uğurla yaradıldı.');
        this.closeCreateDrawer();
        this.loadAdmins();
      },
      error: (error) => {
        this.submitting.set(false);
        this.errorMessage.set(
          error?.error?.message ||
          error?.message ||
          'Admin yaradılarkən xəta baş verdi.'
        );
      }
    });
  }

  toggleStatus(admin: UserListItem): void {
    if (!this.canToggleStatus(admin)) {
      this.errorMessage.set('Bu istifadəçi üçün status dəyişmək icazən yoxdur.');
      return;
    }

    const payload: ChangeUserStatusRequest = {
      userId: admin.userId,
      isActive: !admin.isActive
    };

    this.errorMessage.set('');
    this.successMessage.set('');

    this.userService.changeStatus(payload).subscribe({
      next: () => {
        this.successMessage.set(
          `${admin.fullName} üçün status ${payload.isActive ? 'aktiv' : 'passiv'} edildi.`
        );

        this.admins.update((items) =>
          items.map((item) =>
            item.userId === admin.userId
              ? { ...item, isActive: payload.isActive }
              : item
          )
        );
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.message ||
          error?.message ||
          'Status dəyişdirilərkən xəta baş verdi.'
        );
      }
    });
  }

  goToDetail(admin: UserListItem): void {
    this.router.navigate(['/admin/users/admins', admin.userId]);
  }

  goToEdit(admin: UserListItem): void {
    if (!this.canEdit(admin)) {
      this.errorMessage.set('Bu istifadəçini redaktə etmək icazən yoxdur.');
      return;
    }

    this.router.navigate(['/admin/users/admins', admin.userId, 'edit']);
  }

  trackByUserId(index: number, item: UserListItem): number {
    return item.userId;
  }

  getRoleBadgeText(role: string): string {
    return role === 'IsSuperAdmin' ? 'Super Admin' : 'Admin';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Aktiv' : 'Passiv';
  }

  getInitials(fullName: string): string {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (!parts.length) return 'A';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  isCurrentUserSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  canEdit(admin: UserListItem): boolean {
    if (admin.role === 'IsSuperAdmin') {
      return this.isCurrentUserSuperAdmin();
    }

    return true;
  }

  canToggleStatus(admin: UserListItem): boolean {
    if (!this.isCurrentUserSuperAdmin()) {
      return false;
    }

    if (admin.role === 'IsSuperAdmin') {
      return false;
    }

    return true;
  }

  private isFormValid(): boolean {
    return !!(
      this.adminForm.firstName.trim() &&
      this.adminForm.lastName.trim() &&
      this.adminForm.username.trim() &&
      this.adminForm.email.trim() &&
      this.adminForm.password.trim() &&
      this.adminForm.role
    );
  }

  private getEmptyForm(): AdminFormModel {
    return {
      username: '',
      email: '',
      password: '',
      role: 'Admin',
      isActive: true,
      firstName: '',
      lastName: '',
      birthDate: '',
      phoneNumber: '',
      photoUrl: '',
      details: ''
    };
  }
}