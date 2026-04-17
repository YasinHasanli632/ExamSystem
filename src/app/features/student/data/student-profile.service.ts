import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  StudentProfileModel,
  UpdateStudentProfileRequest
} from '../../../core/models/students/student-profile.model';

@Injectable({
  providedIn: 'root'
})
export class StudentProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/student/profile`;

  getMyProfile(): Observable<StudentProfileModel> {
    return this.http.get<StudentProfileModel>(this.apiUrl).pipe(
      map((profile) => this.mapProfile(profile))
    );
  }

  updateMyProfile(payload: UpdateStudentProfileRequest): Observable<StudentProfileModel> {
    return this.http.put<StudentProfileModel>(this.apiUrl, payload).pipe(
      map((profile) => this.mapProfile(profile))
    );
  }

  private mapProfile(profile: StudentProfileModel): StudentProfileModel {
    return {
      ...profile,
      fullName: profile?.fullName ?? '',
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      email: profile?.email ?? '',
      phoneNumber: profile?.phoneNumber ?? null,
      parentName: profile?.parentName ?? '',
      parentPhone: profile?.parentPhone ?? null,
      address: profile?.address ?? null,
      gender: profile?.gender ?? 'Bilinmir',
      studentNumber: profile?.studentNumber ?? '',
      dateOfBirth: profile?.dateOfBirth ?? '',
      className: profile?.className ?? null,
      status: profile?.status ?? 'Aktiv',
      notes: profile?.notes ?? null,
      averageScore: Number(profile?.averageScore ?? 0),
      examsCount: Number(profile?.examsCount ?? 0),
      attendanceRate: Number(profile?.attendanceRate ?? 0),
      photoUrl: profile?.photoUrl ?? null,
      tasksCount: Number(profile?.tasksCount ?? 0),
      completedTasksCount: Number(profile?.completedTasksCount ?? 0),
      absentCount: Number(profile?.absentCount ?? 0),
      lateCount: Number(profile?.lateCount ?? 0),
      exams: profile?.exams ?? [],
      attendance: profile?.attendance ?? [],
      tasks: profile?.tasks ?? []
    };
  }
}