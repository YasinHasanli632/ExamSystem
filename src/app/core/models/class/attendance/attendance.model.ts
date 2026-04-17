export type AttendanceBoardStatus = 'Present' | 'Absent' | 'Late' | '';

export type AttendanceAbsenceReasonType =
  | 'Xəstəlik'
  | 'Ailə səbəbi'
  | 'İcazəli'
  | 'Məlum deyil'
  | 'Digər'
  | '';

export type AttendanceSessionTypeValue = 1 | 2;

export interface AttendanceBoardCell {
  sessionId: number;
  attendanceRecordId?: number | null;

  status?: string | null;
  notes?: string | null;

  absenceReasonType?: string | null;
  absenceReasonNote?: string | null;

  lateArrivalTime?: string | null;
  lateNote?: string | null;

  hasRecord: boolean;
  isEditable: boolean;
  isLocked: boolean;
}

export interface AttendanceSessionColumn {
  sessionId: number;
  sessionDate: string;
  sessionDateText: string;

  startTimeText?: string | null;
  endTimeText?: string | null;

  sessionType: string;
  isExtraLesson: boolean;
  isLocked: boolean;

  notes?: string | null;
}

export interface AttendanceBoardStudentRow {
  studentId: number;
  studentFullName: string;
  studentEmail: string;
  studentPhotoUrl: string;
  studentNumber: string;

  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;

  cells: AttendanceBoardCell[];
}

export interface AttendanceBoard {
  classRoomId: number;
  className: string;

  subjectId: number;
  subjectName: string;

  teacherId: number;
  teacherName: string;

  year: number;
  month: number;

  totalStudents: number;
  totalSessions: number;
  attendanceRate: number;

  sessions: AttendanceSessionColumn[];
  students: AttendanceBoardStudentRow[];
}

export interface AttendanceBoardFilter {
  classRoomId: number;
  subjectId: number;
  teacherId: number;
  year: number;
  month: number;
}

export interface CreateAttendanceSessionColumnRequest {
  classRoomId: number;
  subjectId: number;
  teacherId: number;

  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;

  sessionType: AttendanceSessionTypeValue;
}

export interface UpsertAttendanceRecordRequest {
  studentId: number;
  status: 'Present' | 'Absent' | 'Late';
  notes?: string | null;

  absenceReasonType?: string | null;
  absenceReasonNote?: string | null;

  lateArrivalTime?: string | null;
  lateNote?: string | null;
}

export interface SaveAttendanceSessionRecordsRequest {
  sessionId: number;
  records: UpsertAttendanceRecordRequest[];
}

export interface AttendanceSessionDetail {
  id: number;

  classRoomId: number;
  className: string;

  subjectId: number;
  subjectName: string;

  teacherId: number;
  teacherName: string;

  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;

  notes?: string | null;

  sessionType: string;
  isExtraLesson: boolean;
  isLocked: boolean;

  records: AttendanceSessionRecordDetail[];
}

export interface AttendanceSessionRecordDetail {
  id: number;
  attendanceSessionId: number;
  studentId: number;
  studentFullName: string;
  studentEmail: string;
  status: string;
  notes?: string | null;
  absenceReasonType?: string | null;
  absenceReasonNote?: string | null;
  lateArrivalTime?: string | null;
  lateNote?: string | null;
}

export interface AttendanceCellDraft {
  studentId: number;
  sessionId: number;

  status: AttendanceBoardStatus;
  notes: string;

  absenceReasonType: AttendanceAbsenceReasonType;
  absenceReasonNote: string;

  lateArrivalTime: string;
  lateNote: string;
}