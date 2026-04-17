export type ExamStatus = 'Draft' | 'Published' | 'Planned' | 'Active' | 'Completed' | 'Cancelled';
export type QuestionType = 'SingleChoice' | 'MultipleChoice' | 'OpenText';
export type ClosedQuestionSelectionMode = 'single' | 'multiple';

export interface ExamClassOption {
  id: number;
  name: string;
}

export interface ExamSubjectOption {
  id: number;
  name: string;
}

export interface ExamTeacherOption {
  id: number;
  fullName: string;
}

export interface ExamFilter {
  search: string;
  classId: number | null;
  subjectId: number | null;
  teacherId: number | null;
  status: '' | ExamStatus;
}

export interface ExamBaseForm {
  title: string;
  classId: number | null;
  subjectId: number | null;
  teacherId: number | null;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  totalScore: number | null;
  closedQuestionScore: number | null;
  description: string;
  instructions: string;
  isPublished: boolean;
}

export interface ExamQuestionOption {
  id: number;
  optionText: string;
  isCorrect: boolean;
  optionKey?: string;
  orderNumber: number;
}

export interface ExamQuestionDraft {
  id: number;
  questionText: string;
  type: QuestionType;
  points: number;
  orderNumber: number;
  description?: string;
  selectionMode?: ClosedQuestionSelectionMode;
  options: ExamQuestionOption[];
}

export interface ExamListItem {
  id: number;
  title: string;
  classId: number | null;
  className: string;
  subjectId?: number;
  subjectName: string;
  teacherId?: number;
  teacherName: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  status: ExamStatus;
  totalQuestionCount: number;
  openQuestionCount: number;
  closedQuestionCount: number;
  totalScore: number;
  closedQuestionScore: number;
  description: string;
  instructions: string;
  isPublished: boolean;
  questions: ExamQuestionDraft[];
}

export interface ExamDetail extends ExamListItem {}

export interface ExamStats {
  totalExams: number;
  plannedExams: number;
  activeExams: number;
  completedExams: number;
  totalQuestions: number;
}

export interface CreateExamRequest {
  title: string;
  subjectId: number;
  teacherId: number;
  classRoomId: number | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  description?: string;
  totalScore?: number | null;
  closedQuestionScore?: number | null;
  instructions?: string;
  isPublished: boolean;
  questions: ExamQuestionRequest[];
}

export interface UpdateExamRequest extends CreateExamRequest {
  id: number;
}

export interface ExamQuestionRequest {
  id?: number;
  questionText: string;
  type: QuestionType;
  points: number;
  orderNumber: number;
  description?: string;
  selectionMode?: ClosedQuestionSelectionMode | null;
  options: ExamOptionRequest[];
}

export interface ExamOptionRequest {
  id?: number;
  optionText: string;
  isCorrect: boolean;
  optionKey?: string;
  orderNumber: number;
}

// YENI
export interface TeacherExamFilter {
  classRoomId?: number | null;
  subjectId?: number | null;
  isPublished?: boolean | null;
  status?: string | null;
}

// YENI
export interface TeacherExamCreateOptions {
  teacherId: number;
  teacherName: string;
  classOptions: ExamClassOption[];
  subjectOptions: ExamSubjectOption[];
}

// YENI
export interface ExamSubmissionStudent {
  studentExamId: number;
  studentId: number;
  studentFullName: string;
  studentNumber: string;
  startTime?: string | null;
  submittedAt?: string | null;
  isCompleted: boolean;
  isReviewed: boolean;
  score: number;
  autoGradedScore: number;
  manualGradedScore: number;
  totalQuestions: number;
  answeredQuestions: number;
  openQuestionsCount: number;
  reviewedOpenQuestionsCount: number;
}

// YENI
export interface ExamSubmissionAnswerOption {
  id: number;
  text: string;
  isCorrect: boolean;
  isSelected: boolean;
}

// YENI
export interface ExamSubmissionAnswer {
  studentAnswerId: number;
  questionId: number;
  questionText: string;
  questionType: string;
  maxScore: number;
  awardedScore: number;
  isReviewed: boolean;
  isCorrect?: boolean | null;
  studentAnswerText?: string | null;
  teacherFeedback?: string | null;
  options: ExamSubmissionAnswerOption[];
}

// YENI
export interface ExamSubmissionDetail {
  studentExamId: number;
  examId: number;
  examTitle: string;
  subjectName: string;
  studentId: number;
  studentFullName: string;
  studentNumber: string;
  startTime?: string | null;
  submittedAt?: string | null;
  isCompleted: boolean;
  isReviewed: boolean;
  score: number;
  autoGradedScore: number;
  manualGradedScore: number;
  answers: ExamSubmissionAnswer[];
}

// YENI
export interface GradeStudentExamAnswerRequest {
  studentAnswerId: number;
  score: number;
  teacherFeedback?: string | null;
}

// YENI
export interface GradeStudentExamRequest {
  studentExamId: number;
  answers: GradeStudentExamAnswerRequest[];
}

// YENI
export interface GradeStudentExamResult {
  studentExamId: number;
  isReviewed: boolean;
  autoGradedScore: number;
  manualGradedScore: number;
  totalScore: number;
  message: string;
}