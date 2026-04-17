import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SubjectFilter,
  SubjectFormData,
  SubjectListItem,
  SubjectStats,
  SubjectTeacherOption
} from '../../../../../core/models/subject/subject.model';
import { SubjectService } from '../../data/subject.service';

@Component({
  selector: 'app-subject-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subject-create.component.html',
  styleUrls: ['./subject-create.component.css']
})
export class SubjectCreateComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef); // YENI

  readonly Math = Math;

  teachers: SubjectTeacherOption[] = [];
  subjects: SubjectListItem[] = [];
  filteredSubjects: SubjectListItem[] = [];

  stats: SubjectStats = {
    totalSubjects: 0,
    activeSubjects: 0,
    passiveSubjects: 0,
    totalAssignments: 0
  };

  filter: SubjectFilter = {
    search: '',
    status: '',
    teacherId: null
  };

  form: SubjectFormData = this.createEmptyForm();

  selectedTeacherIds: number[] = [];

  isEditMode = false;
  editingSubjectId: number | null = null;

  selectedTeacherIdToAdd: number | null = null;

  successMessage = '';
  errorMessage = '';
  loading = false;

  constructor(private subjectService: SubjectService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private refreshView(): void { // YENI
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.refreshView(); // YENI

    this.subjectService.getTeachers().subscribe({
      next: (teachers) => {
        this.teachers = [...(teachers ?? [])];
        this.refreshView(); // YENI
        this.applyFilters();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Müəllim siyahısı yüklənmədi.';
        this.loading = false;
        this.refreshView(); // YENI
      }
    });
  }

  applyFilters(): void {
    this.loading = true; // YENI
    this.refreshView(); // YENI

    this.subjectService.getFilteredSubjects(this.filter).subscribe({
      next: (subjects) => {
        this.subjects = [...(subjects ?? [])];
        this.filteredSubjects = [...this.subjects];
        this.stats = { ...this.subjectService.getStats(this.filteredSubjects) };
        this.loading = false;
        this.refreshView(); // YENI
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Fənn siyahısı yüklənmədi.';
        this.loading = false;
        this.refreshView(); // YENI
      }
    });
  }

  resetFilters(): void {
    this.filter = {
      search: '',
      status: '',
      teacherId: null
    };

    this.refreshView(); // YENI
    this.applyFilters();
  }

  createEmptyForm(): SubjectFormData {
    return {
      name: '',
      code: '',
      description: '',
      weeklyHours: null,
      status: 'Aktiv'
    };
  }

  get availableTeachersForAdd(): SubjectTeacherOption[] {
    return this.teachers.filter(teacher => !this.selectedTeacherIds.includes(teacher.id));
  }

  get selectedTeachers(): SubjectTeacherOption[] {
    return this.teachers.filter(teacher => this.selectedTeacherIds.includes(teacher.id));
  }

  get isFormValid(): boolean {
    return !!(
      this.form.name.trim() &&
      this.form.code.trim() &&
      this.form.description.trim() &&
      this.form.weeklyHours !== null &&
      this.form.weeklyHours > 0
    );
  }

  addTeacherToDraft(): void {
    if (this.selectedTeacherIdToAdd === null || this.selectedTeacherIdToAdd === undefined) {
      return;
    }

    if (!this.selectedTeacherIds.includes(this.selectedTeacherIdToAdd)) {
      this.selectedTeacherIds = [...this.selectedTeacherIds, this.selectedTeacherIdToAdd];
    }

    this.selectedTeacherIdToAdd = null;
    this.refreshView(); // YENI
  }

  removeTeacherFromDraft(teacherId: number): void {
    this.selectedTeacherIds = this.selectedTeacherIds.filter(id => id !== teacherId);
    this.refreshView(); // YENI
  }

  submitForm(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    if (!this.isFormValid) {
      this.errorMessage = 'Zəhmət olmasa bütün vacib xanaları düzgün doldurun.';
      this.refreshView(); // YENI
      return;
    }

    this.loading = true;
    this.refreshView(); // YENI

    const formPayload: SubjectFormData = { ...this.form }; // YENI
    const teacherIdsPayload = [...this.selectedTeacherIds]; // YENI

    const request$ = this.isEditMode && this.editingSubjectId !== null
      ? this.subjectService.updateSubject(this.editingSubjectId, formPayload, teacherIdsPayload)
      : this.subjectService.createSubject(formPayload, teacherIdsPayload);

    request$.subscribe({
      next: () => {
        this.successMessage = this.isEditMode ? 'Fənn uğurla yeniləndi.' : 'Fənn uğurla əlavə edildi.';
        this.refreshView(); // YENI
        this.cancelEdit();
        this.loadData();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Əməliyyat icra olunmadı.';
        this.loading = false;
        this.refreshView(); // YENI
      }
    });
  }

  editSubject(subject: SubjectListItem): void {
    this.isEditMode = true;
    this.editingSubjectId = subject.id;

    this.form = {
      name: subject.name,
      code: subject.code,
      description: subject.description,
      weeklyHours: subject.weeklyHours,
      status: subject.status
    };

    this.selectedTeacherIds = [...subject.teachers.map(teacher => teacher.teacherId)];
    this.selectedTeacherIdToAdd = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.editingSubjectId = null;
    this.form = this.createEmptyForm();
    this.selectedTeacherIds = [];
    this.selectedTeacherIdToAdd = null;
    this.refreshView(); // YENI
  }

  deleteSubject(subjectId: number): void {
    this.loading = true; // YENI
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    this.subjectService.removeSubject(subjectId).subscribe({
      next: () => {
        if (this.editingSubjectId === subjectId) {
          this.cancelEdit();
        }

        this.successMessage = 'Fənn silindi.';
        this.refreshView(); // YENI
        this.loadData();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Fənn silinə bilmədi.';
        this.loading = false; // YENI
        this.refreshView(); // YENI
      }
    });
  }

  toggleStatus(subject: SubjectListItem): void {
    const newStatus = subject.status === 'Aktiv' ? 'Passiv' : 'Aktiv';

    this.loading = true; // YENI
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    this.subjectService.changeSubjectStatus(subject.id, newStatus).subscribe({
      next: () => {
        this.successMessage = `Fənnin statusu "${newStatus}" olaraq dəyişdirildi.`;
        this.refreshView(); // YENI
        this.loadData();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Status dəyişdirilə bilmədi.';
        this.loading = false; // YENI
        this.refreshView(); // YENI
      }
    });
  }

  removeTeacherFromExistingSubject(subjectId: number, teacherId: number): void {
    this.loading = true; // YENI
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView(); // YENI

    this.subjectService.removeTeacherFromSubject(subjectId, teacherId).subscribe({
      next: () => {
        if (this.editingSubjectId === subjectId) {
          this.selectedTeacherIds = this.selectedTeacherIds.filter(id => id !== teacherId);
        }

        this.successMessage = 'Müəllim fəndən çıxarıldı.';
        this.refreshView(); // YENI
        this.loadData();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Müəllim fəndən silinə bilmədi.';
        this.loading = false; // YENI
        this.refreshView(); // YENI
      }  
    });
  }

  trackBySubjectId(_: number, item: SubjectListItem): number {
    return item.id;
  }

  trackByTeacherId(_: number, item: SubjectTeacherOption): number {
    return item.id;
  }
}