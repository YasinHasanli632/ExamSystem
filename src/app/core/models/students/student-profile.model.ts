export type StudentProfileStatus = 'Aktiv' | 'Passiv' | 'Məzun';
export type StudentProfileGender = 'Kişi' | 'Qadın' | 'Bilinmir';

export interface StudentProfileTaskItem {
  id: number;
  title: string;
  description: string | null;
  subjectName: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  status: string;
  score: number;
  maxScore: number;
  link: string | null;
  note: string | null;
}

export interface StudentProfileAttendanceItem {
  attendanceSessionId: number;
  sessionDate: string;
  subjectName: string;
  teacherName: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}

export interface StudentProfileExamItem {
  studentExamId: number;
  examId: number;
  examTitle: string;
  subjectName: string;
  teacherName: string;
  score: number;
  maxScore: number;
  isCompleted: boolean;
  startTime: string;
  endTime: string | null;
  examType: string;
  note: string | null;
}

export interface StudentProfileModel {
  id: number;
  userId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  parentName: string;
  parentPhone: string | null;
  address: string | null;
  gender: StudentProfileGender | string;
  studentNumber: string;
  dateOfBirth: string;
  className: string | null;
  status: StudentProfileStatus | string;
  notes: string | null;
  averageScore: number;
  examsCount: number;
  attendanceRate: number;
  photoUrl: string | null;
  tasksCount: number;
  completedTasksCount: number;
  absentCount: number;
  lateCount: number;
  exams: StudentProfileExamItem[];
  attendance: StudentProfileAttendanceItem[];
  tasks: StudentProfileTaskItem[];
}

export interface UpdateStudentProfileRequest {
  fullName: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  email: string;
  phoneNumber: string | null;
  parentPhone: string | null;
  address: string | null;
  gender: StudentProfileGender | string;
  studentNumber: string;
  dateOfBirth: string;
  status: StudentProfileStatus | string;
  notes: string | null;
  photoUrl: string | null;
}