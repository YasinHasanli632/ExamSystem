import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TeacherPanelService } from '../../../data/teacher-panel.service';
import {
  TeacherClassTaskListItem,
  TeacherTaskClassSummary
} from '../../../../../../core/models/teacher/task-management.model';

type ClassTaskFilter = 'all' | 'waiting' | 'active' | 'completed';

@Component({
  selector: 'app-teacher-class-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-class-tasks.component.html',
  styleUrls: ['./teacher-class-tasks.component.css']
})
export class TeacherClassTasksComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly cdr = inject(ChangeDetectorRef);

  classRoomId = 0;

  isLoading = true;
  errorMessage = '';

  classSummary: TeacherTaskClassSummary | null = null;

  tasks: TeacherClassTaskListItem[] = [];
  filteredTasks: TeacherClassTaskListItem[] = [];

  searchTerm = '';
  selectedFilter: ClassTaskFilter = 'all';

  ngOnInit(): void {
    this.classRoomId = Number(this.route.snapshot.paramMap.get('classRoomId'));

    if (!this.classRoomId) {
      this.errorMessage = 'Sinif identifikatoru tapılmadı.';
      this.isLoading = false;
      this.refreshView();
      return;
    }

    this.loadData();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.refreshView();

    forkJoin({
      classSummaries: this.teacherPanelService.getTeacherTaskClasses(),
      tasks: this.teacherPanelService.getTeacherClassTasks(this.classRoomId)
    }).subscribe({
      next: ({ classSummaries, tasks }) => {
        this.classSummary =
          (classSummaries ?? []).find((x) => x.classRoomId === this.classRoomId) ?? null;

        this.tasks = [...(tasks ?? [])].sort((a, b) => {
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        });

        this.applyFilters();
        this.isLoading = false;
        this.refreshView();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Sinifə aid tasklar yüklənmədi.';
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  applyFilters(): void {
    let result = [...this.tasks];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((item) => {
        return (
          item.title?.toLowerCase().includes(term) ||
          item.subjectName?.toLowerCase().includes(term) ||
          item.teacherName?.toLowerCase().includes(term) ||
          item.taskState?.toLowerCase().includes(term)
        );
      });
    }

    if (this.selectedFilter === 'waiting') {
      result = result.filter((x) => x.taskState === 'Gözləyir');
    }

    if (this.selectedFilter === 'active') {
      result = result.filter((x) => x.taskState === 'Davam edir');
    }

    if (this.selectedFilter === 'completed') {
      result = result.filter((x) => x.taskState === 'Bitib');
    }

    this.filteredTasks = [...result];
    this.refreshView();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setFilter(filter: ClassTaskFilter): void {
    this.selectedFilter = filter;
    this.applyFilters();
    this.refreshView();
  }

  goBack(): void {
    this.router.navigate(['/teacher/tasks']);
  }

  openTaskDetail(task: TeacherClassTaskListItem): void {
    this.router.navigate(['/teacher/tasks/detail', task.taskGroupKey]);
  }

  get totalTaskCount(): number {
    return this.tasks.length;
  }

  get waitingTaskCount(): number {
    return this.tasks.filter((x) => x.taskState === 'Gözləyir').length;
  }

  get activeTaskCount(): number {
    return this.tasks.filter((x) => x.taskState === 'Davam edir').length;
  }

  get completedTaskCount(): number {
    return this.tasks.filter((x) => x.taskState === 'Bitib').length;
  }

  getSubmissionRate(item: TeacherClassTaskListItem): number {
    if (!item.totalStudentCount) {
      return 0;
    }

    return Math.round((item.submittedCount / item.totalStudentCount) * 100);
  }

  getMissingRate(item: TeacherClassTaskListItem): number {
    if (!item.totalStudentCount) {
      return 0;
    }

    return Math.round((item.missingCount / item.totalStudentCount) * 100);
  }

  getStateClass(state: string): string {
    if (state === 'Gözləyir') return 'waiting';
    if (state === 'Davam edir') return 'active';
    if (state === 'Bitib') return 'completed';
    return '';
  }

  getRemainingLabel(item: TeacherClassTaskListItem): string {
    const now = new Date().getTime();
    const assigned = new Date(item.assignedDate).getTime();
    const due = new Date(item.dueDate).getTime();

    if (now < assigned) {
      const diff = assigned - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return `${days} gün sonra başlayır`;
    }

    if (now <= due) {
      const diff = due - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        return `${days} gün ${hours} saat qalıb`;
      }

      return `${Math.max(hours, 0)} saat qalıb`;
    }

    return 'Vaxtı bitib';
  }

  trackByTaskGroup(index: number, item: TeacherClassTaskListItem): string {
    return item.taskGroupKey;
  }
}