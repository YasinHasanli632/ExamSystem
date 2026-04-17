import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TeacherPanelService } from '../../data/teacher-panel.service';
import {
  AttendanceAbsenceReasonType,
  AttendanceBoard,
  AttendanceBoardCell,
  AttendanceBoardFilter,
  AttendanceBoardStatus,
  AttendanceBoardStudentRow,
  AttendanceCellDraft,
  AttendanceSessionColumn,
  AttendanceSessionTypeValue,
  CreateAttendanceSessionColumnRequest,
  SaveAttendanceSessionRecordsRequest,
  UpsertAttendanceRecordRequest
} from '../../../../../core/models/class/attendance/attendance.model';

interface AttendanceSubjectOption {
  id: number;
  name: string;
  code?: string | null;
}

interface CreateSessionForm {
  sessionDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  sessionType: AttendanceSessionTypeValue;
}

@Component({
  selector: 'app-teacher-attendance-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-attendance-detail.component.html',
  styleUrls: ['./teacher-attendance-detail.component.css']
})
export class TeacherAttendanceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherPanelService = inject(TeacherPanelService);
  private readonly cdr = inject(ChangeDetectorRef);

  classId = 0;
  teacherId = 0;

  loadingMeta = false;
  loadingBoard = false;
  saving = false;
  creatingSession = false;

  errorMessage = '';
  successMessage = '';

  classSummary: any = null;

  board: AttendanceBoard | null = null;

  subjectOptions: AttendanceSubjectOption[] = [];
  selectedSubjectId: number | null = null;

  readonly monthOptions = [
    { value: 1, label: 'Yanvar' },
    { value: 2, label: 'Fevral' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Aprel' },
    { value: 5, label: 'May' },
    { value: 6, label: 'İyun' },
    { value: 7, label: 'İyul' },
    { value: 8, label: 'Avqust' },
    { value: 9, label: 'Sentyabr' },
    { value: 10, label: 'Oktyabr' },
    { value: 11, label: 'Noyabr' },
    { value: 12, label: 'Dekabr' }
  ];

  yearOptions: number[] = [];

  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();

  isCreateSessionModalOpen = false;
  isCellModalOpen = false;

  createSessionForm: CreateSessionForm = this.createDefaultSessionForm();

  selectedStudentRow: AttendanceBoardStudentRow | null = null;
  selectedSessionColumn: AttendanceSessionColumn | null = null;
  selectedCell: AttendanceBoardCell | null = null;

  cellDraftForm: AttendanceCellDraft = this.createEmptyCellDraft(0, 0);

  readonly absenceReasonOptions: AttendanceAbsenceReasonType[] = [
    '',
    'Xəstəlik',
    'Ailə səbəbi',
    'İcazəli',
    'Məlum deyil',
    'Digər'
  ];

  private readonly draftStore = new Map<number, Map<number, AttendanceCellDraft>>();
  private readonly dirtySessionIds = new Set<number>();

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id || Number.isNaN(id)) {
      this.errorMessage = 'Sinif identifikatoru düzgün deyil.';
      this.refreshView();
      return;
    }

    this.classId = id;
    this.buildYearOptions();
    this.loadInitialData();
  }

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  loadInitialData(): void {
    this.loadingMeta = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    forkJoin({
      teacher: this.teacherPanelService.getMyProfile(),
      classRooms: this.teacherPanelService.getMyClassRooms(),
      subjectOptions: this.teacherPanelService.getSubjectOptions()
    }).subscribe({
      next: ({ teacher, classRooms, subjectOptions }) => {
        this.teacherId = Number((teacher as any)?.id ?? 0);

        const classes = Array.isArray(classRooms) ? classRooms : [];
        this.classSummary =
          classes.find((x: any) => Number(x?.classRoomId ?? x?.id) === this.classId) ?? null;

        const allSubjectOptions = Array.isArray(subjectOptions) ? subjectOptions : [];
        const classSubjectNames = Array.isArray(this.classSummary?.subjectNames)
          ? this.classSummary.subjectNames
              .map((x: unknown) => String(x ?? '').trim())
              .filter(Boolean)
          : [];

        this.subjectOptions = allSubjectOptions
          .filter((item: any) => {
            const optionName = String(item?.name ?? '').trim().toLocaleLowerCase('az');
            return classSubjectNames.some(
              (name: string) => name.trim().toLocaleLowerCase('az') === optionName
            );
          })
          .map((item: any) => ({
            id: Number(item?.id ?? 0),
            name: String(item?.name ?? ''),
            code: item?.code ?? null
          }))
          .filter((item: AttendanceSubjectOption) => item.id > 0 && !!item.name);

        if (this.subjectOptions.length === 0) {
          this.subjectOptions = allSubjectOptions
            .map((item: any) => ({
              id: Number(item?.id ?? 0),
              name: String(item?.name ?? ''),
              code: item?.code ?? null
            }))
            .filter((item: AttendanceSubjectOption) => item.id > 0 && !!item.name);
        }

        this.subjectOptions = [...this.subjectOptions];

        if (!this.selectedSubjectId && this.subjectOptions.length > 0) {
          this.selectedSubjectId = this.subjectOptions[0].id;
        }

        this.loadingMeta = false;
        this.refreshView();

        if (!this.teacherId) {
          this.errorMessage = 'Müəllim identifikatoru tapılmadı.';
          this.refreshView();
          return;
        }

        if (!this.selectedSubjectId) {
          this.errorMessage = 'Bu sinif üçün fənn tapılmadı.';
          this.refreshView();
          return;
        }

        this.loadBoard();
      },
      error: (error) => {
        console.error('Attendance initial load error:', error);
        this.loadingMeta = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Davamiyyət məlumatları yüklənərkən xəta baş verdi.';
        this.refreshView();
      }
    });
  }

  loadBoard(): void {
    if (!this.classId || !this.teacherId || !this.selectedSubjectId) {
      return;
    }

    this.loadingBoard = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    const payload: AttendanceBoardFilter = {
      classRoomId: this.classId,
      subjectId: this.selectedSubjectId,
      teacherId: this.teacherId,
      year: this.selectedYear,
      month: this.selectedMonth
    };

    this.teacherPanelService.getAttendanceBoard(payload).subscribe({
      next: (response) => {
        this.board = response
          ? {
              ...response,
              students: [...(response.students ?? [])],
              sessions: [...(response.sessions ?? [])]
            }
          : null;
        this.loadingBoard = false;
        this.refreshView();
      },
      error: (error) => {
        console.error('Attendance board load error:', error);
        this.loadingBoard = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Davamiyyət cədvəli yüklənərkən xəta baş verdi.';
        this.refreshView();
      }
    });
  }

  refreshBoard(): void {
    this.loadBoard();
  }

  goBack(): void {
    this.router.navigate(['/teacher/classes']);
  }

  get className(): string {
    return (
      this.board?.className ||
      this.classSummary?.classRoomName ||
      this.classSummary?.name ||
      'Sinif'
    );
  }

  get subjectName(): string {
    const selected = this.subjectOptions.find((x) => x.id === this.selectedSubjectId);
    return selected?.name || this.board?.subjectName || '-';
  }

  get totalStudents(): number {
    return this.board?.totalStudents ?? this.toNumber(this.classSummary?.studentCount);
  }

  get totalSessions(): number {
    return this.board?.totalSessions ?? 0;
  }

  get boardAttendanceRate(): number {
    return Number(this.board?.attendanceRate ?? this.classSummary?.attendanceRate ?? 0);
  }

  get students(): AttendanceBoardStudentRow[] {
    return this.board?.students ?? [];
  }

  get sessions(): AttendanceSessionColumn[] {
    return this.board?.sessions ?? [];
  }

  buildYearOptions(): void {
    const currentYear = new Date().getFullYear();
    this.yearOptions = [
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1
    ];
  }

  onFilterChanged(): void {
    this.loadBoard();
  }

  openCreateSessionModal(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.createSessionForm = this.createDefaultSessionForm();
    this.isCreateSessionModalOpen = true;
    this.refreshView();
  }

  closeCreateSessionModal(): void {
    this.isCreateSessionModalOpen = false;
    this.refreshView();
  }

  createSession(): void {
    if (!this.selectedSubjectId) {
      this.errorMessage = 'Fənn seçilməlidir.';
      this.refreshView();
      return;
    }

    if (!this.createSessionForm.sessionDate) {
      this.errorMessage = 'Dərs tarixi seçilməlidir.';
      this.refreshView();
      return;
    }

    this.creatingSession = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    const payload: CreateAttendanceSessionColumnRequest = {
      classRoomId: this.classId,
      subjectId: this.selectedSubjectId,
      teacherId: this.teacherId,
      sessionDate: `${this.createSessionForm.sessionDate}T00:00:00`,
      startTime: this.normalizeTimeForBackend(this.createSessionForm.startTime),
      endTime: this.normalizeTimeForBackend(this.createSessionForm.endTime),
      notes: this.normalizeText(this.createSessionForm.notes),
      sessionType: this.createSessionForm.sessionType
    };

    this.teacherPanelService.createAttendanceSessionColumn(payload).subscribe({
      next: () => {
        this.creatingSession = false;
        this.isCreateSessionModalOpen = false;
        this.successMessage = 'Yeni dərs session-u uğurla yaradıldı.';
        this.refreshView();
        this.loadBoard();
      },
      error: (error) => {
        console.error('Create attendance session error:', error);
        this.creatingSession = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Yeni dərs session-u yaradılarkən xəta baş verdi.';
        this.refreshView();
      }
    });
  }

  openCellModal(
    student: AttendanceBoardStudentRow,
    session: AttendanceSessionColumn,
    cell: AttendanceBoardCell
  ): void {
    if (session.isLocked || cell.isLocked || !cell.isEditable) {
      return;
    }

    this.selectedStudentRow = student;
    this.selectedSessionColumn = session;
    this.selectedCell = cell;

    const draft = this.getMergedCellDraft(student.studentId, session.sessionId, cell);
    this.cellDraftForm = {
      studentId: student.studentId,
      sessionId: session.sessionId,
      status: draft.status,
      notes: draft.notes,
      absenceReasonType: draft.absenceReasonType,
      absenceReasonNote: draft.absenceReasonNote,
      lateArrivalTime: draft.lateArrivalTime,
      lateNote: draft.lateNote
    };

    this.isCellModalOpen = true;
    this.refreshView();
  }

  closeCellModal(): void {
    this.isCellModalOpen = false;
    this.selectedStudentRow = null;
    this.selectedSessionColumn = null;
    this.selectedCell = null;
    this.cellDraftForm = this.createEmptyCellDraft(0, 0);
    this.refreshView();
  }

  selectStatus(status: AttendanceBoardStatus): void {
    this.cellDraftForm.status = status;

    if (status !== 'Absent') {
      this.cellDraftForm.absenceReasonType = '';
      this.cellDraftForm.absenceReasonNote = '';
    }

    if (status !== 'Late') {
      this.cellDraftForm.lateArrivalTime = '';
      this.cellDraftForm.lateNote = '';
    }

    this.refreshView();
  }

  clearCellSelection(): void {
    if (!this.selectedStudentRow || !this.selectedSessionColumn) {
      return;
    }

    const sessionDrafts = this.draftStore.get(this.selectedSessionColumn.sessionId);
    sessionDrafts?.delete(this.selectedStudentRow.studentId);

    if (sessionDrafts && sessionDrafts.size === 0) {
      this.draftStore.delete(this.selectedSessionColumn.sessionId);
      this.dirtySessionIds.delete(this.selectedSessionColumn.sessionId);
    } else if (sessionDrafts && sessionDrafts.size > 0) {
      this.dirtySessionIds.add(this.selectedSessionColumn.sessionId);
    }

    this.closeCellModal();
    this.refreshView();
  }

  saveCellDraft(): void {
    if (!this.selectedStudentRow || !this.selectedSessionColumn) {
      return;
    }

    if (!this.cellDraftForm.status) {
      this.errorMessage = 'Status seçilməlidir.';
      this.refreshView();
      return;
    }

    if (this.cellDraftForm.status === 'Absent' && !this.cellDraftForm.absenceReasonType) {
      this.errorMessage = 'İştirak etməyib üçün səbəb seçilməlidir.';
      this.refreshView();
      return;
    }

    if (this.cellDraftForm.status === 'Late' && !this.cellDraftForm.lateArrivalTime) {
      this.errorMessage = 'Gecikib üçün gəlmə vaxtı daxil edilməlidir.';
      this.refreshView();
      return;
    }

    this.errorMessage = '';

    const sessionId = this.selectedSessionColumn.sessionId;
    const studentId = this.selectedStudentRow.studentId;

    if (!this.draftStore.has(sessionId)) {
      this.draftStore.set(sessionId, new Map<number, AttendanceCellDraft>());
    }

    this.draftStore.get(sessionId)?.set(studentId, {
      studentId,
      sessionId,
      status: this.cellDraftForm.status,
      notes: this.cellDraftForm.notes.trim(),
      absenceReasonType: this.cellDraftForm.absenceReasonType,
      absenceReasonNote: this.cellDraftForm.absenceReasonNote.trim(),
      lateArrivalTime: this.cellDraftForm.lateArrivalTime,
      lateNote: this.cellDraftForm.lateNote.trim()
    });

    this.dirtySessionIds.add(sessionId);
    this.closeCellModal();
    this.refreshView();
  }

  hasDirtySession(sessionId: number): boolean {
    return this.dirtySessionIds.has(sessionId);
  }

  saveSession(session: AttendanceSessionColumn): void {
    if (!this.board) {
      return;
    }

    const records = this.buildSaveRecordsForSession(session.sessionId);

    if (records.length === 0) {
      this.errorMessage = 'Bu session üçün yadda saxlanacaq attendance seçimi yoxdur.';
      this.refreshView();
      return;
    }

    const payload: SaveAttendanceSessionRecordsRequest = {
      sessionId: session.sessionId,
      records
    };

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    this.teacherPanelService.saveAttendanceSessionRecords(payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = `${session.sessionDateText} tarixli session üçün attendance yadda saxlanıldı.`;
        this.draftStore.delete(session.sessionId);
        this.dirtySessionIds.delete(session.sessionId);
        this.refreshView();
        this.loadBoard();
      },
      error: (error) => {
        console.error('Save attendance session records error:', error);
        this.saving = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Attendance məlumatları yadda saxlanılarkən xəta baş verdi.';
        this.refreshView();
      }
    });
  }

  saveAllDirtySessions(): void {
    if (this.dirtySessionIds.size === 0) {
      this.errorMessage = 'Yadda saxlanacaq dəyişiklik yoxdur.';
      this.refreshView();
      return;
    }

    const dirtySessions = this.sessions.filter((x) => this.dirtySessionIds.has(x.sessionId));

    if (dirtySessions.length === 0) {
      this.errorMessage = 'Yadda saxlanacaq session tapılmadı.';
      this.refreshView();
      return;
    }

    this.saveSessionsSequentially([...dirtySessions]);
  }

  private saveSessionsSequentially(queue: AttendanceSessionColumn[]): void {
    if (queue.length === 0) {
      this.saving = false;
      this.successMessage = 'Bütün dəyişikliklər uğurla yadda saxlanıldı.';
      this.refreshView();
      this.loadBoard();
      return;
    }

    const current = queue.shift();
    if (!current) {
      this.saving = false;
      this.refreshView();
      return;
    }

    const records = this.buildSaveRecordsForSession(current.sessionId);

    if (records.length === 0) {
      this.draftStore.delete(current.sessionId);
      this.dirtySessionIds.delete(current.sessionId);
      this.saveSessionsSequentially(queue);
      return;
    }

    this.saving = true;
    this.refreshView();

    this.teacherPanelService
      .saveAttendanceSessionRecords({
        sessionId: current.sessionId,
        records
      })
      .subscribe({
        next: () => {
          this.draftStore.delete(current.sessionId);
          this.dirtySessionIds.delete(current.sessionId);
          this.refreshView();
          this.saveSessionsSequentially(queue);
        },
        error: (error) => {
          console.error('Sequential save error:', error);
          this.saving = false;
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Attendance dəyişiklikləri yadda saxlanılarkən xəta baş verdi.';
          this.refreshView();
        }
      });
  }

  getCellDisplayStatus(
    student: AttendanceBoardStudentRow,
    session: AttendanceSessionColumn,
    cell: AttendanceBoardCell
  ): AttendanceBoardStatus {
    const draft = this.draftStore.get(session.sessionId)?.get(student.studentId);

    if (draft?.status) {
      return draft.status;
    }

    const status = String(cell?.status ?? '').trim();

    if (status === 'Present' || status === 'Absent' || status === 'Late') {
      return status;
    }

    return '';
  }

  getCellStatusLabel(
    student: AttendanceBoardStudentRow,
    session: AttendanceSessionColumn,
    cell: AttendanceBoardCell
  ): string {
    const status = this.getCellDisplayStatus(student, session, cell);

    switch (status) {
      case 'Present':
        return 'İştirak edib';
      case 'Absent':
        return 'İştirak etməyib';
      case 'Late':
        return 'Gecikib';
      default:
        return '';
    }
  }

  getCellClass(
    student: AttendanceBoardStudentRow,
    session: AttendanceSessionColumn,
    cell: AttendanceBoardCell
  ): string {
    if (session.isLocked || cell.isLocked || !cell.isEditable) {
      return 'locked';
    }

    const status = this.getCellDisplayStatus(student, session, cell);

    switch (status) {
      case 'Present':
        return 'present';
      case 'Absent':
        return 'absent';
      case 'Late':
        return 'late';
      default:
        return 'empty';
    }
  }

  getSessionTypeLabel(session: AttendanceSessionColumn): string {
    return session.isExtraLesson ? 'Əlavə dərs' : 'Əsas dərs';
  }

  getSessionTimeRange(session: AttendanceSessionColumn): string {
    const start = session.startTimeText || '--:--';
    const end = session.endTimeText || '--:--';
    return `${start} - ${end}`;
  }

  isCellLocked(session: AttendanceSessionColumn, cell: AttendanceBoardCell): boolean {
    return session.isLocked || cell.isLocked || !cell.isEditable;
  }

  trackBySession(index: number, item: AttendanceSessionColumn): number {
    return item.sessionId;
  }

  trackByStudent(index: number, item: AttendanceBoardStudentRow): number {
    return item.studentId;
  }

  private buildSaveRecordsForSession(sessionId: number): UpsertAttendanceRecordRequest[] {
    if (!this.board) {
      return [];
    }

    const sessionIndex = this.board.sessions.findIndex((x) => x.sessionId === sessionId);

    if (sessionIndex === -1) {
      return [];
    }

    return this.board.students
      .map((student) => {
        const baseCell = student.cells[sessionIndex];
        const merged = this.getMergedCellDraft(student.studentId, sessionId, baseCell);

        if (!merged.status) {
          return null;
        }

        const payload: UpsertAttendanceRecordRequest = {
          studentId: student.studentId,
          status: merged.status as 'Present' | 'Absent' | 'Late',
          notes: this.normalizeText(merged.notes)
        };

        if (merged.status === 'Absent') {
          payload.absenceReasonType = this.normalizeText(merged.absenceReasonType);
          payload.absenceReasonNote = this.normalizeText(merged.absenceReasonNote);
        }

        if (merged.status === 'Late') {
          payload.lateArrivalTime = this.normalizeTimeForBackend(merged.lateArrivalTime);
          payload.lateNote = this.normalizeText(merged.lateNote);
        }

        return payload;
      })
      .filter((x): x is UpsertAttendanceRecordRequest => x !== null);
  }

  private getMergedCellDraft(
    studentId: number,
    sessionId: number,
    baseCell?: AttendanceBoardCell | null
  ): AttendanceCellDraft {
    const draft = this.draftStore.get(sessionId)?.get(studentId);

    if (draft) {
      return draft;
    }

    const normalizedStatus = this.normalizeBoardStatus(String(baseCell?.status ?? ''));

    return {
      studentId,
      sessionId,
      status: normalizedStatus,
      notes: String(baseCell?.notes ?? ''),
      absenceReasonType: (baseCell?.absenceReasonType as AttendanceAbsenceReasonType) || '',
      absenceReasonNote: String(baseCell?.absenceReasonNote ?? ''),
      lateArrivalTime: this.normalizeTimeForInput(String(baseCell?.lateArrivalTime ?? '')),
      lateNote: String(baseCell?.lateNote ?? '')
    };
  }

  private normalizeBoardStatus(value: string): AttendanceBoardStatus {
    const normalized = value.trim();

    if (normalized === 'Present' || normalized === 'Absent' || normalized === 'Late') {
      return normalized;
    }

    return '';
  }

  private normalizeText(value?: string | null): string | null {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private normalizeTimeForBackend(value?: string | null): string | null {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return null;
    }

    if (raw.length === 5) {
      return `${raw}:00`;
    }

    return raw;
  }

  private normalizeTimeForInput(value?: string | null): string {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return '';
    }

    if (raw.length >= 5) {
      return raw.substring(0, 5);
    }

    return raw;
  }

  private createDefaultSessionForm(): CreateSessionForm {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    return {
      sessionDate: `${yyyy}-${mm}-${dd}`,
      startTime: '',
      endTime: '',
      notes: '',
      sessionType: 1
    };
  }

  private createEmptyCellDraft(studentId: number, sessionId: number): AttendanceCellDraft {
    return {
      studentId,
      sessionId,
      status: '',
      notes: '',
      absenceReasonType: '',
      absenceReasonNote: '',
      lateArrivalTime: '',
      lateNote: ''
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}