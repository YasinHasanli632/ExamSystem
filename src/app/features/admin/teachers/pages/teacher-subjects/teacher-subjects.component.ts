import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Teacher } from '../../../../../core/models/teacher/teacher.model';
import { TeacherPanelService } from '../../data/teacher-panel.service';

@Component({
  selector: 'app-teacher-subjects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-subjects.component.html',
  styleUrls: ['./teacher-subjects.component.css']
})
export class TeacherSubjectsComponent implements OnInit {
  private readonly teacherPanelService = inject(TeacherPanelService);

  teacher: Teacher | null = null;
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.teacherPanelService.getMyTeacherProfile().subscribe({
      next: (teacher) => {
        this.teacher = teacher;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Fənn məlumatları yüklənmədi.';
      }
    });
  }
}