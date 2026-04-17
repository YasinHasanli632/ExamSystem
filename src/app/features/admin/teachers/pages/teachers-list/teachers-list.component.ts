import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Teacher, TeacherClassItem, TeacherStatus } from '../../../../../core/models/teacher/teacher.model';
import { TeacherService } from '../../data/teacher.service';

@Component({
  selector: 'app-teachers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './teachers-list.component.html',
  styleUrls: ['./teachers-list.component.scss']
})
export class TeachersListComponent {
  searchTerm = signal('');
  selectedStatus = signal<'Hamısı' | TeacherStatus>('Hamısı');

  selectedTeacherForDialog = signal<Teacher | null>(null);
  deletedTeacherIds = signal<number[]>([]);

  teachersData = signal<Teacher[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  readonly teachers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.selectedStatus();
    const deletedIds = this.deletedTeacherIds();

    return this.teachersData().filter(teacher => {
      const isDeleted = deletedIds.includes(teacher.id);

      if (isDeleted) {
        return false;
      }

      const fullName =
        `${teacher.firstName} ${teacher.lastName} ${teacher.fatherName} ${teacher.email} ${teacher.phone} ${teacher.subjects.join(' ')}`.toLowerCase();

      const matchesTerm = !term || fullName.includes(term);
      const matchesStatus = status === 'Hamısı' || teacher.status === status;

      return matchesTerm && matchesStatus;
    });
  });

  readonly activeTeachersCount = computed(() =>
    this.teachers().filter(teacher => teacher.status === 'Aktiv').length
  );

  readonly passiveTeachersCount = computed(() =>
    this.teachers().filter(teacher => teacher.status === 'Passiv').length
  );

  readonly deletedTeachersCount = computed(() => this.deletedTeacherIds().length);

  constructor(
    private readonly teacherService: TeacherService,
    private readonly router: Router
  ) {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.teacherService.getAll().subscribe({
      next: (response) => {
        this.teachersData.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Müəllim siyahısı yüklənmədi.');
        this.loading.set(false);
      }
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  onStatusChange(value: 'Hamısı' | TeacherStatus): void {
    this.selectedStatus.set(value);
  }

  openClassesDialog(teacher: Teacher): void {
    this.selectedTeacherForDialog.set(teacher);
  }

  closeClassesDialog(): void {
    this.selectedTeacherForDialog.set(null);
  }

  goToTeacherDetail(teacherId: number): void {
    this.closeClassesDialog();
    this.router.navigate(['/admin/users/teachers', teacherId]);
  }

  deleteTeacher(teacher: Teacher): void {
    const confirmed = window.confirm(
      `${teacher.firstName} ${teacher.lastName} müəllimini silmək istədiyinizə əminsiniz?`
    );

    if (!confirmed) {
      return;
    }

    this.teacherService.deleteTeacher(teacher.id).subscribe({
      next: () => {
        this.deletedTeacherIds.set([...this.deletedTeacherIds(), teacher.id]);

        if (this.selectedTeacherForDialog()?.id === teacher.id) {
          this.closeClassesDialog();
        }
      },
      error: (error) => {
        alert(error?.error?.message || 'Müəllim silinə bilmədi.');
      }
    });
  }

  getStatusClass(status: TeacherStatus): string {
    switch (status) {
      case 'Aktiv':
        return 'status-badge active';
      case 'Passiv':
        return 'status-badge passive';
      case 'Məzuniyyət':
        return 'status-badge leave';
      default:
        return 'status-badge';
    }
  }

  trackByTeacher(index: number, item: Teacher): number {
    return item.id;
  }

  trackByClass(index: number, item: TeacherClassItem): number {
    return item.id;
  }
}