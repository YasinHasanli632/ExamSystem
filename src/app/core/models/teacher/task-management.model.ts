export type TeacherTaskState = 'Gözləyir' | 'Davam edir' | 'Bitib';

export interface TeacherTaskClassSubject {
  subjectId: number;
  subjectName: string;
}

export interface TeacherTaskClassSummary {
  classRoomId: number;
  className: string;
  academicYear: string;
  room?: string | null;
  studentCount: number;
  subjects: TeacherTaskClassSubject[];
  totalTaskCount: number;
  activeTaskCount: number;
  completedTaskCount: number;
  pendingReviewCount: number;
}

export interface TeacherClassTaskListItem {
  taskGroupKey: string;
  classRoomId: number;
  className: string;
  subjectId?: number | null;
  subjectName: string;
  teacherId?: number | null;
  teacherName: string;
  title: string;
  description?: string | null;
  assignedDate: string;
  dueDate: string;
  maxScore: number;
  taskState: TeacherTaskState | string;
  totalStudentCount: number;
  submittedCount: number;
  missingCount: number;
  reviewedCount: number;
}

export interface StudentTaskSubmissionListItem {
  studentTaskId: number;
  studentId: number;
  fullName: string;
  studentNumber: string;
  photoUrl?: string | null;
  submissionStatus: string;
  submittedAt?: string | null;
  score: number;
  maxScore: number;
  isReviewed: boolean;
}

export interface TeacherTaskDetail {
  taskGroupKey: string;
  classRoomId: number;
  className: string;
  subjectId?: number | null;
  subjectName: string;
  teacherId?: number | null;
  teacherName: string;
  title: string;
  description?: string | null;
  link?: string | null;
  note?: string | null;
  assignedDate: string;
  dueDate: string;
  maxScore: number;
  taskState: TeacherTaskState | string;
  totalStudentCount: number;
  submittedCount: number;
  missingCount: number;
  reviewedCount: number;
  students: StudentTaskSubmissionListItem[];
}

export interface StudentTaskSubmissionDetail {
  studentTaskId: number;
  studentId: number;
  fullName: string;
  studentNumber: string;
  photoUrl?: string | null;

  title: string;
  taskDescription?: string | null;
  taskLink?: string | null;
  taskNote?: string | null;

  assignedDate: string;
  dueDate: string;

  submissionStatus: string;
  submissionText?: string | null;
  submissionLink?: string | null;
  submissionFileUrl?: string | null;
  submittedAt?: string | null;

  score: number;
  maxScore: number;
  feedback?: string | null;
  checkedAt?: string | null;
}

export interface UpdateTeacherTaskPayload {
  title: string;
  description?: string | null;
  assignedDate: string;
  dueDate: string;
  maxScore: number;
  link?: string | null;
  note?: string | null;
}

export interface GradeStudentTaskPayload {
  studentTaskId: number;
  score: number;
  feedback?: string | null;
}