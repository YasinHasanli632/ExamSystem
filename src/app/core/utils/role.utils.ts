export function normalizeRole(role: unknown): string {
  if (role === null || role === undefined) {
    return '';
  }

  if (typeof role === 'number') {
    switch (role) {
      case 1:
        return 'admin';
      case 2:
        return 'teacher';
      case 3:
        return 'student';
      case 4:
        return 'superadmin';
      default:
        return '';
    }
  }

  const value = String(role)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');

  if (value === 'admin') {
    return 'admin';
  }

  if (value === 'teacher') {
    return 'teacher';
  }

  if (value === 'student') {
    return 'student';
  }

  if (value === 'issuperadmin' || value === 'superadmin') {
    return 'superadmin';
  }

  return value;
}

export function isAdminRole(role: unknown): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'superadmin';
}

export function isTeacherRole(role: unknown): boolean {
  return normalizeRole(role) === 'teacher';
}

export function isStudentRole(role: unknown): boolean {
  return normalizeRole(role) === 'student';
}

export function isSuperAdminRole(role: unknown): boolean {
  return normalizeRole(role) === 'superadmin';
}