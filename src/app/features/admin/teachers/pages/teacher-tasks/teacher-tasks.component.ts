import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TeacherPanelService } from '../../data/teacher-panel.service';

interface TeacherTaskClassSubject {
  subjectId: number;
  subjectName: string;
}

interface TeacherTaskClassSummary {
  classRoomId: number;
  className: string;
  academicYear: string;
  room?: string | null;
  studentCount: number;
  subjects: TeacherTaskClassSubject[];

  totalTaskCount: number;
  activeTaskCount: number;
  completedTaskCount: number;
  pendingReviewCount: number;
}

interface CreateTeacherTaskForm {
  subjectId: number;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  maxScore: number;
  link: string;
  note: string;
}

interface CreateTeacherTaskPayload {
  classRoomId: number;
  subjectId: number;
  title: string;
  description?: string | null;
  assignedDate: string;
  dueDate: string;
  maxScore: number;
  link?: string | null;
  note?: string | null;
}

type TaskClassFilter = 'all' | 'active' | 'completed' | 'review';

@Component({
  selector: 'app-teacher-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-tasks.component.html',
  styleUrls: ['./teacher-tasks.component.css']
})
export class TeacherTasksComponent implements OnInit {
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  classes: TeacherTaskClassSummary[] = [];
  filteredClasses: TeacherTaskClassSummary[] = [];

  isLoading = true;
  errorMessage = '';

  searchTerm = '';
  selectedFilter: TaskClassFilter = 'all';

  successMessage = '';

  isCreateDrawerOpen = false;
  isSavingTask = false;
  createErrorMessage = '';
  selectedClass: TeacherTaskClassSummary | null = null;

  createForm: CreateTeacherTaskForm = this.getEmptyCreateForm();

  private successMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.clearSuccessMessageTimer();
    });

    this.loadTaskClasses();
  }

  loadTaskClasses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.teacherPanelService
      .getTeacherTaskClasses()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.classes = response ?? [];
          this.applyFilters();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Tapşırıqlar yüklənmədi.';
        }
      });
  }

  applyFilters(): void {
    let result = [...this.classes];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((item) => {
        const subjectText = (item.subjects ?? [])
          .map((x) => x.subjectName)
          .join(' ')
          .toLowerCase();

        return (
          item.className.toLowerCase().includes(term) ||
          (item.academicYear ?? '').toLowerCase().includes(term) ||
          (item.room ?? '').toLowerCase().includes(term) ||
          subjectText.includes(term)
        );
      });
    }

    if (this.selectedFilter === 'active') {
      result = result.filter((item) => item.activeTaskCount > 0);
    }

    if (this.selectedFilter === 'completed') {
      result = result.filter((item) => item.completedTaskCount > 0);
    }

    if (this.selectedFilter === 'review') {
      result = result.filter((item) => item.pendingReviewCount > 0);
    }

    this.filteredClasses = result.sort((a, b) => {
      const scoreA =
        (a.pendingReviewCount || 0) * 100 +
        (a.activeTaskCount || 0) * 10 +
        (a.totalTaskCount || 0);

      const scoreB =
        (b.pendingReviewCount || 0) * 100 +
        (b.activeTaskCount || 0) * 10 +
        (b.totalTaskCount || 0);

      return scoreB - scoreA;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setFilter(filter: TaskClassFilter): void {
    this.selectedFilter = filter;
    this.applyFilters();
  }

  get totalClassesCount(): number {
    return this.classes.length;
  }

  get totalTasksCount(): number {
    return this.classes.reduce((sum, item) => sum + (item.totalTaskCount || 0), 0);
  }

  get totalActiveTasksCount(): number {
    return this.classes.reduce((sum, item) => sum + (item.activeTaskCount || 0), 0);
  }

  get totalCompletedTasksCount(): number {
    return this.classes.reduce((sum, item) => sum + (item.completedTaskCount || 0), 0);
  }

  get totalPendingReviewCount(): number {
    return this.classes.reduce((sum, item) => sum + (item.pendingReviewCount || 0), 0);
  }

  getSubjectsLabel(item: TeacherTaskClassSummary): string {
    if (!item.subjects?.length) {
      return 'Fənn yoxdur';
    }

    return item.subjects.map((x) => x.subjectName).join(', ');
  }

  // DÜZƏLİŞ BURADADIR
  goToClassTasks(classRoomId: number): void {
    if (!classRoomId) {
      return;
    }

    this.router.navigate(['/teacher/tasks/class', classRoomId]);
  }

  openCreateDrawer(item: TeacherTaskClassSummary): void {
    this.clearSuccessMessage();
    this.createErrorMessage = '';
    this.selectedClass = item;
    this.isCreateDrawerOpen = true;
    this.isSavingTask = false;

    this.createForm = {
      subjectId: item.subjects?.[0]?.subjectId ?? 0,
      title: '',
      description: '',
      assignedDate: this.toLocalInputValue(new Date()),
      dueDate: this.toLocalInputValue(this.addDays(new Date(), 7)),
      maxScore: 100,
      link: '',
      note: ''
    };

    this.cdr.detectChanges();
  }

  closeCreateDrawer(force = false): void {
    if (this.isSavingTask && !force) {
      return;
    }

    this.isCreateDrawerOpen = false;
    this.isSavingTask = false;
    this.createErrorMessage = '';
    this.selectedClass = null;
    this.createForm = this.getEmptyCreateForm();

    this.cdr.detectChanges();
  }

  submitCreateTask(): void {
    if (this.isSavingTask) {
      return;
    }

    this.clearSuccessMessage();
    this.createErrorMessage = '';

    if (!this.selectedClass) {
      this.createErrorMessage = 'Sinif seçilməyib.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.createForm.subjectId) {
      this.createErrorMessage = 'Fənn seçilməlidir.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.createForm.title.trim()) {
      this.createErrorMessage = 'Task başlığı boş ola bilməz.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.createForm.assignedDate || !this.createForm.dueDate) {
      this.createErrorMessage = 'Başlama və son tarix daxil edilməlidir.';
      this.cdr.detectChanges();
      return;
    }

    const assignedDate = new Date(this.createForm.assignedDate);
    const dueDate = new Date(this.createForm.dueDate);

    if (Number.isNaN(assignedDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      this.createErrorMessage = 'Tarix formatı yanlışdır.';
      this.cdr.detectChanges();
      return;
    }

    if (dueDate <= assignedDate) {
      this.createErrorMessage = 'Son tarix başlanğıc tarixindən böyük olmalıdır.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.createForm.maxScore || Number(this.createForm.maxScore) <= 0) {
      this.createErrorMessage = 'Maksimum bal 0-dan böyük olmalıdır.';
      this.cdr.detectChanges();
      return;
    }

    const selectedClassName = this.selectedClass.className;

    const payload: CreateTeacherTaskPayload = {
      classRoomId: this.selectedClass.classRoomId,
      subjectId: Number(this.createForm.subjectId),
      title: this.createForm.title.trim(),
      description: this.createForm.description?.trim() || null,
      assignedDate: assignedDate.toISOString(),
      dueDate: dueDate.toISOString(),
      maxScore: Number(this.createForm.maxScore),
      link: this.createForm.link?.trim() || null,
      note: this.createForm.note?.trim() || null
    };

    this.isSavingTask = true;
    this.cdr.detectChanges();

    this.teacherPanelService
      .createTeacherTask(payload)
      .pipe(
        finalize(() => {
          this.isSavingTask = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.closeCreateDrawer(true);
          this.showSuccessMessage(`${selectedClassName} üçün task uğurla əlavə olundu.`);
          this.loadTaskClasses();
        },
        error: (error) => {
          this.createErrorMessage =
            error?.error?.message ||
            error?.message ||
            'Task yaradılarkən xəta baş verdi.';
          this.cdr.detectChanges();
        }
      });
  }

  trackByClass(index: number, item: TeacherTaskClassSummary): number {
    return item.classRoomId;
  }

  private getEmptyCreateForm(): CreateTeacherTaskForm {
    return {
      subjectId: 0,
      title: '',
      description: '',
      assignedDate: '',
      dueDate: '',
      maxScore: 100,
      link: '',
      note: ''
    };
  }

  private toLocalInputValue(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private showSuccessMessage(message: string): void {
    this.clearSuccessMessageTimer();
    this.successMessage = message;

    this.successMessageTimeoutId = setTimeout(() => {
      this.successMessage = '';
      this.successMessageTimeoutId = null;
      this.cdr.detectChanges();
    }, 4000);

    this.cdr.detectChanges();
  }

  private clearSuccessMessage(): void {
    this.clearSuccessMessageTimer();
    this.successMessage = '';
  }  

  private clearSuccessMessageTimer(): void {
    if (this.successMessageTimeoutId) {
      clearTimeout(this.successMessageTimeoutId);
      this.successMessageTimeoutId = null;
    }
  }
}