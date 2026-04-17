import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Teacher } from '../../../../../../core/models/teacher/teacher.model';
import { TeacherService } from '../../../data/teacher.service';

@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './teacher-detail.component.html',
  styleUrls: ['./teacher-detail.component.scss']
})
export class TeacherDetailComponent {
  teacherId = 0;
  teacher: Teacher | null = null;
  performanceBlocks: Array<{ title: string; value: string | number; description: string }> = [];
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService
  ) {
    this.teacherId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadTeacher();
  }

  loadTeacher(): void {
    this.loading = true;
    this.errorMessage = '';

    this.teacherService.getById(this.teacherId).subscribe({
      next: (response) => {
        this.teacher = response;
        this.performanceBlocks = [
          {
            title: 'Tələbə sayı',
            value: response.performance.studentCount,
            description: 'Müəllimin aktiv işlədiyi ümumi tələbə sayı'
          },
          {
            title: 'İmtahan sayı',
            value: response.performance.examCount,
            description: 'Keçirilən ümumi imtahan və sınaqlar'
          },
          {
            title: 'Uğur faizi',
            value: response.performance.successRate + '%',
            description: 'Bu metric backend-də hələ hesablanmır, müvəqqəti 0 gəlir'
          },
          {
            title: 'Orta bal',
            value: response.performance.averageScore,
            description: 'Bu metric backend-də hələ hesablanmır, müvəqqəti 0 gəlir'
          },
          {
            title: 'Tamamlanan task',
            value: response.performance.completedTasks,
            description: 'Tam icra olunmuş tapşırıqlar'
          },
          {
            title: 'Gözləyən task',
            value: response.performance.pendingTasks,
            description: 'Hal-hazırda açıq qalan tapşırıqlar'
          }
        ];
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Müəllim məlumatı tapılmadı.';
        this.loading = false;
      }
    });
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

    this.teacherService.deleteTeacher(this.teacher.id).subscribe({
      next: () => this.router.navigate(['/admin/users/teachers']),
      error: (error) => {
        alert(error?.error?.message || 'Müəllim silinə bilmədi.');
      }
    });
  }
}