import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // YENI
  // Access token keçərlidirsə normal buraxırıq
  if (!authService.isAuthenticated()) {
    // YENI
    // Access token expired olsa da refresh token yaşayırsa,
    // request zamanı interceptor refresh etməyə çalışacaq.
    if (!authService.isRefreshTokenValid()) {
      router.navigate(['/login']);
      return false;
    }
  }

  const mustChangePassword = authService.getMustChangePassword();
  const currentUrl = state.url || '';

  if (mustChangePassword && currentUrl !== '/change-password') {
    router.navigate(['/change-password']);
    return false;
  }

  return true;
};