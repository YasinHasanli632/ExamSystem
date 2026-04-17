import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ClassDetail,
  ClassListItem,
  UpdateClassRequest
} from '../../../../../core/models/class/class.model';
import { ClassService } from '../../data/class.service';

interface ClassFilterState {
  className: string;
  subjectName: string;
  teacherName: string;
  status: '' | 'Aktiv' | 'Passiv';
}

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './class-list.component.html',
  styleUrls: ['./class-list.component.css']
})
export class ClassListComponent implements OnInit {
  private readonly classService = inject(ClassService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef); // YENI

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly errorMessage = signal('');
  readonly actionLoadingId = signal<number | null>(null);

  readonly allClasses = signal<ClassListItem[]>([]);
  readonly allDetails = signal<ClassDetail[]>([]);
  readonly filteredClasses = signal<ClassListItem[]>([]);

  filter: ClassFilterState = {
    className: '',
    subjectName: '',
    teacherName: '',
    status: ''
  };

  currentPage = 1;
  readonly pageSize = 5;

  readonly totalItems = computed(() => this.filteredClasses().length);

  readonly totalPages = computed(() => {
    const total = Math.ceil(this.totalItems() / this.pageSize);
    return total > 0 ? total : 1;
  });

  readonly pagedClasses = computed(() => {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredClasses().slice(start, start + this.pageSize);
  });

  readonly startIndex = computed(() => {
    if (this.totalItems() === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  });

  readonly endIndex = computed(() => {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems() ? this.totalItems() : end;
  });

  readonly isSuperAdmin = computed(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) {
        return false;
      }

      const user = JSON.parse(raw);
      return user?.role === 'IsSuperAdmin';
    } catch {
      return false;
    }
  });

  ngOnInit(): void {
    this.loadClasses();
  }

  private refreshView(): void { // YENI
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadClasses(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.refreshView(); // YENI

    this.classService.getClasses().subscribe({
      next: classes => {
        const safeClasses = [...(classes ?? [])];
        this.allClasses.set(safeClasses);
        this.filteredClasses.set([...safeClasses]);
        this.loading.set(false);
        this.refreshView(); // YENI

        this.loadClassDetails(safeClasses);
      },
      error: error => {
        this.loading.set(false);
        this.errorMessage.set(
          this.getErrorMessage(error, 'Siniflər yüklənərkən xəta baş verdi.')
        );
        this.refreshView(); // YENI
      }
    });
  }

  loadClassDetails(classes: ClassListItem[]): void {
    if (!classes.length) {
      this.allDetails.set([]);
      this.refreshView(); // YENI
      return;
    }

    this.detailLoading.set(true);
    this.refreshView(); // YENI

    forkJoin(
      classes.map(item =>
        this.classService.getClassById(item.id).pipe(catchError(() => of(null)))
      )
    ).subscribe({
      next: details => {
        this.allDetails.set([...(details.filter(Boolean) as ClassDetail[])]);
        this.detailLoading.set(false);
        this.applyFilters();
        this.refreshView(); // YENI
      },
      error: () => {
        this.allDetails.set([]);
        this.detailLoading.set(false);
        this.refreshView(); // YENI
      }
    });
  }

  applyFilters(): void {
    const classTerm = this.filter.className.trim().toLowerCase();
    const subjectTerm = this.filter.subjectName.trim().toLowerCase();
    const teacherTerm = this.filter.teacherName.trim().toLowerCase();
    const statusTerm = this.filter.status;

    const detailsMap = new Map<number, ClassDetail>(
      this.allDetails().map(detail => [detail.id, detail])
    );

    let result = [...this.allClasses()];

    if (classTerm) {
      result = result.filter(item =>
        `${item.name} ${item.academicYear} ${item.room}`
          .toLowerCase()
          .includes(classTerm)
      );
    }

    if (statusTerm) {
      result = result.filter(item => item.status === statusTerm);
    }

    if (subjectTerm) {
      result = result.filter(item => {
        const detail = detailsMap.get(item.id);
        if (!detail) {
          return false;
        }

        return detail.subjects.some(subject =>
          `${subject.name} ${subject.code ?? ''} ${subject.description ?? ''}`
            .toLowerCase()
            .includes(subjectTerm)
        );
      });
    }

    if (teacherTerm) {
      result = result.filter(item => {
        const detail = detailsMap.get(item.id);
        if (!detail) {
          return false;
        }

        return detail.teacherSubjectRows.some(row =>
          `${row.assignedTeacherName ?? ''} ${
            row.availableTeachers?.map(teacher => teacher.fullName).join(' ') ?? ''
          }`
            .toLowerCase()
            .includes(teacherTerm)
        );
      });
    }

    this.filteredClasses.set([...result]);
    this.currentPage = 1;
    this.refreshView(); // YENI
  }

  resetFilters(): void {
    this.filter = {
      className: '',
      subjectName: '',
      teacherName: '',
      status: ''
    };

    this.filteredClasses.set([...this.allClasses()]);
    this.currentPage = 1;
    this.refreshView(); // YENI
  }

  goToCreate(): void {
    this.router.navigate(['/admin/classes/add']);
  }

  goToDetail(classId: number): void {
    this.router.navigate(['/admin/classes/detail', classId]);
  }

  toggleStatus(item: ClassListItem): void {
    this.actionLoadingId.set(item.id);
    this.refreshView(); // YENI

    this.classService.getClassById(item.id).subscribe({
      next: detail => {
        const nextStatus: 'Aktiv' | 'Passiv' =
          item.status === 'Aktiv' ? 'Passiv' : 'Aktiv';

        const payload: UpdateClassRequest = {
          name: detail.name ?? '',
          academicYear: detail.academicYear ?? '',
          room: detail.room ?? '',
          description: detail.description ?? '',
          status: nextStatus,
          maxStudentCount: Number(detail.maxStudentCount ?? 0),
          subjectIds: (detail.subjects ?? []).map(subject => subject.id),
          teacherAssignments: (detail.teacherSubjectRows ?? []).map(row => ({
            subjectId: row.subjectId,
            teacherId: row.assignedTeacherId ?? null
          })),
          studentIds: (detail.students ?? []).map(student => student.id)
        };

        this.classService.updateClass(item.id, payload).subscribe({
          next: () => {
            this.actionLoadingId.set(null);
            this.refreshView(); // YENI
            this.loadClasses();
          },
          error: error => {
            this.actionLoadingId.set(null);
            this.refreshView(); // YENI
            alert(this.getErrorMessage(error, 'Status dəyişdirilərkən xəta baş verdi.'));
          }
        });
      },
      error: error => {
        this.actionLoadingId.set(null);
        this.refreshView(); // YENI
        alert(this.getErrorMessage(error, 'Sinif məlumatı alınarkən xəta baş verdi.'));
      }
    });
  }

  deleteClass(item: ClassListItem): void {
    if (!this.isSuperAdmin()) {
      alert('Silmək yalnız Super Admin üçün açıqdır.');
      return;
    }

    const confirmed = window.confirm(`"${item.name}" sinfini silmək istəyirsiniz?`);
    if (!confirmed) {
      return;
    }

    this.actionLoadingId.set(item.id);
    this.refreshView(); // YENI

    this.classService.deleteClass(item.id).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.refreshView(); // YENI
        this.loadClasses();
      },
      error: error => {
        this.actionLoadingId.set(null);
        this.refreshView(); // YENI
        alert(this.getErrorMessage(error, 'Sinif silinərkən xəta baş verdi.'));
      }
    });
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.refreshView(); // YENI
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
      this.refreshView(); // YENI
    }
  }

  trackByClassId(_: number, item: ClassListItem): number {
    return item.id;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const data = error.error;

      if (typeof data === 'string' && data.trim()) {
        return data;
      }

      if (data?.message && typeof data.message === 'string') {
        return data.message;
      }

      if (data?.title && typeof data.title === 'string') {
        return data.title;
      }

      if (data?.errors && typeof data.errors === 'object') {
        const messages = Object.values(data.errors)
          .flatMap(value => (Array.isArray(value) ? value : [value]))
          .filter(Boolean)
          .map(value => String(value));

        if (messages.length > 0) {
          return messages.join('\n');
        }
      }
    }

    return fallback;
  }
}