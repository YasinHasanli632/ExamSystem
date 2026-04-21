import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Teacher } from '../../../../../../core/models/teacher/teacher.model';
import { TeacherService } from '../../../data/teacher.service';

@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './teacher-detail.component.html',
  styleUrls: ['./teacher-detail.component.scss']
})
export class TeacherDetailComponent implements OnInit, OnDestroy {
  teacherId = 0;
  teacher: Teacher | null = null;
  performanceBlocks: Array<{ title: string; value: string | number; description: string }> = [];
  loading = true;
  errorMessage = '';

  // YENI
  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // YENI
    // Route param deyisende detail sehifesi oz-ozune yeniden melumat ceksin.
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const id = Number(params.get('id') || 0);

        if (!id || Number.isNaN(id)) {
          this.teacherId = 0;
          this.teacher = null;
          this.performanceBlocks = [];
          this.loading = false;
          this.errorMessage = 'Müəllim ID-si düzgün deyil.';
          this.cdr.detectChanges();
          return;
        }

        this.teacherId = id;
        this.loadTeacher();
      });
  }

  loadTeacher(): void {
    if (!this.teacherId) {
      this.loading = false;
      this.errorMessage = 'Müəllim ID-si tapılmadı.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // YENI
    // Evvelki melumat ekranda qalmasin deye sifirlayiriq.
    this.teacher = null;
    this.performanceBlocks = [];
    this.cdr.detectChanges();

    this.teacherService
      .getById(this.teacherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.teacher = response;

          this.performanceBlocks = [
            {
              title: 'Tələbə sayı',
              value: response.performance?.studentCount ?? 0,
              description: 'Müəllimin aktiv işlədiyi ümumi tələbə sayı'
            },
            {
              title: 'İmtahan sayı',
              value: response.performance?.examCount ?? 0,
              description: 'Keçirilən ümumi imtahan və sınaqlar'
            },
            {
              title: 'Uğur faizi',
              value: `${response.performance?.successRate ?? 0}%`,
              description: 'Bu metric backend-də hələ hesablanmır, müvəqqəti 0 gəlir'
            },
            {
              title: 'Orta bal',
              value: response.performance?.averageScore ?? 0,
              description: 'Bu metric backend-də hələ hesablanmır, müvəqqəti 0 gəlir'
            },
            {
              title: 'Tamamlanan task',
              value: response.performance?.completedTasks ?? 0,
              description: 'Tam icra olunmuş tapşırıqlar'
            },
            {
              title: 'Gözləyən task',
              value: response.performance?.pendingTasks ?? 0,
              description: 'Hal-hazırda açıq qalan tapşırıqlar'
            }
          ];

          this.loading = false;

          // YENI
          // UI bazi hallarda avtomatik yenilenmediyi ucun mecburi refresh veririk.
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.teacher = null;
          this.performanceBlocks = [];
          this.errorMessage = error?.error?.message || 'Müəllim məlumatı tapılmadı.';
          this.loading = false;

          // YENI
          this.cdr.detectChanges();
        }
      });
  }

  // YENI
  refreshTeacher(): void {
    this.loadTeacher();
  }

  // YENI
  goToEdit(): void {
    if (!this.teacherId) {
      return;
    }

    this.router.navigate(['/admin/users/teachers', this.teacherId, 'edit']);
  }

  get totalClasses(): number {
    return this.teacher?.classes?.length || 0;
  }

  get totalSubjects(): number {
    return this.teacher?.subjects?.length || 0;
  }

  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'Tamamlanıb':
        return 'task-status completed';
      case 'Gözləyir':
        return 'task-status waiting';
      case 'Gecikir':
        return 'task-status delayed';
      default:
        return 'task-status';
    }
  }

  deleteTeacher(): void {
    if (!this.teacher) {
      return;
    }

    const confirmed = window.confirm(
      `${this.teacher.firstName} ${this.teacher.lastName} müəllimini silmək istədiyinizə əminsiniz?`
    );

    if (!confirmed) {
      return;
    }

    this.teacherService
      .deleteTeacher(this.teacher.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/admin/users/teachers']);
        },
        error: (error) => {
          alert(error?.error?.message || 'Müəllim silinə bilmədi.');
        }
      });
  }

  ngOnDestroy(): void {
    // YENI
    this.destroy$.next();
    this.destroy$.complete();
  }
}