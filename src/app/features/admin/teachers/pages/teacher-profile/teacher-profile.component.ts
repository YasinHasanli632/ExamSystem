import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Teacher } from '../../../../../core/models/teacher/teacher.model';
import { TeacherPanelService } from '../../data/teacher-panel.service';

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-profile.component.html',
  styleUrls: ['./teacher-profile.component.css']
})
export class TeacherProfileComponent implements OnInit {
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly cdr = inject(ChangeDetectorRef);

  teacher: Teacher | null = null;
  isLoading = true;
  errorMessage = '';

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

    this.teacherPanelService.getMyTeacherProfile().subscribe({
      next: (teacher) => {
        this.teacher = { ...teacher };
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

  refreshProfile(): void {
    this.loadProfile();
  }
}