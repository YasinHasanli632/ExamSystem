import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  StudentClassOption,
  StudentFilter,
  StudentListItem,
  StudentStatus,
  StudentSummaryStats
} from '../../../../../core/models/students/student.model';
import { StudentsService } from '../../data/students.service';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './students-list.component.html',
  styleUrls: ['./students-list.component.css']
})
export class StudentsListComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef); // YENI

  readonly Math = Math;

  filter: StudentFilter = {
    fullName: '',
    className: '',
    teacherName: '',
    status: '',
    minScore: null,
    maxScore: null
  };

  students: StudentListItem[] = [];
  filteredStudents: StudentListItem[] = [];

  classOptions: StudentClassOption[] = [];
  teacherOptions: string[] = [];
  fullNameSuggestions: string[] = [];
  teacherSuggestions: string[] = [];

  showNameSuggestions = false;
  showTeacherSuggestions = false;

  isLoading = false;
  isDeleting = false;
  errorMessage = '';

  constructor(
    private readonly studentsService: StudentsService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadClassOptions();
    this.loadStudents();
  }

  private refreshView(): void { // YENI
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadStudents(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.refreshView(); // YENI

    this.studentsService.getStudents(this.filter).subscribe({
      next: (response) => {
        this.students = [...(response ?? [])];
        this.filteredStudents = [...this.students];
        this.prepareSuggestionsAndOptions();
        this.isLoading = false;
        this.refreshView(); // YENI
      },
      error: (error) => {
        console.error('Student list load error =>', error);
        this.students = [];
        this.filteredStudents = [];
        this.teacherOptions = [];
        this.fullNameSuggestions = [];
        this.teacherSuggestions = [];
        this.errorMessage = 'Şagird siyahısı yüklənərkən xəta baş verdi.';
        this.isLoading = false;
        this.refreshView(); // YENI
      }
    });
  }

  loadClassOptions(): void {
    this.studentsService.getClassOptions().subscribe({
      next: (response) => {
        this.classOptions = [...(response ?? [])];
        this.refreshView(); // YENI
      },
      error: (error) => {
        console.error('Class options load error =>', error);
        this.classOptions = [];
        this.refreshView(); // YENI
      }
    });
  }

  applyFilters(): void {
    this.loadStudents();
  }

  resetFilters(): void {
    this.filter = {
      fullName: '',
      className: '',
      teacherName: '',
      status: '',
      minScore: null,
      maxScore: null
    };

    this.showNameSuggestions = false;
    this.showTeacherSuggestions = false;
    this.refreshView(); // YENI
    this.loadStudents();
  }

  onView(student: StudentListItem): void {
    this.router.navigate(['/admin/users/students', student.id]);
  }

  goToCreate(): void {
    this.router.navigate(['/admin/users/students/new']);
  }

  onDelete(student: StudentListItem): void {
    const confirmed = confirm(`"${student.fullName}" adlı şagird silinsin?`);

    if (!confirmed || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.refreshView(); // YENI

    this.studentsService.deleteStudent(student.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.refreshView(); // YENI
        this.loadStudents();
      },
      error: (error) => {
        console.error('Student delete error =>', error);
        this.isDeleting = false;
        this.refreshView(); // YENI
        alert(
          error?.error?.message ||
            'Şagird silinərkən xəta baş verdi.'
        );
      }
    });
  }

  onFullNameInput(): void {
    const query = (this.filter.fullName ?? '').trim().toLowerCase();

    this.fullNameSuggestions = [...new Set(this.students.map((x) => x.fullName))]
      .filter((name) => !query || name.toLowerCase().includes(query))
      .slice(0, 6);

    this.showNameSuggestions = !!query && this.fullNameSuggestions.length > 0;
    this.refreshView(); // YENI
  }

  onTeacherInput(): void {
    const query = (this.filter.teacherName ?? '').trim().toLowerCase();

    this.teacherSuggestions = [...new Set(this.students.map((x) => x.teacherName))]
      .filter((name) => !query || name.toLowerCase().includes(query))
      .slice(0, 6);

    this.showTeacherSuggestions = !!query && this.teacherSuggestions.length > 0;
    this.refreshView(); // YENI
  }

  selectNameSuggestion(fullName: string): void {
    this.filter.fullName = fullName;
    this.showNameSuggestions = false;
    this.refreshView(); // YENI
  }

  selectTeacherSuggestion(teacherName: string): void {
    this.filter.teacherName = teacherName;
    this.showTeacherSuggestions = false;
    this.refreshView(); // YENI
  }

  hideNameSuggestions(): void {
    setTimeout(() => {
      this.showNameSuggestions = false;
      this.refreshView(); // YENI
    }, 150);
  }

  hideTeacherSuggestions(): void {
    setTimeout(() => {
      this.showTeacherSuggestions = false;
      this.refreshView(); // YENI
    }, 150);
  }

  get stats(): StudentSummaryStats {
    return this.studentsService.getSummaryStats(this.filteredStudents);
  }

  get statusOptions(): StudentStatus[] {
    return ['Aktiv', 'Passiv', 'Məzun'];
  }

  private prepareSuggestionsAndOptions(): void {
    this.teacherOptions = [...new Set(this.students.map((x) => x.teacherName))]
      .filter((x) => !!x)
      .sort((a, b) => a.localeCompare(b, 'az'));

    this.fullNameSuggestions = [...new Set(this.students.map((x) => x.fullName))]
      .sort((a, b) => a.localeCompare(b, 'az'));

    this.teacherSuggestions = [...this.teacherOptions];
    this.refreshView(); // YENI
  }
}