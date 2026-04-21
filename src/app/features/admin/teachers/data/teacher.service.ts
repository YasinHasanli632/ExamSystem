import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ClassRoomOptionDto,
  CreateTeacherProfileRequest,
  CreateTeacherUserRequest,
  SubjectOptionDto,
  Teacher,
  TeacherClassAssignmentDraft,
  TeacherClassRoomApiDto,
  TeacherDetailsApiDto,
  TeacherStatus,
  TeacherTaskApiDto,
  UpdateTeacherProfileRequest
} from '../../../../core/models/teacher/teacher.model';

interface CreateUserResponse {
  userId: number;
}

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private readonly http = inject(HttpClient);

  private readonly teacherUrl = `${environment.apiUrl}/Teacher`;
  private readonly userUrl = `${environment.apiUrl}/User`;
  private readonly subjectUrl = `${environment.apiUrl}/Subject`;
  private readonly classRoomUrl = `${environment.apiUrl}/ClassRoom`;

  getAll(): Observable<Teacher[]> {
    return this.http.get<TeacherDetailsApiDto[]>(`${this.teacherUrl}/details`).pipe(
      map(items => items.map(item => this.mapTeacherDetailsToUi(item)))
    );
  }

  getById(id: number): Observable<Teacher> {
    return this.http.get<TeacherDetailsApiDto>(`${this.teacherUrl}/${id}/details`).pipe(
      map(item => this.mapTeacherDetailsToUi(item))
    );
  }

  getSubjectOptions(): Observable<SubjectOptionDto[]> {
    return this.http.get<Array<{ id: number; name: string; code?: string | null }>>(this.subjectUrl);
  }

  getClassRoomOptions(): Observable<ClassRoomOptionDto[]> {
    return this.http.get<Array<{ id: number; name: string; grade: number }>>(this.classRoomUrl);
  }
getByUserId(userId: number): Observable<Teacher> {
  return this.http.get<TeacherDetailsApiDto>(`${this.teacherUrl}/user/${userId}/details`).pipe(
    map(item => this.mapTeacherDetailsToUi(item))
  );
}
  createTeacher(
    userRequest: CreateTeacherUserRequest,
    profileRequest: Omit<CreateTeacherProfileRequest, 'userId'>,
    subjectIds: number[],
    classAssignments: TeacherClassAssignmentDraft[]
  ): Observable<Teacher> {
    return this.http.post<CreateUserResponse>(this.userUrl, userRequest).pipe(
      switchMap((userResponse) =>
        this.http.post<{ id: number }>(this.teacherUrl, {
          ...profileRequest,
          userId: userResponse.userId
        })
      ),
      switchMap((teacherResponse) => {
        const teacherId = teacherResponse.id;
        const requests: Observable<unknown>[] = [];

        if (subjectIds.length > 0) {
          requests.push(
            this.http.put(`${this.teacherUrl}/sync-subjects`, {
              teacherId,
              subjectIds
            })
          );
        }

        if (classAssignments.length > 0) {
          requests.push(
            this.http.put(`${this.teacherUrl}/sync-classrooms`, {
              teacherId,
              assignments: classAssignments
            })
          );
        }

        return (requests.length ? forkJoin(requests) : of([])).pipe(
          switchMap(() => this.getById(teacherId))
        );
      })
    );
  }

  updateTeacher(
    teacherRequest: UpdateTeacherProfileRequest,
    subjectIds: number[],
    classAssignments: TeacherClassAssignmentDraft[]
  ): Observable<Teacher> {
    return this.http.put(this.teacherUrl, teacherRequest).pipe(
      switchMap(() => {
        const requests: Observable<unknown>[] = [
          this.http.put(`${this.teacherUrl}/sync-subjects`, {
            teacherId: teacherRequest.id,
            subjectIds
          }),
          this.http.put(`${this.teacherUrl}/sync-classrooms`, {
            teacherId: teacherRequest.id,
            assignments: classAssignments
          })
        ];

        return forkJoin(requests).pipe(
          switchMap(() => this.getById(teacherRequest.id))
        );
      })
    );
  }

  deleteTeacher(id: number): Observable<unknown> {
    return this.http.delete(`${this.teacherUrl}/${id}`);
  }

  changeStatus(teacherId: number, status: TeacherStatus): Observable<unknown> {
    return this.http.patch(`${this.teacherUrl}/change-status`, {
      teacherId,
      status: this.mapUiStatusToApi(status)
    });
  }

  private mapTeacherDetailsToUi(item: TeacherDetailsApiDto): Teacher {
    const subjectNames = (item.subjects ?? []).map(subject => subject.subjectName);
    const groupedClasses = this.groupClassRooms(item.classRooms ?? []);
    const tasks = (item.tasks ?? []).map(task => this.mapTask(task));
    const age = this.calculateAge(item.birthDate);

    return {
      id: item.id,
      userId: item.userId,
      firstName: item.firstName ?? '',
      lastName: item.lastName ?? '',
      fatherName: item.fatherName ?? '',
      fullName: item.fullName ?? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim(),
      email: item.email ?? '',
      username: item.userName ?? '',
      phone: item.phoneNumber ?? '',
      country: item.country ?? '',
      age,
      birthDate: item.birthDate ?? '',
      photoUrl: item.photoUrl || 'https://via.placeholder.com/160x160?text=Teacher',
      details: item.details ?? '',
      department: item.department ?? '',
      specialization: item.specialization ?? '',
      isActive: item.isActive,
      status: this.mapApiStatusToUi(item.status, item.isActive),
      subjects: subjectNames,
      classes: groupedClasses,
      tasks,
      performance: {
        successRate: 0,
        averageScore: 0,
        examCount: item.overviewStats?.examCount ?? item.examCount ?? 0,
        studentCount: item.overviewStats?.studentCount ?? 0,
        completedTasks: item.overviewStats?.completedTaskCount ?? tasks.filter(x => x.status === 'Tamamlanıb').length,
        pendingTasks: item.overviewStats?.pendingTaskCount ?? tasks.filter(x => x.status !== 'Tamamlanıb').length
      }
    };
  }

  private groupClassRooms(items: TeacherClassRoomApiDto[]) {
    const grouped = new Map<number, { id: number; name: string; studentCount: number; subjectNames: string[] }>();

    for (const item of items) {
      if (!grouped.has(item.classRoomId)) {
        grouped.set(item.classRoomId, {
          id: item.classRoomId,
          name: item.classRoomName,
          studentCount: 0,
          subjectNames: []
        });
      }

      const current = grouped.get(item.classRoomId)!;

      if (item.subjectName && !current.subjectNames.includes(item.subjectName)) {
        current.subjectNames.push(item.subjectName);
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private mapTask(task: TeacherTaskApiDto) {
    return {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: this.mapTaskStatus(task.status, task.isCompleted)
    } as const;
  }

  private mapTaskStatus(status: string | null | undefined, isCompleted: boolean): 'Gözləyir' | 'Tamamlanıb' | 'Gecikir' {
    const normalized = (status ?? '').trim().toLowerCase();

    if (isCompleted || normalized.includes('complete')) {
      return 'Tamamlanıb';
    }

    if (normalized.includes('delay') || normalized.includes('overdue')) {
      return 'Gecikir';
    }

    return 'Gözləyir';
  }

  private mapApiStatusToUi(status: string | null | undefined, isActive: boolean): TeacherStatus {
    const normalized = (status ?? '').trim().toLowerCase();

    if (normalized === 'onleave' || normalized === 'leave') {
      return 'Məzuniyyət';
    }

    if (normalized === 'inactive' || normalized === 'passive' || !isActive) {
      return 'Passiv';
    }

    return 'Aktiv';
  }

  private mapUiStatusToApi(status: TeacherStatus): 'Active' | 'Inactive' | 'OnLeave' {
    switch (status) {
      case 'Passiv':
        return 'Inactive';
      case 'Məzuniyyət':
        return 'OnLeave';
      default:
        return 'Active';
    }
  }

  private calculateAge(birthDate: string | null | undefined): number {
    if (!birthDate) {
      return 0;
    }

    const date = new Date(birthDate);

    if (Number.isNaN(date.getTime())) {
      return 0;
    }

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDifference = today.getMonth() - date.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    return age;
  }
} 