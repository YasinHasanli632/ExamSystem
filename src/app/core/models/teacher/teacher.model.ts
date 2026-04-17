export type TeacherStatus = 'Aktiv' | 'Passiv' | 'Məzuniyyət';

export interface TeacherClassItem {
  id: number;
  name: string;
  studentCount: number;
  subjectNames: string[];
}

export interface TeacherTaskItem {
  id: number;
  title: string;
  dueDate: string;
  status: 'Gözləyir' | 'Tamamlanıb' | 'Gecikir';
}

export interface TeacherPerformance {
  successRate: number;
  examCount: number;
  studentCount: number;
  averageScore: number;
  completedTasks: number;
  pendingTasks: number;
}

export interface Teacher {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  fatherName: string;
  fullName: string;
  email: string;
  username: string;
  phone: string;
  country: string;
  age: number;
  birthDate: string;
  photoUrl: string;
  details: string;
  department: string;
  specialization: string;
  isActive: boolean;
  status: TeacherStatus;
  subjects: string[];
  classes: TeacherClassItem[];
  tasks: TeacherTaskItem[];
  performance: TeacherPerformance;
}

export interface TeacherListApiDto {
  id: number;
  userId: number;
  fullName: string;
  department: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  phoneNumber?: string | null;
  photoUrl?: string | null;
  country?: string | null;
  birthDate?: string | null;
  details?: string | null;
  specialization?: string | null;
  status?: string | null;
  isActive: boolean;
}

export interface TeacherSubjectApiDto {
  id: number;
  subjectId: number;
  subjectName: string;
  subjectCode?: string | null;
  isActive: boolean;
}

export interface TeacherClassRoomApiDto {
  id: number;
  classRoomId: number;
  classRoomName: string;
  grade: number;
  subjectId?: number | null;
  subjectName?: string | null;
  isActive: boolean;
}

export interface TeacherTaskApiDto {
  id: number;
  title: string;
  description?: string | null;
  dueDate: string;
  status: string;
  isCompleted: boolean;
}

export interface TeacherOverviewStatsApiDto {
  subjectCount: number;
  classRoomCount: number;
  studentCount: number;
  examCount: number;
  pendingTaskCount: number;
  completedTaskCount: number;
}

export interface TeacherDetailsApiDto {
  id: number;
  userId: number;
  fullName: string;
  department: string;
  userName: string;
  email: string;
  subjects: TeacherSubjectApiDto[];
  classRooms: TeacherClassRoomApiDto[];
  examCount: number;
  firstName: string;
  lastName: string;
  fatherName: string;
  phoneNumber?: string | null;
  photoUrl?: string | null;
  country?: string | null;
  birthDate?: string | null;
  details?: string | null;
  specialization?: string | null;
  status?: string | null;
  isActive: boolean;
  tasks: TeacherTaskApiDto[];
  overviewStats?: TeacherOverviewStatsApiDto | null;
}

export interface SubjectOptionDto {
  id: number;
  name: string;
  code?: string | null;
}

export interface ClassRoomOptionDto {
  id: number;
  name: string;
  grade: number;
}

export interface TeacherClassAssignmentDraft {
  classRoomId: number;
  subjectId: number;
}

export interface CreateTeacherUserRequest {
  username: string;
  email: string;
  password: string;
  role: 'Teacher';
  isActive: boolean;
  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  photoUrl?: string | null;
  details?: string | null;
}

export type TeacherApiStatus = 0 | 1 | 2;

export interface CreateTeacherProfileRequest {
  userId: number;
  fullName: string;
  department: string;
  specialization?: string | null;
  status: TeacherApiStatus;
}

export interface UpdateTeacherProfileRequest {
  id: number;
  fullName: string;
  department: string;
  specialization?: string | null;
  status?: TeacherApiStatus | null;
}
// YENI - Teacher əsas modeli
export interface TeacherProfile {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  department: string;
  specialization: string;
  status: string;
  photoUrl?: string;
}

// YENI - Dashboard modeli
export interface TeacherDashboard {
  teacherName: string;
  totalClasses: number;
  totalStudents: number;
  totalExams: number;
  totalTasks: number;
  unreadNotifications?: number;

  classes: TeacherClassCard[];
}

// YENI
export interface TeacherClassCard {
  id: number;
  name: string;
  studentCount: number;
  examCount: number;
  averageScore?: number;
}

// YENI - Class list item
export interface TeacherClassListItem {
  id: number;
  name: string;
  studentCount: number;
  examCount: number;
  averageScore?: number;
  topStudentName?: string;
}

// YENI - Class detail
export interface TeacherClassDetail {
  id: number;
  name: string;
  students: TeacherStudent[];
  exams: TeacherExamSummary[];
  tasks: TeacherTask[];
}

// YENI
export interface TeacherStudent {
  id: number;
  fullName: string;
  averageScore: number;
}

// YENI
export interface TeacherExamSummary {
  id: number;
  title: string;
  status: string;
  averageScore?: number;
}

// YENI
export interface TeacherTask {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  status: string;
}

// YENI - Exam list
export interface TeacherExamListItem {
  id: number;
  title: string;
  className: string;
  subjectName: string;
  status: string;
  isPublished: boolean;
  startTime: string;
}

// YENI - Exam create options
export interface TeacherExamCreateOptions {
  classes: { id: number; name: string }[];
  subjects: { id: number; name: string }[];
}