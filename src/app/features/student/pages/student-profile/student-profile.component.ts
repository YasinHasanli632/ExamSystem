import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  StudentProfileModel,
  UpdateStudentProfileRequest
} from '../../../../core/models/students/student-profile.model';
import { StudentProfileService } from '../../data/student-profile.service';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.css']
})
export class StudentProfileComponent implements OnInit {
  private readonly studentProfileService = inject(StudentProfileService);
  private readonly cdr = inject(ChangeDetectorRef);

  profile: StudentProfileModel | null = null;
  isLoading = true;
  isSaving = false;
  isEditMode = false;
  errorMessage = '';
  successMessage = '';

  editModel: UpdateStudentProfileRequest = this.createEmptyEditModel();

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
    this.errorMessage = '';
    this.successMessage = '';

    this.studentProfileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = { ...profile };
        this.editModel = this.mapProfileToEditModel(profile);
        this.isLoading = false;
        this.refreshView();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Profil məlumatları yüklənmədi.';
        this.refreshView();
      }
    });
  }

  startEdit(): void {
    if (!this.profile) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.editModel = this.mapProfileToEditModel(this.profile);
    this.isEditMode = true;
    this.refreshView();
  }

  cancelEdit(): void {
    if (this.profile) {
      this.editModel = this.mapProfileToEditModel(this.profile);
    }

    this.isEditMode = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();
  }

  saveProfile(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.editModel.firstName.trim()) {
      this.errorMessage = 'Ad boş ola bilməz.';
      this.refreshView();
      return;
    }

    if (!this.editModel.lastName.trim()) {
      this.errorMessage = 'Soyad boş ola bilməz.';
      this.refreshView();
      return;
    }

    if (!this.editModel.fatherName.trim()) {
      this.errorMessage = 'Ata adı boş ola bilməz.';
      this.refreshView();
      return;
    }

    if (!this.editModel.email.trim()) {
      this.errorMessage = 'Email boş ola bilməz.';
      this.refreshView();
      return;
    }

    if (!this.editModel.studentNumber.trim()) {
      this.errorMessage = 'Tələbə nömrəsi boş ola bilməz.';
      this.refreshView();
      return;
    }

    this.isSaving = true;
    this.refreshView();

    this.editModel.fullName =
      `${this.editModel.firstName} ${this.editModel.lastName}`.trim();

    this.studentProfileService.updateMyProfile(this.editModel).subscribe({
      next: (profile) => {
        this.profile = { ...profile };
        this.editModel = this.mapProfileToEditModel(profile);
        this.isEditMode = false;
        this.isSaving = false;
        this.successMessage = 'Profil məlumatları uğurla yeniləndi.';
        this.updateLocalCurrentUser(profile);
        this.refreshView();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Profil məlumatları yenilənmədi.';
        this.refreshView();
      }
    });
  }

  get completionRate(): number {
    if (!this.profile?.tasksCount) {
      return 0;
    }

    return Math.round((this.profile.completedTasksCount / this.profile.tasksCount) * 100);
  }

  trackByTaskId(_: number, item: { id: number }): number {
    return item.id;
  }

  trackByExamId(_: number, item: { studentExamId: number }): number {
    return item.studentExamId;
  }

  private mapProfileToEditModel(profile: StudentProfileModel): UpdateStudentProfileRequest {
    return {
      fullName: profile.fullName ?? '',
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      fatherName: profile.parentName ?? '',
      email: profile.email ?? '',
      phoneNumber: profile.phoneNumber ?? null,
      parentPhone: profile.parentPhone ?? null,
      address: profile.address ?? null,
      gender: profile.gender ?? 'Bilinmir',
      studentNumber: profile.studentNumber ?? '',
      dateOfBirth: this.toInputDate(profile.dateOfBirth),
      status: profile.status ?? 'Aktiv',
      notes: profile.notes ?? null,
      photoUrl: profile.photoUrl ?? null
    };
  }

  private createEmptyEditModel(): UpdateStudentProfileRequest {
    return {
      fullName: '',
      firstName: '',
      lastName: '',
      fatherName: '',
      email: '',
      phoneNumber: null,
      parentPhone: null,
      address: null,
      gender: 'Bilinmir',
      studentNumber: '',
      dateOfBirth: '',
      status: 'Aktiv',
      notes: null,
      photoUrl: null
    };
  }

  private toInputDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private updateLocalCurrentUser(profile: StudentProfileModel): void {
    const raw = localStorage.getItem('currentUser');

    if (!raw) {
      return;
    }

    try {
      const currentUser = JSON.parse(raw);
      const updatedUser = {
        ...currentUser,
        fullName: profile.fullName,
        email: profile.email
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch {
      // local storage parse xətası olsa səssiz keç
    }
  }
}