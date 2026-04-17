import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TeacherPanelService } from '../../data/teacher-panel.service';

interface TeacherExamListItemViewModel {
  id: number;
  title: string;
  className: string;
  subjectName: string;
  status: string;
  isPublished: boolean;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  totalScore?: number | null;
  questionCount?: number | null;
  description?: string | null;
  teacherId?: number | null;
}

@Component({
  selector: 'app-teacher-exams',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-exams.component.html',
  styleUrls: ['./teacher-exams.component.css']
})
export class TeacherExamsComponent implements OnInit {
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  exams: TeacherExamListItemViewModel[] = [];
  filteredExams: TeacherExamListItemViewModel[] = [];

  loading = false;
  publishingId: number | null = null;
  errorMessage = '';

  searchTerm = '';
  selectedStatus = '';
  selectedPublishFilter = '';
  selectedClass = '';
  selectedSubject = '';

  classes: string[] = [];
  subjects: string[] = [];
  statuses: string[] = [];

  myTeacherId: number | null = null;

  ngOnInit(): void {
    this.loadMyExams();
  }

  loadMyExams(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      profile: this.teacherPanelService.getMyProfile(),
      exams: this.teacherPanelService.getMyExams()
    }).subscribe({
      next: ({ profile, exams }) => {
        this.myTeacherId = Number((profile as any)?.id ?? 0) || null;

        const rawExams = Array.isArray(exams) ? exams : [];
        const mappedExams = rawExams.map((item: any) => this.mapExam(item));

        this.exams = this.filterTeacherExams(mappedExams, this.myTeacherId);
        this.prepareFilters();
        this.applyFilters();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Teacher exams load error:', error);
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'İmtahanlar yüklənərkən xəta baş verdi.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private filterTeacherExams(
    exams: TeacherExamListItemViewModel[],
    teacherId: number | null
  ): TeacherExamListItemViewModel[] {
    if (!teacherId) {
      return exams;
    }

    const filtered = exams.filter((exam) => exam.teacherId === teacherId);
    const hasTeacherInfo = exams.some((x) => x.teacherId !== null && x.teacherId !== undefined);

    return hasTeacherInfo ? filtered : exams;
  }

  mapExam(item: any): TeacherExamListItemViewModel {
    const questions =
      item?.questions ??
      item?.examQuestions ??
      item?.questionDtos ??
      item?.questionList ??
      item?.items ??
      [];

    const totalScore =
      this.toNumberOrNull(item?.totalScore) ??
      this.toNumberOrNull(item?.maxScore) ??
      this.toNumberOrNull(item?.score) ??
      this.toNumberOrNull(item?.totalPoint) ??
      this.toNumberOrNull(item?.points) ??
      this.toNumberOrNull(item?.examTotalScore) ??
      this.toNumberOrNull(item?.closedQuestionScore) ??
      this.toNumberOrNull(item?.openQuestionScore) ??
      this.toNumberOrNull(item?.writtenQuestionScore) ??
      this.sumKnownScoreFields(item) ??
      this.sumQuestionScores(questions);

    return {
      id: Number(item?.id ?? 0),
      title: item?.title ?? item?.name ?? 'Adsız imtahan',
      className:
        item?.className ??
        item?.classRoomName ??
        item?.classroomName ??
        item?.classroom?.name ??
        item?.classRoom?.name ??
        item?.class?.name ??
        '-',
      subjectName:
        item?.subjectName ??
        item?.subject?.name ??
        item?.subjectDto?.name ??
        '-',
      status: item?.status ?? (item?.isPublished ? 'Published' : 'Draft'),
      isPublished: Boolean(item?.isPublished ?? item?.published ?? false),
      startTime: item?.startTime ?? item?.examDate ?? item?.createdAt ?? null,
      endTime: item?.endTime ?? null,
      durationMinutes:
        this.toNumberOrNull(item?.durationMinutes) ??
        this.toNumberOrNull(item?.duration) ??
        this.toNumberOrNull(item?.examDurationMinutes) ??
        this.calculateDurationFromDates(item?.startTime, item?.endTime),

      totalScore,

      questionCount:
        this.toNumberOrNull(item?.questionCount) ??
        this.toNumberOrNull(item?.questionsCount) ??
        this.toNumberOrNull(item?.totalQuestionCount) ??
        this.toNumberOrNull(item?.totalQuestions) ??
        this.toNumberOrNull(item?.questionLength) ??
        (Array.isArray(questions) ? questions.length : null),

      description: item?.description ?? item?.instructions ?? null,
      teacherId: item?.teacherId ?? item?.teacher?.id ?? null
    };
  }

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private calculateDurationFromDates(startTime?: string | null, endTime?: string | null): number | null {
    if (!startTime || !endTime) {
      return null;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) {
      return null;
    }

    return Math.round(diffMs / 60000);
  }

  private sumQuestionScores(questions: any[]): number | null {
    if (!Array.isArray(questions) || questions.length === 0) {
      return null;
    }

    const total = questions.reduce((sum, question) => {
      const score =
        this.toNumberOrNull(question?.points) ??
        this.toNumberOrNull(question?.score) ??
        this.toNumberOrNull(question?.point) ??
        this.toNumberOrNull(question?.weight) ??
        this.toNumberOrNull(question?.pointsAwarded) ??
        0;

      return sum + score;
    }, 0);

    return total > 0 ? total : null;
  }

  private sumKnownScoreFields(item: any): number | null {
    const values = [
      this.toNumberOrNull(item?.closedQuestionScore),
      this.toNumberOrNull(item?.openQuestionScore),
      this.toNumberOrNull(item?.openQuestionsScore),
      this.toNumberOrNull(item?.writtenQuestionScore),
      this.toNumberOrNull(item?.oralQuestionScore),
      this.toNumberOrNull(item?.practicalQuestionScore)
    ].filter((x): x is number => x !== null);

    if (values.length === 0) {
      return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return total > 0 ? total : null;
  }

  prepareFilters(): void {
    this.classes = [...new Set(this.exams.map(x => x.className).filter(Boolean))].sort();
    this.subjects = [...new Set(this.exams.map(x => x.subjectName).filter(Boolean))].sort();
    this.statuses = [...new Set(this.exams.map(x => x.status).filter(Boolean))].sort();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredExams = this.exams.filter((exam) => {
      const matchesSearch =
        !term ||
        exam.title.toLowerCase().includes(term) ||
        exam.className.toLowerCase().includes(term) ||
        exam.subjectName.toLowerCase().includes(term);

      const matchesStatus =
        !this.selectedStatus || exam.status === this.selectedStatus;

      const matchesPublish =
        !this.selectedPublishFilter ||
        (this.selectedPublishFilter === 'published' && exam.isPublished) ||
        (this.selectedPublishFilter === 'draft' && !exam.isPublished);

      const matchesClass =
        !this.selectedClass || exam.className === this.selectedClass;

      const matchesSubject =
        !this.selectedSubject || exam.subjectName === this.selectedSubject;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPublish &&
        matchesClass &&
        matchesSubject
      );
    });

    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedPublishFilter = '';
    this.selectedClass = '';
    this.selectedSubject = '';
    this.applyFilters();
  }

  goToCreate(): void {
    this.router.navigate(['/teacher/exams/create']);
  }

  goToDetail(exam: TeacherExamListItemViewModel): void {
    if (!exam?.id) {
      return;
    }

    this.router.navigate(['/teacher/exams', exam.id]);
  }

  publishExam(exam: TeacherExamListItemViewModel): void {
    if (!exam?.id || exam.isPublished) {
      return;
    }

    this.publishingId = exam.id;
    this.errorMessage = '';

    this.teacherPanelService.publishExam(exam.id).subscribe({
      next: () => {
        this.exams = this.exams.map((item) =>
          item.id === exam.id
            ? {
                ...item,
                isPublished: true,
                status: item.status === 'Draft' ? 'Published' : item.status
              }
            : item
        );

        this.applyFilters();
        this.publishingId = null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Publish exam error:', error);
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'İmtahan yayımlanarkən xəta baş verdi.';
        this.publishingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Draft':
        return 'Qaralama';
      case 'Published':
        return 'Yayımlanıb';
      case 'Active':
        return 'Aktiv';
      case 'Completed':
        return 'Tamamlanıb';
      case 'Cancelled':
        return 'Ləğv edilib';
      case 'Planned':
        return 'Planlaşdırılıb';
      default:
        return status || '-';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Draft':
        return 'status-draft';
      case 'Published':
        return 'status-published';
      case 'Active':
        return 'status-active';
      case 'Completed':
        return 'status-completed';
      case 'Cancelled':
        return 'status-cancelled';
      case 'Planned':
        return 'status-planned';
      default:
        return 'status-default';
    }
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  displayNumber(value?: number | null): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '-';
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  get publishedCount(): number {
    return this.exams.filter(x => x.isPublished).length;
  }

  get draftCount(): number {
    return this.exams.filter(x => !x.isPublished).length;
  }

  get activeCount(): number {
    return this.exams.filter(x => x.status === 'Active').length;
  }
    
  get completedCount(): number {
    return this.exams.filter(x => x.status === 'Completed').length;
  }
}