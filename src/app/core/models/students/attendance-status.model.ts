export type AttendanceStatus = 'Gəlib' | 'Gecikib' | 'Yoxdur' | 'İcazəli';

export type AttendanceFilterStatus = '' | AttendanceStatus;

export interface StudentAttendanceModel {
  attendanceSessionId: number;
  sessionDate: string;
  className: string;
  subjectName: string;
  teacherName: string;
  status: AttendanceStatus | string;
  notes: string | null;
  absenceReasonType: string | null;
  absenceReasonNote: string | null;
  lateArrivalTime: string | null;
  lateNote: string | null;
  statusLabel: string;
  noteSummary: string;
}

export interface StudentAttendanceFilterModel {
  subjectName: string;
  startDate: string;
  endDate: string;
  searchText: string;
  status: AttendanceFilterStatus;
}

export interface StudentAttendanceStatsModel {
  totalCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
}

export interface StudentAttendanceSubjectModel {
  id: string;
  name: string;
  count: number;
}