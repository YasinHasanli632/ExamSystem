export type ClassStatus = 'Aktiv' | 'Passiv';
export type TeacherStatus = 'Aktiv' | 'Passiv' | 'Məzuniyyət';
export type StudentStatus = 'Aktiv' | 'Passiv' | 'Məzun';
export type ExamStatus = 'Planned' | 'Active' | 'Completed';

export interface SubjectOption {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

export interface TeacherOption {
  id: number;
  fullName: string;
  email: string;
  photoUrl: string;
  subjectIds: number[];
  subjectNames: string[];
  status: TeacherStatus;
}

export interface StudentOption {
  id: number;
  fullName: string;
  email: string;
  photoUrl: string;
  className?: string;
  averageScore?: number;
  attendanceRate?: number;
  status: StudentStatus;
}

export interface ClassTeacherAssignment {
  subjectId: number;
  teacherId: number | null;
}

export interface ClassTeacherAssignmentView {
  subject: SubjectOption;
  teacher: TeacherOption | null;
}

export interface ClassExamItem {
  id: number;
  title: string;
  subjectId: number;
  subjectName: string;
  examDate: string;
  durationMinutes: number;
  totalScore: number;
  status: ExamStatus;
}

export interface ClassTopStudent {
  id: number;
  fullName: string;
  photoUrl: string;
  email: string;
  averageScore: number;
}

export interface ClassTeacherSubjectRow {
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  assignedTeacherId: number | null;
  assignedTeacherName: string;
  availableTeachers: TeacherOption[];
}

export interface SchoolClass {
  id: number;
  name: string;
  academicYear: string;
  room: string;
  description?: string;
  status: ClassStatus;
  maxStudentCount: number;
  averageScore?: number;
  attendanceRate?: number;
  examCount?: number;
  subjects: SubjectOption[];
  teacherAssignments: ClassTeacherAssignmentView[];
  students: StudentOption[];
  exams?: ClassExamItem[];
  topStudents?: ClassTopStudent[];
  teacherSubjectRows?: ClassTeacherSubjectRow[];
  createdAt?: string;
}

export interface ClassListItem {
  id: number;
  name: string;
  academicYear: string;
  room: string;
  status: ClassStatus;
  studentCount: number;
  subjectCount: number;
  teacherCount: number;
  averageScore: number;
}

export interface ClassDetail {
  id: number;
  name: string;
  academicYear: string;
  room: string;
  description?: string;
  status: ClassStatus;
  maxStudentCount: number;
  averageScore: number;
  attendanceRate: number;
  examCount: number;
  createdAt?: string;
  students: StudentOption[];
  topStudents: ClassTopStudent[];
  subjects: SubjectOption[];
  exams: ClassExamItem[];
  teacherSubjectRows: ClassTeacherSubjectRow[];
}

export interface CreateClassRequest {
  name: string;
  academicYear: string;
  room: string;
  description?: string;
  status: ClassStatus;
  maxStudentCount: number;
  subjectIds: number[];
  teacherAssignments: ClassTeacherAssignment[];
  studentIds: number[];
}

export interface UpdateClassRequest {
  name: string;
  academicYear: string;
  room: string;
  description?: string;
  status: ClassStatus;
  maxStudentCount: number;
  subjectIds: number[];
  teacherAssignments: ClassTeacherAssignment[];
  studentIds: number[];
}

// Backend wrapper qaytarmır, plain class object qaytarır.
// Ona görə bu alias-ları belə saxlayırıq ki, köhnə importlar da qırılmasın.
export type CreateClassResponse = SchoolClass;
export type UpdateClassResponse = SchoolClass;

export interface ClassFilter {
  search?: string;
  status?: ClassStatus | '';
  academicYear?: string;
  room?: string;
}

export interface ClassStats {
  totalStudents: number;
  totalSubjects: number;
  totalTeachers: number;
  averageScore: number;
  attendanceRate: number;
  examCount: number;
}