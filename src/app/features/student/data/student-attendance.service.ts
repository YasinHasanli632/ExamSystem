import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AttendanceStatus,
  StudentAttendanceModel
} from '../../../core/models/students/attendance-status.model';

interface StudentAttendanceApiDto {
  attendanceSessionId: number;
  sessionDate: string;
  className?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  status?: string | null;
  notes?: string | null;
  absenceReasonType?: string | null;
  absenceReasonNote?: string | null;
  lateArrivalTime?: string | null;
  lateNote?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class StudentAttendanceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMyAttendance(): Observable<StudentAttendanceModel[]> {
    return this.http
      .get<StudentAttendanceApiDto[]>(`${this.apiUrl}/student/attendance`)
      .pipe(
        map((items) => (items ?? []).map((item) => this.mapAttendance(item)))
      );
  }

  private mapAttendance(item: StudentAttendanceApiDto): StudentAttendanceModel {
    const statusLabel = this.normalizeAttendanceStatus(item.status);
    const noteSummary = this.buildNoteSummary(item, statusLabel);

    return {
      attendanceSessionId: Number(item.attendanceSessionId ?? 0),
      sessionDate: item.sessionDate ?? '',
      className: item.className ?? '',
      subjectName: item.subjectName ?? 'Fənn təyin edilməyib',
      teacherName: item.teacherName ?? 'Müəllim təyin edilməyib',
      status: statusLabel,
      notes: item.notes ?? null,
      absenceReasonType: item.absenceReasonType ?? null,
      absenceReasonNote: item.absenceReasonNote ?? null,
      lateArrivalTime: item.lateArrivalTime ?? null,
      lateNote: item.lateNote ?? null,
      statusLabel,
      noteSummary
    };
  }

  private normalizeAttendanceStatus(
    value: string | null | undefined
  ): AttendanceStatus | string {
    const normalized = (value ?? '').trim().toLowerCase();

    if (
      normalized === 'gəlib' ||
      normalized === 'gelib' ||
      normalized === 'present' ||
      normalized === 'attended'
    ) {
      return 'Gəlib';
    }

    if (
      normalized === 'gecikib' ||
      normalized === 'gecikdi' ||
      normalized === 'late'
    ) {
      return 'Gecikib';
    }

    if (
      normalized === 'yoxdur' ||
      normalized === 'qayıb' ||
      normalized === 'qayib' ||
      normalized === 'absent' ||
      normalized === 'missing'
    ) {
      return 'Yoxdur';
    }

    if (
      normalized === 'i̇cazəli' ||
      normalized === 'icazəli' ||
      normalized === 'icazeli' ||
      normalized === 'excused' ||
      normalized === 'permission'
    ) {
      return 'İcazəli';
    }

    return value?.trim() || 'Naməlum';
  }

  private buildNoteSummary(
    item: StudentAttendanceApiDto,
    statusLabel: string
  ): string {
    const parts: string[] = [];

    if (statusLabel === 'Gecikib') {
      if (item.lateArrivalTime?.trim()) {
        parts.push(`Gecikmə vaxtı: ${item.lateArrivalTime.trim()}`);
      }

      if (item.lateNote?.trim()) {
        parts.push(item.lateNote.trim());
      }
    }

    if (statusLabel === 'Yoxdur' || statusLabel === 'İcazəli') {
      if (item.absenceReasonType?.trim()) {
        parts.push(`Səbəb: ${item.absenceReasonType.trim()}`);
      }

      if (item.absenceReasonNote?.trim()) {
        parts.push(item.absenceReasonNote.trim());
      }
    }

    if (item.notes?.trim()) {
      parts.push(item.notes.trim());
    }

    return parts.join(' • ');
  }
}