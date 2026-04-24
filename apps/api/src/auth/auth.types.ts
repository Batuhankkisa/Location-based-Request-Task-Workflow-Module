import type { OrganizationType, Role } from '@lbrtw/shared';

export interface AuthOrganizationSummary {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId?: string | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string | null;
  organization: AuthOrganizationSummary | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
