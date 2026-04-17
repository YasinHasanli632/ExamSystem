import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeacherPanelService } from '../../data/teacher-panel.service';

interface TeacherClassCardViewModel {
  classRoomId: number;
  classRoomName: string;
  studentCount: number;
  examCount: number;
  averageScore: number;
  attendanceRate: number;
  subjectNames: string[];
  topStudentName?: string | null;
  topStudentScore?: number | null;
}

type ClassSortType =
  | 'name-asc'
  | 'name-desc'
  | 'student-desc'
  | 'attendance-desc'
  | 'exam-desc';

@Component({
  selector: 'app-teacher-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-classes.component.html',
  styleUrls: ['./teacher-classes.component.css']
})
export class TeacherClassesComponent implements OnInit {
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  errorMessage = '';

  classCards: TeacherClassCardViewModel[] = [];
  filteredClassCards: TeacherClassCardViewModel[] = [];

  searchText = '';
  selectedSubject = '';
  sortBy: ClassSortType = 'name-asc';

  totalStudents = 0;
  averageAttendanceRate = 0;
  averageExamScore = 0;

  ngOnInit(): void {
    this.loadMyClasses();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadMyClasses(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.refreshView();

    this.teacherPanelService.getMyClassRooms().subscribe({
      next: (response: any[]) => {
        const items = Array.isArray(response) ? response : [];

        this.classCards = [...items.map((item) => this.mapClassCard(item))];
        this.calculateSummary();
        this.applyFilters();

        this.isLoading = false;
        this.refreshView();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message ||
          error?.error?.title ||
          error?.message ||
          'Siniflər yüklənərkən xəta baş verdi.';
        this.refreshView();
      }
    });
  }

  private mapClassCard(item: any): TeacherClassCardViewModel {
    return {
      classRoomId: this.toNumber(item?.classRoomId ?? item?.id),
      classRoomName: String(item?.classRoomName ?? item?.name ?? 'Adsız sinif'),
      studentCount: this.toNumber(item?.studentCount),
      examCount: this.toNumber(item?.examCount),
      averageScore: this.toNumber(item?.averageScore),
      attendanceRate: this.toNumber(item?.attendanceRate),
      subjectNames: Array.isArray(item?.subjectNames)
        ? [...item.subjectNames.filter((x: unknown) => typeof x === 'string')]
        : [],
      topStudentName: item?.topStudentName ?? null,
      topStudentScore:
        item?.topStudentScore !== null && item?.topStudentScore !== undefined
          ? this.toNumber(item.topStudentScore)
          : null
    };
  }

  private calculateSummary(): void {
    this.totalStudents = this.classCards.reduce(
      (sum, item) => sum + item.studentCount,
      0
    );

    this.averageAttendanceRate = this.classCards.length
      ? this.roundNumber(
          this.classCards.reduce((sum, item) => sum + item.attendanceRate, 0) /
            this.classCards.length
        )
      : 0;

    this.averageExamScore = this.classCards.length
      ? this.roundNumber(
          this.classCards.reduce((sum, item) => sum + item.averageScore, 0) /
            this.classCards.length
        )
      : 0;
  }

  get subjectOptions(): string[] {
    const subjects = this.classCards.flatMap((item) => item.subjectNames ?? []);
    return [...new Set(subjects.map((x) => x.trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'az')
    );
  }

  applyFilters(): void {
    let result = [...this.classCards];

    const search = this.normalizeText(this.searchText);

    if (search) {
      result = result.filter((item) => {
        const haystack = this.normalizeText(
          [
            item.classRoomName,
            item.topStudentName ?? '',
            ...(item.subjectNames ?? [])
          ].join(' ')
        );

        return haystack.includes(search);
      });
    }

    if (this.selectedSubject) {
      const normalizedSelectedSubject = this.normalizeText(this.selectedSubject);

      result = result.filter((item) =>
        (item.subjectNames ?? []).some(
          (subject) => this.normalizeText(subject) === normalizedSelectedSubject
        )
      );
    }

    switch (this.sortBy) {
      case 'name-desc':
        result.sort((a, b) =>
          b.classRoomName.localeCompare(a.classRoomName, 'az')
        );
        break;

      case 'student-desc':
        result.sort((a, b) => b.studentCount - a.studentCount);
        break;

      case 'attendance-desc':
        result.sort((a, b) => b.attendanceRate - a.attendanceRate);
        break;

      case 'exam-desc':
        result.sort((a, b) => b.averageScore - a.averageScore);
        break;

      case 'name-asc':
      default:
        result.sort((a, b) =>
          a.classRoomName.localeCompare(b.classRoomName, 'az')
        );
        break;
    }

    this.filteredClassCards = [...result];
    this.refreshView();
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedSubject = '';
    this.sortBy = 'name-asc';
    this.applyFilters();
    this.refreshView();
  }

  goToClassDetail(classItem: TeacherClassCardViewModel): void {
    this.router.navigate(['/teacher/classes', classItem.classRoomId]);
  }

  goToAttendance(classItem: TeacherClassCardViewModel): void {
    this.router.navigate(['/teacher/classes', classItem.classRoomId, 'attendance']);
  }

  goToTasks(classItem: TeacherClassCardViewModel): void {
    this.router.navigate(['/teacher/tasks'], {
      queryParams: {
        classRoomId: classItem.classRoomId,
        className: classItem.classRoomName
      }
    });
  }

  goToExamCreate(classItem: TeacherClassCardViewModel): void {
    this.router.navigate(['/teacher/exams/create'], {
      queryParams: {
        classRoomId: classItem.classRoomId,
        className: classItem.classRoomName
      }
    });
  }

  getAttendanceState(rate: number): 'good' | 'medium' | 'low' {
    if (rate >= 85) return 'good';
    if (rate >= 65) return 'medium';
    return 'low';
  }

  formatPercent(value: number | null | undefined): string {
    return `${this.roundNumber(this.toNumber(value))}%`;
  }

  formatScore(value: number | null | undefined): string {
    return `${this.roundNumber(this.toNumber(value))}%`;
  }

  trackByClass(index: number, item: TeacherClassCardViewModel): number {
    return item.classRoomId || index;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
 
  private roundNumber(value: number): number {
    return Math.round(value * 100) / 100;
  } 
   

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim().toLocaleLowerCase('az');
  }
}