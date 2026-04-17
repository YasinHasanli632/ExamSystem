import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { normalizeRole } from '../utils/role.utils';

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.getMustChangePassword()) {
    router.navigate(['/change-password']);
    return false;
  }

  const currentRole = normalizeRole(authService.getRole());
  const allowedRoles = (route.data?.['role'] as string[] | undefined) ?? [];
  const normalizedAllowedRoles = allowedRoles.map(role => normalizeRole(role));

  if (normalizedAllowedRoles.includes(currentRole)) {
    return true;
  }

  if (currentRole === 'admin' || currentRole === 'superadmin') {
    router.navigate(['/admin/dashboard']);
    return false;
  }

  if (currentRole === 'teacher') {
    router.navigate(['/teacher/dashboard']);
    return false;
  }

  if (currentRole === 'student') {
    router.navigate(['/student/dashboard']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};