export type StudentExamStatus =
  | 'Pending'
  | 'CodeReady'
  | 'ReadyToStart'
  | 'InProgress'
  | 'Submitted'
  | 'AutoSubmitted'
  | 'Missed'
  | 'Reviewed'
  | string;

export type StudentExamListTab = 'all' | 'upcoming' | 'active' | 'completed';

export type StudentExamQuestionType =
  | 'SingleChoice'
  | 'MultipleChoice'
  | 'OpenText'
  | string;

export type StudentSecurityEventType =
  | 'TabSwitch'
  | 'Blur'
  | 'FullScreenExit'
  | 'CopyAttempt'
  | 'PasteAttempt'
  | 'RightClickAttempt'
  | 'AutoSubmitTriggered'
  | string;

export interface StudentExamListItemModel {
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
  status: StudentExamStatus;
  examStartTime: string;
  examEndTime: string;
  durationMinutes: number;
  isAccessCodeReady: boolean;
  canEnter: boolean;
  canStart: boolean;
  isMissed: boolean;
  accessCode: string | null;

  // YENI
  accessCodeActivationMinutes: number;

  // YENI
  lateEntryToleranceMinutes: number;
}

export interface StudentExamDetailModel {
  examId: number;
  studentExamId: number | null;
  examTitle: string;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  instructions: string;
  status: StudentExamStatus;
  isAccessCodeReady: boolean;
  canVerifyCode: boolean;
  canStart: boolean;
  isCompleted: boolean;
  accessCode: string | null;

  // YENI
  isMissed: boolean;

  // YENI
  accessCodeActivationMinutes: number;

  // YENI
  lateEntryToleranceMinutes: number;

  // YENI
  score: number;

  // YENI
  publishedScore: number | null;

  // YENI
  requiresManualReview: boolean;

  // YENI
  canShowScoreImmediately: boolean;

  // YENI
  isResultAutoPublished: boolean;

  // YENI
  hasOpenQuestions: boolean;

  // YENI
  resultMessage: string;
}

export interface StudentAnswerModel {
  studentAnswerId: number;
  studentExamId: number;
  examQuestionId: number;
  selectedOptionId: number | null;
  answerText: string | null;
  pointsAwarded: number;
  isReviewed: boolean;
  isCorrect: boolean | null;
  teacherFeedback: string | null;
  selectedOptionIds: number[];
}

export interface StudentExamQuestionOptionModel {
  id: number;
  optionText: string;
  optionKey?: string | null;
  orderNumber: number;
}

export interface StudentExamQuestionModel {
  id: number;
  orderNumber: number;
  questionText: string;
  type: StudentExamQuestionType;
  points: number;
  description: string | null;
  options: StudentExamQuestionOptionModel[];
  existingAnswer: StudentAnswerModel | null;
}

export interface StudentExamSessionModel {
  studentExamId: number;
  examId: number;
  examTitle: string;
  subjectName: string;
  startTime: string;
  endTime: string | null;
  isCompleted: boolean;
  score: number;
  isReviewed: boolean;
  submittedAt: string | null;
  durationMinutes: number;
  instructions: string;
  status: StudentExamStatus;
  totalScore: number;
  warningCount: number;
  tabSwitchCount: number;
  fullScreenExitCount: number;
  questions: StudentExamQuestionModel[];
}

export interface StudentExamSubmitResultModel {
  studentExamId: number;
  examId: number;
  startTime: string;
  endTime: string;
  isCompleted: boolean;
  score: number;
  message: string;
  autoGradedScore: number;
  manualGradedScore: number;
  requiresManualReview: boolean;

  // YENI
  hasOpenQuestions: boolean;

  // YENI
  isResultAutoPublished: boolean;

  // YENI
  canShowScoreImmediately: boolean;

  // YENI
  canShowCorrectAnswers: boolean;

  // YENI
  publishedScore: number | null;
}

export interface VerifyStudentExamAccessCodePayload {
  examId: number;
  accessCode: string;
}

export interface StartStudentExamPayload {
  examId: number;
  accessCode?: string | null;
  acceptRules: boolean;
}

export interface SaveStudentAnswerPayload {
  studentExamId: number;
  examQuestionId: number;
  selectedOptionId?: number | null;
  answerText?: string | null;
  selectedOptionIds?: number[];
}

export interface SubmitStudentExamPayload {
  studentExamId: number;
  forceAutoSubmit: boolean;
}

export interface LogStudentExamSecurityPayload {
  studentExamId: number;
  eventType: StudentSecurityEventType;
  description?: string | null;
}

export interface StudentExamListStatsModel {
  totalCount: number;
  upcomingCount: number;
  activeCount: number;
  completedCount: number;
}

export interface StudentExamFilterModel {
  tab: StudentExamListTab;
  searchText: string;
  subjectName: string;
  status: string;
}

export interface StudentExamAccessModalModel {
  isOpen: boolean;
  examId: number | null;
  examTitle: string;
  visibleAccessCode: string | null;
  enteredAccessCode: string;
  isSubmitting: boolean;
  errorMessage: string;
}

export interface StudentExamAnswerDraftModel {
  examQuestionId: number;
  selectedOptionId: number | null;
  selectedOptionIds: number[];
  answerText: string;
}