import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, timeout } from 'rxjs';
import {
  ChangeUserStatusRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserDetail,
  UserListItem
} from '../../../../core/models/user/user.model';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/User`;

  getAll(): Observable<UserListItem[]> {
    console.log('GET ALL URL =>', this.baseUrl);
    return this.http.get<UserListItem[]>(this.baseUrl).pipe(
      timeout(8000),
      tap({
        next: (res) => console.log('GET ALL RESPONSE =>', res),
        error: (err) => console.error('GET ALL ERROR =>', err)
      })
    );
  }

  getById(userId: number): Observable<UserDetail> {
    const url = `${this.baseUrl}/${userId}`;
    console.log('GET BY ID URL =>', url);

    return this.http.get<UserDetail>(url).pipe(
      timeout(8000),
      tap({
        next: (res) => console.log('GET BY ID RESPONSE =>', res),
        error: (err) => console.error('GET BY ID ERROR =>', err)
      })
    );
  }

  getByRole(role: string): Observable<UserListItem[]> {
    return this.http.get<UserListItem[]>(`${this.baseUrl}/by-role/${role}`).pipe(
      timeout(8000)
    );
  }

  create(payload: CreateUserRequest): Observable<UserDetail> {
    return this.http.post<UserDetail>(this.baseUrl, payload).pipe(
      timeout(8000)
    );
  }

  update(payload: UpdateUserRequest): Observable<UserDetail> {
    console.log('UPDATE URL =>', this.baseUrl);
    console.log('UPDATE PAYLOAD =>', payload);

    return this.http.put<UserDetail>(this.baseUrl, payload).pipe(
      timeout(8000),
      tap({
        next: (res) => console.log('UPDATE RESPONSE =>', res),
        error: (err) => console.error('UPDATE ERROR =>', err)
      })
    );
  }

  changeStatus(payload: ChangeUserStatusRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/change-status`, payload).pipe(
      timeout(8000)
    );
  }

  delete(userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${userId}`).pipe(
      timeout(8000)
    );
  }
}