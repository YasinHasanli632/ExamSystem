export type StudentTaskStatus =
  | 'Pending'
  | 'Submitted'
  | 'Reviewed'
  | 'Late'
  | 'Missing'
  | string;

export type StudentTaskFilterStatus =
  | ''
  | 'Pending'
  | 'Submitted'
  | 'Reviewed'
  | 'Late'
  | 'Missing';

export interface StudentTaskModel {
  id: number;
  taskGroupKey: string;
  title: string;
  description: string | null;
  subjectId: number | null;
  subjectName: string;
  teacherId: number | null;
  teacherName: string;
  classRoomId: number | null;
  className: string;
  assignedDate: string;
  dueDate: string;
  status: StudentTaskStatus;
  isLate: boolean;
  canSubmit: boolean;
  isSubmitted: boolean;
  isReviewed: boolean;
  score: number;
  maxScore: number;
  submittedAt: string | null;
  statusLabel: string;
  statusKey: StudentTaskFilterStatus;
  progressPercent: number;
}

export interface StudentTaskSummaryModel {
  totalCount: number;
  pendingCount: number;
  submittedCount: number;
  reviewedCount: number;
  lateCount: number;
  missingCount: number;
}

export interface StudentTaskDetailModel {
  id: number;
  taskGroupKey: string;
  title: string;
  description: string | null;
  subjectId: number | null;
  subjectName: string;
  teacherId: number | null;
  teacherName: string;
  classRoomId: number | null;
  className: string;
  assignedDate: string;
  dueDate: string;
  status: StudentTaskStatus;
  isLate: boolean;
  canSubmit: boolean;
  isSubmitted: boolean;
  isReviewed: boolean;
  score: number;
  maxScore: number;
  link: string | null;
  note: string | null;
  submissionText: string | null;
  submissionLink: string | null;
  submissionFileUrl: string | null;
  submittedAt: string | null;
  feedback: string | null;
  checkedAt: string | null;
  statusLabel: string;
  statusKey: StudentTaskFilterStatus;
  progressPercent: number;
}

export interface SubmitStudentTaskRequest {
  submissionText: string | null;
  submissionLink: string | null;
  submissionFileUrl: string | null;
}

export interface StudentTaskSubjectOptionModel {
  id: number;
  name: string;
  count: number;
}

export interface StudentTaskFilterModel {
  subjectId: number | null;
  status: StudentTaskFilterStatus;
  searchText: string;
}

export interface StudentTaskSubmitFormModel {
  submissionText: string;
  submissionLink: string;
  submissionFileUrl: string;
}

export interface StudentTaskVisibleStatsModel {
  totalCount: number;
  pendingCount: number;
  submittedCount: number;
  reviewedCount: number;
  lateCount: number;
  missingCount: number;
}