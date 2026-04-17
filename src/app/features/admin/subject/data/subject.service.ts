import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CreateSubjectRequest,
  SubjectDetail,
  SubjectDetailsApiDto,
  SubjectFilter,
  SubjectFormData,
  SubjectListItem,
  SubjectStats,
  SubjectTeacherAssignment,
  SubjectTeacherOption,
  SubjectStatus,
  UpdateSubjectRequest
} from '../../../../core/models/subject/subject.model';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private readonly http = inject(HttpClient);

  private readonly subjectUrl = `${environment.apiUrl}/Subject`;
  private readonly teacherUrl = `${environment.apiUrl}/Teacher`;

  getTeachers(): Observable<SubjectTeacherOption[]> {
    return this.http.get<any[]>(`${this.teacherUrl}/details`).pipe(
      map(items =>
        items.map(item => ({
          id: item.id,
          fullName: item.fullName,
          email: item.email,
          photoUrl: item.photoUrl || 'https://via.placeholder.com/120x120?text=Teacher',
          subjectIds: (item.subjects ?? []).map((subject: any) => subject.subjectId),
          subjectNames: (item.subjects ?? []).map((subject: any) => subject.subjectName),
          status: this.mapTeacherStatus(item.status, item.isActive)
        }))
      )
    );
  }

  getSubjects(): Observable<SubjectListItem[]> {
    return this.http.get<SubjectDetailsApiDto[]>(`${this.subjectUrl}/details`).pipe(
      map(items => items.map(item => this.mapSubject(item)))
    );
  }

  getFilteredSubjects(filter: SubjectFilter): Observable<SubjectListItem[]> {
    return this.getSubjects().pipe(
      map(subjects => {
        const search = filter.search.trim().toLowerCase();

        return subjects.filter(subject => {
          const matchesSearch = !search || [
            subject.name,
            subject.code,
            subject.description,
            ...subject.teachers.map(x => `${x.teacherName} ${x.teacherEmail}`)
          ]
            .join(' ')
            .toLowerCase()
            .includes(search);

          const matchesStatus = !filter.status || subject.status === filter.status;
          const matchesTeacher = filter.teacherId === null || subject.teachers.some(x => x.teacherId === filter.teacherId);

          return matchesSearch && matchesStatus && matchesTeacher;
        });
      })
    );
  }

  getStats(subjects: SubjectListItem[]): SubjectStats {
    return {
      totalSubjects: subjects.length,
      activeSubjects: subjects.filter(x => x.status === 'Aktiv').length,
      passiveSubjects: subjects.filter(x => x.status === 'Passiv').length,
      totalAssignments: subjects.reduce((sum, subject) => sum + subject.teachers.length, 0)
    };
  }

  createSubject(payload: SubjectFormData, teacherIds: number[]): Observable<SubjectListItem> {
    const request: CreateSubjectRequest = {
      name: payload.name.trim(),
      code: payload.code.trim() || null,
      description: payload.description.trim() || null,
      weeklyHours: Number(payload.weeklyHours ?? 0),
      isActive: payload.status === 'Aktiv'
    };

    return this.http.post<{ id: number }>(this.subjectUrl, request).pipe(
      switchMap(response => this.syncTeachers(response.id, teacherIds).pipe(
        switchMap(() => this.getSubjectDetail(response.id))
      ))
    );
  }

  updateSubject(subjectId: number, payload: SubjectFormData, teacherIds: number[]): Observable<SubjectListItem> {
    const request: UpdateSubjectRequest = {
      id: subjectId,
      name: payload.name.trim(),
      code: payload.code.trim() || null,
      description: payload.description.trim() || null,
      weeklyHours: Number(payload.weeklyHours ?? 0),
      isActive: payload.status === 'Aktiv'
    };

    return this.http.put(this.subjectUrl, request).pipe(
      switchMap(() => this.syncTeachers(subjectId, teacherIds)),
      switchMap(() => this.getSubjectDetail(subjectId))
    );
  }

  syncTeachers(subjectId: number, teacherIds: number[]): Observable<unknown> {
    return this.http.put(`${this.subjectUrl}/sync-teachers`, {
      subjectId,
      teacherIds
    });
  }

  removeSubject(subjectId: number): Observable<unknown> {
    return this.http.delete(`${this.subjectUrl}/${subjectId}`);
  }

  changeSubjectStatus(subjectId: number, status: SubjectStatus): Observable<unknown> {
    return this.http.patch(`${this.subjectUrl}/change-status`, {
      subjectId,
      isActive: status === 'Aktiv'
    });
  }

  removeTeacherFromSubject(subjectId: number, teacherId: number): Observable<unknown> {
    return this.http.get<SubjectDetailsApiDto>(`${this.subjectUrl}/${subjectId}/details`).pipe(
      map(details => details.teachers.map(x => x.teacherId).filter(id => id !== teacherId)),
      switchMap(teacherIds => this.syncTeachers(subjectId, teacherIds))
    );
  }

  getSubjectDetail(subjectId: number): Observable<SubjectDetail> {
    return this.http.get<SubjectDetailsApiDto>(`${this.subjectUrl}/${subjectId}/details`).pipe(
      map(item => this.mapSubject(item))
    );
  }

  private mapSubject(item: SubjectDetailsApiDto): SubjectDetail {
    return {
      id: item.id,
      name: item.name,
      code: item.code ?? '',
      description: item.description ?? '',
      weeklyHours: item.weeklyHours,
      status: item.isActive ? 'Aktiv' : 'Passiv',
      createdAt: '',
      updatedAt: '',
      teacherCount: item.teacherCount,
      teachers: (item.teachers ?? []).map(teacher => this.mapTeacherAssignment(teacher))
    };
  }

  private mapTeacherAssignment(teacher: any): SubjectTeacherAssignment {
    return {
      teacherId: teacher.teacherId,
      teacherName: teacher.fullName,
      teacherEmail: teacher.email,
      teacherPhotoUrl: teacher.photoUrl || 'https://via.placeholder.com/120x120?text=Teacher',
      teacherStatus: this.mapTeacherStatus(teacher.status, teacher.isActive)
    };
  }

  private mapTeacherStatus(status: string | null | undefined, isActive: boolean): 'Aktiv' | 'Passiv' | 'Məzuniyyət' {
    const normalized = (status ?? '').trim().toLowerCase();

    if (normalized === 'onleave' || normalized === 'leave') {
      return 'Məzuniyyət';
    }

    if (normalized === 'inactive' || !isActive) {
      return 'Passiv';
    }

    return 'Aktiv';
  }
}