export type UserRole = 'Admin' | 'Teacher' | 'Student' | 'IsSuperAdmin';

export interface UserListItem {
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;

  firstName: string;
  lastName: string;
  fullName: string;
  age: number | null;
  phoneNumber: string | null;
  photoUrl: string | null;

  createdAt: string;
}

export interface UserDetail {
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;

  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string | null;
  age: number | null;
  phoneNumber: string | null;
  photoUrl: string | null;
  details: string | null;

  teacherId: number | null;
  studentId: number | null;

  createdAt: string;
  updatedAt: string | null;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;

  firstName: string;
  lastName: string;
  birthDate: string | null;
  phoneNumber: string | null;
  photoUrl: string | null;
  details: string | null;
}

export interface UpdateUserRequest {
  userId: number;
  username: string;
  email: string;
  role: string;

  firstName: string;
  lastName: string;
  birthDate: string | null;
  phoneNumber: string | null;
  photoUrl: string | null;
  details: string | null;
}

export interface ChangeUserStatusRequest {
  userId: number;
  isActive: boolean;
}

export interface UserFilter {
  search: string;
  role: '' | UserRole;
  status: '' | 'active' | 'inactive';
}