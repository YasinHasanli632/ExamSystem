import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const token = authService.getToken();

  // YENI
  const isLoginRequest = req.url.includes('/Auth/login');
  const isRefreshRequest = req.url.includes('/Auth/refresh-token');
  const isRevokeRequest = req.url.includes('/Auth/revoke-refresh-token');

  // YENI
  // Login, refresh və revoke request-lərini access token ilə zorla dəyişmirik
  if (isLoginRequest || isRefreshRequest || isRevokeRequest) {
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if ((isRefreshRequest || isRevokeRequest) && error.status === 401) {
          authService.forceLogout();
        }

        return throwError(() => error);
      })
    );
  }

  // YENI
  // Token ümumiyyətlə yoxdursa request olduğu kimi getsin
  if (!token) {
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          authService.forceLogout();
        }

        return throwError(() => error);
      })
    );
  }

  // YENI
  // Əgər access token artıq expired olubsa və refresh token hələ yaşayırsa,
  // request göndərməzdən əvvəl tokeni yeniləyirik.
  if (!authService.isAuthenticated() && authService.isRefreshTokenValid()) {
    authService.setRefreshing(true);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        authService.setRefreshing(false);

        const refreshedRequest = req.clone({
          setHeaders: {
            Authorization: `Bearer ${response.accessToken}`
          }
        });

        return next(refreshedRequest);
      }),
      catchError((refreshError) => {
        authService.setRefreshing(false);
        authService.forceLogout();
        return throwError(() => refreshError);
      })
    );
  }

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      // YENI
      // Access token backend tərəfindən 401 alıbsa, bir dəfə refresh etməyə çalışırıq
      if (
        error.status === 401 &&
        !isLoginRequest &&
        !isRefreshRequest &&
        !isRevokeRequest &&
        authService.isRefreshTokenValid() &&
        !authService.getIsRefreshing()
      ) {
        authService.setRefreshing(true);

        return authService.refreshToken().pipe(
          switchMap((response) => {
            authService.setRefreshing(false);

            const retryRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.accessToken}`
              }
            });

            return next(retryRequest);
          }),
          catchError((refreshError) => {
            authService.setRefreshing(false);
            authService.forceLogout();
            return throwError(() => refreshError);
          })
        );
      }

      // YENI
      // Refresh token də keçərli deyilsə, artıq session bitmiş sayılır
      if (error.status === 401 && !authService.isRefreshTokenValid()) {
        authService.forceLogout();
      }

      return throwError(() => error);
    })
  );
};