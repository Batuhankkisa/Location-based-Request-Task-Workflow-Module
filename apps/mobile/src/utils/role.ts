import { Role } from '@lbrtw/shared';
import { ROLE_LABELS } from './constants';

export function canSeeQrModule(role?: Role | null) {
  return role === Role.ADMIN || role === Role.SUPERVISOR;
}

export function canSeeLocationsModule(role?: Role | null) {
  return role === Role.ADMIN || role === Role.SUPERVISOR;
}

export function canManageOrganizations(role?: Role | null) {
  return role === Role.ADMIN;
}

export function canManageUsers(role?: Role | null) {
  return role === Role.ADMIN;
}

export function canAccessMobileApp(role?: Role | null) {
  return role === Role.ADMIN || role === Role.SUPERVISOR;
}

export function canReviewTask(role?: Role | null) {
  return role === Role.ADMIN || role === Role.SUPERVISOR;
}

export function canToggleQrStatus(role?: Role | null) {
  return role === Role.ADMIN;
}

export function getRoleLabel(role?: Role | null) {
  if (!role) {
    return '-';
  }

  return ROLE_LABELS[role];
}
