import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  StudentAttendanceFilterModel,
  StudentAttendanceModel,
  StudentAttendanceStatsModel,
  StudentAttendanceSubjectModel
} from '../../../../core/models/students/attendance-status.model';
import { StudentAttendanceService } from '../../data/student-attendance.service';

@Component({
  selector: 'app-student-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-attendance.component.html',
  styleUrl: './student-attendance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAttendanceComponent implements OnInit {
  private readonly studentAttendanceService = inject(StudentAttendanceService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = false;
  isFilterLoading = false;
  errorMessage = '';

  allAttendanceItems: StudentAttendanceModel[] = [];
  filteredAttendanceItems: StudentAttendanceModel[] = [];
  subjectOptions: StudentAttendanceSubjectModel[] = [];

  filter: StudentAttendanceFilterModel = {
    subjectName: '',
    startDate: '',
    endDate: '',
    searchText: '',
    status: ''
  };

  stats: StudentAttendanceStatsModel = {
    totalCount: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    excusedCount: 0
  };

  ngOnInit(): void {
    this.loadAttendance();
  }

  loadAttendance(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentAttendanceService
      .getMyAttendance()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (items) => {
          this.allAttendanceItems = [...(items ?? [])].sort((a, b) => {
            return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
          });

          this.subjectOptions = this.buildSubjectOptions(this.allAttendanceItems);
          this.applyFilters(false);
        },
        error: (error) => {
          console.error('Student attendance load error:', error);
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Davamiyyət məlumatları yüklənərkən xəta baş verdi.';
          this.allAttendanceItems = [];
          this.filteredAttendanceItems = [];
          this.subjectOptions = [];
          this.stats = this.calculateStats([]);
        }
      });
  }

  applyFilters(showLoader = true): void {
    if (showLoader) {
      this.isFilterLoading = true;
      this.cdr.detectChanges();
    }

    const subjectName = this.filter.subjectName.trim().toLowerCase();
    const searchText = this.filter.searchText.trim().toLowerCase();
    const selectedStatus = this.filter.status.trim().toLowerCase();

    const startDate = this.filter.startDate ? new Date(this.filter.startDate) : null;
    const endDate = this.filter.endDate ? new Date(this.filter.endDate) : null;

    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    this.filteredAttendanceItems = this.allAttendanceItems.filter((item) => {
      const itemDate = new Date(item.sessionDate);
      const itemStatus = (item.statusLabel || '').trim().toLowerCase();

      const matchesSubject =
        !subjectName || item.subjectName.toLowerCase() === subjectName;

      const matchesStatus =
        !selectedStatus || itemStatus === selectedStatus;

      const searchableText = [
        item.subjectName,
        item.teacherName,
        item.className,
        item.statusLabel,
        item.notes,
        item.noteSummary,
        item.absenceReasonType,
        item.absenceReasonNote,
        item.lateArrivalTime,
        item.lateNote
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !searchText || searchableText.includes(searchText);

      const matchesStartDate =
        !startDate || itemDate.getTime() >= startDate.getTime();

      const matchesEndDate =
        !endDate || itemDate.getTime() <= endDate.getTime();

      return (
        matchesSubject &&
        matchesStatus &&
        matchesSearch &&
        matchesStartDate &&
        matchesEndDate
      );
    });

    this.stats = this.calculateStats(this.filteredAttendanceItems);

    if (showLoader) {
      setTimeout(() => {
        this.isFilterLoading = false;
        this.cdr.detectChanges();
      }, 120);
      return;
    }

    this.isFilterLoading = false;
    this.cdr.detectChanges();
  }

  resetFilters(): void {
    this.filter = {
      subjectName: '',
      startDate: '',
      endDate: '',
      searchText: '',
      status: ''
    };

    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filter.subjectName ||
      this.filter.startDate ||
      this.filter.endDate ||
      this.filter.searchText ||
      this.filter.status
    );
  }

  get emptyStateTitle(): string {
    return this.allAttendanceItems.length
      ? 'Filterə uyğun nəticə tapılmadı'
      : 'Hələ davamiyyət qeydi yoxdur';
  }

  get emptyStateDescription(): string {
    return this.allAttendanceItems.length
      ? 'Filterləri dəyişib yenidən yoxlayın.'
      : 'Backenddən bu tələbə üçün hələ davamiyyət qeydi gəlməyib.';
  }

  trackByAttendance(_: number, item: StudentAttendanceModel): number {
    return item.attendanceSessionId;
  }

  getStatusClass(status: string): string {
    const normalized = (status ?? '').trim().toLowerCase();

    if (normalized === 'gəlib' || normalized === 'gelib') {
      return 'status-present';
    }

    if (normalized === 'gecikib') {
      return 'status-late';
    }

    if (normalized === 'yoxdur') {
      return 'status-absent';
    }

    if (
      normalized === 'i̇cazəli' ||
      normalized === 'icazəli' ||
      normalized === 'icazeli'
    ) {
      return 'status-excused';
    }

    return 'status-default';
  }

  formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatWeekday(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('az-AZ', {
      weekday: 'long'
    }).format(date);
  }

  private calculateStats(items: StudentAttendanceModel[]): StudentAttendanceStatsModel {
    const getCount = (label: string): number =>
      items.filter((item) => item.statusLabel === label).length;

    return {
      totalCount: items.length,
      presentCount: getCount('Gəlib'),
      lateCount: getCount('Gecikib'),
      absentCount: getCount('Yoxdur'),
      excusedCount: getCount('İcazəli')
    };
  }

  private buildSubjectOptions(
    items: StudentAttendanceModel[]
  ): StudentAttendanceSubjectModel[] {
    const map = new Map<string, number>();

    for (const item of items) {
      const key = (item.subjectName ?? '').trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, count]) => ({
        id: name,
        name,
        count
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'az'));
  }
}