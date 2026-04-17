import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';

// YENI - Auth əlavələri
import { ForgotPasswordComponent } from './features//auth/login/forgot-password/forgot-password.component';
import { VerifyResetOtpComponent } from './features/auth/login/verify-reset-otp/verify-reset-otp.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { ChangePasswordComponent } from './features/auth/change-password/change-password.component';

import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { TeacherLayoutComponent } from './layouts/teacher-layout/teacher-layout.component';
import { StudentLayoutComponent } from './layouts/student-layout/student-layout.component';
import { StudentTasksComponent } from './features/student/pages/student-tasks/student-tasks.component';
import { StudentTaskDetailComponent } from './features/student/pages/student-task-detail/student-task-detail.component';
import { StudentsListComponent } from './features/admin/students/pages/students-list/students-list.component';
import { StudentDetailComponent } from './features/admin/students/pages/student-detail/student-detail.component';

import { ExamListComponent } from './features/admin/exam/pages/exam-list/exam-list.component';
import { ExamCreateComponent } from './features/admin/exam/pages/exam-create/exam-create.component';
import { ExamDetailComponent } from './features/admin/exam/pages/exam-detail/exam-detail.component';
import { StudentProfileComponent } from './features/student/pages/student-profile/student-profile.component';
import { SubjectCreateComponent } from './features/admin/subject/pages/subject-create/subject-create.component';
import { AdminNotificationsComponent } from './features/admin/notifications/pages/admin-notifications/admin-notfications.component';
import { TeachersListComponent } from './features/admin/teachers/pages/teachers-list/teachers-list.component';
import { TeacherDetailComponent } from './features/admin/teachers/pages/teachers-list/teacher-detail/teacher-detail.component';
import { TeacherCreateComponent } from './features/admin/teachers/pages/teacher-create/teacher-create.component';
import { TeacherExamCreateComponent } from './features/admin/teachers/pages/teacher-exam-create/teacher-exam-create.component';
import { AdminManagementComponent } from './features/admin/admin-management/admin-management.component';
import { AdminProfileComponent } from './features/admin/profile/admin-profile.component';
// YENI
import { AdminSettingsComponent } from './features/admin/settings/data/pages/admin-settings.component';
import { AdminCreateComponent } from './features/admin/users/data/pages/admin-create/admin-create.component';
import { AdminDetailComponent } from './features/admin/users/data/pages/admin-detail/admin-detail.component';
import { AdminEditComponent } from './features/admin/users/data/pages/admin-edit/admin-edit.component';
import { ClassListComponent } from './features/admin/class/pages/class-list/class-list.component';
import { ClassCreateComponent } from './features/admin/class/pages/class-create/class-create.component';
import { ClassDetailComponent } from './features/admin/class/pages/class-detail/class-detail.component';

import { DashboardComponent as AdminDashboardComponent } from './features/admin/dashboard/dashboard.component';
import { DashboardComponent as TeacherDashboardComponent } from './features/teacher/dashboard/dashboard.component';
import { DashboardComponent as StudentDashboardComponent } from './features/student/dashboard/dashboard.component';
import { StudentExamsComponent } from './features/student/pages/student-exams/student-exams.component';
import { StudentExamDetailComponent } from './features/student/pages/student-exam-detail/student-exam-detail.component';
import { StudentCreateComponent } from './features/admin/students/pages/student-create/student-create.component';
import { authGuard } from './core/guards/guard';
import { roleGuard } from './core/guards/role.guard';

// YENI - Teacher səhifələri
import { TeacherProfileComponent } from './features/admin/teachers/pages/teacher-profile/teacher-profile.component';
import { TeacherClassesComponent } from './features/admin/teachers/pages/teacher-classes/teacher-classes.component';
import { TeacherSubjectsComponent } from './features/admin/teachers/pages/teacher-subjects/teacher-subjects.component';
import { TeacherExamsComponent } from './features/admin/teachers/pages/teacher-exams/teacher-exams.component';
import { TeacherTasksComponent } from './features/admin/teachers/pages/teacher-tasks/teacher-tasks.component';
import { TeacherNotificationsComponent } from './features/teacher/teacher-notifications/teacher-notifications.component';

import { StudentNotificationsComponent } from './features/student/pages/student-notifications/student-notifications.component';

// YENI
import { TeacherClassDetailComponent } from './features/admin/teachers/pages/teacher-class-detail/teacher-class-detail.component';

// YENI
import { TeacherExamDetailComponent } from './features/admin/teachers/pages/teacher-exam-detail/teacher-exam-detail.component';

// YENI
import { TeacherClassTasksComponent } from './features/admin/teachers/pages/teacher-tasks/teacher-class-tasks/teacher-class-tasks.component';

// YENI
import { TeacherTaskDetailComponent } from './features/admin/teachers/pages/teacher-tasks/teacher-task-detail/teacher-task-detail.component';

// YENI
import { TeacherAttendanceDetailComponent } from './features/admin/teachers/pages/teacher-attendance-detail/teacher-attendance-detail.component';

import { StudentAttendanceComponent } from './features/student/pages/student-attendance/student-attendance.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: LoginComponent
  },

  // YENI - Forgot/Reset Password flow
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'verify-reset-otp',
    component: VerifyResetOtpComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'change-password',
    component: ChangePasswordComponent,
    canActivate: [authGuard]
  },

  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: ['Admin', 'IsSuperAdmin'] },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // Dashboard / Profile
      {
        path: 'dashboard',
        component: AdminDashboardComponent
      },
      {
        path: 'profile',
        component: AdminProfileComponent
      },
       {
  path: 'settings',
  component: AdminSettingsComponent
},
      // Admin management
      {
        path: 'users/admins',
        component: AdminManagementComponent
      },
      {
        path: 'users/admins/new',
        component: AdminCreateComponent
      },
      {
        path: 'users/admins/:id/edit',
        component: AdminEditComponent
      },
      {
        path: 'users/admins/:id',
        component: AdminDetailComponent
      },

      // Teachers
      {
        path: 'users/teachers',
        component: TeachersListComponent
      },
      {
        path: 'users/teachers/new',
        component: TeacherCreateComponent
      },
      {
        path: 'users/teachers/:id',
        component: TeacherDetailComponent
      },

      // Students
      {
        path: 'users/students',
        component: StudentsListComponent
      },
      {
        path: 'users/students/new',
        component: StudentCreateComponent
      },
      {
        path: 'users/students/:id',
        component: StudentDetailComponent
      },

      // Classes
      {
        path: 'classes',
        component: ClassListComponent
      },
      {
        path: 'classes/detail/:id',
        component: ClassDetailComponent
      },
      {
        path: 'classes/add',
        component: ClassCreateComponent
      },

      // Subjects
      {
        path: 'subjects',
        component: SubjectCreateComponent
      },

      // Exams
      {
        path: 'exams/list',
        component: ExamListComponent
      },
      {
        path: 'exams/create',
        component: ExamCreateComponent
      },
      {
        path: 'exams/detail/:id',
        component: ExamDetailComponent
      },

      // Other
      {
        path: 'results',
        component: AdminDashboardComponent
      },
      {
        path: 'reports',
        component: AdminDashboardComponent
      },
      {
        path: 'notifications',
        component: AdminNotificationsComponent
      },
      {
        path: 'settings',
        component: AdminDashboardComponent
      }
    ]
  },

  {
    path: 'teacher',
    component: TeacherLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: ['Teacher'] },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: TeacherDashboardComponent
      },

      // YENI - Teacher əlavə route-ları
      {
        path: 'profile',
        component: TeacherProfileComponent
      },
      {
        path: 'classes',
        component: TeacherClassesComponent
      },

      // YENI
      {
        path: 'classes/:id/attendance',
        component: TeacherAttendanceDetailComponent
      },

      {
        path: 'classes/:id',
        component: TeacherClassDetailComponent
      },
      {
        path: 'subjects',
        component: TeacherSubjectsComponent
      },
      {
        path: 'exams',
        component: TeacherExamsComponent
      },
      {
        path: 'exams/create',
        component: TeacherExamCreateComponent
      },
      // YENI
      {
        path: 'exams/:id',
        component: TeacherExamDetailComponent
      },
      {
        path: 'tasks',
        component: TeacherTasksComponent
      },

      // YENI
      {
        path: 'tasks/class/:classRoomId',
        component: TeacherClassTasksComponent
      },

      // YENI
      {
        path: 'tasks/detail/:taskGroupKey',
        component: TeacherTaskDetailComponent
      },

      {
        path: 'notifications',
        component: TeacherNotificationsComponent
      }
    ]
  },

  {
    path: 'student',
    component: StudentLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: ['Student'] },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: StudentDashboardComponent
      },
      {
        path: 'attendance',
        component: StudentAttendanceComponent
      },
      {
        path: 'profile',
        component: StudentProfileComponent
      },
      {
        path: 'tasks',
        component: StudentTasksComponent
      },
      {
        path: 'exams',
        component: StudentExamsComponent
      },
      {
        path: 'exams/:examId',
        component: StudentExamDetailComponent
      },
      {
        path: 'notifications',
        component: StudentNotificationsComponent
      },
      {
        path: 'tasks/:id',
        component: StudentTaskDetailComponent
      }
    ]
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];