export type SubjectStatus = 'Aktiv' | 'Passiv';

export interface SubjectTeacherOption {
  id: number;
  fullName: string;
  email: string;
  photoUrl: string;
  subjectIds?: number[];
  subjectNames?: string[];
  status: 'Aktiv' | 'Passiv' | 'Məzuniyyət';
}

export interface SubjectTeacherAssignment {
  teacherId: number;
  teacherName: string;
  teacherEmail: string;
  teacherPhotoUrl: string;
  teacherStatus: 'Aktiv' | 'Passiv' | 'Məzuniyyət';
}

export interface SubjectFormData {
  name: string;
  code: string;
  description: string;
  weeklyHours: number | null;
  status: SubjectStatus;
}

export interface SubjectListItem {
  id: number;
  name: string;
  code: string;
  description: string;
  weeklyHours: number;
  status: SubjectStatus;
  createdAt: string;
  updatedAt: string;
  teachers: SubjectTeacherAssignment[];
}

export interface SubjectDetail extends SubjectListItem {
  teacherCount: number;
}

export interface SubjectFilter {
  search: string;
  status: '' | SubjectStatus;
  teacherId: number | null;
}

export interface SubjectStats {
  totalSubjects: number;
  activeSubjects: number;
  passiveSubjects: number;
  totalAssignments: number;
}

export interface SubjectApiDto {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  weeklyHours: number;
  isActive: boolean;
}

export interface SubjectTeacherApiDto {
  teacherId: number;
  userId: number;
  fullName: string;
  userName: string;
  email: string;
  photoUrl?: string | null;
  status?: string | null;
  isActive: boolean;
}

export interface SubjectDetailsApiDto {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  weeklyHours: number;
  isActive: boolean;
  teacherCount: number;
  teachers: SubjectTeacherApiDto[];
}

export interface CreateSubjectRequest {
  name: string;
  code?: string | null;
  description?: string | null;
  weeklyHours: number;
  isActive: boolean;
}

export interface UpdateSubjectRequest extends CreateSubjectRequest {
  id: number;
}