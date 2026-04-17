import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import {
  ChangePasswordRequest,
  CurrentUser,
  ForgotPasswordRequest,
  LoginResponse,
  ResetPasswordRequest,
  RevokeRefreshTokenRequest,
  VerifyResetOtpRequest,
  VerifyResetOtpResponse,
  RefreshTokenRequest
} from '../models/auth/auth.models';
import { isAdminRole, isSuperAdminRole, normalizeRole } from '../utils/role.utils';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/Auth`;
  private readonly tokenKey = 'accessToken';
  private readonly userKey = 'currentUser';
  private readonly expiresAtKey = 'expiresAt';
  private readonly mustChangePasswordKey = 'mustChangePassword';

  // YENI
  private readonly refreshTokenKey = 'refreshToken';

  // YENI
  private readonly refreshTokenExpiresAtKey = 'refreshTokenExpiresAt';

  // YENI
  private isRefreshing = false;

  constructor(private http: HttpClient) {}

  login(payload: { usernameOrEmail: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((response) => {
        this.setSession(response);
      })
    );
  }

  getMe(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/me`);
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, payload);
  }

  verifyResetOtp(payload: VerifyResetOtpRequest): Observable<VerifyResetOtpResponse> {
    return this.http.post<VerifyResetOtpResponse>(`${this.baseUrl}/verify-reset-otp`, payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, payload);
  }

  changePassword(payload: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/change-password`, payload);
  }

  // YENI
  refreshToken(): Observable<LoginResponse> {
    const accessToken = this.getToken();
    const refreshToken = this.getRefreshToken();

    const payload: RefreshTokenRequest = {
      accessToken: accessToken ?? '',
      refreshToken: refreshToken ?? ''
    };

    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh-token`, payload).pipe(
      tap((response) => {
        this.setSession(response);
      })
    );
  }

  // YENI
  revokeRefreshToken(): Observable<{ message: string } | null> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return of(null);
    }

    const payload: RevokeRefreshTokenRequest = {
      refreshToken
    };

    return this.http
      .post<{ message: string }>(`${this.baseUrl}/revoke-refresh-token`, payload)
      .pipe(catchError(() => of(null)));
  }

  setSession(response: LoginResponse): void {
    localStorage.setItem(this.tokenKey, response.accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    localStorage.setItem(this.expiresAtKey, response.expiresAt);
    localStorage.setItem(this.mustChangePasswordKey, String(!!response.mustChangePassword));

    // YENI
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);

    // YENI
    localStorage.setItem(this.refreshTokenExpiresAtKey, response.refreshTokenExpiresAt);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  getExpiresAt(): string | null {
    return localStorage.getItem(this.expiresAtKey);
  }

  // YENI
  getRefreshTokenExpiresAt(): string | null {
    return localStorage.getItem(this.refreshTokenExpiresAtKey);
  }

  getCurrentUser(): CurrentUser | null {
    const raw = localStorage.getItem(this.userKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }

  getRole(): string {
    const user = this.getCurrentUser();

    if (!user) {
      return '';
    }

    const role = user.role as unknown;

    if (role === null || role === undefined) {
      return '';
    }

    if (typeof role === 'number') {
      switch (role) {
        case 1:
          return 'Admin';
        case 2:
          return 'Teacher';
        case 3:
          return 'Student';
        case 4:
          return 'IsSuperAdmin';
        default:
          return '';
      }
    }

    return String(role);
  }

  getMustChangePassword(): boolean {
    return localStorage.getItem(this.mustChangePasswordKey) === 'true';
  }

  setMustChangePassword(value: boolean): void {
    localStorage.setItem(this.mustChangePasswordKey, String(value));
  }

  clearMustChangePassword(): void {
    this.setMustChangePassword(false);
  }

  isSuperAdmin(): boolean {
    const role = this.getRole();
    return isSuperAdminRole(role);
  }

  isAdmin(): boolean {
    const role = this.getRole();
    return isAdminRole(role);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    const expiresAt = this.getExpiresAt();

    if (!expiresAt) {
      return false;
    }

    return new Date(expiresAt).getTime() > Date.now();
  }

  // YENI
  isRefreshTokenValid(): boolean {
    const refreshToken = this.getRefreshToken();
    const refreshTokenExpiresAt = this.getRefreshTokenExpiresAt();

    if (!refreshToken || !refreshTokenExpiresAt) {
      return false;
    }

    return new Date(refreshTokenExpiresAt).getTime() > Date.now();
  }

  // YENI
  setRefreshing(value: boolean): void {
    this.isRefreshing = value;
  }

  // YENI
  getIsRefreshing(): boolean {
    return this.isRefreshing;
  }

  getHomeRouteByRole(): string {
    const role = normalizeRole(this.getRole());

    if (role === 'admin' || role === 'superadmin') {
      return '/admin/dashboard';
    }

    if (role === 'teacher') {
      return '/teacher/dashboard';
    }

    if (role === 'student') {
      return '/student/dashboard';
    }

    return '/login';
  }

  logout(): void {
    this.clearLocalSession();
  }

  // YENI
  forceLogout(): void {
    this.clearLocalSession();
  }

  // YENI
  private clearLocalSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.expiresAtKey);
    localStorage.removeItem(this.mustChangePasswordKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.refreshTokenExpiresAtKey);

    this.isRefreshing = false;
  }
}