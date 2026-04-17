export interface DashboardResponseModel {
  role: string;
  admin?: AdminDashboardModel | null;
  teacher?: TeacherDashboardModel | null;
  student?: StudentDashboardModel | null;
}

export interface AdminDashboardModel {
  activeTeacherCount: number;
  todayAttendanceRate: number;
  totalClasses: number;
  totalTeachers: number;
  totalStudents: number;
  activeExams: number;
  todayExamCount: number;
  totalSubjects: number;
  totalAdmins: number;
  activities: AdminDashboardActivityModel[];
}

export interface AdminDashboardActivityModel {
  id: number;
  action?: string | null;
  entityName?: string | null;
  entityId?: number | null;
  actionTime?: string | null;
  performedBy?: string | null;
  title?: string | null;
  description?: string | null;
}

export interface TeacherDashboardModel {
  teacherId: number;
  userId: number;
  fullName: string;
  department: string;
  specialization: string;
  teacherStatus: number;
  totalClasses: number;
  totalStudents: number;
  totalExams: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  totalSubjects: number;
  unreadNotificationsCount: number;
  classes: TeacherDashboardClassItemModel[];
  recentTasks: TeacherDashboardTaskItemModel[];
}

export interface TeacherDashboardClassItemModel {
  classRoomId: number;
  classRoomName: string;
  studentCount: number;
  examCount: number;
  subjectNames: string[];
}

export interface TeacherDashboardTaskItemModel {
  id: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  isCompleted: boolean;
}

export interface StudentDashboardModel {
  studentId: number;
  userId: number;
  fullName: string;
  studentNumber: string;
  studentStatus: number;
  classRoomId?: number | null;
  classRoomName?: string | null;
  mySubjectsCount: number;
  upcomingExamsCount: number;
  completedExamsCount: number;
  averageScore: number;
  unreadNotificationsCount: number;
  exams: StudentDashboardExamItemModel[];
  recentTasks: StudentDashboardTaskItemModel[];
}

export interface StudentDashboardExamItemModel {
  examId: number;
  title: string;
  startTime: string;
  endTime: string;
}

export interface StudentDashboardTaskItemModel {
  id: number;
  title: string;
  dueDate?: string | null;
  status: number;
}