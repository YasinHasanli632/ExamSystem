export type StudentStatus = 'Aktiv' | 'Passiv' | 'Məzun';

export type StudentTaskStatus =
  | 'Pending'
  | 'Submitted'
  | 'Reviewed'
  | 'Late'
  | 'Missing';

export type AttendanceStatus = 'Gəlib' | 'Yoxdur' | 'Gecikib' | 'İcazəli';

export type ExamType = 'Quiz' | 'Midterm' | 'Final' | 'Practice' | 'Unknown';

export type ExamReviewQuestionType = 'MultipleChoice' | 'OpenEnded' | string;

export interface StudentListItem {
  id: number;
  userId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber: string;
  className: string;
  teacherName: string;
  averageScore: number;
  examsCount: number;
  attendanceRate: number;
  status: StudentStatus;
  photoUrl: string;
}

export interface StudentFilter {
  fullName: string;
  className: string;
  teacherName: string;
  status: '' | StudentStatus;
  minScore: number | null;
  maxScore: number | null;
}

export interface StudentSummaryStats {
  totalStudents: number;
  activeStudents: number;
  passiveStudents: number;
  averageScore: number;
}

export interface StudentClassOption {
  id: number;
  name: string;
}

export interface CreateStudentUserRequest {
  username: string;
  email: string;
  password: string;
  role: 'Student';
  isActive: boolean;
  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate: string | null;
  phoneNumber: string | null;
  country: string | null;
  photoUrl: string | null;
  details: string | null;
}

export interface CreateStudentProfileRequest {
  userId: number;
  fullName: string;
  dateOfBirth: string;
  studentNumber: string;
  classRoomId: number | null;
  status: number | null;
  notes: string | null;
}

export interface StudentCreateFormValue {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  email: string;
  phone: string;
  country: string;
  birthDate: string;
  studentNumber: string;
  classRoomId: number | null;
  status: StudentStatus;
  photoUrl: string;
  details: string;
  notes: string;
}

export interface StudentTaskItem {
  id: number;
  title: string;
  description: string | null;
  subjectName: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  status: StudentTaskStatus;
  score: number;
  maxScore: number;
  link: string | null;
  note: string | null;
  monthKey: string;
}

export interface StudentAttendanceItem {
  attendanceSessionId: number;
  sessionDate: string;
  subjectName: string;
  teacherName: string;
  status: AttendanceStatus;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
  monthKey: string;
}

export interface StudentExamItem {
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
  examType: ExamType;
  note: string | null;
  percentage: number;
  resultLabel: string;
  monthKey: string;
}

export interface StudentExamReviewOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface StudentExamReviewQuestion {
  id: number;
  examId: number;
  questionNo: number;
  type: ExamReviewQuestionType;
  questionText: string;
  options: StudentExamReviewOption[];
  correctAnswerText: string;
  studentAnswerText: string;
  awardedScore: number;
  maxScore: number;
  teacherFeedback: string;
}

export interface StudentExamReview {
  studentExamId: number;
  examId: number;
  examTitle: string;
  subjectName: string;
  teacherName: string;
  examDate: string;
  score: number;
  questions: StudentExamReviewQuestion[];
}

export interface StudentDetail {
  id: number;
  userId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  parentName: string;
  parentPhone: string | null;
  gender: string;
  address: string | null;
  studentNumber: string;
  dateOfBirth: string;
  className: string | null;
  status: StudentStatus;
  notes: string | null;
  averageScore: number;
  examsCount: number;
  attendanceRate: number;
  photoUrl: string | null;
  tasksCount: number;
  completedTasksCount: number;
  absentCount: number;
  lateCount: number;
  tasks: StudentTaskItem[];
  attendance: StudentAttendanceItem[];
  exams: StudentExamItem[];
}

export interface StudentExamSummary {
  id: number;
  title: string;
  subjectName: string;
  teacherName: string;
  date: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: string;
}

// YENI
export interface StudentAttendanceSummary {
  id: number;
  date: string;
  subjectName: string;
  teacherName: string;
  status: string;
  note?: string;
}

// YENI
export interface StudentTask {
  id: number;
  title: string;
  subjectName: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  status: string;
  score: number;
  maxScore: number;
}

// ==========================================
// YENI
// STUDENT DETAIL PROFILE EDIT ÜÇÜN MODELLƏR
// ==========================================

// YENI
export interface UpdateStudentUserRequest {
  userId: number;
  username: string;
  email: string;
  role: 'Student' | string;
  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate: string | null;
  phoneNumber: string | null;
  country: string | null;
  photoUrl: string | null;
  details: string | null;
}

// YENI
export interface UpdateStudentProfileRequest {
  id: number;
  fullName: string;
  dateOfBirth: string;
  studentNumber: string;
  classRoomId: number | null;
  status: number | null;
  notes: string | null;
}

// YENI
export interface StudentProfileEditFormValue {
  userId: number;
  studentId: number;
  username: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  email: string;
  phoneNumber: string;
  country: string;
  photoUrl: string;
  details: string;
  fullName: string;
  birthDate: string;
  dateOfBirth: string;
  studentNumber: string;
  classRoomId: number | null;
  status: StudentStatus;
  notes: string;
}

// ==========================================
// YENI
// TASK EDIT ÜÇÜN MODELLƏR
// ==========================================

// YENI
export interface UpdateStudentTaskRequest {
  id: number;
  title: string;
  description: string | null;
  subjectId: number | null;
  teacherId: number | null;
  assignedDate: string;
  dueDate: string;
  status: number;
  score: number;
  maxScore: number;
  link: string | null;
  note: string | null;
}

// YENI
export interface StudentTaskEditFormValue {
  id: number;
  title: string;
  description: string;
  subjectId: number | null;
  teacherId: number | null;
  assignedDate: string;
  dueDate: string;
  status: StudentTaskStatus;
  score: number | null;
  maxScore: number | null;
  link: string;
  note: string;
}

// YENI
export interface StudentSubjectOption {
  id: number;
  name: string;
}

// YENI
export interface StudentTeacherOption {
  id: number;
  fullName: string;
}