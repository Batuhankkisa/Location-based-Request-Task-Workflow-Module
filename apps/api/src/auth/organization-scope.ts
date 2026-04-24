import { ForbiddenException } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import type { AuthenticatedUser } from './auth.types';

export function isGlobalAdmin(user: AuthenticatedUser) {
  return user.role === Role.ADMIN;
}

export function requireOrganizationScope(user: AuthenticatedUser) {
  if (isGlobalAdmin(user)) {
    throw new ForbiddenException('Global admin does not have a fixed organization scope');
  }

  const organizationId = user.organizationId?.trim();
  if (!organizationId) {
    throw new ForbiddenException('User is not assigned to an active organization');
  }

  return organizationId;
}

export function resolveOrganizationScope(user: AuthenticatedUser, requestedOrganizationId?: string) {
  const normalizedRequestedId = requestedOrganizationId?.trim();

  if (isGlobalAdmin(user)) {
    return normalizedRequestedId || undefined;
  }

  const scopedOrganizationId = requireOrganizationScope(user);
  if (normalizedRequestedId && normalizedRequestedId !== scopedOrganizationId) {
    throw new ForbiddenException('You do not have permission to access another organization');
  }

  return scopedOrganizationId;
}
